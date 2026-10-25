/** Shared types for browser image processing (canvas-based). */
export type ImageOutputFormat = "image/jpeg" | "image/png" | "image/webp";

export const outputFormatLabels: Record<ImageOutputFormat, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

export const outputExtensions: Record<ImageOutputFormat, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Formats the browser can decode (tested at runtime with createImageBitmap). */
export const acceptedInputMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/avif", "image/svg+xml"] as const;

export function supportsTransparency(format: ImageOutputFormat): boolean {
  return format !== "image/jpeg";
}

export interface ImageDimensions {
  width: number;
  height: number;
}

/** Computes target dimensions preserving aspect ratio (pure, tested). */
export function fitDimensions(source: ImageDimensions, target: { width?: number; height?: number; maxWidth?: number; maxHeight?: number; percent?: number; allowUpscale?: boolean }): ImageDimensions {
  const ratio = source.width / source.height;
  let width = source.width;
  let height = source.height;
  if (target.percent !== undefined) {
    width = source.width * (target.percent / 100);
    height = source.height * (target.percent / 100);
  } else if (target.width && target.height) {
    width = target.width;
    height = target.height;
  } else if (target.width) {
    width = target.width;
    height = target.width / ratio;
  } else if (target.height) {
    height = target.height;
    width = target.height * ratio;
  }
  if (target.maxWidth && width > target.maxWidth) {
    width = target.maxWidth;
    height = width / ratio;
  }
  if (target.maxHeight && height > target.maxHeight) {
    height = target.maxHeight;
    width = height * ratio;
  }
  if (!target.allowUpscale && target.percent === undefined && !(target.width && target.height)) {
    if (width > source.width || height > source.height) {
      width = source.width;
      height = source.height;
    }
  }
  return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
}

/** Ratio of a crop expressed as width/height; null = free. */
export type AspectPreset = { label: string; ratio: number | null };

export const aspectPresets: AspectPreset[] = [
  { label: "Libre", ratio: null },
  { label: "Carré 1:1", ratio: 1 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "Portrait 3:4", ratio: 3 / 4 },
  { label: "A4 (portrait)", ratio: 210 / 297 },
];

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Clamps a crop rectangle to the image bounds and a minimum size. */
export function clampCrop(rect: CropRect, image: ImageDimensions, minSize = 8): CropRect {
  const width = Math.min(Math.max(minSize, rect.width), image.width);
  const height = Math.min(Math.max(minSize, rect.height), image.height);
  const x = Math.min(Math.max(0, rect.x), image.width - width);
  const y = Math.min(Math.max(0, rect.y), image.height - height);
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}
