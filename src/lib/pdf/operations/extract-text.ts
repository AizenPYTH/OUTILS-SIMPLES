import type { PDFDocumentProxy } from "pdfjs-dist";
import { tr } from "@/lib/i18n/messages";

export interface PageText {
  pageIndex: number;
  text: string;
  /** True when pdf.js found no text items (likely a scanned page). */
  empty: boolean;
}

export interface ExtractedText {
  pages: PageText[];
  totalCharacters: number;
  emptyPages: number[];
}

interface TextItemLike {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
}

/**
 * Rebuilds readable text from pdf.js text items: items are grouped into lines
 * by their baseline (y), ordered by x, and lines separated by a gap larger
 * than a line height become paragraphs.
 */
export function assembleTextItems(items: TextItemLike[]): string {
  const positioned = items
    .filter((i) => i.str.length > 0)
    .map((i) => ({
      str: i.str,
      x: i.transform[4] ?? 0,
      y: i.transform[5] ?? 0,
      h: Math.abs(i.transform[3] ?? i.height) || i.height || 10,
      w: i.width,
    }));
  if (positioned.length === 0) return "";
  // Group by baseline with a tolerance relative to the font height.
  const lines: { y: number; h: number; items: typeof positioned }[] = [];
  for (const item of positioned.sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find(
      (l) => Math.abs(l.y - item.y) <= Math.max(2, Math.min(l.h, item.h) * 0.5),
    );
    if (line) line.items.push(item);
    else lines.push({ y: item.y, h: item.h, items: [item] });
  }
  const out: string[] = [];
  let previous: (typeof lines)[number] | null = null;
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    let text = "";
    let cursor: number | null = null;
    for (const item of line.items) {
      if (cursor !== null) {
        const gap = item.x - cursor;
        const spaceWidth = item.h * 0.25;
        if (gap > spaceWidth && !text.endsWith(" ") && !item.str.startsWith(" ")) text += " ";
      }
      text += item.str;
      cursor = item.x + item.w;
    }
    if (previous && previous.y - line.y > Math.max(previous.h, line.h) * 1.8) out.push("");
    out.push(text.replace(/\s+/g, " ").trimEnd());
    previous = line;
  }
  return out.join("\n").trim();
}

export async function extractText(
  doc: PDFDocumentProxy,
  onProgress?: (current: number, total: number) => void,
): Promise<ExtractedText> {
  const pages: PageText[] = [];
  let totalCharacters = 0;
  for (let i = 1; i <= doc.numPages; i += 1) {
    onProgress?.(i, doc.numPages);
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = assembleTextItems(
      content.items.filter((item) => "str" in item) as unknown as TextItemLike[],
    );
    pages.push({ pageIndex: i - 1, text, empty: text.length === 0 });
    totalCharacters += text.length;
    page.cleanup();
  }
  return {
    pages,
    totalCharacters,
    emptyPages: pages.filter((p) => p.empty).map((p) => p.pageIndex),
  };
}

export function pagesToPlainText(pages: PageText[], withSeparators = true): string {
  return pages
    .map((p) => (withSeparators ? `${p.text}` : p.text))
    .join(withSeparators ? "\n\n-----\n\n" : "\n\n")
    .trim();
}

/** Markdown: one H2 per page, paragraphs preserved. */
export function pagesToMarkdown(pages: PageText[], title?: string): string {
  const out: string[] = [];
  if (title) out.push(`# ${title}`, "");
  for (const p of pages) {
    out.push(
      `## Page ${p.pageIndex + 1}`,
      "",
      p.text.length ? p.text : tr("_(aucun texte détecté sur cette page)_"),
      "",
    );
  }
  return out.join("\n").trim() + "\n";
}

/** Case-insensitive, accent-insensitive search across pages. */
export function searchPages(
  pages: PageText[],
  query: string,
  maxHits = 500,
): { pageIndex: number; snippet: string }[] {
  const needle = normalize(query);
  if (!needle) return [];
  const hits: { pageIndex: number; snippet: string }[] = [];
  for (const page of pages) {
    const haystack = normalize(page.text);
    let from = 0;
    while (hits.length < maxHits) {
      const index = haystack.indexOf(needle, from);
      if (index === -1) break;
      const start = Math.max(0, index - 60);
      const end = Math.min(page.text.length, index + needle.length + 60);
      hits.push({
        pageIndex: page.pageIndex,
        snippet:
          (start > 0 ? "…" : "") +
          page.text.slice(start, end).replace(/\s+/g, " ") +
          (end < page.text.length ? "…" : ""),
      });
      from = index + needle.length;
    }
  }
  return hits;
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
