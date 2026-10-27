/**
 * Applies text edits to a PDF by rewriting the page content streams.
 *
 * The text-showing operator chosen by the user is replaced in place: its
 * string operand becomes the new text, encoded with the original font when
 * every character has a known code, otherwise drawn with a standard font set
 * just for that operator (`/Fx size Tf … Tj /Forig size Tf`). Position, text
 * matrix, colour and rendering mode are untouched because the surrounding
 * operators are kept byte for byte. Nothing is painted over: the original
 * glyphs no longer exist in the stream.
 *
 * Runs in Node (pdf-lib only) and in the browser.
 */
import {
  PDFArray,
  PDFName,
  PDFRawStream,
  PDFRef,
  decodePDFRawStream,
  type PDFDocument,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { resolveStandardFont, sanitizeForStandardFont } from "../fonts";
import { loadPdfDocument, savePdfDocument } from "../load";
import {
  fromLatin1,
  spliceBytes,
  tokenizeContent,
  type ContentOp,
  type Operand,
} from "../content/tokenizer";
import type { FallbackFontHint, OriginalEncoding, TextEdit, TextEditReport } from "./types";
import { tr } from "@/lib/i18n/messages";

export const TEXT_SHOW_OPS = new Set(["Tj", "TJ", "'", '"']);

/** A page-level text-showing operator with the text state it runs under. */
export interface RawTextOp {
  index: number;
  op: ContentOp;
  /** Font resource name and size from the last `Tf` in scope (null when none). */
  fontName: string | null;
  fontSize: number | null;
  /** Total bytes of the string operand(s), to infer the code width. */
  stringBytes: number;
  /** Number of string operands (TJ arrays have several). */
  stringCount: number;
  /**
   * A positioning operator (Td, TD, Tm, T*, ET…) follows before the next
   * text-showing operator: removing this operator cannot shift later text.
   */
  nextIsPositioned: boolean;
  /** Text matrix in effect (absolute `Tm` combined with later `Td`/`TD`/`T*`), when known. */
  textMatrix: number[] | null;
}

/** Decoded, concatenated content of a page (streams joined by a newline). */
export function pageContentBytes(doc: PDFDocument, page: PDFPage): Uint8Array {
  const contents = page.node.Contents();
  if (!contents) return new Uint8Array();
  const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
  const parts: Uint8Array[] = [];
  for (const item of refs) {
    const stream = item instanceof PDFRef ? doc.context.lookup(item) : item;
    if (stream instanceof PDFRawStream) {
      parts.push(decodePDFRawStream(stream).decode());
      parts.push(new Uint8Array([0x0a]));
    }
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Page-level text-showing operators, in stream order, with their font state. */
export function collectTextOps(content: Uint8Array): RawTextOp[] {
  const ops = tokenizeContent(content);
  const result: RawTextOp[] = [];
  let font: { name: string | null; size: number | null } = { name: null, size: null };
  const stack: (typeof font)[] = [];
  let lastText: RawTextOp | null = null;
  const positioning = new Set(["Td", "TD", "Tm", "T*", "ET", "BT", "q", "Q", "cm"]);
  // Text matrix tracking (line matrix only: enough to re-enter a text object at the same place).
  let tm: number[] | null = null;
  let tlm: number[] | null = null;
  let leading = 0;
  const num = (o: Operand | undefined) => (o?.type === "number" ? o.value : 0);
  const td = (tx: number, ty: number) => {
    if (!tlm) tlm = [1, 0, 0, 1, 0, 0];
    tlm = [
      tlm[0]!,
      tlm[1]!,
      tlm[2]!,
      tlm[3]!,
      tlm[0]! * tx + tlm[2]! * ty + tlm[4]!,
      tlm[1]! * tx + tlm[3]! * ty + tlm[5]!,
    ];
    tm = tlm;
  };
  for (const op of ops) {
    if (positioning.has(op.op) && lastText) {
      lastText.nextIsPositioned = true;
      lastText = null;
    }
    switch (op.op) {
      case "BT":
        tm = tlm = [1, 0, 0, 1, 0, 0];
        break;
      case "Tm":
        tm = tlm = op.operands.slice(0, 6).map(num);
        break;
      case "Td":
        td(num(op.operands[0]), num(op.operands[1]));
        break;
      case "TD":
        leading = -num(op.operands[1]);
        td(num(op.operands[0]), num(op.operands[1]));
        break;
      case "TL":
        leading = num(op.operands[0]);
        break;
      case "T*":
        td(0, -leading);
        break;
      case "q":
        stack.push(font);
        break;
      case "Q":
        font = stack.pop() ?? font;
        break;
      case "Tf": {
        const [name, size] = op.operands;
        font = {
          name: name?.type === "name" ? name.value : null,
          size: size?.type === "number" ? size.value : null,
        };
        break;
      }
      default:
        if (TEXT_SHOW_OPS.has(op.op)) {
          let stringBytes = 0;
          let stringCount = 0;
          const visit = (operand: Operand) => {
            if (operand.type === "string") {
              stringBytes += operand.bytes.length;
              stringCount += 1;
            } else if (operand.type === "array") operand.items.forEach(visit);
          };
          op.operands.forEach(visit);
          const raw: RawTextOp = {
            index: result.length,
            op,
            fontName: font.name,
            fontSize: font.size,
            stringBytes,
            stringCount,
            nextIsPositioned: false,
            textMatrix: tm ? [...tm] : null,
          };
          result.push(raw);
          lastText = raw;
        }
    }
  }
  if (lastText) lastText.nextIsPositioned = true;
  return result;
}

/**
 * After closing and reopening a text object, the font and the text matrix are
 * gone: re-emit them from the state recorded on the raw operator.
 */
function restoreTextState(raw: RawTextOp): string {
  const parts: string[] = [];
  if (raw.fontName !== null && raw.fontSize !== null)
    parts.push(`${PDFName.of(raw.fontName).toString()} ${raw.fontSize} Tf`);
  if (raw.textMatrix)
    parts.push(
      `${raw.textMatrix.map((v) => (Math.round(v * 1000) / 1000).toString()).join(" ")} Tm`,
    );
  return parts.join(" ");
}

/** Pairs that fonts often draw as one ligature glyph. */
export const LIGATURES: Record<string, string> = {
  ff: "\ufb00",
  fi: "\ufb01",
  fl: "\ufb02",
  ffi: "\ufb03",
  ffl: "\ufb04",
};

/** Ligature glyphs shown as their letters when editing. */
export function expandLigatures(text: string): string {
  return text
    .replace(/\ufb03/g, "ffi")
    .replace(/\ufb04/g, "ffl")
    .replace(/\ufb00/g, "ff")
    .replace(/\ufb01/g, "fi")
    .replace(/\ufb02/g, "fl");
}

function hex(bytes: number[]): string {
  return `<${bytes.map((b) => b.toString(16).padStart(2, "0")).join("")}>`;
}

/**
 * Encodes `text` with the original font codes. Spaces missing from the font
 * become a TJ adjustment of -250 (a quarter em). Returns the operand text and
 * whether a TJ array was needed; `null` when a character has no code.
 */
export function encodeWithOriginal(
  text: string,
  encoding: OriginalEncoding,
): { operand: string; array: boolean } | null {
  if (encoding.bytesPerCode === 0) return null;
  const segments: string[] = [];
  let current: number[] = [];
  const flush = () => {
    if (current.length) segments.push(hex(current));
    current = [];
  };
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i += 1) {
    let ch = chars[i]!;
    // Prefer a ligature glyph the font already uses for the pair (subset fonts often lack the single letters).
    for (const length of [3, 2]) {
      const group = chars.slice(i, i + length).join("");
      const ligature = LIGATURES[group];
      if (
        group.length === length &&
        ligature &&
        encoding.codes[ligature] !== undefined &&
        encoding.codes[ch] === undefined
      ) {
        ch = ligature;
        i += length - 1;
        break;
      }
    }
    const code = encoding.codes[ch];
    if (code === undefined) {
      if (ch === " ") {
        flush();
        segments.push("-250");
        continue;
      }
      return null;
    }
    if (encoding.bytesPerCode === 2) current.push((code >> 8) & 0xff, code & 0xff);
    else current.push(code & 0xff);
  }
  flush();
  if (segments.length === 0) return { operand: "<>", array: false };
  if (segments.length === 1 && !segments[0]!.startsWith("-"))
    return { operand: segments[0]!, array: false };
  return { operand: `[${segments.join(" ")}]`, array: true };
}

/** Prefix reproducing the line move of `'` and `"` when they are rewritten as Tj/TJ. */
function lineMovePrefix(raw: RawTextOp): string {
  if (raw.op.op === "'") return "T* ";
  if (raw.op.op === '"') {
    const [aw, ac] = raw.op.operands;
    const w = aw?.type === "number" ? aw.value : 0;
    const c = ac?.type === "number" ? ac.value : 0;
    return `${w} Tw ${c} Tc T* `;
  }
  return "";
}

function fallbackKey(hint: FallbackFontHint): string {
  return `${hint.family}-${hint.bold ? "b" : ""}${hint.italic ? "i" : ""}`;
}

export interface ApplyTextEditsResult {
  bytes: Uint8Array;
  report: TextEditReport;
}

/**
 * Rewrites the pages touched by `edits` and returns the new document bytes.
 * Edits that cannot be applied safely are listed in the report, never
 * approximated silently.
 */
export async function applyTextEdits(
  bytes: Uint8Array,
  edits: TextEdit[],
): Promise<ApplyTextEditsResult> {
  const report: TextEditReport = {
    applied: 0,
    fontReplaced: 0,
    replacedCharacters: 0,
    skipped: [],
  };
  if (edits.length === 0) return { bytes, report };
  const doc = await loadPdfDocument(bytes);
  const fonts = new Map<string, PDFFont>();
  const getFont = async (hint: FallbackFontHint): Promise<PDFFont> => {
    const key = fallbackKey(hint);
    let font = fonts.get(key);
    if (!font) {
      font = await doc.embedFont(
        resolveStandardFont(hint.family, { bold: hint.bold, italic: hint.italic }),
      );
      fonts.set(key, font);
    }
    return font;
  };

  const byPage = new Map<number, TextEdit[]>();
  for (const edit of edits)
    byPage.set(edit.pageIndex, [...(byPage.get(edit.pageIndex) ?? []), edit]);

  for (const [pageIndex, pageEdits] of byPage) {
    const page = doc.getPage(pageIndex);
    const content = pageContentBytes(doc, page);
    const textOps = collectTextOps(content);
    const replacements: { start: number; end: number; bytes: Uint8Array }[] = [];
    const fontKeys = new Map<string, string>();
    const seen = new Set<number>();
    for (const edit of pageEdits) {
      // Fragments merged into this run disappear with it (their advance only mattered inside the line).
      for (const extra of edit.removeOps ?? []) {
        const raw = textOps[extra];
        if (!raw || seen.has(extra)) continue;
        seen.add(extra);
        replacements.push({ start: raw.op.start, end: raw.op.end, bytes: new Uint8Array() });
      }
      if (seen.has(edit.opIndex)) {
        report.skipped.push({
          pageIndex,
          opIndex: edit.opIndex,
          reason: tr("modification en double"),
        });
        continue;
      }
      const raw = textOps[edit.opIndex];
      if (!raw) {
        report.skipped.push({
          pageIndex,
          opIndex: edit.opIndex,
          reason: tr("opérateur de texte introuvable"),
        });
        continue;
      }
      seen.add(edit.opIndex);
      const text = edit.text.replace(/[\r\n]+/g, " ");
      const prefix = lineMovePrefix(raw);
      const original = encodeWithOriginal(text, edit.original);
      let replacement: string;
      if (original) {
        replacement = `${prefix}${original.operand} ${original.array ? "TJ" : "Tj"}`;
      } else {
        if (raw.fontName === null || raw.fontSize === null) {
          report.skipped.push({
            pageIndex,
            opIndex: edit.opIndex,
            reason: tr("police d'origine inconnue, remplacement impossible"),
          });
          continue;
        }
        const font = await getFont(edit.fallback);
        const key = fallbackKey(edit.fallback);
        let resourceName = fontKeys.get(key);
        if (!resourceName) {
          resourceName = page.node.newFontDictionary("OutiliaTexte", font.ref).asString().slice(1);
          fontKeys.set(key, resourceName);
        }
        const sanitized = sanitizeForStandardFont(text);
        if (sanitized.replaced)
          report.replacedCharacters += Array.from(text).filter(
            (c, i) => Array.from(sanitized.text)[i] === "?" && c !== "?",
          ).length;
        const encoded = font.encodeText(sanitized.text).toString();
        const origName = PDFName.of(raw.fontName).toString();
        replacement = `${prefix}/${resourceName} ${raw.fontSize} Tf ${encoded} Tj ${origName} ${raw.fontSize} Tf`;
        report.fontReplaced += 1;
      }
      if (edit.visual) {
        // Visual rewrite of a recognised (invisible) run: repaint the box with the
        // sampled background and show the new text; the user asked for it explicitly.
        const n = (v: number) => (Math.round(v * 100) / 100).toString();
        const [p0, ...rest] = edit.visual.polygon;
        if (p0 && rest.length >= 2) {
          const path = `${n(p0.x)} ${n(p0.y)} m ${rest.map((p) => `${n(p.x)} ${n(p.y)} l`).join(" ")} h f`;
          const { r, g, b } = edit.visual.fill;
          replacement = `ET q ${n(r)} ${n(g)} ${n(b)} rg ${path} Q BT ${restoreTextState(raw)} 0 Tr ${replacement} 3 Tr`;
        }
      }
      replacements.push({ start: raw.op.start, end: raw.op.end, bytes: fromLatin1(replacement) });
      report.applied += 1;
    }
    if (replacements.length === 0) continue;
    const rewritten = spliceBytes(content, replacements);
    const stream = doc.context.flateStream(rewritten);
    page.node.set(PDFName.of("Contents"), doc.context.register(stream));
  }
  const out = await savePdfDocument(doc);
  return { bytes: out, report };
}
