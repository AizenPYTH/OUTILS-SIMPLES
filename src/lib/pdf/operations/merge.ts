import type { PDFDocument } from "pdf-lib";
import { pdfLimits } from "@/config/limits";
import { PdfError, toPdfError } from "../errors";
import { createPdfDocument, loadPdfDocument, savePdfDocument } from "../load";
import { t } from "@/lib/i18n";

export interface MergeInput {
  name: string;
  bytes: Uint8Array;
}

export interface ProgressReporter {
  (progress: { current: number; total: number; label?: string }): void;
}

export interface MergeResult {
  bytes: Uint8Array;
  pageCount: number;
}

/**
 * Copies every page of every input, in order, into a fresh document.
 * Pages keep their size, rotation, content and resources.
 */
export async function mergePdfs(
  inputs: MergeInput[],
  onProgress?: ProgressReporter,
): Promise<MergeResult> {
  if (inputs.length === 0)
    throw new PdfError("NO_SELECTION", t.errors.noFiles, { recoverable: true });
  if (inputs.length > pdfLimits.maxFileCount) {
    throw new PdfError("TOO_MANY_FILES", t.errors.tooManyFiles(pdfLimits.maxFileCount));
  }
  const output = await createPdfDocument();
  let totalPages = 0;
  for (let i = 0; i < inputs.length; i += 1) {
    const input = inputs[i]!;
    onProgress?.({
      current: i + 1,
      total: inputs.length,
      label: t.progress.processingFile(i + 1, inputs.length),
    });
    const source = await loadPdfDocument(input.bytes, { maxPageCount: Number.MAX_SAFE_INTEGER });
    totalPages += source.getPageCount();
    if (totalPages > pdfLimits.maxPageCount * 5) {
      throw new PdfError("TOO_MANY_PAGES", t.errors.tooManyPages(pdfLimits.maxPageCount * 5));
    }
    await copyAllPages(source, output);
  }
  onProgress?.({ current: inputs.length, total: inputs.length, label: t.progress.finalizing });
  const bytes = await savePdfDocument(output);
  return { bytes, pageCount: output.getPageCount() };
}

export async function copyAllPages(source: PDFDocument, target: PDFDocument): Promise<void> {
  try {
    const indices = source.getPageIndices();
    const pages = await target.copyPages(source, indices);
    for (const page of pages) target.addPage(page);
  } catch (error) {
    throw toPdfError(error, "PROCESSING_FAILED");
  }
}
