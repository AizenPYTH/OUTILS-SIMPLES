import {
  PDFArray,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFString,
  PDFDocument,
  PDFPage,
  beginMarkedContent,
  decodePDFRawStream,
  degrees,
  endMarkedContent,
  rgb,
  type PDFFont,
  type PDFImage,
} from "pdf-lib";
import { resolveStandardFont, sanitizeForStandardFont, type FontFamily } from "../fonts";
import { PdfError, toPdfError } from "../errors";
import { loadPdfDocument, savePdfDocument } from "../load";
import type { RgbColor } from "../annotations/types";
import { t } from "@/lib/i18n";
import { tr } from "@/lib/i18n/messages";

/** Marked-content tag wrapping every watermark drawn by this platform. */
export const WATERMARK_TAG = "AveropdfWatermark";
/** Info-dictionary key recording the pages carrying an AVEROPDF watermark. */
export const WATERMARK_INFO_KEY = "AveropdfWatermark";

export type WatermarkPosition =
  | "center"
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "tiled";

interface WatermarkBase {
  /** 0..1 */
  opacity: number;
  /** degrees, counter-clockwise */
  rotation: number;
  position: WatermarkPosition;
  /** 0-based page indices; empty array = all pages. */
  pageIndices: number[];
}

export interface TextWatermarkOptions extends WatermarkBase {
  kind: "text";
  text: string;
  fontSize: number;
  fontFamily: FontFamily;
  bold: boolean;
  color: RgbColor;
}

export interface ImageWatermarkOptions extends WatermarkBase {
  kind: "image";
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg";
  /** Width as a fraction of the page width (0.05..1). */
  widthRatio: number;
}

export type WatermarkOptions = TextWatermarkOptions | ImageWatermarkOptions;

export interface WatermarkPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Positions a box of (w, h) on a page of (pw, ph) with a margin. Shared by preview and export. */
export function placeWatermark(
  pageWidth: number,
  pageHeight: number,
  width: number,
  height: number,
  position: Exclude<WatermarkPosition, "tiled">,
  margin = 24,
): WatermarkPlacement {
  const centerX = (pageWidth - width) / 2;
  const centerY = (pageHeight - height) / 2;
  const left = margin;
  const right = pageWidth - width - margin;
  const bottom = margin;
  const top = pageHeight - height - margin;
  const map: Record<Exclude<WatermarkPosition, "tiled">, WatermarkPlacement> = {
    center: { x: centerX, y: centerY, width, height },
    "top-left": { x: left, y: top, width, height },
    "top-center": { x: centerX, y: top, width, height },
    "top-right": { x: right, y: top, width, height },
    "middle-left": { x: left, y: centerY, width, height },
    "middle-right": { x: right, y: centerY, width, height },
    "bottom-left": { x: left, y: bottom, width, height },
    "bottom-center": { x: centerX, y: bottom, width, height },
    "bottom-right": { x: right, y: bottom, width, height },
  };
  return map[position];
}

/** Tile anchors (bottom-left of each tile) covering the page with spacing. */
export function tilePositions(
  pageWidth: number,
  pageHeight: number,
  width: number,
  height: number,
): { x: number; y: number }[] {
  const gapX = Math.max(width * 1.6, 120);
  const gapY = Math.max(height * 3, 120);
  const out: { x: number; y: number }[] = [];
  for (let y = -height; y < pageHeight + height; y += gapY) {
    for (let x = -width; x < pageWidth + width; x += gapX) out.push({ x, y });
  }
  return out;
}

export interface WatermarkResult {
  bytes: Uint8Array;
  pagesMarked: number[];
  replacedCharacters: boolean;
}

/**
 * Draws the watermark inside a marked-content sequence tagged WATERMARK_TAG
 * and records the marked pages in the Info dictionary so that the
 * "manage watermark" tool can remove it later without guessing.
 */
export async function addWatermark(
  bytes: Uint8Array,
  options: WatermarkOptions,
): Promise<WatermarkResult> {
  const doc = await loadPdfDocument(bytes);
  const pages = doc.getPages();
  const targets = options.pageIndices.length === 0 ? pages.map((_, i) => i) : options.pageIndices;
  for (const index of targets) {
    if (!pages[index])
      throw new PdfError("INVALID_RANGE", t.ranges.errorOutOfBounds(pages.length), {
        recoverable: true,
      });
  }
  if (options.kind === "text" && options.text.trim().length === 0) {
    throw new PdfError("NO_SELECTION", tr("Saisissez le texte du filigrane."), {
      recoverable: true,
    });
  }

  let font: PDFFont | null = null;
  let image: PDFImage | null = null;
  let replacedCharacters = false;
  let text = "";
  if (options.kind === "text") {
    font = await doc.embedFont(
      resolveStandardFont(options.fontFamily, { bold: options.bold, italic: false }),
    );
    const sanitized = sanitizeForStandardFont(options.text);
    text = sanitized.text;
    replacedCharacters = sanitized.replaced;
  } else {
    image =
      options.mimeType === "image/png"
        ? await doc.embedPng(options.bytes)
        : await doc.embedJpg(options.bytes);
  }

  try {
    for (const index of targets) {
      const page = pages[index]!;
      page.pushOperators(beginMarkedContent(WATERMARK_TAG));
      drawWatermarkOnPage(page, options, { font, image, text });
      page.pushOperators(endMarkedContent());
    }
  } catch (error) {
    throw toPdfError(error);
  }

  recordWatermarkPages(doc, targets);
  return { bytes: await savePdfDocument(doc), pagesMarked: targets, replacedCharacters };
}

function drawWatermarkOnPage(
  page: PDFPage,
  options: WatermarkOptions,
  assets: { font: PDFFont | null; image: PDFImage | null; text: string },
): void {
  const { width: pw, height: ph } = page.getSize();
  let w: number;
  let h: number;
  if (options.kind === "text") {
    w = assets.font!.widthOfTextAtSize(assets.text, options.fontSize);
    h = options.fontSize;
  } else {
    const ratio = Math.min(1, Math.max(0.05, options.widthRatio));
    w = pw * ratio;
    h = (assets.image!.height / assets.image!.width) * w;
  }
  const rotation = degrees(options.rotation);
  const anchors =
    options.position === "tiled"
      ? tilePositions(pw, ph, w, h)
      : [placeWatermark(pw, ph, w, h, options.position)];

  for (const anchor of anchors) {
    // Rotate around the box centre so the placement stays visually centred.
    const cx = anchor.x + w / 2;
    const cy = anchor.y + h / 2;
    const rad = (options.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const x = cx - (w / 2) * cos + (h / 2) * sin;
    const y = cy - (w / 2) * sin - (h / 2) * cos;
    if (options.kind === "text") {
      page.drawText(assets.text, {
        x,
        y,
        size: options.fontSize,
        font: assets.font!,
        color: rgb(options.color.r, options.color.g, options.color.b),
        opacity: options.opacity,
        rotate: rotation,
      });
    } else {
      page.drawImage(assets.image!, {
        x,
        y,
        width: w,
        height: h,
        opacity: options.opacity,
        rotate: rotation,
      });
    }
  }
}

function recordWatermarkPages(doc: PDFDocument, pageIndices: number[]): void {
  const info = getOrCreateInfoDict(doc);
  const existing = readWatermarkRecord(doc);
  const merged = Array.from(new Set([...existing, ...pageIndices])).sort((a, b) => a - b);
  info.set(PDFName.of(WATERMARK_INFO_KEY), PDFString.of(JSON.stringify({ v: 1, pages: merged })));
}

function getOrCreateInfoDict(doc: PDFDocument): PDFDict {
  const existing = doc.context.lookup(doc.context.trailerInfo.Info);
  if (existing instanceof PDFDict) return existing;
  const info = doc.context.obj({});
  doc.context.trailerInfo.Info = doc.context.register(info);
  return info;
}

/** Pages recorded by addWatermark, or [] when the document carries no record. */
export function readWatermarkRecord(doc: PDFDocument): number[] {
  const info = doc.context.lookup(doc.context.trailerInfo.Info);
  if (!(info instanceof PDFDict)) return [];
  const value = info.get(PDFName.of(WATERMARK_INFO_KEY));
  let raw: string | null = null;
  if (value instanceof PDFString) raw = value.decodeText();
  else if (value instanceof PDFHexString) raw = value.decodeText();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { pages?: unknown };
    if (Array.isArray(parsed.pages))
      return parsed.pages.filter((p): p is number => Number.isInteger(p));
  } catch {
    return [];
  }
  return [];
}

// ------------------------------------------------------------------ analysis

export interface WatermarkDiagnostic {
  /** Pages (0-based) where an AVEROPDF marked-content watermark was found. */
  averopdfPages: number[];
  /** Pages (0-based) carrying /Watermark annotations, with counts. */
  watermarkAnnotations: { pageIndex: number; count: number }[];
  /** Pages where the Info record claims a watermark but no marker was found (edited by another tool). */
  recordedButMissing: number[];
  pageCount: number;
}

function getPageContentStreams(
  doc: PDFDocument,
  page: PDFPage,
): { ref: PDFRef; stream: PDFRawStream }[] {
  const contents = page.node.Contents();
  const out: { ref: PDFRef; stream: PDFRawStream }[] = [];
  const collect = (ref: PDFRef) => {
    const obj = doc.context.lookup(ref);
    if (obj instanceof PDFRawStream) out.push({ ref, stream: obj });
  };
  if (contents instanceof PDFRef) collect(contents);
  else if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i += 1) {
      const item = contents.get(i);
      if (item instanceof PDFRef) collect(item);
    }
  } else if (contents instanceof PDFRawStream) {
    const ref = doc.context.getObjectRef(contents);
    if (ref) out.push({ ref, stream: contents });
  }
  return out;
}

function decodeStream(stream: PDFRawStream): Uint8Array {
  const filter = stream.dict.get(PDFName.of("Filter"));
  if (!filter) return stream.contents;
  return decodePDFRawStream(stream).decode();
}

const MARKER_START = `/${WATERMARK_TAG} BMC`;
const MARKER_END = "EMC";

function latin1(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return s;
}

function latin1Bytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

/**
 * Removes every `/AveropdfWatermark BMC … EMC` block from a content stream.
 * Nested marked content inside the block is handled by depth counting.
 */
export function stripMarkedContent(content: string): { content: string; removed: number } {
  let removed = 0;
  let cursor = 0;
  let out = "";
  while (cursor < content.length) {
    const start = content.indexOf(MARKER_START, cursor);
    if (start === -1) {
      out += content.slice(cursor);
      break;
    }
    out += content.slice(cursor, start);
    // Walk tokens after the marker to find the matching EMC.
    let depth = 1;
    let pos = start + MARKER_START.length;
    const tokenRe = /\bBMC\b|\bBDC\b|\bEMC\b/g;
    tokenRe.lastIndex = pos;
    let match: RegExpExecArray | null;
    let endPos = -1;
    while ((match = tokenRe.exec(content)) !== null) {
      if (match[0] === "EMC") {
        depth -= 1;
        if (depth === 0) {
          endPos = match.index + MARKER_END.length;
          break;
        }
      } else {
        depth += 1;
      }
    }
    if (endPos === -1) {
      // Unterminated marker: keep the rest untouched rather than guessing.
      out += content.slice(start);
      break;
    }
    removed += 1;
    pos = endPos;
    cursor = pos;
  }
  return { content: out, removed };
}

export async function analyzeWatermarks(bytes: Uint8Array): Promise<WatermarkDiagnostic> {
  const doc = await loadPdfDocument(bytes);
  const pages = doc.getPages();
  const averopdfPages: number[] = [];
  const watermarkAnnotations: { pageIndex: number; count: number }[] = [];

  pages.forEach((page, index) => {
    let found = false;
    for (const { stream } of getPageContentStreams(doc, page)) {
      try {
        if (latin1(decodeStream(stream)).includes(MARKER_START)) {
          found = true;
          break;
        }
      } catch {
        // Unsupported filter: cannot inspect this stream.
      }
    }
    if (found) averopdfPages.push(index);

    const annots = page.node.Annots();
    if (annots) {
      let count = 0;
      for (let i = 0; i < annots.size(); i += 1) {
        const annot = doc.context.lookup(annots.get(i));
        if (
          annot instanceof PDFDict &&
          annot.get(PDFName.of("Subtype")) === PDFName.of("Watermark")
        )
          count += 1;
      }
      if (count > 0) watermarkAnnotations.push({ pageIndex: index, count });
    }
  });

  const recorded = readWatermarkRecord(doc);
  const recordedButMissing = recorded.filter((p) => !averopdfPages.includes(p));
  return { averopdfPages, watermarkAnnotations, recordedButMissing, pageCount: pages.length };
}

export interface RemoveWatermarkOptions {
  removeAveropdf: boolean;
  removeWatermarkAnnotations: boolean;
}

export interface RemoveWatermarkResult {
  bytes: Uint8Array;
  removedBlocks: number;
  removedAnnotations: number;
}

export async function removeWatermarks(
  bytes: Uint8Array,
  options: RemoveWatermarkOptions,
): Promise<RemoveWatermarkResult> {
  const doc = await loadPdfDocument(bytes);
  const pages = doc.getPages();
  let removedBlocks = 0;
  let removedAnnotations = 0;

  try {
    for (const page of pages) {
      if (options.removeAveropdf) {
        for (const { ref, stream } of getPageContentStreams(doc, page)) {
          let decoded: Uint8Array;
          try {
            decoded = decodeStream(stream);
          } catch {
            continue;
          }
          const text = latin1(decoded);
          if (!text.includes(MARKER_START)) continue;
          const { content, removed } = stripMarkedContent(text);
          if (removed === 0) continue;
          removedBlocks += removed;
          // Replace the stream with an uncompressed one holding the cleaned content.
          const dict = doc.context.obj({});
          const newStream = PDFRawStream.of(dict, latin1Bytes(content));
          dict.set(PDFName.of("Length"), PDFNumber.of(content.length));
          doc.context.assign(ref, newStream);
        }
      }
      if (options.removeWatermarkAnnotations) {
        const annots = page.node.Annots();
        if (annots) {
          const keep: (PDFRef | PDFDict)[] = [];
          for (let i = 0; i < annots.size(); i += 1) {
            const item = annots.get(i);
            const annot = doc.context.lookup(item);
            if (
              annot instanceof PDFDict &&
              annot.get(PDFName.of("Subtype")) === PDFName.of("Watermark")
            ) {
              removedAnnotations += 1;
              continue;
            }
            if (item instanceof PDFRef || item instanceof PDFDict) keep.push(item);
          }
          if (removedAnnotations > 0) {
            const array = doc.context.obj(keep);
            page.node.set(PDFName.of("Annots"), array);
          }
        }
      }
    }
    if (options.removeAveropdf) {
      const info = doc.context.lookup(doc.context.trailerInfo.Info);
      if (info instanceof PDFDict) info.delete(PDFName.of(WATERMARK_INFO_KEY));
    }
  } catch (error) {
    throw toPdfError(error);
  }

  if (removedBlocks === 0 && removedAnnotations === 0) {
    throw new PdfError(
      "UNSUPPORTED",
      tr("Aucun filigrane retirable n'a été trouvé dans ce document."),
      { recoverable: true },
    );
  }
  return { bytes: await savePdfDocument(doc), removedBlocks, removedAnnotations };
}
