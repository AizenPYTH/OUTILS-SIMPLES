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

export async function openPdf(bytes: Uint8Array): Promise<OpenedPdf> {
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
  });
  let doc: PDFDocumentProxy;
  try {
    doc = await loadingTask.promise;
  } catch (error) {
    throw toPdfError(error, "CORRUPTED");
  }
  const pages: PageInfo[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1, rotation: 0 });
    pages.push({ index: i - 1, width: viewport.width, height: viewport.height, rotation: page.rotate });
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
}

export interface RenderOutcome {
  viewport: PageViewport;
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
  const ratio = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 3);
  canvas.width = Math.floor(viewport.width * ratio);
  canvas.height = Math.floor(viewport.height * ratio);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  const renderViewport = ratio === 1 ? viewport : page.getViewport({ scale: options.scale * ratio, rotation });
  const task = page.render({ canvas, viewport: renderViewport, intent: "display" });
  const onAbort = () => task.cancel();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    await task.promise;
  } catch (error) {
    if (options.signal?.aborted || (error instanceof Error && error.name === "RenderingCancelledException")) {
      return { viewport };
    }
    throw toPdfError(error, "RENDER_FAILED");
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
  }
  return { viewport };
}

/** Scale that fits a page of (w, h) points into a box of (maxW, maxH) CSS px. */
export function fitScale(pageWidth: number, pageHeight: number, maxWidth: number, maxHeight: number): number {
  return Math.min(maxWidth / pageWidth, maxHeight / pageHeight);
}

/** Visual (rotated) size of a page in points. */
export function visualSize(page: PageInfo, extraRotation = 0): { width: number; height: number } {
  const rotation = ((page.rotation + extraRotation) % 360 + 360) % 360;
  return rotation === 90 || rotation === 270 ? { width: page.height, height: page.width } : { width: page.width, height: page.height };
}
