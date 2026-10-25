import type { OcrPageResult } from "./types";

export function ocrPagesToText(
  pages: { pageIndex: number; text: string }[],
  separators = true,
): string {
  return pages
    .map((p) => p.text.trim())
    .join(separators ? "\n\n-----\n\n" : "\n\n")
    .trim();
}

/** Markdown: page headings; paragraphs separated by blank lines are preserved. */
export function ocrPagesToMarkdown(
  pages: { pageIndex: number; text: string }[],
  title?: string,
): string {
  const out: string[] = [];
  if (title) out.push(`# ${title}`, "");
  for (const p of pages)
    out.push(`## Page ${p.pageIndex + 1}`, "", p.text.trim() || "_(aucun texte reconnu)_", "");
  return out.join("\n").trim() + "\n";
}

export function averageConfidence(pages: OcrPageResult[]): number {
  if (pages.length === 0) return 0;
  return Math.round(pages.reduce((s, p) => s + p.confidence, 0) / pages.length);
}
