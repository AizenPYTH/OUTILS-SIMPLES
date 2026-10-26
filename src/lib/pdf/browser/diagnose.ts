/**
 * Document diagnosis for the editor: what can really be done with this PDF?
 * Runs after the file is opened (a file picker cannot know whether a PDF is
 * scanned). Per page: amount of real text, presence of images. Never rejects a
 * document: it only describes it so the interface can offer the right path
 * (edit text directly, run OCR first, annotate only).
 */
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdfJs } from "./pdfjs";

export type PageContentKind = "text" | "scanned" | "empty";

export interface PageDiagnosis {
  index: number;
  /** Visible, non-whitespace characters of real text. */
  chars: number;
  hasImages: boolean;
  kind: PageContentKind;
  /** Page was not analysed (sampling on very long documents). */
  skipped?: boolean;
}

export type DocumentKind =
  /** Every analysed page has real text. */
  | "native"
  /** Some pages have text, others are images only. */
  | "mixed"
  /** No real text anywhere, images on the pages: a scan. */
  | "scanned"
  /** Neither text nor images. */
  | "empty";

export interface DocumentDiagnosis {
  kind: DocumentKind;
  pages: PageDiagnosis[];
  textPages: number;
  scannedPages: number;
  emptyPages: number;
  /** Only a sample of pages was analysed. */
  sampled: boolean;
  /** Pages whose text is only an invisible OCR layer (rendering mode 3). */
  ocrLayerPages: number;
}

/** A page counts as text when it holds at least this many characters. */
export const MIN_TEXT_CHARS = 12;
/** Beyond this many pages, a sample is analysed to keep the import snappy. */
export const DIAGNOSIS_FULL_LIMIT = 80;
const SAMPLE_HEAD = 40;
const SAMPLE_STEP = 10;

export function pagesToAnalyse(pageCount: number): number[] {
  if (pageCount <= DIAGNOSIS_FULL_LIMIT) return Array.from({ length: pageCount }, (_, i) => i);
  const set = new Set<number>();
  for (let i = 0; i < SAMPLE_HEAD; i += 1) set.add(i);
  for (let i = SAMPLE_HEAD; i < pageCount; i += SAMPLE_STEP) set.add(i);
  set.add(pageCount - 1);
  return [...set].sort((a, b) => a - b);
}

const IMAGE_OP_NAMES = [
  "paintImageXObject",
  "paintInlineImageXObject",
  "paintImageMaskXObject",
  "paintJpegXObject",
  "paintImageXObjectRepeat",
  "paintImageMaskXObjectRepeat",
  "paintImageMaskXObjectGroup",
];

/** Counts the characters pdf.js extracts, ignoring whitespace. */
export async function countPageText(doc: PDFDocumentProxy, pageIndex: number): Promise<number> {
  const page = await doc.getPage(pageIndex + 1);
  const content = await page.getTextContent();
  let chars = 0;
  for (const item of content.items) if ("str" in item) chars += item.str.replace(/\s/g, "").length;
  return chars;
}

export async function pageHasImages(doc: PDFDocumentProxy, pageIndex: number): Promise<boolean> {
  const pdfjs = await loadPdfJs();
  const OPS = pdfjs.OPS as unknown as Record<string, number>;
  const codes = new Set(
    IMAGE_OP_NAMES.map((n) => OPS[n]).filter((v): v is number => typeof v === "number"),
  );
  const page = await doc.getPage(pageIndex + 1);
  const list = await page.getOperatorList({ annotationMode: pdfjs.AnnotationMode.DISABLE });
  return list.fnArray.some((fn) => codes.has(fn));
}

/**
 * Whether a page's text is only an invisible layer (every text-showing
 * operator under rendering mode 3 or 7): the mark of an OCR'd scan.
 */
export async function pageTextIsInvisible(
  doc: PDFDocumentProxy,
  pageIndex: number,
): Promise<boolean> {
  const pdfjs = await loadPdfJs();
  const OPS = pdfjs.OPS as unknown as Record<string, number>;
  const page = await doc.getPage(pageIndex + 1);
  const list = await page.getOperatorList({ annotationMode: pdfjs.AnnotationMode.DISABLE });
  let mode = 0;
  let shown = 0;
  let invisible = 0;
  const stack: number[] = [];
  for (let i = 0; i < list.fnArray.length; i += 1) {
    const fn = list.fnArray[i];
    if (fn === OPS.save) stack.push(mode);
    else if (fn === OPS.restore) mode = stack.pop() ?? mode;
    else if (fn === OPS.setTextRenderingMode)
      mode = Number((list.argsArray[i] as unknown[])[0]) || 0;
    else if (fn === OPS.showText) {
      shown += 1;
      if (mode === 3 || mode === 7) invisible += 1;
    }
  }
  return shown > 0 && invisible === shown;
}

export async function diagnoseDocument(
  doc: PDFDocumentProxy,
  onProgress?: (done: number, total: number) => void,
): Promise<DocumentDiagnosis> {
  const indices = pagesToAnalyse(doc.numPages);
  const sampled = indices.length < doc.numPages;
  const pages: PageDiagnosis[] = [];
  let ocrLayerPages = 0;
  for (let i = 0; i < indices.length; i += 1) {
    const index = indices[i]!;
    const chars = await countPageText(doc, index);
    let kind: PageContentKind;
    let hasImages = false;
    if (chars >= MIN_TEXT_CHARS) {
      kind = "text";
      if (await pageTextIsInvisible(doc, index)) ocrLayerPages += 1;
    } else {
      hasImages = await pageHasImages(doc, index);
      kind = hasImages ? "scanned" : "empty";
    }
    pages.push({ index, chars, hasImages, kind });
    onProgress?.(i + 1, indices.length);
  }
  const textPages = pages.filter((p) => p.kind === "text").length;
  const scannedPages = pages.filter((p) => p.kind === "scanned").length;
  const emptyPages = pages.filter((p) => p.kind === "empty").length;
  let kind: DocumentKind;
  if (textPages > 0 && scannedPages === 0) kind = "native";
  else if (textPages > 0 && scannedPages > 0) kind = "mixed";
  else if (scannedPages > 0) kind = "scanned";
  else kind = "empty";
  return { kind, pages, textPages, scannedPages, emptyPages, sampled, ocrLayerPages };
}
