import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderPageToRaster } from "./pdfjs";
import { diffRasters, type RasterLike, type VisualDiff } from "../operations/visual-diff";

export interface PageVisualComparison extends VisualDiff {
  pageIndex: number;
  a: RasterLike | null;
  b: RasterLike | null;
  /** The page exists in only one of the documents. */
  status: "compared" | "added" | "removed";
}

/** Renders page `pageIndex` of both documents (same max side) and diffs them pixel by pixel. */
export async function comparePageVisually(
  docA: PDFDocumentProxy,
  docB: PDFDocumentProxy,
  pageIndex: number,
  maxSide = 1100,
  signal?: AbortSignal,
): Promise<PageVisualComparison> {
  const hasA = pageIndex < docA.numPages;
  const hasB = pageIndex < docB.numPages;
  const a = hasA ? await renderPageToRaster(docA, pageIndex, maxSide, signal) : null;
  const b = hasB ? await renderPageToRaster(docB, pageIndex, maxSide, signal) : null;
  if (a && b) return { ...diffRasters(a, b), pageIndex, a, b, status: "compared" };
  const only = (a ?? b)!;
  return {
    pageIndex,
    a,
    b,
    status: hasA ? "removed" : "added",
    width: only.width,
    height: only.height,
    changedPixels: only.width * only.height,
    changedRatio: 1,
    overlay: only.data,
    bbox: { x: 0, y: 0, width: only.width, height: only.height },
    sizeDiffers: true,
  };
}

export interface VisualSummaryEntry {
  pageIndex: number;
  changedRatio: number;
  status: PageVisualComparison["status"];
}

/** Lower-resolution pass over every page to list where the differences are. */
export async function summarizeVisually(
  docA: PDFDocumentProxy,
  docB: PDFDocumentProxy,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<VisualSummaryEntry[]> {
  const total = Math.max(docA.numPages, docB.numPages);
  const out: VisualSummaryEntry[] = [];
  for (let i = 0; i < total; i += 1) {
    if (signal?.aborted) break;
    const result = await comparePageVisually(docA, docB, i, 500, signal);
    out.push({ pageIndex: i, changedRatio: result.changedRatio, status: result.status });
    onProgress?.(i + 1, total);
  }
  return out;
}
