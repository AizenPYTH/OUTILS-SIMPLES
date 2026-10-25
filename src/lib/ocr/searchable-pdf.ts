import {
  PDFDocument,
  StandardFonts,
  TextRenderingMode,
  degrees,
  rgb,
  setTextRenderingMode,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { sanitizeForStandardFont } from "@/lib/pdf/fonts";
import type { OcrLine, OcrPageResult, OcrWord } from "./types";

export interface SearchablePageInput {
  /** Encoded page image (JPEG or PNG) kept as the visible layer: the ORIGINAL, never a preprocessed copy. */
  image: Uint8Array;
  mimeType: "image/jpeg" | "image/png";
  /** Pixel size of the image. */
  width: number;
  height: number;
  /** OCR result for the same image (same pixel space). */
  ocr: OcrPageResult;
  /** Page size in points; defaults to the image at 150 dpi. */
  pageWidthPt?: number;
  pageHeightPt?: number;
}

export interface SearchablePdfOptions {
  /** Words below this confidence (0–100) are skipped to avoid polluting search. */
  minConfidence: number;
  title?: string;
}

export const defaultSearchablePdfOptions: SearchablePdfOptions = { minConfidence: 30 };

/**
 * Builds a PDF with the page image as background and an invisible text layer
 * (text rendering mode 3) whose words sit on their OCR bounding boxes with
 * the reading direction of their line (0°, 90°, 180°, 270° plus residual
 * skew), so the document is selectable and searchable in any reader, in the
 * right place and the right orientation.
 */
export async function buildSearchablePdf(
  pages: SearchablePageInput[],
  options: SearchablePdfOptions = defaultSearchablePdfOptions,
): Promise<{ bytes: Uint8Array; wordsPlaced: number; wordsSkipped: number }> {
  const doc = await PDFDocument.create();
  doc.setProducer("OUTILIA (pdf-lib + Tesseract.js)");
  doc.setCreator("OUTILIA OCR");
  if (options.title) doc.setTitle(options.title);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let wordsPlaced = 0;
  let wordsSkipped = 0;

  for (const input of pages) {
    const image =
      input.mimeType === "image/png"
        ? await doc.embedPng(input.image)
        : await doc.embedJpg(input.image);
    const pageWidth = input.pageWidthPt ?? (input.width * 72) / 150;
    const pageHeight = input.pageHeightPt ?? (pageWidth * input.height) / input.width;
    const page = doc.addPage([pageWidth, pageHeight]);
    page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    const placed = drawInvisibleText(
      page,
      input.ocr,
      font,
      pageWidth / input.width,
      pageHeight / input.height,
      options.minConfidence,
    );
    wordsPlaced += placed.placed;
    wordsSkipped += placed.skipped;
  }
  return { bytes: await doc.save({ useObjectStreams: true }), wordsPlaced, wordsSkipped };
}

/** Where a word's text origin goes for each reading direction (image pixels, y down). */
export function wordOrigin(word: OcrWord, line: OcrLine, extent: number): { x: number; y: number } {
  const descent = extent * 0.2;
  switch (line.angle) {
    case 90:
      return { x: word.x1 - descent, y: word.y1 };
    case 180:
      return { x: word.x1, y: word.y0 + descent };
    case 270:
      return { x: word.x0 + descent, y: word.y0 };
    default:
      return { x: word.x0, y: word.y1 - descent };
  }
}

function drawInvisibleText(
  page: PDFPage,
  ocr: OcrPageResult,
  font: PDFFont,
  scaleX: number,
  scaleY: number,
  minConfidence: number,
) {
  let placed = 0;
  let skipped = 0;
  const pageHeight = page.getHeight();
  page.pushOperators(setTextRenderingMode(TextRenderingMode.Invisible));
  for (const line of ocr.lines) {
    const horizontal = line.angle % 180 === 0;
    // Glyph height comes from the line (stable), not from each word (punctuation would shrink it).
    const lineExtentPx = horizontal ? line.y1 - line.y0 : line.x1 - line.x0;
    for (const word of line.words) {
      const { text } = sanitizeForStandardFont(word.text.trim());
      if (!text || word.confidence < minConfidence) {
        skipped += 1;
        continue;
      }
      const wordExtentPx = horizontal ? word.y1 - word.y0 : word.x1 - word.x0;
      const extentPx = Math.max(2, Math.min(lineExtentPx, wordExtentPx * 1.5) || wordExtentPx);
      const alongPx = horizontal ? word.x1 - word.x0 : word.y1 - word.y0;
      if (extentPx <= 0 || alongPx <= 0) {
        skipped += 1;
        continue;
      }
      const scaleExtent = horizontal ? scaleY : scaleX;
      const scaleAlong = horizontal ? scaleX : scaleY;
      const size = Math.max(2, extentPx * scaleExtent * 0.85);
      const natural = font.widthOfTextAtSize(text, size) || 1;
      const target = alongPx * scaleAlong;
      const origin = wordOrigin(word, line, extentPx);
      const x = origin.x * scaleX;
      const y = pageHeight - origin.y * scaleY;
      page.drawText(text, {
        x,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
        opacity: 0,
        rotate: degrees(line.angle + line.skew),
        ...(Math.abs(natural - target) / target > 0.15
          ? { horizontalScale: (target / natural) * 100 }
          : {}),
      });
      placed += 1;
    }
  }
  page.pushOperators(setTextRenderingMode(TextRenderingMode.Fill));
  return { placed, skipped };
}
