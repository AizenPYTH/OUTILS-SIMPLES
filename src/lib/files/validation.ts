import { acceptedImageMimeTypes, pdfLimits } from "@/config/limits";
import { PdfError } from "@/lib/pdf/errors";
import { formatBytes } from "./format";
import { t } from "@/lib/i18n";

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46]; // %PDF
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, i) => bytes[offset + i] === value);
}

/**
 * Detects a PDF by its magic bytes. Some generators prepend junk (BOM, blank
 * lines) before "%PDF", so the first 1 KiB is scanned — the same tolerance
 * most readers apply.
 */
export function looksLikePdf(bytes: Uint8Array): boolean {
  const window = bytes.subarray(0, Math.min(bytes.length, 1024));
  for (let i = 0; i + PDF_SIGNATURE.length <= window.length; i += 1) {
    if (startsWith(window, PDF_SIGNATURE, i)) return true;
  }
  return false;
}

export type DetectedImageType = "image/png" | "image/jpeg" | null;

export function detectImageType(bytes: Uint8Array): DetectedImageType {
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (startsWith(bytes, JPEG_SIGNATURE)) return "image/jpeg";
  return null;
}

export interface FileLike {
  name: string;
  size: number;
  type: string;
}

export interface PdfFileValidationOptions {
  maxFileSizeBytes?: number;
}

/**
 * Cheap checks that run before reading the file: size and declared type.
 * The declared type is advisory only (browsers often send an empty type);
 * the real check is `assertPdfBytes` once the header is available.
 */
export function validatePdfFileMeta(file: FileLike, options: PdfFileValidationOptions = {}): void {
  const max = options.maxFileSizeBytes ?? pdfLimits.maxFileSizeBytes;
  if (file.size === 0) throw new PdfError("NOT_PDF", t.errors.notPdf);
  if (file.size > max) throw new PdfError("TOO_LARGE", t.errors.tooLarge(formatBytes(max)));
  const type = file.type.toLowerCase();
  const hasPdfExtension = /\.pdf$/i.test(file.name);
  if (type && type !== "application/pdf" && type !== "application/x-pdf" && !hasPdfExtension) {
    throw new PdfError("NOT_PDF", t.errors.notPdf);
  }
}

export function assertPdfBytes(bytes: Uint8Array): void {
  if (!looksLikePdf(bytes)) throw new PdfError("NOT_PDF", t.errors.notPdf);
}

export function validateFileBatch(
  files: FileLike[],
  options: { maxFileCount?: number; maxTotalSizeBytes?: number } = {},
): void {
  const maxCount = options.maxFileCount ?? pdfLimits.maxFileCount;
  const maxTotal = options.maxTotalSizeBytes ?? pdfLimits.maxTotalSizeBytes;
  if (files.length > maxCount)
    throw new PdfError("TOO_MANY_FILES", t.errors.tooManyFiles(maxCount));
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > maxTotal)
    throw new PdfError("TOTAL_TOO_LARGE", t.errors.totalTooLarge(formatBytes(maxTotal)));
}

export function validateImageFile(
  file: FileLike,
  bytes: Uint8Array,
  maxSize = pdfLimits.maxImageSizeBytes,
): DetectedImageType {
  if (file.size > maxSize) throw new PdfError("TOO_LARGE", t.errors.tooLarge(formatBytes(maxSize)));
  const detected = detectImageType(bytes);
  if (!detected || !(acceptedImageMimeTypes as readonly string[]).includes(detected)) {
    throw new PdfError("NOT_PDF", t.errors.notImage);
  }
  return detected;
}

export function assertPageCount(pageCount: number, max: number = pdfLimits.maxPageCount): void {
  if (pageCount === 0) throw new PdfError("EMPTY", t.errors.empty);
  if (pageCount > max) throw new PdfError("TOO_MANY_PAGES", t.errors.tooManyPages(max));
}
