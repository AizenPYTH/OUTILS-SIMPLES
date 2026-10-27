import { StandardFonts } from "pdf-lib";
import { tr } from "@/lib/i18n/messages";

/**
 * Font palette of the text tools. Three kinds of families:
 * - the standard PDF fonts (Helvetica, Times, Courier): no embedding, WinAnsi only;
 * - open-source fonts shipped in /public/fonts and embedded (subset) at export
 *   with fontkit: full Latin coverage (accents, œ, €…), identical on screen and
 *   in the exported file. Licences: public/fonts/LICENSES.md.
 * Nothing is listed that cannot be drawn at export.
 */
export type FontFamily =
  | "helvetica"
  | "times"
  | "courier"
  | "liberation-sans"
  | "liberation-serif"
  | "liberation-mono"
  | "carlito"
  | "caladea"
  | "gelasio"
  | "open-sans"
  | "fira-sans"
  | "dejavu-sans";

export interface FontStyle {
  bold: boolean;
  italic: boolean;
}

export type FontStyleKey = "regular" | "bold" | "italic" | "boldItalic";

export interface FontFamilyInfo {
  id: FontFamily;
  label: string;
  /** CSS font-family stack used on screen (the embedded face comes first). */
  css: string;
  kind: "standard" | "embedded";
  category: "sans" | "serif" | "mono";
  /** Files in /public/fonts by style; a missing style falls back (see `styleFor`). */
  files?: Partial<Record<FontStyleKey, string>>;
  /** Short honest note shown in the picker ("compatible Arial"). */
  note?: string;
  licence: string;
}

export const fontFamilies: FontFamilyInfo[] = [
  {
    id: "helvetica",
    label: "Helvetica",
    css: "Helvetica, Arial, sans-serif",
    kind: "standard",
    category: "sans",
    note: tr("police standard PDF, non incorporée"),
    licence: tr("Police standard PDF"),
  },
  {
    id: "liberation-sans",
    label: "Liberation Sans",
    css: "'Liberation Sans', Arial, sans-serif",
    kind: "embedded",
    category: "sans",
    note: tr("métriques compatibles Arial"),
    licence: "SIL OFL 1.1",
    files: {
      regular: "LiberationSans-Regular.ttf",
      bold: "LiberationSans-Bold.ttf",
      italic: "LiberationSans-Italic.ttf",
      boldItalic: "LiberationSans-BoldItalic.ttf",
    },
  },
  {
    id: "carlito",
    label: "Carlito",
    css: "Carlito, Calibri, sans-serif",
    kind: "embedded",
    category: "sans",
    note: tr("métriques compatibles Calibri"),
    licence: "SIL OFL 1.1",
    files: {
      regular: "Carlito-Regular.ttf",
      bold: "Carlito-Bold.ttf",
      italic: "Carlito-Italic.ttf",
      boldItalic: "Carlito-BoldItalic.ttf",
    },
  },
  {
    id: "open-sans",
    label: "Open Sans",
    css: "'Open Sans', sans-serif",
    kind: "embedded",
    category: "sans",
    note: tr("sans-serif moderne"),
    licence: "SIL OFL 1.1",
    files: {
      regular: "OpenSans-Regular.ttf",
      bold: "OpenSans-Bold.ttf",
      italic: "OpenSans-Italic.ttf",
      boldItalic: "OpenSans-BoldItalic.ttf",
    },
  },
  {
    id: "fira-sans",
    label: "Fira Sans",
    css: "'Fira Sans', 'Trebuchet MS', sans-serif",
    kind: "embedded",
    category: "sans",
    note: tr("sans-serif humaniste (proche de Trebuchet MS)"),
    licence: "SIL OFL 1.1",
    files: {
      regular: "FiraSans-Regular.ttf",
      bold: "FiraSans-Bold.ttf",
      italic: "FiraSans-Italic.ttf",
      boldItalic: "FiraSans-BoldItalic.ttf",
    },
  },
  {
    id: "dejavu-sans",
    label: "DejaVu Sans",
    css: "'DejaVu Sans', Verdana, sans-serif",
    kind: "embedded",
    category: "sans",
    note: tr("large et lisible (proche de Verdana) ; pas d'italique"),
    licence: tr("Bitstream Vera (libre)"),
    files: { regular: "DejaVuSans.ttf", bold: "DejaVuSans-Bold.ttf" },
  },
  {
    id: "times",
    label: "Times",
    css: "'Times New Roman', Times, serif",
    kind: "standard",
    category: "serif",
    note: tr("police standard PDF, non incorporée"),
    licence: tr("Police standard PDF"),
  },
  {
    id: "liberation-serif",
    label: "Liberation Serif",
    css: "'Liberation Serif', 'Times New Roman', serif",
    kind: "embedded",
    category: "serif",
    note: tr("métriques compatibles Times New Roman"),
    licence: "SIL OFL 1.1",
    files: {
      regular: "LiberationSerif-Regular.ttf",
      bold: "LiberationSerif-Bold.ttf",
      italic: "LiberationSerif-Italic.ttf",
      boldItalic: "LiberationSerif-BoldItalic.ttf",
    },
  },
  {
    id: "caladea",
    label: "Caladea",
    css: "Caladea, Cambria, serif",
    kind: "embedded",
    category: "serif",
    note: tr("métriques compatibles Cambria"),
    licence: "SIL OFL 1.1",
    files: {
      regular: "Caladea-Regular.ttf",
      bold: "Caladea-Bold.ttf",
      italic: "Caladea-Italic.ttf",
      boldItalic: "Caladea-BoldItalic.ttf",
    },
  },
  {
    id: "gelasio",
    label: "Gelasio",
    css: "Gelasio, Georgia, serif",
    kind: "embedded",
    category: "serif",
    note: tr("métriques compatibles Georgia"),
    licence: "SIL OFL 1.1",
    files: {
      regular: "Gelasio-Regular.ttf",
      bold: "Gelasio-Bold.ttf",
      italic: "Gelasio-Italic.ttf",
      boldItalic: "Gelasio-BoldItalic.ttf",
    },
  },
  {
    id: "courier",
    label: "Courier",
    css: "'Courier New', Courier, monospace",
    kind: "standard",
    category: "mono",
    note: tr("police standard PDF, non incorporée"),
    licence: tr("Police standard PDF"),
  },
  {
    id: "liberation-mono",
    label: "Liberation Mono",
    css: "'Liberation Mono', 'Courier New', monospace",
    kind: "embedded",
    category: "mono",
    note: tr("métriques compatibles Courier New"),
    licence: "SIL OFL 1.1",
    files: {
      regular: "LiberationMono-Regular.ttf",
      bold: "LiberationMono-Bold.ttf",
      italic: "LiberationMono-Italic.ttf",
      boldItalic: "LiberationMono-BoldItalic.ttf",
    },
  },
];

/** The three families every tool can draw without embedding (stamps, watermarks, Markdown → PDF). */
export const standardFontFamilies = fontFamilies.filter((f) => f.kind === "standard");

export function fontInfo(family: FontFamily): FontFamilyInfo {
  return fontFamilies.find((f) => f.id === family) ?? fontFamilies[0]!;
}

export function styleKey(style: FontStyle): FontStyleKey {
  if (style.bold && style.italic) return "boldItalic";
  if (style.bold) return "bold";
  if (style.italic) return "italic";
  return "regular";
}

/** Whether a family really provides the style (DejaVu Sans has no italic). */
export function hasStyle(family: FontFamily, style: FontStyle): boolean {
  const info = fontInfo(family);
  if (info.kind === "standard") return true;
  return !!info.files?.[styleKey(style)];
}

/** Closest available style of a family (bold italic → bold → regular). */
export function styleFor(family: FontFamily, style: FontStyle): FontStyle {
  const info = fontInfo(family);
  if (info.kind === "standard") return style;
  const files = info.files ?? {};
  if (files[styleKey(style)]) return style;
  if (style.bold && files.bold) return { bold: true, italic: false };
  if (style.italic && files.italic) return { bold: false, italic: true };
  return { bold: false, italic: false };
}

/** Maps family + style to one of the 14 standard PDF fonts (no embedding needed). */
export function resolveStandardFont(family: FontFamily, style: FontStyle): StandardFonts {
  const { bold, italic } = style;
  switch (fontInfo(family).kind === "standard" ? family : fontInfo(family).category) {
    case "times":
    case "serif":
      if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
      if (bold) return StandardFonts.TimesRomanBold;
      if (italic) return StandardFonts.TimesRomanItalic;
      return StandardFonts.TimesRoman;
    case "courier":
    case "mono":
      if (bold && italic) return StandardFonts.CourierBoldOblique;
      if (bold) return StandardFonts.CourierBold;
      if (italic) return StandardFonts.CourierOblique;
      return StandardFonts.Courier;
    case "helvetica":
    case "sans":
    default:
      if (bold && italic) return StandardFonts.HelveticaBoldOblique;
      if (bold) return StandardFonts.HelveticaBold;
      if (italic) return StandardFonts.HelveticaOblique;
      return StandardFonts.Helvetica;
  }
}

/**
 * Standard fonts use WinAnsi encoding. Characters outside it (non-Latin
 * scripts, emojis…) cannot be drawn; they are replaced so export never fails,
 * and the UI warns the user when a replacement happened.
 */
export function sanitizeForStandardFont(text: string): { text: string; replaced: boolean } {
  return sanitizeWith(text, (code) => isWinAnsi(code));
}

/** Replaces every character the predicate rejects by "?" (newlines and tabs kept). */
export function sanitizeWith(
  text: string,
  supports: (code: number) => boolean,
): { text: string; replaced: boolean } {
  let replaced = false;
  const out = Array.from(text)
    .map((ch) => {
      if (ch === "\n" || ch === "\t") return ch;
      const code = ch.codePointAt(0) ?? 0;
      if (supports(code)) return ch;
      replaced = true;
      return "?";
    })
    .join("");
  return { text: out, replaced };
}

const WIN_ANSI_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152,
  0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a,
  0x0153, 0x017e, 0x0178,
]);

export function isWinAnsi(code: number): boolean {
  if (code >= 0x20 && code <= 0x7e) return true;
  if (code >= 0xa0 && code <= 0xff) return true;
  return WIN_ANSI_EXTRA.has(code);
}
