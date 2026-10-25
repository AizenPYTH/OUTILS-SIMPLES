/**
 * Browser glue for the pure corner detector: downscale the bitmap, convert
 * to grey and map the detected quad back to source pixels.
 */
import { getRgba, releaseCanvas, resizeCanvas } from "@/lib/images/canvas";
import { detectDocumentQuad, type DetectionResult } from "./detect";
import type { Quad } from "./geometry";

export function detectQuadFromBitmap(bitmap: ImageBitmap, maxDimension = 480): DetectionResult | null {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = resizeCanvas(bitmap, width, height);
  const rgba = getRgba(canvas);
  releaseCanvas(canvas);
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < gray.length; i += 1) {
    const o = i * 4;
    gray[i] = (rgba.data[o]! * 299 + rgba.data[o + 1]! * 587 + rgba.data[o + 2]! * 114) / 1000;
  }
  const detected = detectDocumentQuad(gray, width, height);
  if (!detected) return null;
  const factor = 1 / scale;
  return { confidence: detected.confidence, quad: detected.quad.map((p) => ({ x: Math.min(bitmap.width, p.x * factor), y: Math.min(bitmap.height, p.y * factor) })) as Quad };
}

/** Default quad when nothing is detected: the whole image inset by 8 %. */
export function defaultQuad(width: number, height: number): Quad {
  const ix = width * 0.08;
  const iy = height * 0.08;
  return [
    { x: ix, y: iy },
    { x: width - ix, y: iy },
    { x: width - ix, y: height - iy },
    { x: ix, y: height - iy },
  ];
}
