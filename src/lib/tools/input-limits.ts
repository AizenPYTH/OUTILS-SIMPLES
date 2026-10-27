import { getLocale, type Locale } from "@/lib/i18n/locale";
import type { ToolDefinition } from "./types";

/**
 * What a tool page says about the files it accepts. A tool "accepts files"
 * only when the registry declares a positive size limit: calculators,
 * generators and printable documents declare 0 and take no file at all, so
 * the page must not print "0 o" or an empty format list for them. Nothing is
 * invented: absent data stays absent (null), it is never replaced by a default.
 */
export interface ToolInputLimits {
  acceptsFiles: boolean;
  /** Human labels of the accepted formats (deduplicated), empty when unknown. */
  formats: string[];
  /** Maximum size of one file, null when the tool takes no file. */
  maxFileSizeBytes: number | null;
  /** Maximum number of files, null unless the tool takes several files. */
  maxFileCount: number | null;
}

const FORMAT_LABELS: Record<string, { fr: string; en: string }> = {
  "application/pdf": { fr: "PDF", en: "PDF" },
  "application/zip": { fr: "ZIP", en: "ZIP" },
  "application/json": { fr: "JSON", en: "JSON" },
  "application/octet-stream": { fr: "Tout fichier", en: "Any file" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    fr: "Word (.docx)",
    en: "Word (.docx)",
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    fr: "Excel (.xlsx)",
    en: "Excel (.xlsx)",
  },
  "image/png": { fr: "PNG", en: "PNG" },
  "image/jpeg": { fr: "JPEG", en: "JPEG" },
  "image/webp": { fr: "WebP", en: "WebP" },
  "image/gif": { fr: "GIF", en: "GIF" },
  "image/bmp": { fr: "BMP", en: "BMP" },
  "image/avif": { fr: "AVIF", en: "AVIF" },
  "image/svg+xml": { fr: "SVG", en: "SVG" },
  "image/heic": { fr: "HEIC", en: "HEIC" },
  "image/heif": { fr: "HEIF", en: "HEIF" },
  "text/plain": { fr: "Texte", en: "Text" },
  "text/csv": { fr: "CSV", en: "CSV" },
  "text/html": { fr: "HTML", en: "HTML" },
  "text/markdown": { fr: "Markdown", en: "Markdown" },
};

/** Readable label of a MIME type ("image/gif" → "GIF"); unknown types are shown as-is. */
export function formatInputFormat(mime: string, locale: Locale = getLocale()): string {
  return FORMAT_LABELS[mime]?.[locale] ?? mime;
}

export function getToolInputLimits(
  tool: Pick<ToolDefinition, "inputFormats" | "limits">,
  locale: Locale = getLocale(),
): ToolInputLimits {
  const acceptsFiles = tool.limits.maxFileSizeBytes > 0;
  const formats = acceptsFiles
    ? [...new Set(tool.inputFormats.map((m) => formatInputFormat(m, locale)))]
    : [];
  return {
    acceptsFiles,
    formats,
    maxFileSizeBytes: acceptsFiles ? tool.limits.maxFileSizeBytes : null,
    maxFileCount: acceptsFiles && tool.limits.maxFileCount > 1 ? tool.limits.maxFileCount : null,
  };
}
