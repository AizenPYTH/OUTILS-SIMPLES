import { loadPdfDocument, savePdfDocument } from "../load";
import { stripMetadata } from "./metadata";

export interface RasterizedPage {
  pageIndex: number;
  bytes: Uint8Array;
  mimeType: "image/jpeg" | "image/png";
}

/** Axis-aligned rectangle in "visual points" (origin top-left, page rotation applied). */
export interface RedactionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReplaceOptions {
  /** Remove Info/XMP metadata from the result (default true: a redacted file should not leak its history). */
  stripMetadata?: boolean;
}

/**
 * Real redaction: every page that received black boxes is replaced by a
 * rasterised image of itself (drawn by the caller with the boxes painted).
 * The original text, vectors and annotations of those pages are therefore
 * gone from the file, not just covered. Untouched pages are kept as they are.
 */
export async function replacePagesWithImages(
  bytes: Uint8Array,
  rasterized: RasterizedPage[],
  options: ReplaceOptions = {},
): Promise<Uint8Array> {
  const doc = await loadPdfDocument(bytes);
  const byIndex = new Map(rasterized.map((r) => [r.pageIndex, r]));
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i += 1) {
    const raster = byIndex.get(i);
    if (!raster) continue;
    const original = pages[i]!;
    const { width, height } = original.getSize();
    const angle = ((original.getRotation().angle % 360) + 360) % 360;
    const visual =
      angle === 90 || angle === 270 ? { width: height, height: width } : { width, height };
    const image =
      raster.mimeType === "image/png"
        ? await doc.embedPng(raster.bytes)
        : await doc.embedJpg(raster.bytes);
    const page = doc.insertPage(i, [visual.width, visual.height]);
    page.drawImage(image, { x: 0, y: 0, width: visual.width, height: visual.height });
    doc.removePage(i + 1);
  }
  const saved = await savePdfDocument(doc);
  return options.stripMetadata === false ? saved : stripMetadata(saved);
}

/** Converts rectangles expressed at one render scale to another (pixels ↔ points). */
export function scaleRect(rect: RedactionRect, factor: number): RedactionRect {
  return {
    x: rect.x * factor,
    y: rect.y * factor,
    width: rect.width * factor,
    height: rect.height * factor,
  };
}

/** Normalises a drag (any two corners) into a positive rectangle, dropping tiny ones. */
export function normalizeRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minSize = 3,
): RedactionRect | null {
  const rect = {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
  return rect.width < minSize || rect.height < minSize ? null : rect;
}

/** Grows a rectangle by a padding and clamps it inside the page. */
export function padRect(
  rect: RedactionRect,
  padding: number,
  page: { width: number; height: number },
): RedactionRect {
  const x = Math.max(0, rect.x - padding);
  const y = Math.max(0, rect.y - padding);
  return {
    x,
    y,
    width: Math.min(page.width - x, rect.width + padding * 2),
    height: Math.min(page.height - y, rect.height + padding * 2),
  };
}
