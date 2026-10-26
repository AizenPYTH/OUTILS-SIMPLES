/**
 * Pixel comparison of two rendered pages (pure, runs in Node for tests).
 * The second raster is resampled (nearest neighbour) to the first one's size
 * when pages differ in size, so a page of another format shows as changed.
 */
export interface RasterLike {
  width: number;
  height: number;
  /** RGBA. */
  data: Uint8ClampedArray;
}

export interface VisualDiff {
  width: number;
  height: number;
  changedPixels: number;
  /** Changed pixels over all pixels (0–1). */
  changedRatio: number;
  /** RGBA overlay: the second page faded to grey, differences painted red. */
  overlay: Uint8ClampedArray;
  /** Bounding box of the differences, in pixels of the first raster, or null when identical. */
  bbox: { x: number; y: number; width: number; height: number } | null;
  /** The two pages had different pixel sizes (page format or orientation differs). */
  sizeDiffers: boolean;
}

export function diffRasters(a: RasterLike, b: RasterLike, tolerance = 48): VisualDiff {
  const { width, height } = a;
  const overlay = new Uint8ClampedArray(width * height * 4);
  const sizeDiffers = a.width !== b.width || a.height !== b.height;
  const sx = b.width / width;
  const sy = b.height / height;
  let changed = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    const by = Math.min(b.height - 1, Math.floor(y * sy));
    for (let x = 0; x < width; x += 1) {
      const bx = Math.min(b.width - 1, Math.floor(x * sx));
      const i = (y * width + x) * 4;
      const j = (by * b.width + bx) * 4;
      const dr = Math.abs(a.data[i]! - b.data[j]!);
      const dg = Math.abs(a.data[i + 1]! - b.data[j + 1]!);
      const db = Math.abs(a.data[i + 2]! - b.data[j + 2]!);
      const da = Math.abs(a.data[i + 3]! - b.data[j + 3]!);
      const grey = (b.data[j]! * 299 + b.data[j + 1]! * 587 + b.data[j + 2]! * 114) / 1000;
      if (Math.max(dr, dg, db, da) > tolerance) {
        changed += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        overlay[i] = 220;
        overlay[i + 1] = 38;
        overlay[i + 2] = 38;
        overlay[i + 3] = 255;
      } else {
        const faded = 255 - (255 - grey) * 0.35;
        overlay[i] = faded;
        overlay[i + 1] = faded;
        overlay[i + 2] = faded;
        overlay[i + 3] = 255;
      }
    }
  }
  const total = width * height;
  return {
    width,
    height,
    changedPixels: changed,
    changedRatio: total ? changed / total : 0,
    overlay,
    bbox: changed ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : null,
    sizeDiffers,
  };
}

/** Human label for a ratio: "identique", "0,3 %", "12 %". */
export function formatChangedRatio(ratio: number): string {
  if (ratio === 0) return "identique";
  const pct = ratio * 100;
  if (pct < 0.05) return "< 0,1 %";
  return `${pct < 10 ? pct.toFixed(1).replace(".", ",") : Math.round(pct)} %`;
}
