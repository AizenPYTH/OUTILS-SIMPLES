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
  for (const op of ops) {
    switch (op.op) {
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
          result.push({
            index: result.length,
            op,
            fontName: font.name,
            fontSize: font.size,
            stringBytes,
            stringCount,
          });
        }
    }
  }
  return result;
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
  for (const ch of Array.from(text)) {
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
      if (seen.has(edit.opIndex)) {
        report.skipped.push({ pageIndex, opIndex: edit.opIndex, reason: "modification en double" });
        continue;
      }
      const raw = textOps[edit.opIndex];
      if (!raw) {
        report.skipped.push({
          pageIndex,
          opIndex: edit.opIndex,
          reason: "opérateur de texte introuvable",
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
            reason: "police d'origine inconnue, remplacement impossible",
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
