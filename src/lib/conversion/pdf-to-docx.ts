import { PdfError, toPdfError } from "@/lib/pdf/errors";
import { openPdf } from "@/lib/pdf/browser/pdfjs";
import { extractImages, type ExtractedImage } from "@/lib/pdf/operations/extract-images";
import { tr } from "@/lib/i18n/messages";

export interface PdfToDocxOptions {
  /** Keep one Word page per PDF page (page break after each page). */
  pageBreaks: boolean;
  /** Insert the raster images found on each page after its text. */
  images: boolean;
  onProgress?: (current: number, total: number) => void;
}

export const defaultPdfToDocxOptions: PdfToDocxOptions = { pageBreaks: true, images: true };

export interface PdfToDocxResult {
  bytes: Uint8Array;
  pageCount: number;
  paragraphCount: number;
  imageCount: number;
  /** Pages without any text layer (scans): their image is kept, the text is not (use OCR first). */
  emptyPages: number[];
  warnings: string[];
}

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface Item {
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
  bold: boolean;
  italic: boolean;
  mono: boolean;
  eol: boolean;
}

interface Line {
  items: Item[];
  y: number;
  size: number;
}

export interface DocxRun {
  text: string;
  bold: boolean;
  italic: boolean;
  mono: boolean;
  size: number;
}

export interface DocxParagraph {
  runs: DocxRun[];
  /** 1–3 when the text is markedly larger than the body text, else 0. */
  heading: 0 | 1 | 2 | 3;
  /** Approximate alignment (centred lines are common for titles). */
  align: "left" | "center";
}

interface TextItemLike {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL?: boolean;
}

interface StyleLike {
  fontFamily?: string;
}

function styleFlags(fontName: string, style: StyleLike | undefined) {
  const name = `${fontName} ${style?.fontFamily ?? ""}`;
  return {
    bold: /bold|black|heavy|semibold|demibold/i.test(name),
    italic: /italic|oblique/i.test(name),
    mono: /mono|courier|consolas|menlo/i.test(name),
  };
}

/** Groups pdf.js text items into lines (same baseline) and paragraphs (vertical gaps, size changes). */
export function itemsToParagraphs(
  rawItems: TextItemLike[],
  styles: Record<string, StyleLike> = {},
  pageWidth = 595,
): DocxParagraph[] {
  const items: Item[] = rawItems
    .filter((it) => it.str.length > 0)
    .map((it) => {
      const [a, b, c, d, e, f] = it.transform as [number, number, number, number, number, number];
      const size = Math.max(1, Math.hypot(c, d)) || Math.max(1, Math.hypot(a, b));
      return {
        text: it.str,
        x: e,
        y: f,
        width: it.width,
        size,
        eol: Boolean(it.hasEOL),
        ...styleFlags(it.fontName, styles[it.fontName]),
      };
    });
  if (items.length === 0) return [];

  // Lines: items whose baselines differ by less than a third of the font size.
  const sorted = [...items].sort((p, q) => q.y - p.y || p.x - q.x);
  const lines: Line[] = [];
  for (const item of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - item.y) <= Math.max(last.size, item.size) * 0.35) {
      last.items.push(item);
      last.size = Math.max(last.size, item.size);
    } else lines.push({ items: [item], y: item.y, size: item.size });
  }
  for (const line of lines) line.items.sort((p, q) => p.x - q.x);

  const sizes = lines.map((l) => l.size).sort((p, q) => p - q);
  const body = sizes[Math.floor(sizes.length / 2)] ?? 11;

  const paragraphs: DocxParagraph[] = [];
  let current: { runs: DocxRun[]; size: number; left: number; right: number } | null = null;
  let previous: Line | null = null;
  const flush = () => {
    if (!current || current.runs.length === 0) return;
    const text = current.runs.map((r) => r.text).join("");
    if (!text.trim()) {
      current = null;
      return;
    }
    const ratio = current.size / body;
    const heading =
      ratio >= 1.8 ? 1 : ratio >= 1.45 ? 2 : ratio >= 1.2 && text.length < 120 ? 3 : 0;
    const leftGap = current.left;
    const rightGap = pageWidth - current.right;
    const centered = Math.abs(leftGap - rightGap) < pageWidth * 0.06 && leftGap > pageWidth * 0.12;
    paragraphs.push({
      runs: mergeRuns(current.runs),
      heading,
      align: centered ? "center" : "left",
    });
    current = null;
  };

  for (const line of lines) {
    const lineLeft = line.items[0]!.x;
    const lineRight = Math.max(...line.items.map((it) => it.x + it.width));
    const gap = previous ? previous.y - line.y : 0;
    const newParagraph =
      !current ||
      !previous ||
      gap > Math.max(previous.size, line.size) * 1.6 ||
      Math.abs(line.size - current.size) > body * 0.25 ||
      (previous.items[previous.items.length - 1]?.eol === true &&
        lineLeft > current.left + body * 1.5);
    if (newParagraph) {
      flush();
      current = { runs: [], size: line.size, left: lineLeft, right: lineRight };
    } else if (current) {
      current.runs.push({ text: " ", bold: false, italic: false, mono: false, size: line.size });
      current.left = Math.min(current.left, lineLeft);
      current.right = Math.max(current.right, lineRight);
    }
    let cursor: number | null = null;
    for (const item of line.items) {
      const space =
        cursor !== null && item.x - cursor > item.size * 0.18 && !item.text.startsWith(" ");
      const text = (space ? " " : "") + item.text;
      current!.runs.push({
        text,
        bold: item.bold,
        italic: item.italic,
        mono: item.mono,
        size: item.size,
      });
      cursor = item.x + item.width;
    }
    previous = line;
  }
  flush();
  return paragraphs;
}

function mergeRuns(runs: DocxRun[]): DocxRun[] {
  const out: DocxRun[] = [];
  for (const run of runs) {
    const last = out[out.length - 1];
    if (
      last &&
      last.bold === run.bold &&
      last.italic === run.italic &&
      last.mono === run.mono &&
      Math.abs(last.size - run.size) < 0.5
    ) {
      last.text += run.text;
    } else out.push({ ...run });
  }
  return out
    .map((r) => ({ ...r, text: r.text.replace(/\s+/g, " ") }))
    .filter((r) => r.text.length > 0);
}

/**
 * PDF → Word (.docx): the text layer of every page becomes paragraphs with
 * bold/italic and approximate headings, the embedded images follow each page's
 * text, one page break per PDF page. Columns, exact positions, fonts, forms and
 * vector drawings are not reproduced; scanned pages keep their image only.
 */
export async function pdfToDocx(
  bytes: Uint8Array,
  options: PdfToDocxOptions = defaultPdfToDocxOptions,
): Promise<PdfToDocxResult> {
  const docx = await import("docx");
  const opened = await openPdf(bytes);
  const warnings: string[] = [];
  const emptyPages: number[] = [];
  let paragraphCount = 0;
  let imageCount = 0;
  try {
    let imagesByPage = new Map<number, ExtractedImage[]>();
    if (options.images) {
      try {
        const extracted = await extractImages(bytes, { minDimension: 24 });
        imagesByPage = new Map();
        for (const image of extracted.images) {
          const list = imagesByPage.get(image.pageIndex) ?? [];
          list.push(image);
          imagesByPage.set(image.pageIndex, list);
        }
        if (extracted.skipped.length > 0)
          warnings.push(tr("Certaines images (CCITT, JBIG2) n'ont pas pu être extraites."));
      } catch {
        warnings.push(tr("Les images n'ont pas pu être extraites ; seul le texte a été converti."));
      }
    }
    const children: InstanceType<typeof docx.Paragraph>[] = [];
    for (let i = 0; i < opened.pageCount; i += 1) {
      options.onProgress?.(i + 1, opened.pageCount);
      const page = await opened.doc.getPage(i + 1);
      const content = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });
      const items = content.items.filter((it) => "str" in it) as unknown as TextItemLike[];
      const paragraphs = itemsToParagraphs(
        items,
        content.styles as Record<string, StyleLike>,
        viewport.width,
      );
      if (paragraphs.length === 0) emptyPages.push(i);
      for (const paragraph of paragraphs) {
        paragraphCount += 1;
        children.push(
          new docx.Paragraph({
            heading:
              paragraph.heading === 1
                ? docx.HeadingLevel.HEADING_1
                : paragraph.heading === 2
                  ? docx.HeadingLevel.HEADING_2
                  : paragraph.heading === 3
                    ? docx.HeadingLevel.HEADING_3
                    : undefined,
            alignment:
              paragraph.align === "center" ? docx.AlignmentType.CENTER : docx.AlignmentType.LEFT,
            spacing: { after: 120 },
            children: paragraph.runs.map(
              (run) =>
                new docx.TextRun({
                  text: run.text,
                  bold: run.bold || undefined,
                  italics: run.italic || undefined,
                  font: run.mono ? "Courier New" : undefined,
                  size: paragraph.heading ? undefined : Math.round(run.size * 2),
                }),
            ),
          }),
        );
      }
      for (const image of imagesByPage.get(i) ?? []) {
        if (image.mimeType === "image/jp2") {
          warnings.push(
            tr("Une image JPEG 2000 n'est pas prise en charge par Word et a été ignorée."),
          );
          continue;
        }
        const maxWidth = 600;
        const scale = Math.min(1, maxWidth / image.width, 780 / image.height);
        imageCount += 1;
        children.push(
          new docx.Paragraph({
            spacing: { after: 120 },
            children: [
              new docx.ImageRun({
                type: image.mimeType === "image/png" ? "png" : "jpg",
                data: image.bytes,
                transformation: {
                  width: Math.max(1, Math.round(image.width * scale)),
                  height: Math.max(1, Math.round(image.height * scale)),
                },
              }),
            ],
          }),
        );
      }
      page.cleanup();
      if (options.pageBreaks && i < opened.pageCount - 1) {
        children.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
      }
    }
    if (paragraphCount === 0 && imageCount === 0)
      throw new PdfError(
        "EMPTY",
        tr(
          "Aucun texte ni image exploitable dans ce PDF. S'il s'agit d'un scan, passez d'abord par la reconnaissance de texte (OCR).",
        ),
      );
    if (emptyPages.length > 0)
      warnings.push(
        emptyPages.length === opened.pageCount
          ? tr(
              "Ce PDF ne contient pas de couche texte (scan) : seules les images ont été reprises. Utilisez l'OCR pour obtenir un texte modifiable.",
            )
          : emptyPages.length > 1
            ? tr("{n} pages sans texte (scan) : image reprise, texte absent.", {
                n: emptyPages.length,
              })
            : tr("{n} page sans texte (scan) : image reprise, texte absent.", {
                n: emptyPages.length,
              }),
      );
    const document = new docx.Document({
      creator: "OUTILIA",
      sections: [
        {
          properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
          children,
        },
      ],
    });
    const buffer = await docx.Packer.toArrayBuffer(document);
    return {
      bytes: new Uint8Array(buffer),
      pageCount: opened.pageCount,
      paragraphCount,
      imageCount,
      emptyPages,
      warnings: Array.from(new Set(warnings)),
    };
  } catch (error) {
    throw toPdfError(error, "PROCESSING_FAILED");
  } finally {
    await opened.destroy();
  }
}
