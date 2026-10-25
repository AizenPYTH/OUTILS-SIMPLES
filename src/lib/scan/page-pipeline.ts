/**
 * Scanner page processing: crop → rotation → filter → brightness/contrast,
 * from a decoded bitmap to an encoded blob. Browser only (canvas).
 */
import { adjustBrightnessContrast, documentFilter, toBlackAndWhite, toGrayscale, type RgbaImage } from "@/lib/images/pixels";
import { createCanvas, context2d, cropCanvas, drawToCanvas, encodeCanvas, getRgba, putRgba, releaseCanvas, resizeCanvas, rotateFlipCanvas } from "@/lib/images/canvas";
import type { CropRect } from "@/lib/images/types";
import { warpPerspective, quadOutputSize, type Quad } from "./geometry";

export type ScanFilter = "color" | "document" | "gray" | "bw";

export interface ScanPageSettings {
  crop: CropRect | null;
  /** Perspective quad in source pixels (takes precedence over crop when set). */
  quad: Quad | null;
  rotation: 0 | 90 | 180 | 270;
  filter: ScanFilter;
  brightness: number;
  contrast: number;
}

export const defaultScanSettings: ScanPageSettings = { crop: null, quad: null, rotation: 0, filter: "document", brightness: 0, contrast: 10 };

/** Longest side kept for processing (memory bound on phones). */
export const SCAN_MAX_DIMENSION = 2400;

export function applyFilter(img: RgbaImage, filter: ScanFilter): RgbaImage {
  switch (filter) {
    case "document":
      return documentFilter(img, Math.max(12, Math.round(Math.max(img.width, img.height) / 60)), 1.15);
    case "gray":
      return toGrayscale(img);
    case "bw":
      return toBlackAndWhite(img);
    default:
      return img;
  }
}

/** Renders a page with its settings into a canvas; caller releases it. */
export function renderScanPage(bitmap: ImageBitmap, settings: ScanPageSettings, maxDimension = SCAN_MAX_DIMENSION): HTMLCanvasElement {
  // Downscale first so every later step is bounded.
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  let canvas = scale < 1 ? resizeCanvas(bitmap, Math.round(bitmap.width * scale), Math.round(bitmap.height * scale)) : drawToCanvas(bitmap, bitmap.width, bitmap.height);
  const s = scale;
  if (settings.quad) {
    const quad = settings.quad.map((p) => ({ x: p.x * s, y: p.y * s })) as Quad;
    const out = quadOutputSize(quad, maxDimension);
    const warped = warpPerspective(getRgba(canvas), quad, out);
    releaseCanvas(canvas);
    canvas = putRgba(warped);
  } else if (settings.crop) {
    const crop = { x: Math.round(settings.crop.x * s), y: Math.round(settings.crop.y * s), width: Math.round(settings.crop.width * s), height: Math.round(settings.crop.height * s) };
    const cropped = cropCanvas(canvas, crop);
    releaseCanvas(canvas);
    canvas = cropped;
  }
  if (settings.rotation !== 0) {
    const rotated = rotateFlipCanvas(canvas, settings.rotation);
    releaseCanvas(canvas);
    canvas = rotated;
  }
  if (settings.filter !== "color" || settings.brightness !== 0 || settings.contrast !== 0) {
    let img = getRgba(canvas);
    img = applyFilter(img, settings.filter);
    if (settings.brightness !== 0 || settings.contrast !== 0) img = adjustBrightnessContrast(img, settings.brightness, settings.contrast);
    const ctx = context2d(canvas);
    ctx.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0);
  }
  return canvas;
}

export async function encodeScanPage(canvas: HTMLCanvasElement, format: "image/jpeg" | "image/png", quality = 0.88): Promise<Uint8Array> {
  const { blob } = await encodeCanvas(canvas, format, quality);
  return new Uint8Array(await blob.arrayBuffer());
}

/** Small preview canvas for thumbnails/preview panes. */
export function previewCanvas(bitmap: ImageBitmap, settings: ScanPageSettings, maxDimension: number): HTMLCanvasElement {
  return renderScanPage(bitmap, settings, maxDimension);
}

export function emptyCanvas(): HTMLCanvasElement {
  return createCanvas(1, 1);
}
