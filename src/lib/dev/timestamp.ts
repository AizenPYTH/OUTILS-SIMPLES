/** Unix timestamp ↔ date helpers (pure, French formatting). */

export interface ParsedInstant {
  ms: number;
  source: "seconds" | "milliseconds" | "date";
}

/** Accepts "1700000000", "1700000000000", ISO 8601 or any string Date.parse understands. */
export function parseInstant(input: string): ParsedInstant | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const value = Number(trimmed);
    if (!Number.isFinite(value)) return null;
    // 10 digits → seconds (until year 2286), 13 digits → milliseconds.
    if (Math.abs(value) < 1e11) return { ms: Math.round(value * 1000), source: "seconds" };
    return { ms: Math.round(value), source: "milliseconds" };
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    // French "JJ/MM/AAAA[ HH:MM]" form.
    const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(trimmed);
    if (!fr) return null;
    const [, d, m, y, h = "0", mi = "0", s = "0"] = fr;
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(mi), Number(s));
    return Number.isNaN(date.getTime()) ? null : { ms: date.getTime(), source: "date" };
  }
  return { ms: parsed, source: "date" };
}

export interface InstantDescription {
  unixSeconds: number;
  unixMilliseconds: number;
  iso: string;
  utc: string;
  local: string;
  localZone: string;
  relative: string;
  weekday: string;
  dayOfYear: number;
  isoWeek: number;
  valid: boolean;
}

export function describeInstant(ms: number, now = Date.now(), locale = "fr-FR", timeZone?: string): InstantDescription {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime()) || Math.abs(ms) > 8.64e15) {
    return { unixSeconds: 0, unixMilliseconds: 0, iso: "", utc: "", local: "", localZone: "", relative: "", weekday: "", dayOfYear: 0, isoWeek: 0, valid: false };
  }
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    unixSeconds: Math.floor(ms / 1000),
    unixMilliseconds: ms,
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "long", timeZone: zone }).format(date),
    localZone: zone,
    relative: relativeTime(ms, now, locale),
    weekday: new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: zone }).format(date),
    dayOfYear: dayOfYear(date),
    isoWeek: isoWeek(date),
    valid: true,
  };
}

export function relativeTime(ms: number, now: number, locale = "fr-FR"): string {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 86400_000],
    ["month", 30 * 86400_000],
    ["day", 86400_000],
    ["hour", 3600_000],
    ["minute", 60_000],
    ["second", 1000],
  ];
  for (const [unit, size] of units) {
    if (abs >= size || unit === "second") return rtf.format(Math.round(diff / size), unit);
  }
  return "";
}

export function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400_000) + 1;
}

/** ISO-8601 week number (weeks start Monday; week 1 contains the first Thursday). */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86400_000 + 1) / 7);
}

/** Formats a Date for an <input type="datetime-local"> in the local zone. */
export function toDateTimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
