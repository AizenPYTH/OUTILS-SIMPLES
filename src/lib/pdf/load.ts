import { PDFDocument } from "pdf-lib";
import { pdfLimits } from "@/config/limits";
import { assertPageCount, assertPdfBytes } from "@/lib/files/validation";
import { PdfError, toPdfError } from "./errors";
import { t } from "@/lib/i18n";

export interface LoadOptions {
  /** Allow page counts above the default limit (e.g. merge counts the total separately). */
  maxPageCount?: number;
  /** Keep document metadata such as the modification date untouched. */
  updateMetadata?: boolean;
}

/**
 * Loads bytes into a pdf-lib document with the platform's validation rules:
 * magic bytes, encryption detection, page count limits and friendly errors.
 */
export async function loadPdfDocument(
  bytes: Uint8Array,
  options: LoadOptions = {},
): Promise<PDFDocument> {
  assertPdfBytes(bytes);
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: options.updateMetadata ?? false,
      throwOnInvalidObject: false,
    });
  } catch (error) {
    throw toPdfError(error, "CORRUPTED");
  }
  if (doc.isEncrypted) {
    throw new PdfError("ENCRYPTED", t.errors.encrypted);
  }
  let pageCount: number;
  try {
    pageCount = doc.getPageCount();
  } catch (error) {
    throw toPdfError(error, "CORRUPTED");
  }
  assertPageCount(pageCount, options.maxPageCount ?? pdfLimits.maxPageCount);
  return doc;
}

export async function savePdfDocument(doc: PDFDocument): Promise<Uint8Array> {
  try {
    return await doc.save({ useObjectStreams: true, addDefaultPage: false });
  } catch (error) {
    throw toPdfError(error, "PROCESSING_FAILED");
  }
}

/** Creates an empty document stamped with the platform producer string. */
export async function createPdfDocument(): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  doc.setProducer("AVEROPDF (pdf-lib)");
  doc.setCreator("AVEROPDF");
  return doc;
}
