/**
 * Orientation handling for OCR: pure pixel rotations, coordinate mapping from
 * a rotated working copy back to the original image, line direction from the
 * baseline Tesseract reports, skew estimation, and the merge of several
 * oriented passes. No DOM: unit-tested in Node.
 */
import type { RgbaImage } from "@/lib/images/pixels";
import type { OcrAngle, OcrLine, OcrWord } from "./types";

export const OCR_ANGLES: OcrAngle[] = [0, 90, 180, 270];

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Rotates an image clockwise by `angle`, so that text written at `angle`
 * (counter-clockwise, PDF convention) becomes upright.
 */
export function rotateRgba(img: RgbaImage, angle: OcrAngle): RgbaImage {
  if (angle === 0) return img;
  const { width: w, height: h, data } = img;
  const [nw, nh] = angle === 180 ? [w, h] : [h, w];
  const out = new Uint8ClampedArray(nw * nh * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let nx: number;
      let ny: number;
      if (angle === 90) {
        nx = h - 1 - y;
        ny = x;
      } else if (angle === 180) {
        nx = w - 1 - x;
        ny = h - 1 - y;
      } else {
        nx = y;
        ny = w - 1 - x;
      }
      const s = (y * w + x) * 4;
      const d = (ny * nw + nx) * 4;
      out[d] = data[s]!;
      out[d + 1] = data[s + 1]!;
      out[d + 2] = data[s + 2]!;
      out[d + 3] = data[s + 3]!;
    }
  }
  return { width: nw, height: nh, data: out };
}

/** Maps a point of the rotated working copy (pass `angle`) back to the original image. */
export function mapPointFromPass(
  p: { x: number; y: number },
  angle: OcrAngle,
  originalWidth: number,
  originalHeight: number,
): { x: number; y: number } {
  switch (angle) {
    case 90:
      return { x: p.y, y: originalHeight - p.x };
    case 180:
      return { x: originalWidth - p.x, y: originalHeight - p.y };
    case 270:
      return { x: originalWidth - p.y, y: p.x };
    default:
      return { x: p.x, y: p.y };
  }
}

export function mapBoxFromPass(
  box: Box,
  angle: OcrAngle,
  originalWidth: number,
  originalHeight: number,
): Box {
  const a = mapPointFromPass({ x: box.x0, y: box.y0 }, angle, originalWidth, originalHeight);
  const b = mapPointFromPass({ x: box.x1, y: box.y1 }, angle, originalWidth, originalHeight);
  return {
    x0: Math.min(a.x, b.x),
    y0: Math.min(a.y, b.y),
    x1: Math.max(a.x, b.x),
    y1: Math.max(a.y, b.y),
  };
}

/** Rotates a point by `degrees` (counter-clockwise on screen, y down) around a centre. */
export function rotatePointAround(
  p: { x: number; y: number },
  degrees: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const rad = (-degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/** Axis-aligned box of a box rotated by `degrees` around a centre. */
export function rotateBoxAround(box: Box, degrees: number, cx: number, cy: number): Box {
  const corners = [
    rotatePointAround({ x: box.x0, y: box.y0 }, degrees, cx, cy),
    rotatePointAround({ x: box.x1, y: box.y0 }, degrees, cx, cy),
    rotatePointAround({ x: box.x0, y: box.y1 }, degrees, cx, cy),
    rotatePointAround({ x: box.x1, y: box.y1 }, degrees, cx, cy),
  ];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/**
 * Rotates an image by an arbitrary small angle (counter-clockwise positive,
 * degrees) around its centre, same size, bilinear sampling, white outside.
 * Used to deskew a working copy.
 */
export function rotateRgbaByDegrees(img: RgbaImage, degrees: number): RgbaImage {
  if (Math.abs(degrees) < 1e-6) return img;
  const { width: w, height: h, data } = img;
  const out = new Uint8ClampedArray(w * h * 4);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  // Destination (x, y) samples the source at the inverse rotation.
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const sx = cx + dx * cos - dy * sin;
      const sy = cy + dx * sin + dy * cos;
      const d = (y * w + x) * 4;
      if (sx < 0 || sy < 0 || sx > w - 1 || sy > h - 1) {
        out[d] = out[d + 1] = out[d + 2] = 255;
        out[d + 3] = 255;
        continue;
      }
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(w - 1, x0 + 1);
      const y1 = Math.min(h - 1, y0 + 1);
      const fx = sx - x0;
      const fy = sy - y0;
      for (let c = 0; c < 4; c += 1) {
        const p00 = data[(y0 * w + x0) * 4 + c]!;
        const p10 = data[(y0 * w + x1) * 4 + c]!;
        const p01 = data[(y1 * w + x0) * 4 + c]!;
        const p11 = data[(y1 * w + x1) * 4 + c]!;
        out[d + c] = Math.round(
          (p00 * (1 - fx) + p10 * fx) * (1 - fy) + (p01 * (1 - fx) + p11 * fx) * fy,
        );
      }
    }
  }
  return { width: w, height: h, data: out };
}

/**
 * Estimates the skew of text lines (degrees, counter-clockwise positive) by
 * maximising the variance of the row projection profile of dark pixels over
 * candidate angles. Works on a downscaled copy; returns 0 when the image has
 * too little ink or no clear line structure.
 */
export function estimateSkew(
  img: RgbaImage,
  options: { range?: number; step?: number; maxSide?: number } = {},
): number {
  const range = options.range ?? 6;
  const step = options.step ?? 0.5;
  const maxSide = options.maxSide ?? 700;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  // Downscaled grayscale.
  const gray = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const sy = Math.min(img.height - 1, Math.floor(y / scale));
    for (let x = 0; x < w; x += 1) {
      const sx = Math.min(img.width - 1, Math.floor(x / scale));
      const i = (sy * img.width + sx) * 4;
      gray[y * w + x] =
        (img.data[i]! * 299 + img.data[i + 1]! * 587 + img.data[i + 2]! * 114) / 1000;
    }
  }
  // Ink threshold: midway between the two main modes (cheap Otsu substitute).
  let sum = 0;
  for (let i = 0; i < gray.length; i += 1) sum += gray[i]!;
  const mean = sum / gray.length;
  const threshold = Math.min(200, Math.max(60, mean - 40));
  const ink: number[] = [];
  for (let i = 0; i < gray.length; i += 1) if (gray[i]! < threshold) ink.push(i);
  if (ink.length < 50 || ink.length > gray.length * 0.6) return 0;
  const cx = w / 2;
  const cy = h / 2;
  const diag = Math.ceil(Math.hypot(w, h));
  let best = 0;
  let bestScore = -1;
  let zeroScore = 0;
  for (let a = -range; a <= range + 1e-9; a += step) {
    const rad = (a * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const hist = new Float64Array(2 * diag + 1);
    for (const idx of ink) {
      const x = idx % w;
      const y = (idx - x) / w;
      const r = Math.round((x - cx) * sin + (y - cy) * cos) + diag;
      hist[r] = hist[r]! + 1;
    }
    let s = 0;
    let s2 = 0;
    let n = 0;
    for (let i = 0; i < hist.length; i += 1) {
      const v = hist[i]!;
      if (v === 0) continue;
      s += v;
      s2 += v * v;
      n += 1;
    }
    const score = n ? s2 / n - (s / n) * (s / n) : 0;
    if (Math.abs(a) < 1e-9) zeroScore = score;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  // Only trust a clear improvement over the unrotated profile.
  if (bestScore < zeroScore * 1.15) return 0;
  return Math.abs(best) < step / 2 ? 0 : -best;
}

/** Reading direction of a line from its baseline (image coordinates, y down). */
export function angleFromBaseline(baseline: { x0: number; y0: number; x1: number; y1: number }): {
  angle: OcrAngle;
  skew: number;
} {
  const dx = baseline.x1 - baseline.x0;
  const dy = baseline.y1 - baseline.y0;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return { angle: 0, skew: 0 };
  let deg = (Math.atan2(-dy, dx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  const snapped = ((Math.round(deg / 90) * 90) % 360 || 0) as OcrAngle;
  let skew = deg - snapped;
  if (skew > 180) skew -= 360;
  if (skew < -180) skew += 360;
  return { angle: snapped, skew: Math.round(skew * 100) / 100 || 0 };
}

export function boxArea(b: Box): number {
  return Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
}

export function intersectionOverUnion(a: Box, b: Box): number {
  const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const inter = ix * iy;
  const union = boxArea(a) + boxArea(b) - inter;
  return union > 0 ? inter / union : 0;
}

/** Share of `a` covered by `b`. */
export function coverage(a: Box, b: Box): number {
  const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const area = boxArea(a);
  return area > 0 ? (ix * iy) / area : 0;
}

/**
 * Merges the lines of several oriented passes: the most confident reading of
 * a region wins; lines of other passes overlapping it are dropped. Lines are
 * returned grouped by pass in their original order (reading order within a pass).
 */
export function mergePassLines(lines: OcrLine[]): OcrLine[] {
  const ranked = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.text.trim().length > 0)
    .sort((a, b) => b.line.confidence - a.line.confidence || a.index - b.index);
  const accepted: { line: OcrLine; index: number }[] = [];
  for (const candidate of ranked) {
    const clash = accepted.some(({ line }) => {
      if (line.pass === candidate.line.pass) return false;
      const c1 = coverage(candidate.line, line);
      const c2 = coverage(line, candidate.line);
      return Math.max(c1, c2) > 0.35;
    });
    if (!clash) accepted.push(candidate);
  }
  return accepted.sort((a, b) => a.index - b.index).map((a) => a.line);
}

/**
 * Splits a horizontal line at gaps wider than `factor` × the line height:
 * Tesseract joins the lines of two columns when they share a baseline and
 * little else separates them. Vertical and upside-down lines are left as is.
 */
export function splitWideGaps(lines: OcrLine[], factor = 2.2): OcrLine[] {
  const out: OcrLine[] = [];
  for (const line of lines) {
    if (line.angle !== 0 || line.words.length < 2) {
      out.push(line);
      continue;
    }
    const height = Math.max(1, line.y1 - line.y0);
    const words = [...line.words].sort((a, b) => a.x0 - b.x0);
    const segments: OcrWord[][] = [[words[0]!]];
    for (let i = 1; i < words.length; i += 1) {
      const prev = words[i - 1]!;
      const word = words[i]!;
      if (word.x0 - prev.x1 > factor * height) segments.push([word]);
      else segments[segments.length - 1]!.push(word);
    }
    if (segments.length === 1) {
      out.push(line);
      continue;
    }
    segments.forEach((segment, i) => {
      const x0 = Math.min(...segment.map((w) => w.x0));
      const x1 = Math.max(...segment.map((w) => w.x1));
      const y0 = Math.min(...segment.map((w) => w.y0));
      const y1 = Math.max(...segment.map((w) => w.y1));
      const confidence = Math.round(segment.reduce((s, w) => s + w.confidence, 0) / segment.length);
      out.push({
        ...line,
        text: segment.map((w) => w.text).join(" "),
        words: segment,
        x0,
        y0,
        x1,
        y1,
        confidence,
        baseline: { x0, y0: line.baseline.y0, x1, y1: line.baseline.y1 },
        paragraphEnd: i === segments.length - 1 && line.paragraphEnd,
      });
    });
  }
  return out;
}

/**
 * Reading order for upright lines laid out in columns: lines are grouped into
 * columns by horizontal overlap, columns are read left to right, lines top to
 * bottom within a column. Applied only when at least two columns each hold
 * two lines or more; otherwise Tesseract's order is kept.
 */
export function orderByColumns(lines: OcrLine[]): OcrLine[] {
  const upright = lines.filter((l) => l.angle === 0);
  if (upright.length < 4) return lines;
  interface Column {
    x0: number;
    x1: number;
    lines: OcrLine[];
  }
  const columns: Column[] = [];
  for (const line of upright) {
    const width = Math.max(1, line.x1 - line.x0);
    let target: Column | undefined;
    for (const column of columns) {
      const overlap = Math.min(column.x1, line.x1) - Math.max(column.x0, line.x0);
      if (overlap > 0.5 * Math.min(width, column.x1 - column.x0)) {
        target = column;
        break;
      }
    }
    if (target) {
      target.lines.push(line);
      target.x0 = Math.min(target.x0, line.x0);
      target.x1 = Math.max(target.x1, line.x1);
    } else columns.push({ x0: line.x0, x1: line.x1, lines: [line] });
  }
  const real = columns.filter((c) => c.lines.length >= 2);
  if (real.length < 2) return lines;
  // Two columns must not overlap horizontally, otherwise this is one block with ragged lines.
  const sorted = [...columns].sort((a, b) => a.x0 - b.x0);
  for (let i = 1; i < sorted.length; i += 1)
    if (sorted[i]!.x0 < sorted[i - 1]!.x1 - 0.1 * (sorted[i - 1]!.x1 - sorted[i - 1]!.x0))
      return lines;
  const ordered = sorted.flatMap((c) => [...c.lines].sort((a, b) => a.y0 - b.y0));
  const others = lines.filter((l) => l.angle !== 0);
  return [...ordered, ...others];
}

/** Character-weighted confidence of a set of lines. */
export function weightedConfidence(lines: OcrLine[]): number {
  let chars = 0;
  let sum = 0;
  for (const line of lines) {
    const n = line.text.replace(/\s/g, "").length;
    chars += n;
    sum += n * line.confidence;
  }
  return chars ? Math.round(sum / chars) : 0;
}

/** Characters per reading direction. */
export function charsByAngle(lines: OcrLine[]): Record<OcrAngle, number> {
  const out: Record<OcrAngle, number> = { 0: 0, 90: 0, 180: 0, 270: 0 };
  for (const line of lines) out[line.angle] += line.text.replace(/\s/g, "").length;
  return out;
}

const ANGLE_HEADING: Record<OcrAngle, string> = {
  0: "",
  90: "[Texte tourné à 90°, lu de bas en haut]",
  180: "[Texte à l'envers (180°)]",
  270: "[Texte tourné à 270°, lu de haut en bas]",
};

/**
 * Text of a page from merged lines: the dominant orientation first, then the
 * other orientations each under a heading. Paragraph boundaries become blank
 * lines; nothing is reflowed.
 */
export function assembleText(lines: OcrLine[]): {
  text: string;
  dominantAngle: OcrAngle;
  mixed: boolean;
} {
  const counts = charsByAngle(lines);
  let total = 0;
  for (const a of OCR_ANGLES) total += counts[a];
  let dominant: OcrAngle = 0;
  for (const a of OCR_ANGLES) if (counts[a] > counts[dominant]) dominant = a;
  const order = [dominant, ...OCR_ANGLES.filter((a) => a !== dominant)];
  const parts: string[] = [];
  for (const angle of order) {
    const group = lines.filter((l) => l.angle === angle);
    if (group.length === 0) continue;
    const buffer: string[] = [];
    if (angle !== dominant) buffer.push(ANGLE_HEADING[angle]);
    for (const line of group) {
      buffer.push(line.text);
      if (line.paragraphEnd) buffer.push("");
    }
    parts.push(
      buffer
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    );
  }
  const significant = OCR_ANGLES.filter((a) => counts[a] >= Math.max(8, total * 0.08));
  return {
    text: parts.join("\n\n").trim(),
    dominantAngle: dominant,
    mixed: significant.length > 1,
  };
}
