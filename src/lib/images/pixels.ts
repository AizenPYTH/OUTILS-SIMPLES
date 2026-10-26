/**
 * Pixel-level operations on RGBA buffers. Pure functions (no DOM) so they can
 * be unit-tested in Node and reused by the document scanner filters.
 */
export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export function toGrayscale(img: RgbaImage): RgbaImage {
  const out = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < img.data.length; i += 4) {
    const g = Math.round(
      0.299 * img.data[i]! + 0.587 * img.data[i + 1]! + 0.114 * img.data[i + 2]!,
    );
    out[i] = out[i + 1] = out[i + 2] = g;
    out[i + 3] = img.data[i + 3]!;
  }
  return { width: img.width, height: img.height, data: out };
}

/** brightness: -100..100, contrast: -100..100 */
export function adjustBrightnessContrast(
  img: RgbaImage,
  brightness: number,
  contrast: number,
): RgbaImage {
  const out = new Uint8ClampedArray(img.data.length);
  const b = (brightness / 100) * 255;
  const c = contrast / 100;
  const factor = (259 * (c * 255 + 255)) / (255 * (259 - c * 255));
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v += 1) lut[v] = Math.round(factor * (v - 128) + 128 + b);
  for (let i = 0; i < img.data.length; i += 4) {
    out[i] = lut[img.data[i]!]!;
    out[i + 1] = lut[img.data[i + 1]!]!;
    out[i + 2] = lut[img.data[i + 2]!]!;
    out[i + 3] = img.data[i + 3]!;
  }
  return { width: img.width, height: img.height, data: out };
}

/** Otsu threshold on a grayscale histogram (0..255). */
export function otsuThreshold(gray: Uint8ClampedArray | Uint8Array, stride = 1): number {
  const hist = new Uint32Array(256);
  let total = 0;
  for (let i = 0; i < gray.length; i += stride) {
    hist[gray[i]!] = (hist[gray[i]!] ?? 0) + 1;
    total += 1;
  }
  let sum = 0;
  for (let t = 0; t < 256; t += 1) sum += t * hist[t]!;
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t += 1) {
    wB += hist[t]!;
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t]!;
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Pure black & white using Otsu or a fixed threshold. */
export function toBlackAndWhite(img: RgbaImage, threshold?: number): RgbaImage {
  const gray = toGrayscale(img);
  const t = threshold ?? otsuThreshold(gray.data, 4);
  const out = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < gray.data.length; i += 4) {
    const v = gray.data[i]! > t ? 255 : 0;
    out[i] = out[i + 1] = out[i + 2] = v;
    out[i + 3] = img.data[i + 3]!;
  }
  return { width: img.width, height: img.height, data: out };
}

/**
 * "Document" filter: adaptive background normalisation. Each pixel is divided
 * by the local background estimated with a box blur, which removes shadows
 * and yellowing while keeping text dark. Works on grayscale.
 */
export function documentFilter(img: RgbaImage, radius = 24, strength = 1.2): RgbaImage {
  const gray = toGrayscale(img);
  const w = img.width;
  const h = img.height;
  const channel = new Float32Array(w * h);
  for (let i = 0, p = 0; i < gray.data.length; i += 4, p += 1) channel[p] = gray.data[i]!;
  const background = boxBlur(channel, w, h, radius);
  const out = new Uint8ClampedArray(img.data.length);
  for (let p = 0, i = 0; p < channel.length; p += 1, i += 4) {
    const bg = Math.max(1, background[p]!);
    let v = (channel[p]! / bg) * 255;
    v = 255 - (255 - v) * strength;
    const clamped = Math.max(0, Math.min(255, Math.round(v)));
    out[i] = out[i + 1] = out[i + 2] = clamped;
    out[i + 3] = img.data[i + 3]!;
  }
  return { width: w, height: h, data: out };
}

/** Separable box blur using summed-area running sums; O(n). */
export function boxBlur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const r = Math.max(1, Math.round(radius));
  for (let y = 0; y < h; y += 1) {
    let sum = 0;
    for (let x = -r; x <= r; x += 1) sum += src[y * w + clamp(x, 0, w - 1)]!;
    for (let x = 0; x < w; x += 1) {
      tmp[y * w + x] = sum / (2 * r + 1);
      sum += src[y * w + clamp(x + r + 1, 0, w - 1)]! - src[y * w + clamp(x - r, 0, w - 1)]!;
    }
  }
  for (let x = 0; x < w; x += 1) {
    let sum = 0;
    for (let y = -r; y <= r; y += 1) sum += tmp[clamp(y, 0, h - 1) * w + x]!;
    for (let y = 0; y < h; y += 1) {
      out[y * w + x] = sum / (2 * r + 1);
      sum += tmp[clamp(y + r + 1, 0, h - 1) * w + x]! - tmp[clamp(y - r, 0, h - 1) * w + x]!;
    }
  }
  return out;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export interface PaletteColor {
  r: number;
  g: number;
  b: number;
  hex: string;
  share: number;
}

/** Dominant colours by median-cut quantisation on a sampled pixel set. */
export function extractPalette(img: RgbaImage, count = 6, sampleStep = 4): PaletteColor[] {
  const pixels: number[][] = [];
  for (let i = 0; i < img.data.length; i += 4 * sampleStep) {
    if (img.data[i + 3]! < 128) continue;
    pixels.push([img.data[i]!, img.data[i + 1]!, img.data[i + 2]!]);
  }
  if (pixels.length === 0) return [];
  const buckets: number[][][] = [pixels];
  while (buckets.length < count) {
    buckets.sort((a, b) => b.length - a.length);
    const bucket = buckets.shift()!;
    if (bucket.length < 2) {
      buckets.push(bucket);
      break;
    }
    const ranges = [0, 1, 2].map(
      (c) => Math.max(...bucket.map((p) => p[c]!)) - Math.min(...bucket.map((p) => p[c]!)),
    );
    const channel = ranges.indexOf(Math.max(...ranges));
    bucket.sort((a, b) => a[channel]! - b[channel]!);
    const mid = Math.floor(bucket.length / 2);
    buckets.push(bucket.slice(0, mid), bucket.slice(mid));
  }
  // Refine the median-cut seeds with a few k-means iterations so clusters follow colour boundaries.
  let centroids = buckets.map((bucket) =>
    [0, 1, 2].map((c) => bucket.reduce((s, p) => s + p[c]!, 0) / bucket.length),
  );
  let assignment: number[][][] = buckets;
  for (let iter = 0; iter < 6; iter += 1) {
    const groups: number[][][] = centroids.map(() => []);
    for (const p of pixels) {
      let best = 0;
      let bestDist = Infinity;
      for (let k = 0; k < centroids.length; k += 1) {
        const c = centroids[k]!;
        const d = (p[0]! - c[0]!) ** 2 + (p[1]! - c[1]!) ** 2 + (p[2]! - c[2]!) ** 2;
        if (d < bestDist) {
          bestDist = d;
          best = k;
        }
      }
      groups[best]!.push(p);
    }
    assignment = groups.filter((g) => g.length > 0);
    centroids = assignment.map((g) =>
      [0, 1, 2].map((c) => g.reduce((s, p) => s + p[c]!, 0) / g.length),
    );
  }
  const total = pixels.length;
  return assignment
    .map((group, k) => {
      const [r, g, b] = centroids[k]!.map((v) => Math.round(v)) as [number, number, number];
      return { r, g, b, hex: rgbToHex(r, g, b), share: group.length / total };
    })
    .sort((a, b) => b.share - a.share);
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
