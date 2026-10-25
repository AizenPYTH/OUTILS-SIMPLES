import { t } from "@/lib/i18n";

export type PdfErrorCode =
  | "NOT_PDF"
  | "TOO_LARGE"
  | "TOO_MANY_FILES"
  | "TOTAL_TOO_LARGE"
  | "TOO_MANY_PAGES"
  | "ENCRYPTED"
  | "CORRUPTED"
  | "EMPTY"
  | "DUPLICATE"
  | "INVALID_RANGE"
  | "NO_SELECTION"
  | "OUT_OF_MEMORY"
  | "TIMEOUT"
  | "RENDER_FAILED"
  | "UNSUPPORTED"
  | "PROCESSING_FAILED"
  | "UNKNOWN";

/**
 * Error raised by PDF operations. `message` is already a French, user-facing
 * sentence; `code` lets the UI decide whether the error is recoverable
 * (retry with the same file) or needs a new upload.
 */
export class PdfError extends Error {
  readonly code: PdfErrorCode;
  readonly recoverable: boolean;

  constructor(
    code: PdfErrorCode,
    message: string,
    options?: { recoverable?: boolean; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "PdfError";
    this.code = code;
    this.recoverable = options?.recoverable ?? false;
  }
}

export function isPdfError(error: unknown): error is PdfError {
  return error instanceof PdfError;
}

/** Maps any thrown value (pdf-lib, pdf.js, DOM) to a PdfError with a safe message. */
export function toPdfError(
  error: unknown,
  fallbackCode: PdfErrorCode = "PROCESSING_FAILED",
): PdfError {
  if (isPdfError(error)) return error;
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  const lower = `${name} ${message}`.toLowerCase();

  if (lower.includes("encrypted") || lower.includes("password")) {
    return new PdfError("ENCRYPTED", t.errors.encrypted, { cause: error });
  }
  if (
    lower.includes("no pdf header") ||
    lower.includes("invalid pdf") ||
    lower.includes("failed to parse") ||
    lower.includes("expected instance of pdfdict") ||
    lower.includes("trailer") ||
    lower.includes("xref") ||
    lower.includes("formaterror") ||
    lower.includes("invalidpdfexception") ||
    lower.includes("unexpected") ||
    lower.includes("corrupt")
  ) {
    return new PdfError("CORRUPTED", t.errors.corrupted, { cause: error });
  }
  if (
    lower.includes("out of memory") ||
    lower.includes("allocation failed") ||
    lower.includes("array buffer allocation")
  ) {
    return new PdfError("OUT_OF_MEMORY", t.errors.outOfMemory, { cause: error });
  }
  if (lower.includes("timeout") || lower.includes("aborted")) {
    return new PdfError("TIMEOUT", t.errors.timeout, { cause: error, recoverable: true });
  }
  const fallbackMessage =
    fallbackCode === "RENDER_FAILED" ? t.errors.renderFailed : t.errors.processingFailed;
  return new PdfError(fallbackCode, fallbackMessage, { cause: error, recoverable: true });
}
