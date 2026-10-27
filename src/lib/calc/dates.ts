/**
 * Date calculators on calendar days (UTC midnight to avoid DST surprises):
 * durations, business days and French public holidays.
 */
import { tr } from "@/lib/i18n/messages";

export const FRENCH_MONTHS = [
  tr("janvier"),
  tr("février"),
  tr("mars"),
  tr("avril"),
  tr("mai"),
  tr("juin"),
  tr("juillet"),
  tr("août"),
  tr("septembre"),
  tr("octobre"),
  tr("novembre"),
  tr("décembre"),
];
export const FRENCH_WEEKDAYS = [
  tr("lundi"),
  tr("mardi"),
  tr("mercredi"),
  tr("jeudi"),
  tr("vendredi"),
  tr("samedi"),
  tr("dimanche"),
];
export const FRENCH_WEEKDAYS_SHORT = [
  tr("lun."),
  tr("mar."),
  tr("mer."),
  tr("jeu."),
  tr("ven."),
  tr("sam."),
  tr("dim."),
];

/** Builds a UTC calendar day. Month is 1-based. */
export function day(year: number, month: number, date: number): Date {
  return new Date(Date.UTC(year, month - 1, date));
}

/** Parses "AAAA-MM-JJ" (input[type=date]) or "JJ/MM/AAAA" into a UTC day. */
export function parseDay(input: string): Date | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (iso) return validDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input.trim());
  if (fr) return validDay(Number(fr[3]), Number(fr[2]), Number(fr[1]));
  return null;
}

function validDay(y: number, m: number, d: number): Date | null {
  const date = day(y, m, d);
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
    ? date
    : null;
}

export function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDayFr(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  },
): string {
  return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: "UTC" }).format(date);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400_000);
}

/** Signed number of calendar days from a to b. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400_000);
}

export interface Duration {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  remainingDaysAfterWeeks: number;
  negative: boolean;
}

/** Adds calendar months, clamping the day to the target month's length (31 janv. + 1 mois = 28/29 févr.). */
export function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(date.getUTCDate(), last)));
}

/** Calendar breakdown (years, months, days) like a human would count, plus totals. */
export function durationBetween(from: Date, to: Date): Duration {
  const negative = to < from;
  const [a, b] = negative ? [to, from] : [from, to];
  let years = 0;
  let months = 0;
  let cursor = a;
  while (addMonths(cursor, 12) <= b) {
    cursor = addMonths(cursor, 12);
    years += 1;
  }
  while (addMonths(cursor, 1) <= b) {
    cursor = addMonths(cursor, 1);
    months += 1;
  }
  const days = daysBetween(cursor, b);
  const totalDays = daysBetween(a, b);
  return {
    years,
    months,
    days,
    totalDays,
    totalWeeks: Math.floor(totalDays / 7),
    remainingDaysAfterWeeks: totalDays % 7,
    negative,
  };
}

/** Easter Sunday (Gregorian, Meeus/Jones/Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const date = ((h + l - 7 * m + 114) % 31) + 1;
  return day(year, month, date);
}

export interface Holiday {
  date: Date;
  name: string;
}

/** French public holidays (métropole; Alsace-Moselle adds two days). */
export function frenchPublicHolidays(year: number, alsaceMoselle = false): Holiday[] {
  const easter = easterSunday(year);
  const list: Holiday[] = [
    { date: day(year, 1, 1), name: "Jour de l'an" },
    { date: addDays(easter, 1), name: "Lundi de Pâques" },
    { date: day(year, 5, 1), name: "Fête du Travail" },
    { date: day(year, 5, 8), name: "Victoire 1945" },
    { date: addDays(easter, 39), name: "Ascension" },
    { date: addDays(easter, 50), name: "Lundi de Pentecôte" },
    { date: day(year, 7, 14), name: "Fête nationale" },
    { date: day(year, 8, 15), name: "Assomption" },
    { date: day(year, 11, 1), name: "Toussaint" },
    { date: day(year, 11, 11), name: "Armistice 1918" },
    { date: day(year, 12, 25), name: "Noël" },
  ];
  if (alsaceMoselle)
    list.push(
      { date: addDays(easter, -2), name: "Vendredi saint" },
      { date: day(year, 12, 26), name: "Saint-Étienne" },
    );
  return list.sort((x, y) => x.date.getTime() - y.date.getTime());
}

export function isWeekend(date: Date): boolean {
  const d = date.getUTCDay();
  return d === 0 || d === 6;
}

function holidaySet(fromYear: number, toYear: number, alsaceMoselle: boolean): Set<string> {
  const set = new Set<string>();
  for (let y = fromYear; y <= toYear; y += 1)
    for (const h of frenchPublicHolidays(y, alsaceMoselle)) set.add(toIsoDay(h.date));
  return set;
}

export interface BusinessDaysOptions {
  excludeHolidays: boolean;
  alsaceMoselle?: boolean;
  /** Count the end date itself (default true). */
  inclusive?: boolean;
}

/** Working days (Mon–Fri) between two dates, optionally minus French public holidays. */
export function businessDaysBetween(
  from: Date,
  to: Date,
  options: BusinessDaysOptions,
): { businessDays: number; weekendDays: number; holidays: Holiday[] } {
  const [a, b] = to < from ? [to, from] : [from, to];
  const holidays = options.excludeHolidays
    ? holidaySet(a.getUTCFullYear(), b.getUTCFullYear(), options.alsaceMoselle ?? false)
    : new Set<string>();
  const names = new Map<string, string>();
  if (options.excludeHolidays)
    for (let y = a.getUTCFullYear(); y <= b.getUTCFullYear(); y += 1)
      for (const h of frenchPublicHolidays(y, options.alsaceMoselle ?? false))
        names.set(toIsoDay(h.date), h.name);
  let businessDays = 0;
  let weekendDays = 0;
  const hit: Holiday[] = [];
  const end = options.inclusive === false ? addDays(b, -1) : b;
  for (let d = a; d <= end; d = addDays(d, 1)) {
    if (isWeekend(d)) {
      weekendDays += 1;
      continue;
    }
    const key = toIsoDay(d);
    if (holidays.has(key)) {
      hit.push({ date: d, name: names.get(key) ?? tr("Jour férié") });
      continue;
    }
    businessDays += 1;
  }
  return { businessDays, weekendDays, holidays: hit };
}

/** Adds (or subtracts) working days, skipping weekends and optionally holidays. */
export function addBusinessDays(from: Date, count: number, options: BusinessDaysOptions): Date {
  const step = count < 0 ? -1 : 1;
  let remaining = Math.abs(count);
  let current = from;
  const holidays = options.excludeHolidays
    ? holidaySet(
        from.getUTCFullYear() - 1,
        from.getUTCFullYear() + Math.ceil(Math.abs(count) / 200) + 1,
        options.alsaceMoselle ?? false,
      )
    : new Set<string>();
  while (remaining > 0) {
    current = addDays(current, step);
    if (isWeekend(current) || holidays.has(toIsoDay(current))) continue;
    remaining -= 1;
  }
  return current;
}

/** Age in full years at `at` (default today). */
export function ageAt(birth: Date, at: Date): number {
  return durationBetween(birth, at).years;
}
