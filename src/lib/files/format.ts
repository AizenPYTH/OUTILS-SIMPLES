/** Human-readable byte size with French formatting (e.g. "2,4 Mo"). */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} o`;
  const units = ["Ko", "Mo", "Go"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: value >= 100 ? 0 : decimals,
  }).format(value);
  return `${formatted} ${units[unitIndex]}`;
}

export function formatPercent(ratio: number, decimals = 0): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(ratio);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}
