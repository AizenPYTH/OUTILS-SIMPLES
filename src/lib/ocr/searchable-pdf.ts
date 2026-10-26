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
import { loadPdfDocument, savePdfDocument } from "@/lib/pdf/load";
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

export function drawInvisibleText(
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

export interface OcrLayerPageInput {
  /** Index of the page in the document. */
  pageIndex: number;
  /** Recognition result of the page image rendered at `imageWidth` × `imageHeight` px. */
  ocr: OcrPageResult;
  imageWidth: number;
  imageHeight: number;
}

/**
 * Adds an invisible, searchable text layer to the pages of an EXISTING PDF
 * (the editor's scanned pages) without touching their content: the page keeps
 * its image, size, rotation and other operators. The layer is placed in the
 * page's user space from the image rendered for OCR (same visual size).
 */
export async function addOcrLayer(
  bytes: Uint8Array,
  pages: OcrLayerPageInput[],
  options: SearchablePdfOptions = defaultSearchablePdfOptions,
): Promise<{ bytes: Uint8Array; wordsPlaced: number; wordsSkipped: number }> {
  const doc = await loadPdfDocument(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let wordsPlaced = 0;
  let wordsSkipped = 0;
  for (const input of pages) {
    const page = doc.getPage(input.pageIndex);
    // The OCR image is the page as displayed (its /Rotate applied): the user space of a
    // rotated page is itself rotated, so draw in a frame that undoes /Rotate.
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;
    const { width, height } = page.getSize();
    const visualWidth = rotation % 180 === 0 ? width : height;
    const visualHeight = rotation % 180 === 0 ? height : width;
    const scaleX = visualWidth / input.imageWidth;
    const scaleY = visualHeight / input.imageHeight;
    if (rotation === 0) {
      const placed = drawInvisibleText(
        page,
        input.ocr,
        font,
        scaleX,
        scaleY,
        options.minConfidence,
      );
      wordsPlaced += placed.placed;
      wordsSkipped += placed.skipped;
      continue;
    }
    // Rotated page: express the OCR result in the unrotated user space by rotating the
    // boxes back (displayed image → image of the unrotated page), then scale that image
    // onto the page's own width and height.
    const rotated = rotateOcrResultIntoUserSpace(
      input.ocr,
      rotation,
      input.imageWidth,
      input.imageHeight,
    );
    const placed = drawInvisibleText(
      page,
      rotated,
      font,
      width / rotated.width,
      height / rotated.height,
      options.minConfidence,
    );
    wordsPlaced += placed.placed;
    wordsSkipped += placed.skipped;
  }
  return { bytes: await savePdfDocument(doc), wordsPlaced, wordsSkipped };
}

/**
 * Maps an OCR result given in the DISPLAYED image (page /Rotate applied) to
 * the page's unrotated user space, in pixels of an image of the unrotated
 * page (width/height swapped for 90° and 270°).
 */
export function rotateOcrResultIntoUserSpace(
  ocr: OcrPageResult,
  rotation: number,
  imageWidth: number,
  imageHeight: number,
): OcrPageResult {
  const r = ((rotation % 360) + 360) % 360;
  if (r === 0) return ocr;
  const point = (x: number, y: number) => {
    // Displayed image = unrotated page rotated clockwise by r (PDF /Rotate is clockwise).
    switch (r) {
      case 90:
        return { x: y, y: imageWidth - x };
      case 180:
        return { x: imageWidth - x, y: imageHeight - y };
      default:
        return { x: imageHeight - y, y: x };
    }
  };
  const box = (b: { x0: number; y0: number; x1: number; y1: number }) => {
    const a = point(b.x0, b.y0);
    const c = point(b.x1, b.y1);
    return {
      x0: Math.min(a.x, c.x),
      y0: Math.min(a.y, c.y),
      x1: Math.max(a.x, c.x),
      y1: Math.max(a.y, c.y),
    };
  };
  const angleOf = (a: OcrLine["angle"]) => ((((a + r) % 360) + 360) % 360) as OcrLine["angle"];
  return {
    ...ocr,
    width: r % 180 === 0 ? imageWidth : imageHeight,
    height: r % 180 === 0 ? imageHeight : imageWidth,
    lines: ocr.lines.map((line) => {
      const b0 = point(line.baseline.x0, line.baseline.y0);
      const b1 = point(line.baseline.x1, line.baseline.y1);
      return {
        ...line,
        ...box(line),
        angle: angleOf(line.angle),
        baseline: { x0: b0.x, y0: b0.y, x1: b1.x, y1: b1.y },
        words: line.words.map((w) => ({ ...w, ...box(w) })),
      };
    }),
  };
}
