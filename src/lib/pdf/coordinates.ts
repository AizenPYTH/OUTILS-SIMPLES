/**
 * Coordinate transformation layer.
 *
 * Three spaces are involved:
 *  - PDF user space: points, origin bottom-left, y up (what pdf-lib draws in,
 *    before the page /Rotate is applied).
 *  - Viewport (canvas CSS pixel) space: origin top-left, y down, already
 *    scaled by the zoom and rotated by the page /Rotate. pdf.js describes it
 *    with a 6-number affine `transform` [a b c d e f].
 *  - Screen space: viewport space offset by the canvas element position.
 *
 * pdf.js exposes `viewport.transform`; we re-implement the inverse here so the
 * math is testable without pdf.js and so the overlay never drifts from the
 * rendered canvas (both use the same matrix).
 */
import type { PdfPoint, PdfRect } from "./annotations/types";

export type Matrix = readonly [number, number, number, number, number, number];

export interface ViewportLike {
  width: number;
  height: number;
  transform: Matrix | number[];
}

export function applyMatrix(m: Matrix | number[], x: number, y: number): PdfPoint {
  return { x: m[0]! * x + m[2]! * y + m[4]!, y: m[1]! * x + m[3]! * y + m[5]! };
}

export function invertMatrix(m: Matrix | number[]): Matrix {
  const [a, b, c, d, e, f] = m as Matrix;
  const det = a * d - b * c;
  if (det === 0) throw new Error("Non-invertible viewport transform");
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}

/** PDF user space → viewport pixels. */
export function pdfToViewport(viewport: ViewportLike, point: PdfPoint): PdfPoint {
  return applyMatrix(viewport.transform, point.x, point.y);
}

/** Viewport pixels → PDF user space. */
export function viewportToPdf(viewport: ViewportLike, point: PdfPoint): PdfPoint {
  return applyMatrix(invertMatrix(viewport.transform), point.x, point.y);
}

/** Converts a PDF-space rectangle to a viewport-space CSS box (handles rotation). */
export function pdfRectToViewport(viewport: ViewportLike, rect: PdfRect): PdfRect {
  const corners = [
    pdfToViewport(viewport, { x: rect.x, y: rect.y }),
    pdfToViewport(viewport, { x: rect.x + rect.width, y: rect.y }),
    pdfToViewport(viewport, { x: rect.x, y: rect.y + rect.height }),
    pdfToViewport(viewport, { x: rect.x + rect.width, y: rect.y + rect.height }),
  ];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/** Converts a viewport-space box (e.g. a drag rectangle) to a PDF-space rect. */
export function viewportRectToPdf(viewport: ViewportLike, rect: PdfRect): PdfRect {
  const inv = invertMatrix(viewport.transform);
  const corners = [
    applyMatrix(inv, rect.x, rect.y),
    applyMatrix(inv, rect.x + rect.width, rect.y),
    applyMatrix(inv, rect.x, rect.y + rect.height),
    applyMatrix(inv, rect.x + rect.width, rect.y + rect.height),
  ];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/** Uniform scale factor of the viewport (pixels per point). */
export function viewportScale(viewport: ViewportLike): number {
  const [a, b] = viewport.transform as Matrix;
  return Math.hypot(a, b);
}

/**
 * Builds the same transform pdf.js produces for `getViewport({ scale, rotation })`
 * given a page mediabox/cropbox [x0 y0 x1 y1] and rotation in degrees. Useful
 * for tests and for computing thumbnail boxes without a pdf.js page object.
 */
export function buildViewportTransform(
  box: readonly [number, number, number, number],
  scale: number,
  rotation: number,
): { width: number; height: number; transform: Matrix } {
  const [x0, y0, x1, y1] = box;
  const centerX = (x0 + x1) / 2;
  const centerY = (y0 + y1) / 2;
  const rot = ((rotation % 360) + 360) % 360;
  let rotateA: number, rotateB: number, rotateC: number, rotateD: number;
  switch (rot) {
    case 180:
      rotateA = -1;
      rotateB = 0;
      rotateC = 0;
      rotateD = 1;
      break;
    case 90:
      rotateA = 0;
      rotateB = 1;
      rotateC = 1;
      rotateD = 0;
      break;
    case 270:
      rotateA = 0;
      rotateB = -1;
      rotateC = -1;
      rotateD = 0;
      break;
    default:
      rotateA = 1;
      rotateB = 0;
      rotateC = 0;
      rotateD = -1;
  }
  let offsetCanvasX: number, offsetCanvasY: number, width: number, height: number;
  if (rotateA === 0) {
    offsetCanvasX = Math.abs(centerY - y0) * scale;
    offsetCanvasY = Math.abs(centerX - x0) * scale;
    width = Math.abs(y1 - y0) * scale;
    height = Math.abs(x1 - x0) * scale;
  } else {
    offsetCanvasX = Math.abs(centerX - x0) * scale;
    offsetCanvasY = Math.abs(centerY - y0) * scale;
    width = Math.abs(x1 - x0) * scale;
    height = Math.abs(y1 - y0) * scale;
  }
  const transform: Matrix = [
    rotateA * scale,
    rotateB * scale,
    rotateC * scale,
    rotateD * scale,
    offsetCanvasX - rotateA * scale * centerX - rotateC * scale * centerY,
    offsetCanvasY - rotateB * scale * centerX - rotateD * scale * centerY,
  ];
  return { width, height, transform };
}
