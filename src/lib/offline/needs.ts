import type { ToolCategoryId } from "@/lib/tools/types";

/** Groups of heavy runtime files listed in public/offline-manifest.json (built by scripts/build-sw.mjs). */
export type OfflineGroup = "pdf" | "ocr" | "fonts";

export interface OfflineManifest {
  version: string;
  assetKey: string;
  groups: Record<OfflineGroup, { label: string; files: string[]; bytes: number }>;
}

/** Tools whose component embeds fonts from /fonts (editor family). */
const FONT_TOOLS = new Set(["pdf-edit", "pdf-annotate", "pdf-add-text", "pdf-sign"]);
/** Tools that run OCR; the editor's integrated OCR is optional and only works offline once cached by scan-ocr. */
const OCR_TOOLS = new Set(["scan-ocr"]);
/** Categories whose tools render or write PDF pages (pdf.js worker, standard fonts, qpdf). */
const PDF_CATEGORIES = new Set<ToolCategoryId>(["pdf", "numerisation", "documents"]);
/** Tools outside those categories that still open PDFs with pdf.js. */
const PDF_TOOLS = new Set(["conv-pdf-docx"]);

/**
 * Which engine groups a tool needs beyond its own page and scripts (those are
 * discovered at runtime from what the page actually loaded).
 */
export function offlineGroupsFor(tool: { id: string; category: ToolCategoryId }): OfflineGroup[] {
  const groups: OfflineGroup[] = [];
  if (PDF_CATEGORIES.has(tool.category) || PDF_TOOLS.has(tool.id)) groups.push("pdf");
  if (OCR_TOOLS.has(tool.id)) groups.push("ocr");
  if (FONT_TOOLS.has(tool.id)) groups.push("fonts");
  return groups;
}

export function formatMegabytes(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return mb >= 10 ? `${Math.round(mb)} Mo` : `${mb.toFixed(1).replace(".", ",")} Mo`;
}
