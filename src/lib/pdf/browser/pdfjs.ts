/**
 * Thin wrapper around pdf.js for rendering. The library (~450 KB) is loaded
 * on demand so it never ships with pages that do not render PDFs. Runtime
 * assets are served from /public/pdfjs (see scripts/copy-pdfjs-assets.mjs).
 */
import type { PDFDocumentProxy, PDFPageProxy, PageViewport } from "pdfjs-dist";
import { toPdfError } from "../errors";

type PdfJsModule = typeof import("pdfjs-dist");

let modulePromise: Promise<PdfJsModule> | null = null;

export const PDFJS_ASSET_BASE = "/pdfjs/";

export function loadPdfJs(): Promise<PdfJsModule> {
  if (!modulePromise) {
    modulePromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_ASSET_BASE}pdf.worker.min.mjs`;
      return pdfjs;
    });
  }
  return modulePromise;
}

export interface PageInfo {
  index: number;
  /** User-space size in points (before /Rotate). */
  width: number;
  height: number;
  /** Intrinsic /Rotate of the page in degrees. */
  rotation: number;
}

export interface OpenedPdf {
  doc: PDFDocumentProxy;
  pageCount: number;
  pages: PageInfo[];
  destroy: () => Promise<void>;
}

export interface OpenPdfOptions {
  /** User or owner password for an encrypted document. */
  password?: string;
  /** Called while page sizes are collected (large documents). */
  onProgress?: (done: number, total: number) => void;
}

/** Thrown when pdf.js needs a password (or the given one is wrong). */
export class PdfPasswordError extends Error {
  constructor(readonly reason: "required" | "incorrect") {
    super(reason === "required" ? "password required" : "incorrect password");
    this.name = "PdfPasswordError";
  }
}

export async function openPdf(bytes: Uint8Array, options: OpenPdfOptions = {}): Promise<OpenedPdf> {
  const pdfjs = await loadPdfJs();
  // pdf.js takes ownership of the buffer when transferring to the worker: copy it.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const loadingTask = pdfjs.getDocument({
    data: copy,
    cMapUrl: `${PDFJS_ASSET_BASE}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDFJS_ASSET_BASE}standard_fonts/`,
    wasmUrl: `${PDFJS_ASSET_BASE}wasm/`,
    iccUrl: `${PDFJS_ASSET_BASE}iccs/`,
    disableAutoFetch: true,
    verbosity: 0,
    // Exposes each simple font's encoding (glyph names by code) to the text editor.
    fontExtraProperties: true,
    ...(options.password ? { password: options.password } : {}),
  });
  let doc: PDFDocumentProxy;
  try {
    doc = await loadingTask.promise;
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") {
      const code = (error as { code?: number }).code;
      throw new PdfPasswordError(code === 2 || options.password ? "incorrect" : "required");
    }
    throw toPdfError(error, "CORRUPTED");
  }
  const pages: PageInfo[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    if (i % 25 === 0 || i === doc.numPages) options.onProgress?.(i, doc.numPages);
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1, rotation: 0 });
    pages.push({
      index: i - 1,
      width: viewport.width,
      height: viewport.height,
      rotation: page.rotate,
    });
    page.cleanup();
  }
  return {
    doc,
    pageCount: doc.numPages,
    pages,
    destroy: async () => {
      try {
        await loadingTask.destroy();
      } catch {
        // Already destroyed.
      }
    },
  };
}

export interface RenderOptions {
  scale: number;
  /** Extra rotation added to the page's own /Rotate (thumbnails previewing a rotation). */
  extraRotation?: number;
  signal?: AbortSignal;
  /**
   * Upper bound on the backing-store pixel count. Above it the device pixel
   * ratio is reduced (never below 1) so a 400 % zoom on a 3× screen cannot
   * allocate hundreds of megabytes. 16 Mpx is below every browser's canvas limit.
   */
  maxPixels?: number;
}

export interface RenderOutcome {
  viewport: PageViewport;
  /** Backing-store pixels per CSS pixel actually used. */
  pixelRatio: number;
}

export const DEFAULT_MAX_RENDER_PIXELS = 16_000_000;

/**
 * Backing-store ratio for a CSS-pixel viewport: the device pixel ratio, capped
 * so the canvas stays under `maxPixels`, never below 1.
 */
export function effectivePixelRatio(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  maxPixels = DEFAULT_MAX_RENDER_PIXELS,
): number {
  const dpr = Math.max(1, devicePixelRatio || 1);
  const area = cssWidth * cssHeight;
  if (area <= 0) return dpr;
  return Math.max(1, Math.min(dpr, Math.sqrt(maxPixels / area)));
}

/**
 * Size of the canvas for a CSS viewport: the backing store is a whole number
 * of pixels and the CSS size is derived from it (`backing / ratio`), so the
 * browser scales by an exact factor. Rounding the CSS size instead (the
 * previous behaviour) gave ratios such as 913/348 = 2.6236 on a 2.625× screen,
 * i.e. a resampling pass that blurred every glyph.
 */
export function canvasSizeFor(
  cssWidth: number,
  cssHeight: number,
  ratio: number,
): { width: number; height: number; cssWidth: number; cssHeight: number } {
  const width = Math.max(1, Math.round(cssWidth * ratio));
  const height = Math.max(1, Math.round(cssHeight * ratio));
  return { width, height, cssWidth: width / ratio, cssHeight: height / ratio };
}

/**
 * Renders a page into a canvas, sized for the device pixel ratio. Returns the
 * CSS-pixel viewport used so overlays can share the exact transform.
 */
export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  options: RenderOptions,
): Promise<RenderOutcome> {
  let page: PDFPageProxy;
  try {
    page = await doc.getPage(pageIndex + 1);
  } catch (error) {
    throw toPdfError(error, "RENDER_FAILED");
  }
  const rotation = (page.rotate + (options.extraRotation ?? 0) + 360) % 360;
  const viewport = page.getViewport({ scale: options.scale, rotation });
  const ratio = effectivePixelRatio(
    viewport.width,
    viewport.height,
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
    options.maxPixels,
  );
  const size = canvasSizeFor(viewport.width, viewport.height, ratio);
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.style.width = `${size.cssWidth}px`;
  canvas.style.height = `${size.cssHeight}px`;
  // Render exactly into the backing store (the viewport scaled by the ratio
  // differs from it by less than a pixel; the transform absorbs that).
  const renderViewport = page.getViewport({
    scale: options.scale * ratio,
    rotation,
  });
  const task = page.render({
    canvas,
    viewport: renderViewport,
    intent: "display",
    background: "#ffffff",
  });
  const onAbort = () => task.cancel();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    await task.promise;
  } catch (error) {
    if (
      options.signal?.aborted ||
      (error instanceof Error && error.name === "RenderingCancelledException")
    ) {
      return { viewport, pixelRatio: ratio };
    }
    throw toPdfError(error, "RENDER_FAILED");
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
  }
  return { viewport, pixelRatio: ratio };
}

export interface PageRaster {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/**
 * Renders a page (as displayed, /Rotate applied) to RGBA pixels for OCR: the
 * longest side is `maxSide` px at most (≈ 220 dpi for A4 at 2 600 px), the
 * device pixel ratio is ignored and the canvas is released right away.
 */
export async function renderPageToRaster(
  doc: PDFDocumentProxy,
  pageIndex: number,
  maxSide = 2600,
  signal?: AbortSignal,
): Promise<PageRaster> {
  let page: PDFPageProxy;
  try {
    page = await doc.getPage(pageIndex + 1);
  } catch (error) {
    throw toPdfError(error, "RENDER_FAILED");
  }
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(maxSide / Math.max(base.width, base.height), 4);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  const task = page.render({ canvas, viewport, intent: "print", background: "#ffffff" });
  const onAbort = () => task.cancel();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    await task.promise;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("canvas 2d context unavailable");
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { width: canvas.width, height: canvas.height, data: image.data };
  } catch (error) {
    throw toPdfError(error, "RENDER_FAILED");
  } finally {
    signal?.removeEventListener("abort", onAbort);
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** Scale that fits a page of (w, h) points into a box of (maxW, maxH) CSS px. */
export function fitScale(
  pageWidth: number,
  pageHeight: number,
  maxWidth: number,
  maxHeight: number,
): number {
  return Math.min(maxWidth / pageWidth, maxHeight / pageHeight);
}

/** Visual (rotated) size of a page in points. */
export function visualSize(page: PageInfo, extraRotation = 0): { width: number; height: number } {
  const rotation = (((page.rotation + extraRotation) % 360) + 360) % 360;
  return rotation === 90 || rotation === 270
    ? { width: page.height, height: page.width }
    : { width: page.width, height: page.height };
}
