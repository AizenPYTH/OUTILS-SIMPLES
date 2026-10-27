import { PdfError, toPdfError } from "@/lib/pdf/errors";
import { parseCsv } from "@/lib/dev/csv";
import { textToPdf } from "@/lib/pdf/operations/text-to-pdf";
import { tr } from "@/lib/i18n/messages";
import {
  defaultOfficeToPdfOptions,
  looksLikeZip,
  type OfficeToPdfOptions,
  type OfficeToPdfResult,
} from "./docx";

export interface SheetTable {
  name: string;
  rows: string[][];
}

export interface SheetToMarkdownOptions {
  /** Rows kept per sheet (the rest is reported); protects the device on huge exports. */
  maxRows?: number;
  /** Use the first row as the table header (default true). */
  headerRow?: boolean;
}

const MAX_ROWS = 5000;

/** Name of the single table of a CSV file (its heading is omitted in the PDF). */
function defaultTableName(): string {
  return tr("Données");
}

/** fr-FR formatting; the narrow no-break spaces it uses do not exist in the standard PDF fonts. */
function plainSpaces(text: string): string {
  return text.replace(/[\u202f\u00a0]/g, " ");
}

function formatNumber(value: number, numFmt?: string): string {
  if (numFmt && /%/.test(numFmt))
    return `${plainSpaces((value * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 }))} %`;
  const decimals = numFmt ? (numFmt.match(/0\.(0+)/)?.[1]?.length ?? undefined) : undefined;
  return plainSpaces(
    value.toLocaleString("fr-FR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals ?? (Number.isInteger(value) ? 0 : 4),
    }),
  );
}

function formatDate(value: Date, numFmt?: string): string {
  const hasTime = numFmt
    ? /h|s/i.test(numFmt.replace(/\[[^\]]*\]/g, ""))
    : value.getUTCHours() + value.getUTCMinutes() !== 0;
  return hasTime
    ? value.toLocaleString("fr-FR", { timeZone: "UTC" })
    : value.toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

type CellValueLike =
  | null
  | undefined
  | string
  | number
  | boolean
  | Date
  | { richText: { text: string }[] }
  | { text: string; hyperlink?: string }
  | { formula?: string; sharedFormula?: string; result?: unknown }
  | { error: string };

/** Readable text for an exceljs cell value (results of formulas, dates, rich text, links, errors). */
export function cellText(value: CellValueLike, numFmt?: string): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return formatNumber(value, numFmt);
  if (typeof value === "boolean") return value ? "VRAI" : "FAUX";
  if (value instanceof Date) return formatDate(value, numFmt);
  if ("richText" in value) return value.richText.map((r) => r.text).join("");
  if ("error" in value) return value.error;
  if ("formula" in value || "sharedFormula" in value)
    return cellText((value as { result?: CellValueLike }).result, numFmt);
  if ("text" in value) return value.text;
  return String(value);
}

/** Reads every non-empty worksheet of an .xlsx file into string tables. */
export async function workbookToTables(
  bytes: Uint8Array,
  options: SheetToMarkdownOptions = {},
): Promise<{ tables: SheetTable[]; warnings: string[] }> {
  if (!looksLikeZip(bytes))
    throw new PdfError(
      "UNSUPPORTED",
      tr(
        "Ce fichier n'est pas un classeur Excel (.xlsx). Les anciens .xls ne sont pas pris en charge : enregistrez-le au format .xlsx, ou exportez-le en CSV.",
      ),
    );
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  try {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    await workbook.xlsx.load(copy.buffer as ArrayBuffer);
  } catch (error) {
    throw new PdfError(
      "CORRUPTED",
      tr(
        "Impossible de lire ce classeur : le fichier est peut-être endommagé ou protégé par un mot de passe.",
      ),
      { cause: error },
    );
  }
  const maxRows = options.maxRows ?? MAX_ROWS;
  const tables: SheetTable[] = [];
  const warnings: string[] = [];
  workbook.eachSheet((sheet) => {
    const rows: string[][] = [];
    let truncated = false;
    sheet.eachRow({ includeEmpty: false }, (row) => {
      if (rows.length >= maxRows) {
        truncated = true;
        return;
      }
      const cells: string[] = [];
      for (let c = 1; c <= row.cellCount; c += 1) {
        const cell = row.getCell(c);
        cells.push(
          cellText(cell.value as CellValueLike, cell.numFmt)
            .replace(/\s+/g, " ")
            .trim(),
        );
      }
      while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
      if (cells.some((c) => c !== "")) rows.push(cells);
    });
    if (rows.length === 0) {
      warnings.push(tr("Feuille « {name} » vide : ignorée.", { name: sheet.name }));
      return;
    }
    if (truncated)
      warnings.push(
        tr("Feuille « {name} » : seules les {max} premières lignes sont converties.", {
          name: sheet.name,
          max: maxRows,
        }),
      );
    if (sheet.getImages().length > 0)
      warnings.push(
        tr("Feuille « {name} » : les images et graphiques ne sont pas convertis.", {
          name: sheet.name,
        }),
      );
    tables.push({ name: sheet.name, rows });
  });
  if (tables.length === 0)
    throw new PdfError("EMPTY", tr("Ce classeur ne contient aucune donnée convertible."));
  return { tables, warnings };
}

export function csvToTable(text: string, name = defaultTableName()): SheetTable {
  const rows = parseCsv(text.replace(/^﻿/, "")).map((r) =>
    r.map((c) => c.replace(/\s+/g, " ").trim()),
  );
  const kept = rows.filter((r) => r.some((c) => c !== ""));
  if (kept.length === 0) throw new PdfError("EMPTY", tr("Ce fichier CSV est vide."));
  return { name, rows: kept };
}

function escapeCell(text: string): string {
  return text.replace(/([\\`*_~[\]<>|])/g, "\\$1");
}

/** GFM Markdown: one heading per sheet, header row in bold, equal-width columns in the PDF. */
export function tablesToMarkdown(
  tables: SheetTable[],
  options: SheetToMarkdownOptions = {},
): string {
  const headerRow = options.headerRow ?? true;
  const out: string[] = [];
  for (const table of tables) {
    const columns = Math.max(...table.rows.map((r) => r.length));
    const pad = (r: string[]) => [...r, ...Array<string>(columns - r.length).fill("")];
    const line = (r: string[]) => `| ${pad(r).map(escapeCell).join(" | ")} |`;
    if (tables.length > 1 || table.name !== defaultTableName())
      out.push(`## ${escapeCell(table.name)}\n`);
    const rows = headerRow ? table.rows : [Array<string>(columns).fill(" "), ...table.rows];
    out.push(line(rows[0]!));
    out.push(`| ${Array<string>(columns).fill("---").join(" | ")} |`);
    for (const row of rows.slice(1)) out.push(line(row));
    out.push("");
  }
  return out.join("\n");
}

export type SheetSource =
  { kind: "xlsx"; bytes: Uint8Array } | { kind: "csv"; text: string; name?: string };

export async function sheetToPdf(
  source: SheetSource,
  options: OfficeToPdfOptions = {
    ...defaultOfficeToPdfOptions,
    orientation: "landscape",
    fontSize: 9,
  },
  tableOptions: SheetToMarkdownOptions = {},
): Promise<OfficeToPdfResult & { tables: SheetTable[] }> {
  const { tables, warnings } =
    source.kind === "xlsx"
      ? await workbookToTables(source.bytes, tableOptions)
      : { tables: [csvToTable(source.text, source.name)], warnings: [] };
  const widest = Math.max(...tables.flatMap((t) => t.rows.map((r) => r.length)));
  if (widest > 12)
    warnings.push(
      tr(
        "{n} colonnes : les colonnes sont étroites, préférez le format paysage ou scindez la feuille.",
        { n: widest },
      ),
    );
  try {
    const result = await textToPdf(tablesToMarkdown(tables, tableOptions), {
      ...options,
      markdown: true,
    });
    const notes = [...warnings, ...result.skipped];
    if (result.replacedCharacters)
      notes.push(
        tr(
          "Certains caractères (emoji, alphabets non latins, symboles) ont été remplacés par « ? ».",
        ),
      );
    return { ...result, tables, warnings: Array.from(new Set(notes)) };
  } catch (error) {
    throw toPdfError(error, "PROCESSING_FAILED");
  }
}
