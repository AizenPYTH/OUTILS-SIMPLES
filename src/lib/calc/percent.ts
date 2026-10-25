/** Percentage and VAT calculators (pure, French rounding helpers). */

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatAmount(value: number, decimals = 2, locale = "fr-FR"): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Parses "1 234,56" / "1234.56" / "12 %" into a number. */
export function parseNumber(input: string): number | null {
  const cleaned = input.replace(/\s| |%|€/g, "").replace(",", ".");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** X % of Y. */
export function percentOf(percent: number, total: number): number {
  return (percent / 100) * total;
}

/** What percentage is `part` of `total`? */
export function whatPercent(part: number, total: number): number | null {
  if (total === 0) return null;
  return (part / total) * 100;
}

/** Variation from `from` to `to`, in percent (null when `from` is 0). */
export function percentChange(from: number, to: number): number | null {
  if (from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

/** Value after a percentage increase (positive) or discount (negative). */
export function applyPercent(value: number, percent: number): number {
  return value * (1 + percent / 100);
}

/** Original value before a percentage was applied (e.g. price before +20 %). */
export function beforePercent(value: number, percent: number): number | null {
  const factor = 1 + percent / 100;
  if (factor === 0) return null;
  return value / factor;
}

// ----------------------------------------------------------------------- VAT

export interface VatBreakdown {
  ht: number;
  tva: number;
  ttc: number;
  rate: number;
}

export const FRENCH_VAT_RATES: { rate: number; label: string }[] = [
  { rate: 20, label: "20 % — taux normal" },
  { rate: 10, label: "10 % — restauration, travaux, transports" },
  { rate: 5.5, label: "5,5 % — alimentaire, livres, énergie" },
  { rate: 2.1, label: "2,1 % — presse, médicaments remboursables" },
  { rate: 8.5, label: "8,5 % — taux normal DOM" },
];

export function vatFromHt(ht: number, rate: number): VatBreakdown {
  const tva = round(ht * (rate / 100));
  return { ht: round(ht), tva, ttc: round(ht + tva), rate };
}

export function vatFromTtc(ttc: number, rate: number): VatBreakdown {
  const ht = round(ttc / (1 + rate / 100));
  return { ht, tva: round(ttc - ht), ttc: round(ttc), rate };
}

export function vatFromAmount(tva: number, rate: number): VatBreakdown | null {
  if (rate === 0) return null;
  const ht = round(tva / (rate / 100));
  return { ht, tva: round(tva), ttc: round(ht + tva), rate };
}
