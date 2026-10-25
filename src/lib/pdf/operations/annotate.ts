import { drawAnnotations, type DrawReport } from "../annotations/draw";
import type { Annotation } from "../annotations/types";
import { loadPdfDocument, savePdfDocument } from "../load";

export interface AnnotateResult {
  bytes: Uint8Array;
  report: DrawReport;
}

/** Flattens visual annotations into the page content and returns the new bytes. */
export async function applyAnnotations(bytes: Uint8Array, annotations: Annotation[]): Promise<AnnotateResult> {
  const doc = await loadPdfDocument(bytes);
  const report = await drawAnnotations(doc, annotations);
  const out = await savePdfDocument(doc);
  return { bytes: out, report };
}
