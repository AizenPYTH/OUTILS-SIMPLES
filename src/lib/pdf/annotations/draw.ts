import {
  PDFDocument,
  PDFPage,
  degrees,
  rgb,
  BlendMode,
  LineCapStyle,
  type PDFFont,
  type PDFImage,
} from "pdf-lib";
import { styleFor } from "../fonts";
import { embedFamilyFont, sanitizeForFamily } from "../fonts-embed";
import { toPdfError } from "../errors";
import {
  dashArrayFor,
  type Annotation,
  type ImageAnnotation,
  type LineAnnotation,
  type PathAnnotation,
  type TextAnnotation,
} from "./types";

export interface DrawReport {
  /** Text annotations whose characters had to be replaced (outside WinAnsi). */
  replacedCharacters: number;
  drawn: number;
}

/**
 * Draws a set of annotations onto their pages. Geometry is in PDF user space
 * so no transformation is needed here: positions match what the UI showed
 * (the UI converts with the same matrix the renderer used).
 *
 * Text and images use the pdf-lib `rotate` option so they appear upright on
 * pages carrying a /Rotate attribute: the UI stores them in user space where a
 * 90°-rotated page has its "visual top" on the x axis.
 */
export async function drawAnnotations(
  doc: PDFDocument,
  annotations: Annotation[],
): Promise<DrawReport> {
  const report: DrawReport = { replacedCharacters: 0, drawn: 0 };
  const fontCache = new Map<string, PDFFont>();
  const imageCache = new Map<string, PDFImage>();
  const pages = doc.getPages();

  const getFont = async (a: TextAnnotation): Promise<PDFFont> => {
    const style = styleFor(a.fontFamily, { bold: a.bold, italic: a.italic });
    const key = `${a.fontFamily}-${style.bold}-${style.italic}`;
    let font = fontCache.get(key);
    if (!font) {
      font = await embedFamilyFont(doc, a.fontFamily, style);
      fontCache.set(key, font);
    }
    return font;
  };

  const getImage = async (a: ImageAnnotation): Promise<PDFImage> => {
    let image = imageCache.get(a.id);
    if (!image) {
      image =
        a.mimeType === "image/png" ? await doc.embedPng(a.bytes) : await doc.embedJpg(a.bytes);
      imageCache.set(a.id, image);
    }
    return image;
  };

  try {
    for (const annotation of annotations) {
      const page = pages[annotation.pageIndex];
      if (!page) continue;
      const rotation = page.getRotation().angle;
      switch (annotation.type) {
        case "text": {
          const font = await getFont(annotation);
          const { text, replaced } = await sanitizeForFamily(
            annotation.text,
            annotation.fontFamily,
            styleFor(annotation.fontFamily, { bold: annotation.bold, italic: annotation.italic }),
          );
          if (replaced) report.replacedCharacters += 1;
          drawTextBlock(page, { ...annotation, text }, font, rotation);
          break;
        }
        case "path":
          drawPath(page, annotation);
          break;
        case "rect":
          page.drawRectangle({
            x: annotation.x,
            y: annotation.y,
            width: annotation.width,
            height: annotation.height,
            borderWidth: annotation.strokeColor ? annotation.strokeWidth : 0,
            borderColor: annotation.strokeColor
              ? rgb(annotation.strokeColor.r, annotation.strokeColor.g, annotation.strokeColor.b)
              : undefined,
            color: annotation.fillColor
              ? rgb(annotation.fillColor.r, annotation.fillColor.g, annotation.fillColor.b)
              : undefined,
            opacity: annotation.opacity,
            borderOpacity: annotation.opacity,
            borderDashArray: dashArrayFor(annotation.dash, annotation.strokeWidth),
          });
          break;
        case "ellipse":
          page.drawEllipse({
            x: annotation.x + annotation.width / 2,
            y: annotation.y + annotation.height / 2,
            xScale: annotation.width / 2,
            yScale: annotation.height / 2,
            borderWidth: annotation.strokeColor ? annotation.strokeWidth : 0,
            borderColor: annotation.strokeColor
              ? rgb(annotation.strokeColor.r, annotation.strokeColor.g, annotation.strokeColor.b)
              : undefined,
            color: annotation.fillColor
              ? rgb(annotation.fillColor.r, annotation.fillColor.g, annotation.fillColor.b)
              : undefined,
            opacity: annotation.opacity,
            borderOpacity: annotation.opacity,
            borderDashArray: dashArrayFor(annotation.dash, annotation.strokeWidth),
          });
          break;
        case "line":
          drawLine(page, annotation);
          break;
        case "highlight":
          page.drawRectangle({
            x: annotation.x,
            y: annotation.y,
            width: annotation.width,
            height: annotation.height,
            color: rgb(annotation.color.r, annotation.color.g, annotation.color.b),
            opacity: annotation.opacity,
            borderWidth: 0,
            blendMode: BlendMode.Multiply,
          });
          break;
        case "image": {
          const image = await getImage(annotation);
          drawImageBlock(page, annotation, image, rotation);
          break;
        }
      }
      report.drawn += 1;
    }
  } catch (error) {
    throw toPdfError(error);
  }
  return report;
}

/**
 * For rotated pages, pdf-lib rotates text/images around their anchor (bottom
 * left of the first line). We compute the anchor so the visual box stays where
 * the user placed it.
 */
function rotatedAnchor(
  rect: { x: number; y: number; width: number; height: number },
  rotation: number,
) {
  switch (((rotation % 360) + 360) % 360) {
    case 90:
      return { x: rect.x + rect.width, y: rect.y };
    case 180:
      return { x: rect.x + rect.width, y: rect.y + rect.height };
    case 270:
      return { x: rect.x, y: rect.y + rect.height };
    default:
      return { x: rect.x, y: rect.y };
  }
}

function drawTextBlock(page: PDFPage, a: TextAnnotation, font: PDFFont, rotation: number): void {
  const lineHeight = a.fontSize * 1.2;
  const lines = a.text.split("\n");
  const rot = ((rotation % 360) + 360) % 360;
  const visualWidth = rot === 90 || rot === 270 ? a.height : a.width;
  const visualHeight = rot === 90 || rot === 270 ? a.width : a.height;

  if (a.background) {
    page.drawRectangle({
      x: a.x,
      y: a.y,
      width: a.width,
      height: a.height,
      color: rgb(a.background.r, a.background.g, a.background.b),
      borderWidth: 0,
    });
  }

  const anchor = rotatedAnchor(a, rot);
  const padding = a.background ? 4 : 0;
  lines.forEach((line, i) => {
    const textWidth = font.widthOfTextAtSize(line, a.fontSize);
    let offsetX = padding;
    if (a.align === "center") offsetX = (visualWidth - textWidth) / 2;
    else if (a.align === "right") offsetX = visualWidth - textWidth - padding;
    const offsetY = visualHeight - padding - a.fontSize * 0.95 - i * lineHeight;
    const { x, y } = localToUser(anchor, offsetX, offsetY, rot);
    page.drawText(line, {
      x,
      y,
      size: a.fontSize,
      font,
      color: rgb(a.color.r, a.color.g, a.color.b),
      rotate: degrees(rot),
    });
    if (a.underline && line.length > 0) {
      // Underline 12 % of the size below the baseline, 6 % thick (common typographic defaults).
      const start = localToUser(anchor, offsetX, offsetY - a.fontSize * 0.12, rot);
      const end = localToUser(anchor, offsetX + textWidth, offsetY - a.fontSize * 0.12, rot);
      page.drawLine({
        start,
        end,
        thickness: Math.max(0.5, a.fontSize * 0.06),
        color: rgb(a.color.r, a.color.g, a.color.b),
      });
    }
  });
}

/** Converts an offset expressed in the visual (upright) frame into user space. */
function localToUser(anchor: { x: number; y: number }, dx: number, dy: number, rot: number) {
  switch (rot) {
    case 90:
      return { x: anchor.x - dy, y: anchor.y + dx };
    case 180:
      return { x: anchor.x - dx, y: anchor.y - dy };
    case 270:
      return { x: anchor.x + dy, y: anchor.y - dx };
    default:
      return { x: anchor.x + dx, y: anchor.y + dy };
  }
}

function drawImageBlock(
  page: PDFPage,
  a: ImageAnnotation,
  image: PDFImage,
  rotation: number,
): void {
  const rot = ((rotation % 360) + 360) % 360;
  const anchor = rotatedAnchor(a, rot);
  const visualWidth = rot === 90 || rot === 270 ? a.height : a.width;
  const visualHeight = rot === 90 || rot === 270 ? a.width : a.height;
  page.drawImage(image, {
    x: anchor.x,
    y: anchor.y,
    width: visualWidth,
    height: visualHeight,
    rotate: degrees(rot),
  });
}

function drawPath(page: PDFPage, a: PathAnnotation): void {
  if (a.points.length === 0) return;
  const color = rgb(a.color.r, a.color.g, a.color.b);
  if (a.points.length === 1) {
    const p = a.points[0]!;
    page.drawCircle({
      x: p.x,
      y: p.y,
      size: a.strokeWidth / 2,
      color,
      opacity: a.opacity,
      borderWidth: 0,
    });
    return;
  }
  // pdf-lib's drawSvgPath flips y (SVG convention); build the path in a
  // flipped frame so it lands exactly on the stored points.
  const first = a.points[0]!;
  const d = a.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${round(p.x - first.x)} ${round(first.y - p.y)}`)
    .join(" ");
  page.drawSvgPath(d, {
    x: first.x,
    y: first.y,
    borderColor: color,
    borderWidth: a.strokeWidth,
    borderOpacity: a.opacity,
    borderLineCap: LineCapStyle.Round,
    borderDashArray: dashArrayFor(a.dash, a.strokeWidth),
    color: undefined,
  });
}

function drawLine(page: PDFPage, a: LineAnnotation): void {
  const color = rgb(a.color.r, a.color.g, a.color.b);
  page.drawLine({
    start: a.start,
    end: a.end,
    thickness: a.strokeWidth,
    color,
    opacity: a.opacity,
    lineCap: LineCapStyle.Round,
    dashArray: dashArrayFor(a.dash, a.strokeWidth),
  });
  if (a.arrow) {
    const angle = Math.atan2(a.end.y - a.start.y, a.end.x - a.start.x);
    const size = Math.max(8, a.strokeWidth * 4);
    const left = {
      x: a.end.x - size * Math.cos(angle - Math.PI / 6),
      y: a.end.y - size * Math.sin(angle - Math.PI / 6),
    };
    const right = {
      x: a.end.x - size * Math.cos(angle + Math.PI / 6),
      y: a.end.y - size * Math.sin(angle + Math.PI / 6),
    };
    page.drawLine({
      start: a.end,
      end: left,
      thickness: a.strokeWidth,
      color,
      opacity: a.opacity,
      lineCap: LineCapStyle.Round,
    });
    page.drawLine({
      start: a.end,
      end: right,
      thickness: a.strokeWidth,
      color,
      opacity: a.opacity,
      lineCap: LineCapStyle.Round,
    });
  }
}

function round(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}
