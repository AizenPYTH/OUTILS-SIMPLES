/**
 * Browser-side image operations built on canvas. Every function returns a new
 * canvas or encoded bytes; callers must release object URLs they create.
 */
import type { CropRect, ImageOutputFormat } from "./types";
import type { RgbaImage } from "./pixels";

export interface DecodedImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  /** Detected MIME type (from the file). */
  type: string;
}

export async function decodeImage(file: Blob): Promise<DecodedImage> {
  try {
    const bitmap = await createImageBitmap(file);
    return { bitmap, width: bitmap.width, height: bitmap.height, type: file.type };
  } catch {
    // Fallback through an <img> element (SVG, some AVIF builds).
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Image illisible"));
        el.src = url;
      });
      const bitmap = await createImageBitmap(img);
      return { bitmap, width: bitmap.width, height: bitmap.height, type: file.type };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D indisponible dans ce navigateur.");
  return ctx;
}

export function drawToCanvas(source: CanvasImageSource, width: number, height: number, background?: string): HTMLCanvasElement {
  const canvas = createCanvas(width, height);
  const ctx = context2d(canvas);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** High-quality downscale in steps of at most 2× to avoid aliasing. */
export function resizeCanvas(source: CanvasImageSource & { width: number; height: number }, width: number, height: number): HTMLCanvasElement {
  let current: CanvasImageSource & { width: number; height: number } = source;
  let cw = source.width;
  let ch = source.height;
  while (cw / 2 > width && ch / 2 > height) {
    cw = Math.round(cw / 2);
    ch = Math.round(ch / 2);
    current = drawToCanvas(current, cw, ch);
  }
  return drawToCanvas(current, width, height);
}

export function cropCanvas(source: CanvasImageSource, rect: CropRect): HTMLCanvasElement {
  const canvas = createCanvas(rect.width, rect.height);
  const ctx = context2d(canvas);
  ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  return canvas;
}

export function rotateFlipCanvas(source: CanvasImageSource & { width: number; height: number }, rotation: 0 | 90 | 180 | 270, flipH = false, flipV = false): HTMLCanvasElement {
  const swap = rotation === 90 || rotation === 270;
  const canvas = createCanvas(swap ? source.height : source.width, swap ? source.width : source.height);
  const ctx = context2d(canvas);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

export function getRgba(canvas: HTMLCanvasElement): RgbaImage {
  const ctx = context2d(canvas);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: data.data };
}

export function putRgba(img: RgbaImage): HTMLCanvasElement {
  const canvas = createCanvas(img.width, img.height);
  const ctx = context2d(canvas);
  ctx.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0);
  return canvas;
}

export interface EncodeResult {
  blob: Blob;
  bytes: number;
  format: ImageOutputFormat;
}

export async function encodeCanvas(canvas: HTMLCanvasElement, format: ImageOutputFormat, quality = 0.85): Promise<EncodeResult> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, format === "image/png" ? undefined : quality));
  if (!blob) throw new Error("Encodage de l'image impossible.");
  // Some browsers silently fall back to PNG when WebP is unsupported.
  if (blob.type !== format) throw new Error(`Le format ${format} n'est pas pris en charge par ce navigateur.`);
  return { blob, bytes: blob.size, format };
}

/** Flattens transparency on a background colour (needed before JPEG export). */
export function flattenOnBackground(source: CanvasImageSource & { width: number; height: number }, color: string): HTMLCanvasElement {
  return drawToCanvas(source, source.width, source.height, color);
}

export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

export function canvasToBytes(canvas: HTMLCanvasElement, format: ImageOutputFormat, quality?: number): Promise<Uint8Array> {
  return encodeCanvas(canvas, format, quality).then(async (r) => new Uint8Array(await r.blob.arrayBuffer()));
}
