/**
 * Perspective geometry for the document scanner: 4-point homography and
 * quadrilateral helpers. Pure math (no DOM), unit-tested.
 */
import { tr } from "@/lib/i18n/messages";

export interface Point {
  x: number;
  y: number;
}

/** Four corners in order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point];

/** 3×3 matrix stored row-major. */
export type Homography = [number, number, number, number, number, number, number, number, number];

/** Solves the homography mapping src quad → dst quad (direct linear transform, 8 unknowns). */
export function computeHomography(src: Quad, dst: Quad): Homography {
  // Build the 8×8 system A·h = b.
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const { x, y } = src[i]!;
    const { x: u, y: v } = dst[i]!;
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solveLinear(A, b);
  return [h[0]!, h[1]!, h[2]!, h[3]!, h[4]!, h[5]!, h[6]!, h[7]!, 1];
}

/** Gaussian elimination with partial pivoting. */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1)
      if (Math.abs(M[r]![col]!) > Math.abs(M[pivot]![col]!)) pivot = r;
    if (Math.abs(M[pivot]![col]!) < 1e-12)
      throw new Error(tr("Quadrilatère dégénéré : les coins doivent former une surface."));
    [M[col], M[pivot]] = [M[pivot]!, M[col]!];
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const factor = M[r]![col]! / M[col]![col]!;
      for (let c = col; c <= n; c += 1) M[r]![c]! -= factor * M[col]![c]!;
    }
  }
  return M.map((row, i) => row[n]! / row[i]!);
}

export function applyHomography(h: Homography, p: Point): Point {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

/** Output size (pixels) for a warped quad: averages of opposite edge lengths. */
export function quadOutputSize(quad: Quad, maxDimension = 4000): { width: number; height: number } {
  const d = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  let width = Math.round((d(quad[0], quad[1]) + d(quad[3], quad[2])) / 2);
  let height = Math.round((d(quad[0], quad[3]) + d(quad[1], quad[2])) / 2);
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));
  return { width, height };
}

/** Orders arbitrary 4 points as TL, TR, BR, BL. */
export function orderQuad(points: Point[]): Quad {
  if (points.length !== 4) throw new Error(tr("Quatre points attendus."));
  const sum = points.map((p) => p.x + p.y);
  const diff = points.map((p) => p.x - p.y);
  const tl = points[sum.indexOf(Math.min(...sum))]!;
  const br = points[sum.indexOf(Math.max(...sum))]!;
  const topRight = points[diff.indexOf(Math.max(...diff))]!;
  const bl = points[diff.indexOf(Math.min(...diff))]!;
  return [tl, topRight, br, bl];
}

/**
 * Warps `src` (RGBA, width×height) so that `quad` becomes an upright rectangle
 * of the given output size, using inverse mapping with bilinear sampling.
 */
export function warpPerspective(
  src: { data: Uint8ClampedArray; width: number; height: number },
  quad: Quad,
  out: { width: number; height: number },
): { data: Uint8ClampedArray; width: number; height: number } {
  const dst: Quad = [
    { x: 0, y: 0 },
    { x: out.width, y: 0 },
    { x: out.width, y: out.height },
    { x: 0, y: out.height },
  ];
  // Map output pixels back to the source: homography dst → src.
  const h = computeHomography(dst, quad);
  const data = new Uint8ClampedArray(out.width * out.height * 4);
  const { width: sw, height: sh } = src;
  for (let y = 0; y < out.height; y += 1) {
    for (let x = 0; x < out.width; x += 1) {
      const w = h[6] * (x + 0.5) + h[7] * (y + 0.5) + h[8];
      const sx = (h[0] * (x + 0.5) + h[1] * (y + 0.5) + h[2]) / w - 0.5;
      const sy = (h[3] * (x + 0.5) + h[4] * (y + 0.5) + h[5]) / w - 0.5;
      const o = (y * out.width + x) * 4;
      if (sx < 0 || sy < 0 || sx > sw - 1 || sy > sh - 1) {
        data[o] = data[o + 1] = data[o + 2] = 255;
        data[o + 3] = 255;
        continue;
      }
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(sw - 1, x0 + 1);
      const y1 = Math.min(sh - 1, y0 + 1);
      const fx = sx - x0;
      const fy = sy - y0;
      for (let c = 0; c < 4; c += 1) {
        const p00 = src.data[(y0 * sw + x0) * 4 + c]!;
        const p10 = src.data[(y0 * sw + x1) * 4 + c]!;
        const p01 = src.data[(y1 * sw + x0) * 4 + c]!;
        const p11 = src.data[(y1 * sw + x1) * 4 + c]!;
        data[o + c] = Math.round(
          (p00 * (1 - fx) + p10 * fx) * (1 - fy) + (p01 * (1 - fx) + p11 * fx) * fy,
        );
      }
    }
  }
  return { data, width: out.width, height: out.height };
}
