/**
 * Loading and embedding of the palette fonts (see fonts.ts). The font files
 * live in /public/fonts; in the browser they are fetched on demand, in tests a
 * Node loader is installed with `setFontLoader`. fontkit (~250 KB) is loaded
 * only when an embedded family is actually exported.
 */
import type { PDFDocument, PDFFont } from "pdf-lib";
import {
  fontInfo,
  isWinAnsi,
  resolveStandardFont,
  sanitizeWith,
  styleFor,
  styleKey,
  type FontFamily,
  type FontStyle,
} from "./fonts";

export const FONT_ASSET_BASE = "/fonts/";

type FontLoader = (file: string) => Promise<Uint8Array>;

let loader: FontLoader = async (file) => {
  const response = await fetch(`${FONT_ASSET_BASE}${file}`);
  if (!response.ok) throw new Error(`Police introuvable : ${file} (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
};
const bytesCache = new Map<string, Promise<Uint8Array>>();

/** Replaces the loader (tests read the files from disk). */
export function setFontLoader(next: FontLoader): void {
  loader = next;
  bytesCache.clear();
}

/** File name of the face used for a family + style (after fallback), or null for standard fonts. */
export function fontFileFor(family: FontFamily, style: FontStyle): string | null {
  const info = fontInfo(family);
  if (info.kind === "standard") return null;
  const effective = styleFor(family, style);
  return info.files?.[styleKey(effective)] ?? info.files?.regular ?? null;
}

export function loadFontBytes(file: string): Promise<Uint8Array> {
  let pending = bytesCache.get(file);
  if (!pending) {
    pending = loader(file);
    bytesCache.set(file, pending);
  }
  return pending;
}

type Fontkit = Parameters<PDFDocument["registerFontkit"]>[0] & {
  create: (bytes: Uint8Array) => { hasGlyphForCodePoint: (code: number) => boolean };
};
let fontkitPromise: Promise<Fontkit> | null = null;
function loadFontkit(): Promise<Fontkit> {
  if (!fontkitPromise)
    fontkitPromise = import("@pdf-lib/fontkit").then(
      (m) => ((m as { default?: unknown }).default ?? m) as Fontkit,
    );
  return fontkitPromise;
}

const registered = new WeakSet<PDFDocument>();

/**
 * Embeds the face for a family + style in the document: a standard font, or
 * the palette file subset to the glyphs used. One call per (document, face)
 * is enough; callers cache the result.
 */
export async function embedFamilyFont(
  doc: PDFDocument,
  family: FontFamily,
  style: FontStyle,
): Promise<PDFFont> {
  const file = fontFileFor(family, style);
  if (!file) return doc.embedFont(resolveStandardFont(family, style));
  const fontkit = await loadFontkit();
  if (!registered.has(doc)) {
    doc.registerFontkit(fontkit);
    registered.add(doc);
  }
  return doc.embedFont(await loadFontBytes(file), { subset: true });
}

/** Predicate telling whether a code point can be drawn with the face. */
export async function glyphSupport(
  family: FontFamily,
  style: FontStyle,
): Promise<(code: number) => boolean> {
  const file = fontFileFor(family, style);
  if (!file) return isWinAnsi;
  const fontkit = await loadFontkit();
  const font = fontkit.create(await loadFontBytes(file));
  return (code) => font.hasGlyphForCodePoint(code);
}

/** Replaces characters the face cannot draw by "?" and says whether it happened. */
export async function sanitizeForFamily(
  text: string,
  family: FontFamily,
  style: FontStyle,
): Promise<{ text: string; replaced: boolean }> {
  return sanitizeWith(text, await glyphSupport(family, style));
}

const facesLoaded = new Set<FontFamily>();

/**
 * Registers the family's faces for on-screen rendering (FontFace API) and
 * waits for them, so canvas measurements and the editor use the real font.
 * No-op for standard fonts and outside the browser.
 */
export async function ensureFontFace(family: FontFamily): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const info = fontInfo(family);
  if (info.kind === "standard" || !info.files) return;
  const cssName = info.css.split(",")[0]!.replace(/^['"]|['"]$/g, "");
  if (!facesLoaded.has(family)) {
    facesLoaded.add(family);
    const styles: [keyof NonNullable<typeof info.files>, string, string][] = [
      ["regular", "400", "normal"],
      ["bold", "700", "normal"],
      ["italic", "400", "italic"],
      ["boldItalic", "700", "italic"],
    ];
    for (const [key, weight, fontStyle] of styles) {
      const file = info.files[key];
      if (!file) continue;
      const face = new FontFace(cssName, `url(${FONT_ASSET_BASE}${file})`, {
        weight,
        style: fontStyle,
      });
      document.fonts.add(face);
    }
  }
  await Promise.all([
    document.fonts.load(`400 16px "${cssName}"`),
    document.fonts.load(`700 16px "${cssName}"`),
    document.fonts.load(`italic 400 16px "${cssName}"`),
  ]).catch(() => undefined);
}
