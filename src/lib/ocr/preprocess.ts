/**
 * OCR preprocessing on a working copy of the page image. The original pixels
 * are never modified: the caller keeps them for the preview and for the
 * visible layer of the searchable PDF. Pure functions (Node-testable).
 */
import { documentFilter, toBlackAndWhite, toGrayscale, type RgbaImage } from "@/lib/images/pixels";
import type { OcrPreprocessMode } from "./types";

/**
 * Grayscale with a percentile contrast stretch (2 %–98 %): lifts faded scans
 * and photos without inventing a binarisation.
 */
export function stretchContrast(img: RgbaImage, low = 0.02, high = 0.98): RgbaImage {
  const gray = toGrayscale(img);
  const hist = new Uint32Array(256);
  const n = gray.width * gray.height;
  for (let i = 0; i < gray.data.length; i += 4) hist[gray.data[i]!] = hist[gray.data[i]!]! + 1;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v += 1) {
    acc += hist[v]!;
    if (acc >= n * low) {
      lo = v;
      break;
    }
  }
  acc = 0;
  for (let v = 255; v >= 0; v -= 1) {
    acc += hist[v]!;
    if (acc >= n * (1 - high)) {
      hi = v;
      break;
    }
  }
  if (hi - lo < 30) return gray;
  const out = new Uint8ClampedArray(gray.data.length);
  const scale = 255 / (hi - lo);
  for (let i = 0; i < gray.data.length; i += 4) {
    const v = Math.max(0, Math.min(255, Math.round((gray.data[i]! - lo) * scale)));
    out[i] = out[i + 1] = out[i + 2] = v;
    out[i + 3] = gray.data[i + 3]!;
  }
  return { width: gray.width, height: gray.height, data: out };
}

/** Applies the chosen preprocessing to a copy; "none" returns the input untouched. */
export function preprocessForOcr(img: RgbaImage, mode: OcrPreprocessMode): RgbaImage {
  switch (mode) {
    case "none":
      return img;
    case "contrast":
      return documentFilter(
        img,
        Math.max(12, Math.round(Math.max(img.width, img.height) / 60)),
        1.15,
      );
    case "bw":
      return toBlackAndWhite(img);
    case "auto":
    default:
      return stretchContrast(img);
  }
}
