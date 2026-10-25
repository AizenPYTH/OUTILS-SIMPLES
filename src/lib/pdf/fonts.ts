import { StandardFonts } from "pdf-lib";

export type FontFamily = "helvetica" | "times" | "courier";

export interface FontStyle {
  bold: boolean;
  italic: boolean;
}

export const fontFamilies: { id: FontFamily; label: string; css: string }[] = [
  { id: "helvetica", label: "Helvetica (sans-serif)", css: "Helvetica, Arial, sans-serif" },
  { id: "times", label: "Times (serif)", css: "'Times New Roman', Times, serif" },
  { id: "courier", label: "Courier (monospace)", css: "'Courier New', Courier, monospace" },
];

/** Maps family + style to one of the 14 standard PDF fonts (no embedding needed). */
export function resolveStandardFont(family: FontFamily, style: FontStyle): StandardFonts {
  const { bold, italic } = style;
  switch (family) {
    case "times":
      if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
      if (bold) return StandardFonts.TimesRomanBold;
      if (italic) return StandardFonts.TimesRomanItalic;
      return StandardFonts.TimesRoman;
    case "courier":
      if (bold && italic) return StandardFonts.CourierBoldOblique;
      if (bold) return StandardFonts.CourierBold;
      if (italic) return StandardFonts.CourierOblique;
      return StandardFonts.Courier;
    case "helvetica":
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
  let replaced = false;
  const out = Array.from(text)
    .map((ch) => {
      if (ch === "\n" || ch === "\t") return ch;
      const code = ch.codePointAt(0) ?? 0;
      if (isWinAnsi(code)) return ch;
      replaced = true;
      return "?";
    })
    .join("");
  return { text: out, replaced };
}

const WIN_ANSI_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017d, 0x2018,
  0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

function isWinAnsi(code: number): boolean {
  if (code >= 0x20 && code <= 0x7e) return true;
  if (code >= 0xa0 && code <= 0xff) return true;
  return WIN_ANSI_EXTRA.has(code);
}
