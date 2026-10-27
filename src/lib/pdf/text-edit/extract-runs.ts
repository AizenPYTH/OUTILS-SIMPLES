/**
 * Finds the text runs of a page as the editor needs them: one run per
 * page-level text-showing operator, with its decoded text, position and size
 * in PDF user space, and the character codes its font uses (so the run can be
 * re-encoded with the same font).
 *
 * Positions are computed by replaying the pdf.js operator list with the
 * standard text-space maths (ISO 32000-1 §9.4.4); the raw content stream is
 * tokenised in parallel so the n-th pdf.js `showText` can be matched to the
 * n-th raw `Tj`/`TJ`/`'`/`"`. When the two disagree the page is declared not
 * editable rather than guessed.
 *
 * Browser only (pdf.js).
 */
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdfJs } from "../browser/pdfjs";
import type { FontFamily } from "../fonts";
import { collectTextOps, expandLigatures } from "./apply";
import { glyphNameToUnicode } from "./glyph-names";
import type { FallbackFontHint, OriginalEncoding, PageTextStatus, TextRun } from "./types";
import { tr } from "@/lib/i18n/messages";

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** Row-vector convention: apply `a` first, then `b`. */
function mul(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4],
    a[4] * b[1] + a[5] * b[3] + b[5],
  ];
}

function translate(x: number, y: number): Matrix {
  return [1, 0, 0, 1, x, y];
}

/**
 * pdf.js passes `cm` as six numbers but `Tm` as one Float32Array (and may
 * change either); accept both shapes.
 */
function matrixArgs(args: unknown[]): Matrix {
  const first = args[0];
  const values =
    args.length === 1 && (Array.isArray(first) || ArrayBuffer.isView(first))
      ? Array.from(first as ArrayLike<number>)
      : (args as number[]);
  const m = values.slice(0, 6).map((v) => Number(v));
  while (m.length < 6) m.push(0);
  return m as Matrix;
}

interface Glyph {
  unicode?: string;
  width?: number;
  isSpace?: boolean;
  originalCharCode?: number;
}

interface FontLike {
  fontMatrix?: number[] | null;
  isType3Font?: boolean;
  vertical?: boolean;
  bold?: boolean;
  italic?: boolean;
  black?: boolean;
  fallbackName?: string;
  /** With `fontExtraProperties`: glyph names by code for simple fonts, and the /Differences. */
  defaultEncoding?: (string | undefined)[];
  differences?: (string | undefined)[] | Record<number, string>;
  name?: string;
}

/**
 * Completes an encoding with every character the font's /Encoding names, so a
 * character not yet seen on the page (an « è » in a page without any) can
 * still use the original font. Only for fonts that are not subsets (a subset
 * prefix such as `ABCDEF+` means unlisted glyphs are missing from the font
 * program and would render as nothing).
 */
export function extendWithEncoding(encoding: OriginalEncoding, font: FontLike | null): void {
  if (!font?.defaultEncoding || encoding.bytesPerCode !== 1) return;
  if (font.name && /^[A-Z]{6}\+/.test(font.name)) return;
  for (let code = 0; code < 256; code += 1) {
    const diff = font.differences
      ? (font.differences as Record<number, string | undefined>)[code]
      : undefined;
    const unicode = glyphNameToUnicode(diff ?? font.defaultEncoding[code]);
    if (unicode && encoding.codes[unicode] === undefined) encoding.codes[unicode] = code;
  }
}

interface TextState {
  font: string | null;
  size: number;
  charSpacing: number;
  wordSpacing: number;
  hScale: number;
  leading: number;
  rise: number;
  renderMode: number;
}

function fallbackFor(font: FontLike | null): FallbackFontHint {
  const name = font?.fallbackName ?? "";
  const family: FontFamily = name.includes("monospace")
    ? "courier"
    : name.includes("serif") && !name.includes("sans")
      ? "times"
      : "helvetica";
  return { family, bold: !!(font?.bold || font?.black), italic: !!font?.italic };
}

const IMAGE_OPS = [
  "paintImageXObject",
  "paintInlineImageXObject",
  "paintImageMaskXObject",
  "paintJpegXObject",
  "paintImageXObjectRepeat",
  "paintImageMaskXObjectRepeat",
  "paintImageMaskXObjectGroup",
];

export async function extractTextRuns(
  doc: PDFDocumentProxy,
  pageIndex: number,
  content: Uint8Array,
): Promise<PageTextStatus> {
  const pdfjs = await loadPdfJs();
  const OPS = pdfjs.OPS as unknown as Record<string, number>;
  const page = await doc.getPage(pageIndex + 1);
  const list = await page.getOperatorList({ annotationMode: pdfjs.AnnotationMode.DISABLE });
  const rawOps = collectTextOps(content);

  let ctm: Matrix = IDENTITY;
  let tm: Matrix = IDENTITY;
  let tlm: Matrix = IDENTITY;
  let text: TextState = {
    font: null,
    size: 0,
    charSpacing: 0,
    wordSpacing: 0,
    hScale: 1,
    leading: 0,
    rise: 0,
    renderMode: 0,
  };
  const stack: { ctm: Matrix; text: TextState }[] = [];
  let depth = 0;
  let hasImages = false;
  const encodings = new Map<string, OriginalEncoding>();
  const runs: TextRun[] = [];
  let shown = 0;

  const fontObject = (name: string | null): FontLike | null => {
    if (!name) return null;
    try {
      return page.commonObjs.has(name) ? (page.commonObjs.get(name) as FontLike) : null;
    } catch {
      return null;
    }
  };

  for (let i = 0; i < list.fnArray.length; i += 1) {
    const fn = list.fnArray[i]!;
    const args = (list.argsArray[i] ?? []) as unknown[];
    if (fn === OPS.paintFormXObjectBegin || fn === OPS.beginAnnotation) {
      depth += 1;
      continue;
    }
    if (fn === OPS.paintFormXObjectEnd || fn === OPS.endAnnotation) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (IMAGE_OPS.some((name) => OPS[name] === fn)) hasImages = true;
    if (depth > 0) continue;
    switch (fn) {
      case OPS.save:
        stack.push({ ctm, text: { ...text } });
        break;
      case OPS.restore: {
        const saved = stack.pop();
        if (saved) {
          ctm = saved.ctm;
          text = saved.text;
        }
        break;
      }
      case OPS.transform:
        ctm = mul(matrixArgs(args), ctm);
        break;
      case OPS.beginText:
        tm = IDENTITY;
        tlm = IDENTITY;
        break;
      case OPS.setCharSpacing:
        text.charSpacing = Number(args[0]) || 0;
        break;
      case OPS.setWordSpacing:
        text.wordSpacing = Number(args[0]) || 0;
        break;
      case OPS.setHScale:
        text.hScale = (Number(args[0]) || 100) / 100;
        break;
      case OPS.setLeading:
        text.leading = Number(args[0]) || 0;
        break;
      case OPS.setFont:
        text.font = String(args[0]);
        text.size = Number(args[1]) || 0;
        break;
      case OPS.setTextRenderingMode:
        text.renderMode = Number(args[0]) || 0;
        break;
      case OPS.setTextRise:
        text.rise = Number(args[0]) || 0;
        break;
      case OPS.moveText:
        tlm = mul(translate(Number(args[0]) || 0, Number(args[1]) || 0), tlm);
        tm = tlm;
        break;
      case OPS.setLeadingMoveText:
        text.leading = -(Number(args[1]) || 0);
        tlm = mul(translate(Number(args[0]) || 0, Number(args[1]) || 0), tlm);
        tm = tlm;
        break;
      case OPS.setTextMatrix:
        tlm = matrixArgs(args);
        tm = tlm;
        break;
      case OPS.nextLine:
        tlm = mul(translate(0, -text.leading), tlm);
        tm = tlm;
        break;
      case OPS.showText: {
        const glyphs = (args[0] ?? []) as (Glyph | number)[];
        const raw = rawOps[shown];
        const opIndex = shown;
        shown += 1;
        const font = fontObject(text.font);
        const fontMatrix0 = font?.fontMatrix?.[0] ?? 0.001;
        const size = text.size;
        const key = text.font ?? "?";
        let encoding = encodings.get(key);
        if (!encoding) {
          encoding = { codes: {}, bytesPerCode: 0 };
          encodings.set(key, encoding);
        }
        let advance = 0;
        let str = "";
        let glyphCount = 0;
        for (const g of glyphs) {
          if (typeof g === "number") {
            advance += (-g / 1000) * size * text.hScale;
            // A large negative adjustment is how many producers encode a word space.
            if (g < -150 && str.length > 0 && !str.endsWith(" ")) str += " ";
            continue;
          }
          glyphCount += 1;
          const w0 = (g.width ?? 0) * fontMatrix0;
          advance +=
            (w0 * size + text.charSpacing + (g.isSpace ? text.wordSpacing : 0)) * text.hScale;
          const unicode = g.unicode ?? "";
          str += unicode;
          if (unicode && g.originalCharCode !== undefined && encoding.codes[unicode] === undefined)
            encoding.codes[unicode] = g.originalCharCode;
        }
        if (raw) {
          const bytesPerCode: 0 | 1 | 2 =
            raw.stringBytes === glyphCount ? 1 : raw.stringBytes === glyphCount * 2 ? 2 : 0;
          if (encoding.bytesPerCode === 0 && glyphCount > 0) encoding.bytesPerCode = bytesPerCode;
          else if (bytesPerCode !== encoding.bytesPerCode && glyphCount > 0)
            encoding.bytesPerCode = 0;
        }
        const m = mul(tm, ctm);
        const scale = Math.hypot(m[0], m[1]);
        const origin = mul(translate(0, text.rise), m);
        const fontSize = Math.abs(size) * scale;
        const invisible = text.renderMode === 3 || text.renderMode === 7;
        let reason: string | undefined;
        if (!raw) reason = tr("désynchronisation avec le flux de contenu");
        else if (invisible && font?.isType3Font) reason = tr("Police Type 3 : non modifiable.");
        else if (font?.isType3Font)
          reason = tr("Police Type 3 (glyphes dessinés) : non modifiable.");
        else if (font?.vertical) reason = tr("Écriture verticale : non prise en charge.");
        else if (fontSize < 0.5 || str.trim().length === 0) reason = tr("Passage vide.");
        runs.push({
          id: `run-${pageIndex}-${opIndex}`,
          pageIndex,
          opIndex,
          extraOps: [],
          text: str,
          x: origin[4],
          y: origin[5],
          width: Math.max(advance * scale, fontSize * 0.3),
          height: fontSize,
          fontSize,
          angle: (Math.atan2(m[1], m[0]) * 180) / Math.PI,
          editable: reason === undefined,
          reason,
          original: encoding,
          fallback: fallbackFor(font),
          fontUsable: !font?.isType3Font && !font?.vertical,
          kind: invisible ? "ocr" : "native",
        });
        tm = mul(translate(advance, 0), tm);
        break;
      }
      default:
        break;
    }
  }

  const fontsByKey = new Map<string, FontLike | null>();
  for (const key of encodings.keys()) fontsByKey.set(key, fontObject(key === "?" ? null : key));
  for (const [key, encoding] of encodings)
    extendWithEncoding(encoding, fontsByKey.get(key) ?? null);

  if (shown !== rawOps.length) {
    return {
      kind: "mismatch",
      runs: [],
      detail: tr("{shown} passages rendus pour {total} opérateurs de texte", {
        shown,
        total: rawOps.length,
      }),
    };
  }
  if (runs.length === 0)
    return hasImages ? { kind: "scanned", runs: [] } : { kind: "empty", runs: [] };
  const merged = mergeFragments(
    runs,
    rawOps.map((r) => r.nextIsPositioned),
  );
  return { kind: "ok", runs: merged };
}

/**
 * Producers split one line into many operators (kerning pairs, ligatures,
 * font-hinting runs). Consecutive runs sharing font, size, direction and
 * baseline, with no positioning operator between them, are merged into one
 * editable run; the extra operators are removed when the run is edited.
 */
export function mergeFragments(runs: TextRun[], nextIsPositioned: boolean[]): TextRun[] {
  const out: TextRun[] = [];
  for (const run of runs) {
    const prev = out[out.length - 1];
    if (prev && canMerge(prev, run) && !nextIsPositioned[prev.opIndex + prev.extraOps.length]) {
      const rad = (prev.angle * Math.PI) / 180;
      const d = { x: Math.cos(rad), y: Math.sin(rad) };
      const along = (run.x - prev.x) * d.x + (run.y - prev.y) * d.y;
      const gap = along - prev.width;
      const space =
        gap > prev.fontSize * 0.12 && !prev.text.endsWith(" ") && !run.text.startsWith(" ")
          ? " "
          : "";
      prev.text = expandLigatures(prev.text + space + run.text);
      prev.width = Math.max(prev.width, along + run.width);
      prev.extraOps.push(run.opIndex);
      prev.editable = prev.editable && run.editable;
      prev.reason = prev.reason ?? run.reason;
      continue;
    }
    out.push({ ...run, text: expandLigatures(run.text), extraOps: [...run.extraOps] });
  }
  return out;
}

function canMerge(a: TextRun, b: TextRun): boolean {
  if (b.opIndex !== a.opIndex + a.extraOps.length + 1) return false;
  if (a.original !== b.original) return false; // same font object
  if (a.kind !== b.kind) return false;
  if (Math.abs(a.fontSize - b.fontSize) > 0.05 * a.fontSize) return false;
  if (Math.abs(a.angle - b.angle) > 0.5) return false;
  const rad = (a.angle * Math.PI) / 180;
  const n = { x: -Math.sin(rad), y: Math.cos(rad) };
  const d = { x: Math.cos(rad), y: Math.sin(rad) };
  const across = (b.x - a.x) * n.x + (b.y - a.y) * n.y;
  if (Math.abs(across) > 0.15 * a.fontSize) return false;
  const along = (b.x - a.x) * d.x + (b.y - a.y) * d.y;
  const gap = along - a.width;
  return gap > -0.5 * a.fontSize && gap < 1.2 * a.fontSize;
}
