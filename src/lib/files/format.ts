import { getDictionary, getLocale } from "@/lib/i18n";

const UNITS = { fr: ["o", "Ko", "Mo", "Go"], en: ["B", "KB", "MB", "GB"] } as const;

function languageTag(): string {
  return getDictionary(getLocale()).site.languageTag;
}

/** Human-readable byte size in the current language (e.g. "2,4 Mo" in French, "2.4 MB" in English). */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = UNITS[getLocale()];
  if (bytes < 1024) return `${bytes} ${units[0]}`;
  let value = bytes / 1024;
  let unitIndex = 1;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const formatted = new Intl.NumberFormat(languageTag(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: value >= 100 ? 0 : decimals,
  }).format(value);
  return `${formatted} ${units[unitIndex]}`;
}

export function formatPercent(ratio: number, decimals = 0): string {
  return new Intl.NumberFormat(languageTag(), {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(ratio);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(languageTag()).format(value);
}
