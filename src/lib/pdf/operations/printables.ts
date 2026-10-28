/**
 * Printable documents generated with pdf-lib: ruled/grid paper, monthly and
 * yearly calendars with French public holidays, cover pages. Pure, testable.
 */
import { PageSizes, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { createPdfDocument, savePdfDocument } from "../load";
import { sanitizeForStandardFont } from "../fonts";
import { tr } from "@/lib/i18n/messages";
import {
  FRENCH_MONTHS,
  FRENCH_WEEKDAYS_SHORT,
  day,
  frenchPublicHolidays,
  toIsoDay,
} from "@/lib/calc/dates";

const MM = 72 / 25.4;

export type PaperKind = "grid" | "lines" | "dots" | "seyes" | "millimeter" | "isometric" | "music";
export type PageFormat = "a4" | "a4-landscape" | "a5" | "letter";

export interface PaperOptions {
  kind: PaperKind;
  /** Spacing in millimetres (grid, lines, dots, isometric). */
  spacingMm: number;
  page: PageFormat;
  marginMm: number;
  /** Line colour as hex. */
  color: string;
  pages: number;
  title?: string;
}

export const defaultPaperOptions: PaperOptions = {
  kind: "grid",
  spacingMm: 5,
  page: "a4",
  marginMm: 10,
  color: "#9aa3b2",
  pages: 1,
};

function pageSize(format: PageFormat): [number, number] {
  switch (format) {
    case "a4-landscape":
      return [PageSizes.A4[1], PageSizes.A4[0]];
    case "a5":
      return [PageSizes.A5[0], PageSizes.A5[1]];
    case "letter":
      return [PageSizes.Letter[0], PageSizes.Letter[1]];
    default:
      return [PageSizes.A4[0], PageSizes.A4[1]];
  }
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return rgb(0.6, 0.63, 0.7);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export async function paperPdf(options: PaperOptions): Promise<Uint8Array> {
  const doc = await createPdfDocument();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const [w, h] = pageSize(options.page);
  const margin = Math.max(0, options.marginMm) * MM;
  const color = hexToRgb(options.color);
  const spacing = Math.max(2, options.spacingMm) * MM;
  const pages = Math.max(1, Math.min(50, Math.round(options.pages)));
  for (let p = 0; p < pages; p += 1) {
    const page = doc.addPage([w, h]);
    let top = h - margin;
    if (options.title) {
      const { text } = sanitizeForStandardFont(options.title);
      page.drawText(text, { x: margin, y: top - 12, size: 12, font, color: rgb(0.3, 0.3, 0.35) });
      top -= 24;
    }
    const area = { x: margin, y: margin, width: w - margin * 2, height: top - margin };
    drawPaper(page, options.kind, spacing, area, color);
  }
  return savePdfDocument(doc);
}

function drawPaper(
  page: PDFPage,
  kind: PaperKind,
  spacing: number,
  area: { x: number; y: number; width: number; height: number },
  color: ReturnType<typeof rgb>,
): void {
  const thin = 0.4;
  const right = area.x + area.width;
  const top = area.y + area.height;
  const line = (x1: number, y1: number, x2: number, y2: number, thickness = thin, c = color) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color: c });
  switch (kind) {
    case "lines":
      for (let y = top; y >= area.y; y -= spacing) line(area.x, y, right, y);
      break;
    case "grid":
      for (let y = top; y >= area.y - 0.01; y -= spacing) line(area.x, y, right, y);
      for (let x = area.x; x <= right + 0.01; x += spacing) line(x, area.y, x, top);
      break;
    case "dots":
      for (let y = top; y >= area.y; y -= spacing)
        for (let x = area.x; x <= right; x += spacing) page.drawCircle({ x, y, size: 0.7, color });
      break;
    case "millimeter": {
      const mm = MM;
      let i = 0;
      for (let y = top; y >= area.y - 0.01; y -= mm, i += 1)
        line(area.x, y, right, y, i % 10 === 0 ? 0.8 : i % 5 === 0 ? 0.5 : 0.15);
      i = 0;
      for (let x = area.x; x <= right + 0.01; x += mm, i += 1)
        line(x, area.y, x, top, i % 10 === 0 ? 0.8 : i % 5 === 0 ? 0.5 : 0.15);
      break;
    }
    case "seyes": {
      // Grands carreaux 8 mm with 2 mm interlines and vertical lines every 8 mm.
      const big = 8 * MM;
      const small = 2 * MM;
      for (let y = top; y >= area.y - 0.01; y -= big) {
        line(area.x, y, right, y, 0.6);
        for (let k = 1; k < 4; k += 1)
          if (y - k * small >= area.y) line(area.x, y - k * small, right, y - k * small, 0.2);
      }
      for (let x = area.x; x <= right + 0.01; x += big)
        line(x, area.y, x, top, 0.5, rgb(0.78, 0.6, 0.85));
      line(area.x + (40 * MM) / 2, area.y, area.x + (40 * MM) / 2, top, 1, rgb(0.9, 0.3, 0.3));
      break;
    }
    case "isometric": {
      const dy = spacing * Math.sin(Math.PI / 3);
      for (let y = top; y >= area.y; y -= dy) line(area.x, y, right, y);
      const slope = Math.tan(Math.PI / 6);
      for (let x = area.x - area.height * slope; x <= right; x += spacing) {
        line(
          clampX(x, area),
          yAt(x, area, slope, false),
          clampX(x + area.height * slope, area),
          yAt(x + area.height * slope, area, slope, false),
        );
      }
      for (let x = area.x; x <= right + area.height * slope; x += spacing) {
        line(
          clampX(x, area),
          yAt(x, area, slope, true),
          clampX(x - area.height * slope, area),
          yAt(x - area.height * slope, area, slope, true),
        );
      }
      break;
    }
    case "music": {
      const staffGap = 2.2 * MM;
      const staffHeight = staffGap * 4;
      const between = 10 * MM;
      for (let y = top - between / 2; y - staffHeight >= area.y; y -= staffHeight + between) {
        for (let k = 0; k < 5; k += 1)
          line(area.x, y - k * staffGap, right, y - k * staffGap, 0.6, rgb(0.15, 0.15, 0.15));
        line(area.x, y, area.x, y - staffHeight, 0.8, rgb(0.15, 0.15, 0.15));
        line(right, y, right, y - staffHeight, 0.8, rgb(0.15, 0.15, 0.15));
      }
      break;
    }
  }
  function clampX(x: number, a: typeof area) {
    return Math.max(a.x, Math.min(a.x + a.width, x));
  }
  function yAt(x: number, a: typeof area, s: number, down: boolean) {
    // Line through (x0, bottom) rising with slope 1/s; clamp handles the edges approximately.
    const cx = clampX(x, a);
    const y = down ? a.y + (x - cx) / s : a.y + (cx - x) / s;
    return Math.max(a.y, Math.min(a.y + a.height, y));
  }
}

// ---------------------------------------------------------------- calendars

export interface CalendarOptions {
  year: number;
  /** 1–12 for a monthly calendar, null for the yearly overview. */
  month: number | null;
  holidays: boolean;
  alsaceMoselle?: boolean;
  notes: boolean;
  page: PageFormat;
}

export const defaultCalendarOptions: CalendarOptions = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  holidays: true,
  notes: true,
  page: "a4-landscape",
};

const WEEKEND = rgb(0.95, 0.95, 0.97);
const HOLIDAY = rgb(0.99, 0.93, 0.86);
const INK = rgb(0.12, 0.12, 0.15);
const MUTED = rgb(0.5, 0.5, 0.55);
const RULE = rgb(0.75, 0.76, 0.8);

export async function calendarPdf(options: CalendarOptions): Promise<Uint8Array> {
  const doc = await createPdfDocument();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const [w, h] = pageSize(options.page);
  const holidays = new Map<string, string>();
  if (options.holidays)
    for (const hol of frenchPublicHolidays(options.year, options.alsaceMoselle))
      holidays.set(toIsoDay(hol.date), hol.name);
  if (options.month) {
    const page = doc.addPage([w, h]);
    drawMonth(
      page,
      options.year,
      options.month,
      { x: 36, y: 36, width: w - 72, height: h - 72 },
      { font, bold, holidays, notes: options.notes, detailed: true },
    );
  } else {
    const page = doc.addPage([w, h]);
    const margin = 30;
    const title = String(options.year);
    page.drawText(title, {
      x: (w - bold.widthOfTextAtSize(title, 26)) / 2,
      y: h - margin - 22,
      size: 26,
      font: bold,
      color: INK,
    });
    const cols = w > h ? 4 : 3;
    const rows = 12 / cols;
    const gap = 14;
    const cellW = (w - margin * 2 - gap * (cols - 1)) / cols;
    const cellH = (h - margin * 2 - 40 - gap * (rows - 1)) / rows;
    for (let m = 1; m <= 12; m += 1) {
      const c = (m - 1) % cols;
      const r = Math.floor((m - 1) / cols);
      drawMonth(
        page,
        options.year,
        m,
        {
          x: margin + c * (cellW + gap),
          y: h - margin - 40 - (r + 1) * cellH - r * gap,
          width: cellW,
          height: cellH,
        },
        { font, bold, holidays, notes: false, detailed: false },
      );
    }
  }
  return savePdfDocument(doc);
}

interface MonthContext {
  font: Awaited<ReturnType<Awaited<ReturnType<typeof createPdfDocument>>["embedFont"]>>;
  bold: MonthContext["font"];
  holidays: Map<string, string>;
  notes: boolean;
  detailed: boolean;
}

function drawMonth(
  page: PDFPage,
  year: number,
  month: number,
  box: { x: number; y: number; width: number; height: number },
  ctx: MonthContext,
): void {
  const first = day(year, month, 1);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday = 0
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const titleSize = ctx.detailed ? 22 : Math.min(11, box.height / 9);
  const title = ctx.detailed
    ? `${capitalize(FRENCH_MONTHS[month - 1]!)} ${year}`
    : capitalize(FRENCH_MONTHS[month - 1]!);
  page.drawText(title, {
    x: box.x,
    y: box.y + box.height - titleSize,
    size: titleSize,
    font: ctx.bold,
    color: INK,
  });
  const headerH = ctx.detailed ? 18 : titleSize * 1.1;
  const gridTop = box.y + box.height - titleSize - (ctx.detailed ? 14 : 6);
  const notesW = ctx.notes && ctx.detailed ? box.width * 0.22 : 0;
  const gridW = box.width - notesW;
  const colW = gridW / 7;
  const rowH = (gridTop - headerH - box.y) / weeks;
  const small = ctx.detailed ? 9 : Math.max(5, Math.min(8, rowH * 0.6));
  FRENCH_WEEKDAYS_SHORT.forEach((label, i) => {
    const text = ctx.detailed ? label : label.slice(0, 1).toUpperCase();
    page.drawText(text, {
      x: box.x + i * colW + (colW - ctx.font.widthOfTextAtSize(text, small)) / 2,
      y: gridTop - headerH + (headerH - small) / 2,
      size: small,
      font: ctx.bold,
      color: MUTED,
    });
  });
  for (let d = 1; d <= daysInMonth; d += 1) {
    const index = offset + d - 1;
    const col = index % 7;
    const row = Math.floor(index / 7);
    const x = box.x + col * colW;
    const yTop = gridTop - headerH - row * rowH;
    const iso = toIsoDay(day(year, month, d));
    const holiday = ctx.holidays.get(iso);
    const weekend = col >= 5;
    if (ctx.detailed) {
      if (holiday || weekend)
        page.drawRectangle({
          x,
          y: yTop - rowH,
          width: colW,
          height: rowH,
          color: holiday ? HOLIDAY : WEEKEND,
        });
      page.drawRectangle({
        x,
        y: yTop - rowH,
        width: colW,
        height: rowH,
        borderColor: RULE,
        borderWidth: 0.5,
      });
      page.drawText(String(d), { x: x + 5, y: yTop - 14, size: 11, font: ctx.bold, color: INK });
      if (holiday) {
        const { text } = sanitizeForStandardFont(holiday);
        page.drawText(fit(text, ctx.font, 7, colW - 10), {
          x: x + 5,
          y: yTop - rowH + 5,
          size: 7,
          font: ctx.font,
          color: MUTED,
        });
      }
    } else {
      const label = String(d);
      const color = holiday ? rgb(0.8, 0.3, 0.1) : weekend ? MUTED : INK;
      page.drawText(label, {
        x: x + (colW - ctx.font.widthOfTextAtSize(label, small)) / 2,
        y: yTop - rowH + (rowH - small) / 2,
        size: small,
        font: holiday ? ctx.bold : ctx.font,
        color,
      });
    }
  }
  if (ctx.detailed) {
    page.drawRectangle({
      x: box.x,
      y: box.y,
      width: gridW,
      height: gridTop - headerH - box.y,
      borderColor: RULE,
      borderWidth: 0.8,
    });
    if (notesW > 0) {
      const nx = box.x + gridW + 12;
      page.drawText("Notes", {
        x: nx,
        y: gridTop - headerH + 4,
        size: 10,
        font: ctx.bold,
        color: MUTED,
      });
      for (let y = gridTop - headerH - 14; y > box.y; y -= 18)
        page.drawLine({
          start: { x: nx, y },
          end: { x: box.x + box.width, y },
          thickness: 0.4,
          color: RULE,
        });
    }
    const holidaysOfMonth = [...ctx.holidays.entries()].filter(([iso]) =>
      iso.startsWith(`${year}-${String(month).padStart(2, "0")}`),
    );
    if (holidaysOfMonth.length) {
      const { text } = sanitizeForStandardFont(
        tr("Jours fériés : {list}", {
          list: holidaysOfMonth.map(([iso, name]) => `${Number(iso.slice(8))} ${name}`).join(" · "),
        }),
      );
      page.drawText(text, { x: box.x, y: box.y - 14, size: 8, font: ctx.font, color: MUTED });
    }
  }
}

function fit(text: string, font: MonthContext["font"], size: number, width: number): string {
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(out, size) > width) out = out.slice(0, -1);
  return out === text ? out : `${out.slice(0, -1)}…`.replace("…", ".");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --------------------------------------------------------------- cover page

export interface CoverPageOptions {
  title: string;
  subtitle?: string;
  author?: string;
  institution?: string;
  date?: string;
  footer?: string;
  page: PageFormat;
  accent: string;
}

export const defaultCoverOptions: CoverPageOptions = {
  title: "",
  subtitle: "",
  author: "",
  institution: "",
  date: "",
  footer: "",
  page: "a4",
  accent: "#0e6b3c",
};

export async function coverPagePdf(
  options: CoverPageOptions,
): Promise<{ bytes: Uint8Array; replaced: boolean }> {
  const doc = await createPdfDocument();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const [w, h] = pageSize(options.page);
  const page = doc.addPage([w, h]);
  const accent = hexToRgb(options.accent);
  let replaced = false;
  const clean = (s: string) => {
    const r = sanitizeForStandardFont(s);
    replaced = replaced || r.replaced;
    return r.text;
  };
  const margin = 64;
  page.drawRectangle({ x: 0, y: h - 14, width: w, height: 14, color: accent });
  page.drawRectangle({ x: margin, y: h * 0.62 - 6, width: 48, height: 3, color: accent });
  if (options.institution)
    page.drawText(clean(options.institution), {
      x: margin,
      y: h - margin - 10,
      size: 11,
      font,
      color: MUTED,
    });
  const titleLines = wrap(clean(options.title || "Titre"), bold, 30, w - margin * 2);
  let y = h * 0.62 - 44;
  for (const line of titleLines) {
    page.drawText(line, { x: margin, y, size: 30, font: bold, color: INK });
    y -= 38;
  }
  if (options.subtitle) {
    for (const line of wrap(clean(options.subtitle), font, 15, w - margin * 2)) {
      page.drawText(line, { x: margin, y: y - 4, size: 15, font, color: MUTED });
      y -= 22;
    }
  }
  const bottom = [options.author, options.date].filter(Boolean).map((s) => clean(s!));
  let by = margin + 48;
  for (const line of bottom.reverse()) {
    page.drawText(line, { x: margin, y: by, size: 12, font, color: INK });
    by += 18;
  }
  if (options.footer)
    page.drawText(clean(options.footer), {
      x: margin,
      y: margin - 20,
      size: 9,
      font,
      color: MUTED,
    });
  return { bytes: await savePdfDocument(doc), replaced };
}

function wrap(text: string, font: MonthContext["font"], size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > width && line) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    lines.push(line);
  }
  return lines;
}
