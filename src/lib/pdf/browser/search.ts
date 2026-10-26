/**
 * Text search in the open document, from pdf.js text items. A match is one
 * text item (the unit pdf.js extracts: a word, a line, a fragment) whose
 * string contains the query, compared without case or accents. Matches that
 * span two items are not found (documented limit).
 */
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PdfRect } from "../annotations/types";

export interface SearchMatch {
  pageIndex: number;
  /** The item's text, for the result list. */
  text: string;
  /** Box of the item in PDF user space (before /Rotate). */
  box: PdfRect;
  /** Start of the match inside `text` (after normalisation, same length). */
  offset: number;
}

export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export async function searchDocument(
  doc: PDFDocumentProxy,
  query: string,
  options: {
    maxResults?: number;
    signal?: AbortSignal;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<SearchMatch[]> {
  const needle = normalizeForSearch(query.trim());
  if (needle.length === 0) return [];
  const max = options.maxResults ?? 500;
  const matches: SearchMatch[] = [];
  for (let i = 0; i < doc.numPages; i += 1) {
    if (options.signal?.aborted) break;
    const page = await doc.getPage(i + 1);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!("str" in item) || item.str.length === 0) continue;
      const hay = normalizeForSearch(item.str);
      let from = 0;
      while (from <= hay.length - needle.length) {
        const at = hay.indexOf(needle, from);
        if (at < 0) break;
        const [a, b, , , e, f] = item.transform as number[];
        // The item's box: origin at its baseline, advance along the baseline, font height across it.
        const angle = Math.atan2(b!, a!);
        const horizontal = Math.abs(Math.cos(angle)) > 0.5;
        const box: PdfRect = horizontal
          ? {
              x: Math.min(e!, e! + item.width * Math.cos(angle)),
              y: f! - item.height * 0.2,
              width: Math.max(item.width, 2),
              height: item.height,
            }
          : {
              x: e! - item.height * 0.8,
              y: Math.min(f!, f! + item.width * Math.sin(angle)),
              width: item.height,
              height: Math.max(item.width, 2),
            };
        matches.push({ pageIndex: i, text: item.str, box, offset: at });
        if (matches.length >= max) return matches;
        from = at + Math.max(1, needle.length);
      }
    }
    options.onProgress?.(i + 1, doc.numPages);
  }
  return matches;
}
