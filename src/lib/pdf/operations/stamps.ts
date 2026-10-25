import { degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { resolveStandardFont, sanitizeForStandardFont, type FontFamily } from "../fonts";
import { loadPdfDocument, savePdfDocument } from "../load";
import type { RgbColor } from "../annotations/types";

export type StampPosition = "left" | "center" | "right";

export interface StampText {
  /** Template with placeholders: {page}, {total}, {date}, {file}. */
  template: string;
  position: StampPosition;
}

export interface StampOptions {
  header?: StampText | null;
  footer?: StampText | null;
  fontFamily: FontFamily;
  fontSize: number;
  color: RgbColor;
  /** Distance from the page edge in points. */
  margin: number;
  /** First page number value (e.g. 1) and index of the first page to stamp. */
  startNumber: number;
  startPageIndex: number;
  /** Values for {date} and {file}. */
  date: string;
  fileName: string;
}

export const defaultStampOptions: StampOptions = {
  header: null,
  footer: { template: "{page} / {total}", position: "center" },
  fontFamily: "helvetica",
  fontSize: 10,
  color: { r: 0.2, g: 0.2, b: 0.2 },
  margin: 28,
  startNumber: 1,
  startPageIndex: 0,
  date: "",
  fileName: "",
};

export function renderTemplate(template: string, values: { page: number; total: number; date: string; file: string }): string {
  return template
    .replace(/\{page\}/g, String(values.page))
    .replace(/\{total\}/g, String(values.total))
    .replace(/\{date\}/g, values.date)
    .replace(/\{file\}/g, values.file);
}

/**
 * Adds headers/footers/page numbers. Text is placed in the visual frame of
 * each page (honours /Rotate) at the given edge margin.
 */
export async function stampPages(bytes: Uint8Array, options: StampOptions): Promise<{ bytes: Uint8Array; replaced: boolean }> {
  const doc = await loadPdfDocument(bytes);
  const font = await doc.embedFont(resolveStandardFont(options.fontFamily, { bold: false, italic: false }));
  const pages = doc.getPages();
  const total = pages.length - options.startPageIndex;
  let replaced = false;
  pages.forEach((page, index) => {
    if (index < options.startPageIndex) return;
    const number = options.startNumber + (index - options.startPageIndex);
    const values = { page: number, total, date: options.date, file: options.fileName };
    if (options.header) {
      const text = sanitizeForStandardFont(renderTemplate(options.header.template, values));
      replaced ||= text.replaced;
      drawEdgeText(page, font, text.text, options, options.header.position, "top");
    }
    if (options.footer) {
      const text = sanitizeForStandardFont(renderTemplate(options.footer.template, values));
      replaced ||= text.replaced;
      drawEdgeText(page, font, text.text, options, options.footer.position, "bottom");
    }
  });
  return { bytes: await savePdfDocument(doc), replaced };
}

function drawEdgeText(page: PDFPage, font: PDFFont, text: string, options: StampOptions, position: StampPosition, edge: "top" | "bottom"): void {
  if (!text) return;
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  const { width, height } = page.getSize();
  const visualWidth = rotation === 90 || rotation === 270 ? height : width;
  const visualHeight = rotation === 90 || rotation === 270 ? width : height;
  const textWidth = font.widthOfTextAtSize(text, options.fontSize);
  const x = position === "left" ? options.margin : position === "right" ? visualWidth - options.margin - textWidth : (visualWidth - textWidth) / 2;
  const y = edge === "bottom" ? options.margin : visualHeight - options.margin - options.fontSize;
  const { x: ux, y: uy } = visualToUser(x, y, rotation, width, height);
  page.drawText(text, { x: ux, y: uy, size: options.fontSize, font, color: rgb(options.color.r, options.color.g, options.color.b), rotate: degrees(rotation) });
}

/** Maps a point in the visual (upright) frame to user space for a page with /Rotate. */
export function visualToUser(vx: number, vy: number, rotation: number, pageWidth: number, pageHeight: number): { x: number; y: number } {
  switch (rotation) {
    case 90:
      return { x: pageWidth - vy, y: vx };
    case 180:
      return { x: pageWidth - vx, y: pageHeight - vy };
    case 270:
      return { x: vy, y: pageHeight - vx };
    default:
      return { x: vx, y: vy };
  }
}
