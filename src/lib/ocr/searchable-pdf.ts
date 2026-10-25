import { PDFDocument, StandardFonts, TextRenderingMode, rgb, setTextRenderingMode, type PDFPage } from "pdf-lib";
import { sanitizeForStandardFont } from "@/lib/pdf/fonts";
import type { OcrPageResult } from "./types";

export interface SearchablePageInput {
  /** Encoded page image (JPEG or PNG) kept as the visible layer. */
  image: Uint8Array;
  mimeType: "image/jpeg" | "image/png";
  /** Pixel size of the image. */
  width: number;
  height: number;
  /** OCR result for the same image (same pixel space). */
  ocr: OcrPageResult;
  /** Page size in points; defaults to the image at 150 dpi, capped to A4 width. */
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
 * (text rendering mode 3) whose words are positioned on their OCR bounding
 * boxes, so the document is selectable and searchable in any reader.
 */
export async function buildSearchablePdf(pages: SearchablePageInput[], options: SearchablePdfOptions = defaultSearchablePdfOptions): Promise<{ bytes: Uint8Array; wordsPlaced: number; wordsSkipped: number }> {
  const doc = await PDFDocument.create();
  doc.setProducer("OUTILIA (pdf-lib + Tesseract.js)");
  doc.setCreator("OUTILIA OCR");
  if (options.title) doc.setTitle(options.title);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let wordsPlaced = 0;
  let wordsSkipped = 0;

  for (const input of pages) {
    const image = input.mimeType === "image/png" ? await doc.embedPng(input.image) : await doc.embedJpg(input.image);
    const pageWidth = input.pageWidthPt ?? (input.width * 72) / 150;
    const pageHeight = input.pageHeightPt ?? (pageWidth * input.height) / input.width;
    const page = doc.addPage([pageWidth, pageHeight]);
    page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    const scaleX = pageWidth / input.width;
    const scaleY = pageHeight / input.height;
    const placed = drawInvisibleText(page, input.ocr, font, scaleX, scaleY, options.minConfidence);
    wordsPlaced += placed.placed;
    wordsSkipped += placed.skipped;
  }
  return { bytes: await doc.save({ useObjectStreams: true }), wordsPlaced, wordsSkipped };
}

function drawInvisibleText(page: PDFPage, ocr: OcrPageResult, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, scaleX: number, scaleY: number, minConfidence: number) {
  let placed = 0;
  let skipped = 0;
  const pageHeight = page.getHeight();
  page.pushOperators(setTextRenderingMode(TextRenderingMode.Invisible));
  for (const line of ocr.lines) {
    for (const word of line.words) {
      const { text } = sanitizeForStandardFont(word.text.trim());
      if (!text || word.confidence < minConfidence) {
        skipped += 1;
        continue;
      }
      const boxWidth = (word.x1 - word.x0) * scaleX;
      const boxHeight = (word.y1 - word.y0) * scaleY;
      if (boxWidth <= 0 || boxHeight <= 0) {
        skipped += 1;
        continue;
      }
      // Font size from the box height; horizontally stretch to match the box width.
      const size = Math.max(2, boxHeight * 0.85);
      const natural = font.widthOfTextAtSize(text, size) || 1;
      const x = word.x0 * scaleX;
      const y = pageHeight - word.y1 * scaleY + boxHeight * 0.2;
      page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0), opacity: 0, ...(Math.abs(natural - boxWidth) / boxWidth > 0.15 ? { horizontalScale: (boxWidth / natural) * 100 } : {}) });
      placed += 1;
    }
  }
  page.pushOperators(setTextRenderingMode(TextRenderingMode.Fill));
  return { placed, skipped };
}
