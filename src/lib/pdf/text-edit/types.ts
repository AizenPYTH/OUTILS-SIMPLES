import type { FontFamily } from "../fonts";

/** Hint for the replacement font when the original font cannot encode the new text. */
export interface FallbackFontHint {
  family: FontFamily;
  bold: boolean;
  italic: boolean;
}

/**
 * How a text-showing operator can be re-encoded with its original font:
 * unicode → character code, as observed on the page, and the code width in
 * bytes (1 for simple fonts, 2 for Identity-encoded composite fonts, 0 when
 * the width could not be established).
 */
export interface OriginalEncoding {
  codes: Record<string, number>;
  bytesPerCode: 0 | 1 | 2;
}

/** One edit: the n-th page-level text-showing operator of a page gets a new string. */
export interface TextEdit {
  pageIndex: number;
  /** Index among the page-level text-showing operators (Tj, TJ, ', ") of the page. */
  opIndex: number;
  /** Further operators of the same run (kerning or ligature fragments) removed with the edit. */
  removeOps?: number[];
  text: string;
  /**
   * For an OCR (invisible) run: paint the box with `fill` and draw the new text
   * visibly in a standard font. Without it, an OCR edit only corrects the
   * invisible layer (search and copy), the image stays as it is.
   */
  visual?: {
    /** Four corners of the run's box in PDF user space, painted with `fill` before the text. */
    polygon: { x: number; y: number }[];
    fill: { r: number; g: number; b: number };
  };
  original: OriginalEncoding;
  fallback: FallbackFontHint;
}

export interface TextEditReport {
  applied: number;
  /** Edits drawn with a standard font because the original font lacked a glyph. */
  fontReplaced: number;
  /** Characters replaced by "?" (outside WinAnsi) in fallback-font edits. */
  replacedCharacters: number;
  skipped: { pageIndex: number; opIndex: number; reason: string }[];
}

/** A text run on a page as the editor sees it, in PDF user space (points). */
export interface TextRun {
  id: string;
  pageIndex: number;
  opIndex: number;
  /** Operators merged into this run after the first one (same line, font and size). */
  extraOps: number[];
  text: string;
  /** Baseline origin. */
  x: number;
  y: number;
  /** Advance width along the baseline and nominal height (≈ font size). */
  width: number;
  height: number;
  /** Font size in user space (after text and current transformation matrices). */
  fontSize: number;
  /** Baseline angle in degrees (0 = horizontal, counter-clockwise positive). */
  angle: number;
  editable: boolean;
  /** Why it cannot be edited, in French, when `editable` is false. */
  reason?: string;
  original: OriginalEncoding;
  fallback: FallbackFontHint;
  /** Whether the original font is Type3, vertical or missing (fallback font forced). */
  fontUsable: boolean;
  /** "ocr": invisible text (rendering mode 3/7), the layer of a recognised scan. */
  kind: "native" | "ocr";
}

export type PageTextStatus =
  | { kind: "ok"; runs: TextRun[] }
  /** No text-showing operator but images: most likely a scan. */
  | { kind: "scanned"; runs: [] }
  | { kind: "empty"; runs: [] }
  /** pdf.js and the raw stream disagree: editing would be unsafe. */
  | { kind: "mismatch"; runs: []; detail: string };
