import type { FontFamily } from "../fonts";

/**
 * Annotation model shared by the editor, annotate, add-text and sign tools.
 *
 * All geometry is expressed in PDF user space of the page (points, origin at
 * the bottom-left corner, y going up, BEFORE the page /Rotate is applied).
 * The UI converts to/from screen space with the pdf.js viewport (see
 * coordinates.ts); the exporter draws with pdf-lib in the same space.
 */
export type RgbColor = { r: number; g: number; b: number }; // 0..1

export interface PdfPoint {
  x: number;
  y: number;
}

export interface PdfRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnnotationBase {
  id: string;
  /** 0-based page index. */
  pageIndex: number;
}

export interface TextAnnotation extends AnnotationBase, PdfRect {
  type: "text";
  text: string;
  fontFamily: FontFamily;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: RgbColor;
  align: "left" | "center" | "right";
  /** Optional opaque background (used by "comment" notes). */
  background?: RgbColor;
}

export interface PathAnnotation extends AnnotationBase {
  type: "path";
  points: PdfPoint[];
  strokeWidth: number;
  color: RgbColor;
  opacity: number;
}

export interface RectAnnotation extends AnnotationBase, PdfRect {
  type: "rect";
  strokeWidth: number;
  strokeColor: RgbColor | null;
  fillColor: RgbColor | null;
  opacity: number;
}

export interface EllipseAnnotation extends AnnotationBase, PdfRect {
  type: "ellipse";
  strokeWidth: number;
  strokeColor: RgbColor | null;
  fillColor: RgbColor | null;
  opacity: number;
}

export interface LineAnnotation extends AnnotationBase {
  type: "line";
  start: PdfPoint;
  end: PdfPoint;
  strokeWidth: number;
  color: RgbColor;
  opacity: number;
  arrow: boolean;
}

/** Translucent rectangle multiplied over the content. */
export interface HighlightAnnotation extends AnnotationBase, PdfRect {
  type: "highlight";
  color: RgbColor;
  opacity: number;
}

export interface ImageAnnotation extends AnnotationBase, PdfRect {
  type: "image";
  /** Original encoded bytes (PNG or JPEG) — embedded as-is on export. */
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg";
  /** Object URL for on-screen preview; created and revoked by the UI. */
  previewUrl?: string;
  /** "signature" is only a semantic flag for the UI. */
  role: "image" | "signature";
}

export type Annotation =
  | TextAnnotation
  | PathAnnotation
  | RectAnnotation
  | EllipseAnnotation
  | LineAnnotation
  | HighlightAnnotation
  | ImageAnnotation;

export type AnnotationType = Annotation["type"];

export function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value) || full.length !== 6) return { r: 0, g: 0, b: 0 };
  return { r: ((value >> 16) & 255) / 255, g: ((value >> 8) & 255) / 255, b: (value & 255) / 255 };
}

export function rgbToHex(color: RgbColor): string {
  const to = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(color.r)}${to(color.g)}${to(color.b)}`;
}

export function rgbToCss(color: RgbColor, alpha = 1): string {
  return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${alpha})`;
}

/** Bounding box in PDF space, used for selection and hit testing. */
export function annotationBounds(annotation: Annotation): PdfRect {
  switch (annotation.type) {
    case "path": {
      const xs = annotation.points.map((p) => p.x);
      const ys = annotation.points.map((p) => p.y);
      const pad = annotation.strokeWidth / 2;
      const minX = Math.min(...xs) - pad;
      const minY = Math.min(...ys) - pad;
      return {
        x: minX,
        y: minY,
        width: Math.max(...xs) + pad - minX,
        height: Math.max(...ys) + pad - minY,
      };
    }
    case "line": {
      const pad = Math.max(annotation.strokeWidth, 4);
      const minX = Math.min(annotation.start.x, annotation.end.x) - pad;
      const minY = Math.min(annotation.start.y, annotation.end.y) - pad;
      return {
        x: minX,
        y: minY,
        width: Math.max(annotation.start.x, annotation.end.x) + pad - minX,
        height: Math.max(annotation.start.y, annotation.end.y) + pad - minY,
      };
    }
    default:
      return {
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
      };
  }
}

/** Moves an annotation by (dx, dy) in PDF space. */
export function translateAnnotation<T extends Annotation>(
  annotation: T,
  dx: number,
  dy: number,
): T {
  switch (annotation.type) {
    case "path":
      return {
        ...annotation,
        points: annotation.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      };
    case "line":
      return {
        ...annotation,
        start: { x: annotation.start.x + dx, y: annotation.start.y + dy },
        end: { x: annotation.end.x + dx, y: annotation.end.y + dy },
      };
    default:
      return { ...annotation, x: annotation.x + dx, y: annotation.y + dy };
  }
}

export function isResizable(annotation: Annotation): boolean {
  return annotation.type !== "path" && annotation.type !== "line";
}
