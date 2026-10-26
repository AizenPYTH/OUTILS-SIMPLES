import { Lexer, type Token, type Tokens } from "marked";
import {
  PDFString,
  PageSizes,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { PdfError, toPdfError } from "../errors";
import { createPdfDocument, savePdfDocument } from "../load";
import { resolveStandardFont, sanitizeForStandardFont, type FontFamily } from "../fonts";
import { unescapeHtml } from "@/lib/dev/encoding";

export interface TextToPdfOptions {
  /** Interpret the source as Markdown (GFM); otherwise plain text with preserved line breaks. */
  markdown: boolean;
  title?: string;
  fontFamily: FontFamily;
  /** Body font size in points. */
  fontSize: number;
  pageSize: "a4" | "letter";
  /** Page orientation (default portrait). */
  orientation?: "portrait" | "landscape";
  /** Margin in points. */
  margin: number;
  pageNumbers: boolean;
}

export const defaultTextToPdfOptions: TextToPdfOptions = {
  markdown: true,
  fontFamily: "helvetica",
  fontSize: 11,
  pageSize: "a4",
  margin: 56,
  pageNumbers: true,
};

export interface TextToPdfResult {
  bytes: Uint8Array;
  pageCount: number;
  /** Some characters (emoji, non-Latin scripts) were replaced by "?". */
  replacedCharacters: boolean;
  /** Elements that cannot be rendered (remote images, raw HTML…). */
  skipped: string[];
  /** Embedded images (PNG/JPEG data URIs) drawn in the document. */
  imageCount: number;
}

interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
  strike: boolean;
  link?: string;
}

interface Piece extends Run {
  width: number;
  /** Hard line break marker. */
  br?: boolean;
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
  mono: PDFFont;
  monoBold: PDFFont;
}

const GRAY = rgb(0.45, 0.45, 0.45);
const RULE = rgb(0.8, 0.8, 0.8);
const CODE_BG = rgb(0.95, 0.95, 0.96);
const LINK = rgb(0.2, 0.3, 0.8);
const BLACK = rgb(0.1, 0.1, 0.1);

/**
 * Lays out Markdown or plain text into a paginated PDF with the 14 standard
 * fonts (no font download): headings, paragraphs, nested lists, code blocks,
 * quotes, tables, rules and clickable links. Pure pdf-lib, runs in Node too.
 */
export async function textToPdf(
  source: string,
  options: TextToPdfOptions = defaultTextToPdfOptions,
): Promise<TextToPdfResult> {
  if (!source.trim() && !options.title?.trim())
    throw new PdfError("NO_SELECTION", "Le texte à convertir est vide.", { recoverable: true });
  const doc = await createPdfDocument();
  const fonts: Fonts = {
    regular: await doc.embedFont(
      resolveStandardFont(options.fontFamily, { bold: false, italic: false }),
    ),
    bold: await doc.embedFont(
      resolveStandardFont(options.fontFamily, { bold: true, italic: false }),
    ),
    italic: await doc.embedFont(
      resolveStandardFont(options.fontFamily, { bold: false, italic: true }),
    ),
    boldItalic: await doc.embedFont(
      resolveStandardFont(options.fontFamily, { bold: true, italic: true }),
    ),
    mono: await doc.embedFont(StandardFonts.Courier),
    monoBold: await doc.embedFont(StandardFonts.CourierBold),
  };
  const layout = new Layout(doc, fonts, options);
  if (options.title?.trim()) layout.heading([{ ...plainRun(options.title.trim()), bold: true }], 1);
  try {
    if (options.markdown) {
      const tokens = new Lexer({ gfm: true, breaks: false }).lex(source);
      await layout.embedImages(tokens);
      layout.blocks(tokens, 0);
    } else layout.plainText(source);
    layout.finish();
  } catch (error) {
    throw toPdfError(error, "PROCESSING_FAILED");
  }
  const bytes = await savePdfDocument(doc);
  return {
    bytes,
    pageCount: doc.getPageCount(),
    replacedCharacters: layout.replaced,
    skipped: layout.skipped,
    imageCount: layout.imageCount,
  };
}

const DATA_IMAGE = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=\s]+)$/i;

function decodeBase64(data: string): Uint8Array {
  const binary = atob(data.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Every image token of a marked token tree (paragraphs, lists, tables, quotes). */
function collectImageTokens(tokens: Token[], out: Tokens.Image[] = []): Tokens.Image[] {
  for (const token of tokens) {
    if (token.type === "image") out.push(token as Tokens.Image);
    const t = token as {
      tokens?: Token[];
      items?: Tokens.ListItem[];
      header?: Tokens.TableCell[];
      rows?: Tokens.TableCell[][];
    };
    if (Array.isArray(t.tokens)) collectImageTokens(t.tokens, out);
    if (Array.isArray(t.items)) for (const item of t.items) collectImageTokens(item.tokens, out);
    if (Array.isArray(t.header)) for (const cell of t.header) collectImageTokens(cell.tokens, out);
    if (Array.isArray(t.rows))
      for (const row of t.rows) for (const cell of row) collectImageTokens(cell.tokens, out);
  }
  return out;
}

function plainRun(text: string): Run {
  return { text, bold: false, italic: false, code: false, strike: false };
}

class Layout {
  private readonly pageWidth: number;
  private readonly pageHeight: number;
  private readonly margin: number;
  private readonly size: number;
  private page!: PDFPage;
  private y = 0;
  private quoteDepth = 0;
  private readonly images = new Map<string, PDFImage>();
  replaced = false;
  skipped: string[] = [];
  imageCount = 0;

  constructor(
    private readonly doc: Awaited<ReturnType<typeof createPdfDocument>>,
    private readonly fonts: Fonts,
    private readonly options: TextToPdfOptions,
  ) {
    const [pw, ph] = options.pageSize === "letter" ? PageSizes.Letter : PageSizes.A4;
    const [w, h] = options.orientation === "landscape" ? [ph, pw] : [pw, ph];
    this.pageWidth = w;
    this.pageHeight = h;
    this.margin = Math.max(24, Math.min(options.margin, Math.min(w, h) / 4));
    this.size = Math.max(7, Math.min(options.fontSize, 24));
    this.newPage();
  }

  private get contentWidth(): number {
    return this.pageWidth - this.margin * 2;
  }

  private newPage(): void {
    this.page = this.doc.addPage([this.pageWidth, this.pageHeight]);
    this.y = this.pageHeight - this.margin;
  }

  private ensure(height: number): void {
    if (this.y - height < this.margin && this.y < this.pageHeight - this.margin - 1) this.newPage();
  }

  private fontFor(run: Run): PDFFont {
    if (run.code) return run.bold ? this.fonts.monoBold : this.fonts.mono;
    if (run.bold && run.italic) return this.fonts.boldItalic;
    if (run.bold) return this.fonts.bold;
    if (run.italic) return this.fonts.italic;
    return this.fonts.regular;
  }

  private clean(text: string): string {
    const result = sanitizeForStandardFont(text.replace(/ /g, " "));
    if (result.replaced) this.replaced = true;
    return result.text;
  }

  /** Decodes PNG/JPEG data URIs once (pdf-lib embedding is asynchronous; layout is not). */
  async embedImages(tokens: Token[]): Promise<void> {
    for (const token of collectImageTokens(tokens)) {
      const match = DATA_IMAGE.exec(token.href);
      if (!match || this.images.has(token.href)) continue;
      try {
        const bytes = decodeBase64(match[2]!);
        const image =
          match[1]!.toLowerCase() === "png"
            ? await this.doc.embedPng(bytes)
            : await this.doc.embedJpg(bytes);
        this.images.set(token.href, image);
      } catch {
        this.skipped.push(`Image illisible ignorée${token.text ? ` : ${token.text}` : ""}`);
      }
    }
  }

  /** Draws an embedded image as a block, scaled to the content width (1 px = 0.75 pt). */
  private drawImage(image: PDFImage, indent: number): void {
    const maxWidth = this.contentWidth - indent;
    const maxHeight = this.pageHeight - this.margin * 2 - this.size * 2;
    let width = image.width * 0.75;
    let height = image.height * 0.75;
    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    width *= scale;
    height *= scale;
    this.ensure(height + this.size * 0.5);
    this.page.drawImage(image, {
      x: this.margin + indent,
      y: this.y - height,
      width,
      height,
    });
    this.y -= height + this.size * 0.6;
    this.imageCount += 1;
  }

  /** Paragraph whose inline tokens include embedded images: text segments and images alternate as blocks. */
  private paragraphWithImages(tokens: Token[], indent: number): boolean {
    if (!tokens.some((t) => t.type === "image" && this.images.has((t as Tokens.Image).href)))
      return false;
    let buffer: Token[] = [];
    const flush = () => {
      const runs = this.inline(buffer).filter((r) => r.text.trim().length > 0 || r.text === "\n");
      if (runs.some((r) => r.text.trim())) this.paragraph(runs, indent);
      buffer = [];
    };
    for (const token of tokens) {
      const image = token.type === "image" ? this.images.get((token as Tokens.Image).href) : null;
      if (image) {
        flush();
        this.drawImage(image, indent);
      } else buffer.push(token);
    }
    flush();
    return true;
  }

  // ----------------------------------------------------------------- blocks
  blocks(tokens: Token[], indent: number): void {
    for (let i = 0; i < tokens.length; i += 1) this.block(tokens[i]!, indent);
  }

  private block(token: Token, indent: number): void {
    switch (token.type) {
      case "heading":
        this.heading(
          this.inline((token as Tokens.Heading).tokens),
          (token as Tokens.Heading).depth,
          indent,
        );
        break;
      case "paragraph":
        if (!this.paragraphWithImages((token as Tokens.Paragraph).tokens, indent))
          this.paragraph(this.inline((token as Tokens.Paragraph).tokens), indent);
        break;
      case "text": {
        const t = token as Tokens.Text;
        this.paragraph(
          t.tokens ? this.inline(t.tokens) : [plainRun(unescapeHtml(t.text))],
          indent,
          0.3,
        );
        break;
      }
      case "list":
        this.list(token as Tokens.List, indent);
        break;
      case "code":
        this.codeBlock((token as Tokens.Code).text, indent);
        break;
      case "blockquote":
        this.quoteDepth += 1;
        this.blocks((token as Tokens.Blockquote).tokens, indent + 14);
        this.quoteDepth -= 1;
        this.y -= this.size * 0.4;
        break;
      case "hr":
        this.ensure(this.size * 1.5);
        this.y -= this.size * 0.6;
        this.page.drawLine({
          start: { x: this.margin + indent, y: this.y },
          end: { x: this.pageWidth - this.margin, y: this.y },
          thickness: 0.8,
          color: RULE,
        });
        this.y -= this.size * 0.9;
        break;
      case "table":
        this.table(token as Tokens.Table, indent);
        break;
      case "html": {
        const text = (token as Tokens.HTML).text.replace(/<[^>]+>/g, "").trim();
        if (text) this.paragraph([plainRun(unescapeHtml(text))], indent);
        else this.skipped.push("Bloc HTML ignoré");
        break;
      }
      case "space":
      case "def":
        break;
      default:
        if ("tokens" in token && Array.isArray((token as { tokens?: Token[] }).tokens))
          this.paragraph(this.inline((token as { tokens: Token[] }).tokens), indent);
        else if ("text" in token && typeof (token as { text?: string }).text === "string")
          this.paragraph([plainRun((token as { text: string }).text)], indent);
    }
  }

  heading(runs: Run[], depth: number, indent = 0): void {
    const scale = [2, 1.6, 1.3, 1.15, 1.05, 1][Math.min(6, Math.max(1, depth)) - 1]!;
    const size = this.size * scale;
    this.ensure(size * 3.2);
    if (this.y < this.pageHeight - this.margin - 1) this.y -= size * 0.7;
    this.drawRuns(
      runs.map((r) => ({ ...r, bold: true })),
      { indent, size, lineHeight: size * 1.25 },
    );
    if (depth <= 2) {
      this.y -= size * 0.25;
      this.page.drawLine({
        start: { x: this.margin + indent, y: this.y },
        end: { x: this.pageWidth - this.margin, y: this.y },
        thickness: depth === 1 ? 1 : 0.5,
        color: RULE,
      });
    }
    this.y -= size * 0.45;
  }

  paragraph(runs: Run[], indent: number, spacingAfter = 0.6): void {
    this.drawRuns(runs, { indent, size: this.size, lineHeight: this.size * 1.45 });
    this.y -= this.size * spacingAfter;
  }

  private list(list: Tokens.List, indent: number, level = 0): void {
    const markerWidth = 18;
    let number = typeof list.start === "number" ? list.start : 1;
    for (const item of list.items) {
      const marker = list.ordered ? `${number}.` : level % 2 === 0 ? "•" : "–";
      number += 1;
      const prefix = item.task ? (item.checked ? "[x] " : "[ ] ") : "";
      const inner = item.tokens;
      const markerY = { placed: false };
      for (let i = 0; i < inner.length; i += 1) {
        const token = inner[i]!;
        if (token.type === "list") {
          this.list(token as Tokens.List, indent + markerWidth, level + 1);
          continue;
        }
        if (token.type === "space") continue;
        const runs =
          token.type === "text" || token.type === "paragraph"
            ? this.inline((token as Tokens.Text).tokens ?? [])
            : null;
        if (runs) {
          if (i === 0 && prefix) runs.unshift({ ...plainRun(prefix), code: true });
          this.drawRuns(runs, {
            indent: indent + markerWidth,
            size: this.size,
            lineHeight: this.size * 1.4,
            marker: markerY.placed ? undefined : marker,
            markerIndent: indent,
          });
          markerY.placed = true;
          this.y -= this.size * 0.25;
        } else {
          if (!markerY.placed) {
            this.drawRuns([plainRun("")], {
              indent: indent + markerWidth,
              size: this.size,
              lineHeight: this.size * 1.4,
              marker,
              markerIndent: indent,
            });
            markerY.placed = true;
          }
          this.block(token, indent + markerWidth);
        }
      }
    }
    this.y -= this.size * (level === 0 ? 0.4 : 0.1);
  }

  private codeBlock(text: string, indent: number): void {
    const size = this.size * 0.85;
    const lineHeight = size * 1.35;
    const font = this.fonts.mono;
    const pad = 6;
    const width = this.contentWidth - indent - pad * 2;
    const charWidth = font.widthOfTextAtSize("M", size);
    const perLine = Math.max(8, Math.floor(width / charWidth));
    const lines: string[] = [];
    for (const raw of this.clean(text.replace(/\t/g, "    ")).split("\n")) {
      if (raw.length <= perLine) lines.push(raw);
      else for (let i = 0; i < raw.length; i += perLine) lines.push(raw.slice(i, i + perLine));
    }
    this.y -= size * 0.4;
    for (let i = 0; i < lines.length; i += 1) {
      this.ensure(lineHeight + (i === 0 ? pad : 0));
      const top = this.y;
      const h = lineHeight + (i === 0 ? pad : 0) + (i === lines.length - 1 ? pad : 0);
      this.page.drawRectangle({
        x: this.margin + indent,
        y: top - h,
        width: this.contentWidth - indent,
        height: h,
        color: CODE_BG,
      });
      const baseline = top - (i === 0 ? pad : 0) - lineHeight + size * 0.3;
      this.page.drawText(lines[i]!, {
        x: this.margin + indent + pad,
        y: baseline,
        size,
        font,
        color: BLACK,
      });
      this.y = top - h;
    }
    this.y -= size * 0.9;
  }

  private table(table: Tokens.Table, indent: number): void {
    const columns = table.header.length;
    if (columns === 0) return;
    const size = this.size * 0.9;
    const lineHeight = size * 1.35;
    const pad = 4;
    const width = this.contentWidth - indent;
    const colWidth = width / columns;
    const rows = [table.header, ...table.rows];
    rows.forEach((cells, rowIndex) => {
      const bold = rowIndex === 0;
      const wrapped = cells.map((cell) =>
        this.wrap(
          this.inline(cell.tokens).map((r) => ({ ...r, bold: r.bold || bold })),
          colWidth - pad * 2,
          size,
        ),
      );
      const lines = Math.max(1, ...wrapped.map((w) => w.length));
      const rowHeight = lines * lineHeight + pad * 2;
      this.ensure(rowHeight);
      const top = this.y;
      if (bold)
        this.page.drawRectangle({
          x: this.margin + indent,
          y: top - rowHeight,
          width,
          height: rowHeight,
          color: CODE_BG,
        });
      wrapped.forEach((cellLines, c) => {
        const x = this.margin + indent + c * colWidth + pad;
        let lineTop = top - pad;
        for (const line of cellLines) {
          this.drawLinePieces(line, x, lineTop - lineHeight + size * 0.3, size);
          lineTop -= lineHeight;
        }
      });
      // Grid
      this.page.drawRectangle({
        x: this.margin + indent,
        y: top - rowHeight,
        width,
        height: rowHeight,
        borderColor: RULE,
        borderWidth: 0.5,
      });
      for (let c = 1; c < columns; c += 1)
        this.page.drawLine({
          start: { x: this.margin + indent + c * colWidth, y: top },
          end: { x: this.margin + indent + c * colWidth, y: top - rowHeight },
          thickness: 0.5,
          color: RULE,
        });
      this.y = top - rowHeight;
    });
    this.y -= this.size * 0.8;
  }

  plainText(text: string): void {
    const paragraphs = text.replace(/\r\n?/g, "\n").split(/\n{2,}/);
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;
      const runs: Run[] = [];
      paragraph.split("\n").forEach((line, i) => {
        if (i > 0) runs.push(plainRun("\n"));
        runs.push(plainRun(line));
      });
      this.paragraph(runs, 0, 0.8);
    }
  }

  finish(): void {
    if (!this.options.pageNumbers) return;
    const pages = this.doc.getPages();
    pages.forEach((page, i) => {
      const label = `${i + 1} / ${pages.length}`;
      const size = 9;
      const width = this.fonts.regular.widthOfTextAtSize(label, size);
      page.drawText(label, {
        x: (this.pageWidth - width) / 2,
        y: this.margin / 2 - size / 2,
        size,
        font: this.fonts.regular,
        color: GRAY,
      });
    });
  }

  // ----------------------------------------------------------------- inline
  inline(tokens: Token[], style: Partial<Run> = {}): Run[] {
    const out: Run[] = [];
    for (const token of tokens) {
      switch (token.type) {
        case "text": {
          const t = token as Tokens.Text;
          if (t.tokens?.length) out.push(...this.inline(t.tokens, style));
          else out.push({ ...plainRun(unescapeHtml(t.text)), ...style });
          break;
        }
        case "escape":
          out.push({ ...plainRun(unescapeHtml((token as Tokens.Escape).text)), ...style });
          break;
        case "strong":
          out.push(...this.inline((token as Tokens.Strong).tokens, { ...style, bold: true }));
          break;
        case "em":
          out.push(...this.inline((token as Tokens.Em).tokens, { ...style, italic: true }));
          break;
        case "del":
          out.push(...this.inline((token as Tokens.Del).tokens, { ...style, strike: true }));
          break;
        case "codespan":
          out.push({
            ...plainRun(unescapeHtml((token as Tokens.Codespan).text)),
            ...style,
            code: true,
          });
          break;
        case "link": {
          const link = token as Tokens.Link;
          const href = /^(https?:|mailto:)/i.test(link.href) ? link.href : undefined;
          out.push(...this.inline(link.tokens, { ...style, link: href }));
          break;
        }
        case "image": {
          const image = token as Tokens.Image;
          if (!this.images.has(image.href)) {
            const label = DATA_IMAGE.test(image.href) ? "" : image.href.slice(0, 80);
            this.skipped.push(
              `Image ignorée${image.text || label ? ` : ${image.text || label}` : ""}`,
            );
          } else this.skipped.push("Image dans un tableau ou une liste remplacée par son texte");
          if (image.text) out.push({ ...plainRun(`[${image.text}]`), ...style, italic: true });
          break;
        }
        case "br":
          out.push({ ...plainRun("\n"), ...style });
          break;
        case "html": {
          const text = (token as Tokens.HTML).text.replace(/<[^>]+>/g, "");
          if (text) out.push({ ...plainRun(unescapeHtml(text)), ...style });
          break;
        }
        default:
          if ("tokens" in token && Array.isArray((token as { tokens?: Token[] }).tokens))
            out.push(...this.inline((token as { tokens: Token[] }).tokens, style));
          else if ("text" in token && typeof (token as { text?: string }).text === "string")
            out.push({ ...plainRun((token as { text: string }).text), ...style });
      }
    }
    return out;
  }

  private pieces(runs: Run[], size: number): Piece[] {
    const pieces: Piece[] = [];
    for (const run of runs) {
      const text = this.clean(run.text);
      const font = this.fontFor(run);
      for (const part of text.split(/(\n|\s+)/)) {
        if (!part) continue;
        if (part === "\n") {
          pieces.push({ ...run, text: "", width: 0, br: true });
          continue;
        }
        pieces.push({ ...run, text: part, width: font.widthOfTextAtSize(part, size) });
      }
    }
    return pieces;
  }

  /** Greedy word wrap; words wider than the line are split by characters. */
  private wrap(runs: Run[], maxWidth: number, size: number): Piece[][] {
    const lines: Piece[][] = [];
    let line: Piece[] = [];
    let width = 0;
    const flush = () => {
      while (line.length && /^\s+$/.test(line[line.length - 1]!.text)) line.pop();
      lines.push(line);
      line = [];
      width = 0;
    };
    for (const piece of this.pieces(runs, size)) {
      if (piece.br) {
        flush();
        continue;
      }
      const isSpace = /^\s+$/.test(piece.text);
      if (isSpace && line.length === 0) continue;
      if (width + piece.width > maxWidth && line.length > 0) {
        flush();
        if (isSpace) continue;
      }
      if (piece.width > maxWidth) {
        const font = this.fontFor(piece);
        let chunk = "";
        for (const ch of piece.text) {
          const w = font.widthOfTextAtSize(chunk + ch, size);
          if (w > maxWidth && chunk) {
            line.push({ ...piece, text: chunk, width: font.widthOfTextAtSize(chunk, size) });
            flush();
            chunk = ch;
          } else chunk += ch;
        }
        if (chunk) {
          const w = font.widthOfTextAtSize(chunk, size);
          line.push({ ...piece, text: chunk, width: w });
          width += w;
        }
        continue;
      }
      line.push(piece);
      width += piece.width;
    }
    if (line.length) flush();
    if (lines.length === 0) lines.push([]);
    return lines;
  }

  private drawRuns(
    runs: Run[],
    opts: {
      indent: number;
      size: number;
      lineHeight: number;
      marker?: string;
      markerIndent?: number;
    },
  ): void {
    const x = this.margin + opts.indent;
    const maxWidth = this.contentWidth - opts.indent;
    const lines = this.wrap(runs, maxWidth, opts.size);
    lines.forEach((line, i) => {
      this.ensure(opts.lineHeight);
      const baseline = this.y - opts.lineHeight + opts.size * 0.3;
      if (i === 0 && opts.marker !== undefined)
        this.page.drawText(opts.marker, {
          x: this.margin + (opts.markerIndent ?? 0) + 2,
          y: baseline,
          size: opts.size,
          font: this.fonts.regular,
          color: BLACK,
        });
      if (this.quoteDepth > 0)
        this.page.drawRectangle({
          x: x - 10,
          y: this.y - opts.lineHeight,
          width: 2.5,
          height: opts.lineHeight,
          color: RULE,
        });
      this.drawLinePieces(line, x, baseline, opts.size);
      this.y -= opts.lineHeight;
    });
  }

  private drawLinePieces(line: Piece[], x: number, baseline: number, size: number): void {
    let cursor = x;
    let linkStart: { x: number; url: string } | null = null;
    const closeLink = (end: number) => {
      if (!linkStart) return;
      this.addLink(linkStart.url, linkStart.x, baseline - size * 0.25, end, baseline + size * 0.85);
      linkStart = null;
    };
    for (const piece of line) {
      const font = this.fontFor(piece);
      if (piece.link && (!linkStart || linkStart.url !== piece.link)) {
        closeLink(cursor);
        linkStart = { x: cursor, url: piece.link };
      } else if (!piece.link) closeLink(cursor);
      if (piece.code && piece.text.trim())
        this.page.drawRectangle({
          x: cursor - 1,
          y: baseline - size * 0.25,
          width: piece.width + 2,
          height: size * 1.1,
          color: CODE_BG,
        });
      this.page.drawText(piece.text, {
        x: cursor,
        y: baseline,
        size,
        font,
        color: piece.link ? LINK : BLACK,
      });
      if (piece.link)
        this.page.drawLine({
          start: { x: cursor, y: baseline - 1.5 },
          end: { x: cursor + piece.width, y: baseline - 1.5 },
          thickness: 0.6,
          color: LINK,
        });
      if (piece.strike)
        this.page.drawLine({
          start: { x: cursor, y: baseline + size * 0.3 },
          end: { x: cursor + piece.width, y: baseline + size * 0.3 },
          thickness: 0.7,
          color: BLACK,
        });
      cursor += piece.width;
    }
    closeLink(cursor);
  }

  private addLink(url: string, x1: number, y1: number, x2: number, y2: number): void {
    const annot = this.doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x1, y1, x2, y2],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    });
    this.page.node.addAnnot(this.doc.context.register(annot));
  }
}
