/**
 * Processing limits. Everything runs in the visitor's browser, so these limits
 * protect the user's own device memory rather than a server. They are also the
 * single place to raise limits for a future premium tier.
 */
export const MB = 1024 * 1024;

export const pdfLimits = {
  /** Maximum size of a single PDF file. */
  maxFileSizeBytes: 100 * MB,
  /** Maximum combined size of all files in a multi-file operation (merge). */
  maxTotalSizeBytes: 300 * MB,
  /** Maximum number of files per operation (merge). */
  maxFileCount: 30,
  /** Maximum number of pages handled by page-level tools (organize, rotate, editor). */
  maxPageCount: 1000,
  /** Maximum image size accepted for signatures, image annotations and watermarks. */
  maxImageSizeBytes: 15 * MB,
  /** Thumbnail rendering target width in CSS pixels. */
  thumbnailWidth: 160,
  /** Maximum render scale for the editor canvas. */
  maxZoom: 4,
  minZoom: 0.25,
} as const;

export const acceptedPdfMimeTypes = ["application/pdf"] as const;
export const acceptedImageMimeTypes = ["image/png", "image/jpeg"] as const;
