/** RFC 4180-style CSV parsing/serialisation with delimiter detection. */
import { tr } from "@/lib/i18n/messages";

export type Delimiter = "," | ";" | "\t" | "|";

export function detectDelimiter(text: string): Delimiter {
  const sample = text.split(/\r?\n/).slice(0, 10).join("\n");
  const candidates: Delimiter[] = [",", ";", "\t", "|"];
  let best: Delimiter = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const count = (sample.match(new RegExp(d === "|" ? "\\|" : d === "\t" ? "\t" : d, "g")) ?? [])
      .length;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(text: string, delimiter: Delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function coerce(value: string, infer: boolean): unknown {
  if (!infer) return value;
  const trimmed = value.trim();
  if (trimmed === "") return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed) && !/^0\d/.test(trimmed)) return Number(trimmed);
  return value;
}

export function csvToJson(
  text: string,
  options: { delimiter?: Delimiter; header: boolean; inferTypes: boolean },
): unknown[] {
  const rows = parseCsv(text, options.delimiter ?? detectDelimiter(text));
  if (rows.length === 0) return [];
  if (!options.header) return rows.map((r) => r.map((v) => coerce(v, options.inferTypes)));
  const [headerRow, ...body] = rows;
  const headers = (headerRow ?? []).map((h, i) =>
    h.trim() === "" ? `colonne_${i + 1}` : h.trim(),
  );
  return body.map((r) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = coerce(r[i] ?? "", options.inferTypes);
    });
    return obj;
  });
}

export function escapeCsvField(value: unknown, delimiter: Delimiter): string {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return /["\n\r]/.test(text) || text.includes(delimiter) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Converts an array of objects (or arrays) into CSV. Nested objects are JSON-encoded. */
export function jsonToCsv(value: unknown, delimiter: Delimiter = ";"): string {
  const list = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : null;
  if (!list) throw new Error(tr("Le JSON doit être un tableau d'objets (ou un objet)."));
  if (list.length === 0) return "";
  if (list.every((item) => Array.isArray(item))) {
    return (list as unknown[][])
      .map((row) => row.map((v) => escapeCsvField(v, delimiter)).join(delimiter))
      .join("\n");
  }
  const headers: string[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw new Error(tr("Chaque élément du tableau doit être un objet."));
    for (const key of Object.keys(item as object)) if (!headers.includes(key)) headers.push(key);
  }
  const lines = [headers.map((h) => escapeCsvField(h, delimiter)).join(delimiter)];
  for (const item of list as Record<string, unknown>[])
    lines.push(headers.map((h) => escapeCsvField(item[h], delimiter)).join(delimiter));
  return lines.join("\n");
}
