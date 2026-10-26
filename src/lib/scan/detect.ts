/**
 * Heuristic document corner detection: the sheet is assumed brighter than
 * its background. Works on a downscaled grayscale image: Otsu threshold,
 * largest bright connected component, then the four extreme points of its
 * outline. Returns null when nothing convincing is found; the UI always
 * lets the user place corners manually.
 */
import { otsuThreshold } from "@/lib/images/pixels";
import { orderQuad, type Point, type Quad } from "./geometry";

export interface DetectionResult {
  quad: Quad;
  /** 0..1 rough confidence (area share and rectangularity). */
  confidence: number;
}

export function detectDocumentQuad(
  gray: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): DetectionResult | null {
  const threshold = otsuThreshold(gray, 1);
  const bright = new Uint8Array(width * height);
  for (let i = 0; i < bright.length; i += 1) bright[i] = gray[i]! > threshold ? 1 : 0;

  // Largest connected component among bright pixels (4-connectivity, iterative flood fill).
  const labels = new Int32Array(width * height).fill(-1);
  let best = { label: -1, size: 0 };
  let label = 0;
  const stack: number[] = [];
  for (let start = 0; start < bright.length; start += 1) {
    if (!bright[start] || labels[start] !== -1) continue;
    let size = 0;
    stack.push(start);
    labels[start] = label;
    while (stack.length) {
      const idx = stack.pop()!;
      size += 1;
      const x = idx % width;
      const y = (idx - x) / width;
      const neighbours = [idx - 1, idx + 1, idx - width, idx + width];
      const valid = [x > 0, x < width - 1, y > 0, y < height - 1];
      for (let k = 0; k < 4; k += 1) {
        const n = neighbours[k]!;
        if (valid[k] && bright[n] && labels[n] === -1) {
          labels[n] = label;
          stack.push(n);
        }
      }
    }
    if (size > best.size) best = { label, size };
    label += 1;
  }
  const areaShare = best.size / (width * height);
  // Too small: no sheet; too large: no background visible (nothing to separate).
  if (best.label === -1 || areaShare < 0.08 || areaShare > 0.97) return null;

  // Extreme points of the component: TL (min x+y), TR (max x−y), BR (max x+y), BL (min x−y).
  let tl: Point | null = null,
    tr: Point | null = null,
    br: Point | null = null,
    bl: Point | null = null;
  let minSum = Infinity,
    maxSum = -Infinity,
    minDiff = Infinity,
    maxDiff = -Infinity;
  for (let i = 0; i < labels.length; i += 1) {
    if (labels[i] !== best.label) continue;
    const x = i % width;
    const y = (i - x) / width;
    const s = x + y;
    const d = x - y;
    if (s < minSum) {
      minSum = s;
      tl = { x, y };
    }
    if (s > maxSum) {
      maxSum = s;
      br = { x, y };
    }
    if (d > maxDiff) {
      maxDiff = d;
      tr = { x, y };
    }
    if (d < minDiff) {
      minDiff = d;
      bl = { x, y };
    }
  }
  if (!tl || !tr || !br || !bl) return null;
  const quad = orderQuad([tl, tr, br, bl]);
  const quadArea = polygonArea(quad);
  if (quadArea < width * height * 0.08) return null;
  // Rectangularity: component area vs quad area (1 = perfectly filled quad).
  const fill = Math.min(1, best.size / quadArea);
  const confidence = Math.max(0, Math.min(1, fill * (areaShare < 0.95 ? 1 : 0.5)));
  if (fill < 0.7) return null;
  return { quad, confidence };
}

export function polygonArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}
