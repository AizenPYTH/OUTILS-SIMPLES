/** Unit conversion tables (factor to a base unit) plus temperature special-casing. */
import { tr } from "@/lib/i18n/messages";

export interface Unit {
  id: string;
  label: string;
  symbol: string;
  /** Multiply a value in this unit by `factor` to get the base unit. */
  factor: number;
}

export interface UnitCategory {
  id: string;
  label: string;
  units: Unit[];
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: "length",
    label: tr("Longueur"),
    units: [
      { id: "mm", label: tr("millimètre"), symbol: "mm", factor: 0.001 },
      { id: "cm", label: tr("centimètre"), symbol: "cm", factor: 0.01 },
      { id: "m", label: tr("mètre"), symbol: "m", factor: 1 },
      { id: "km", label: tr("kilomètre"), symbol: "km", factor: 1000 },
      { id: "in", label: tr("pouce"), symbol: "in", factor: 0.0254 },
      { id: "ft", label: tr("pied"), symbol: "ft", factor: 0.3048 },
      { id: "yd", label: "yard", symbol: "yd", factor: 0.9144 },
      { id: "mi", label: "mile", symbol: "mi", factor: 1609.344 },
      { id: "nmi", label: tr("mille marin"), symbol: "NM", factor: 1852 },
    ],
  },
  {
    id: "mass",
    label: tr("Masse"),
    units: [
      { id: "mg", label: tr("milligramme"), symbol: "mg", factor: 1e-6 },
      { id: "g", label: tr("gramme"), symbol: "g", factor: 0.001 },
      { id: "kg", label: tr("kilogramme"), symbol: "kg", factor: 1 },
      { id: "t", label: "tonne", symbol: "t", factor: 1000 },
      { id: "oz", label: tr("once"), symbol: "oz", factor: 0.028349523125 },
      { id: "lb", label: tr("livre"), symbol: "lb", factor: 0.45359237 },
    ],
  },
  {
    id: "temperature",
    label: tr("Température"),
    units: [
      { id: "c", label: tr("degré Celsius"), symbol: "°C", factor: 1 },
      { id: "f", label: tr("degré Fahrenheit"), symbol: "°F", factor: 1 },
      { id: "k", label: "kelvin", symbol: "K", factor: 1 },
    ],
  },
  {
    id: "volume",
    label: "Volume",
    units: [
      { id: "ml", label: tr("millilitre"), symbol: "ml", factor: 0.001 },
      { id: "cl", label: tr("centilitre"), symbol: "cl", factor: 0.01 },
      { id: "l", label: tr("litre"), symbol: "L", factor: 1 },
      { id: "m3", label: tr("mètre cube"), symbol: "m³", factor: 1000 },
      { id: "tsp", label: tr("cuillère à café (US)"), symbol: "tsp", factor: 0.00492892 },
      { id: "tbsp", label: tr("cuillère à soupe (US)"), symbol: "tbsp", factor: 0.0147868 },
      { id: "cup", label: tr("tasse (US)"), symbol: "cup", factor: 0.236588 },
      { id: "pt", label: tr("pinte (US)"), symbol: "pt", factor: 0.473176 },
      { id: "gal", label: "gallon (US)", symbol: "gal", factor: 3.785411784 },
    ],
  },
  {
    id: "area",
    label: tr("Surface"),
    units: [
      { id: "cm2", label: tr("centimètre carré"), symbol: "cm²", factor: 0.0001 },
      { id: "m2", label: tr("mètre carré"), symbol: "m²", factor: 1 },
      { id: "a", label: "are", symbol: "a", factor: 100 },
      { id: "ha", label: "hectare", symbol: "ha", factor: 10000 },
      { id: "km2", label: tr("kilomètre carré"), symbol: "km²", factor: 1e6 },
      { id: "ft2", label: tr("pied carré"), symbol: "ft²", factor: 0.09290304 },
      { id: "ac", label: "acre", symbol: "ac", factor: 4046.8564224 },
    ],
  },
  {
    id: "speed",
    label: tr("Vitesse"),
    units: [
      { id: "ms", label: tr("mètre par seconde"), symbol: "m/s", factor: 1 },
      { id: "kmh", label: tr("kilomètre par heure"), symbol: "km/h", factor: 1 / 3.6 },
      { id: "mph", label: tr("mile par heure"), symbol: "mph", factor: 0.44704 },
      { id: "kn", label: tr("nœud"), symbol: "kn", factor: 0.514444 },
    ],
  },
  {
    id: "data",
    label: tr("Données"),
    units: [
      { id: "bit", label: "bit", symbol: "b", factor: 0.125 },
      { id: "B", label: tr("octet"), symbol: "o", factor: 1 },
      { id: "kB", label: tr("kilooctet (10³)"), symbol: "ko", factor: 1e3 },
      { id: "MB", label: tr("mégaoctet (10⁶)"), symbol: "Mo", factor: 1e6 },
      { id: "GB", label: tr("gigaoctet (10⁹)"), symbol: "Go", factor: 1e9 },
      { id: "TB", label: tr("téraoctet (10¹²)"), symbol: "To", factor: 1e12 },
      { id: "KiB", label: tr("kibioctet (2¹⁰)"), symbol: "Kio", factor: 1024 },
      { id: "MiB", label: tr("mébioctet (2²⁰)"), symbol: "Mio", factor: 1024 ** 2 },
      { id: "GiB", label: tr("gibioctet (2³⁰)"), symbol: "Gio", factor: 1024 ** 3 },
      { id: "TiB", label: tr("tébioctet (2⁴⁰)"), symbol: "Tio", factor: 1024 ** 4 },
    ],
  },
  {
    id: "time",
    label: tr("Durée"),
    units: [
      { id: "ms", label: tr("milliseconde"), symbol: "ms", factor: 0.001 },
      { id: "s", label: tr("seconde"), symbol: "s", factor: 1 },
      { id: "min", label: "minute", symbol: "min", factor: 60 },
      { id: "h", label: tr("heure"), symbol: "h", factor: 3600 },
      { id: "d", label: tr("jour"), symbol: "j", factor: 86400 },
      { id: "wk", label: tr("semaine"), symbol: "sem.", factor: 604800 },
      { id: "yr", label: tr("année (365,25 j)"), symbol: "an", factor: 31557600 },
    ],
  },
  {
    id: "energy",
    label: tr("Énergie"),
    units: [
      { id: "J", label: "joule", symbol: "J", factor: 1 },
      { id: "kJ", label: "kilojoule", symbol: "kJ", factor: 1000 },
      { id: "cal", label: "calorie", symbol: "cal", factor: 4.184 },
      { id: "kcal", label: "kilocalorie", symbol: "kcal", factor: 4184 },
      { id: "Wh", label: tr("wattheure"), symbol: "Wh", factor: 3600 },
      { id: "kWh", label: tr("kilowattheure"), symbol: "kWh", factor: 3.6e6 },
    ],
  },
];

export function getUnitCategory(id: string): UnitCategory | undefined {
  return UNIT_CATEGORIES.find((c) => c.id === id);
}

function toCelsius(value: number, unit: string): number {
  if (unit === "f") return ((value - 32) * 5) / 9;
  if (unit === "k") return value - 273.15;
  return value;
}

function fromCelsius(value: number, unit: string): number {
  if (unit === "f") return (value * 9) / 5 + 32;
  if (unit === "k") return value + 273.15;
  return value;
}

export function convertUnit(
  categoryId: string,
  value: number,
  fromId: string,
  toId: string,
): number | null {
  const category = getUnitCategory(categoryId);
  if (!category) return null;
  const from = category.units.find((u) => u.id === fromId);
  const to = category.units.find((u) => u.id === toId);
  if (!from || !to) return null;
  if (categoryId === "temperature") return fromCelsius(toCelsius(value, fromId), toId);
  return (value * from.factor) / to.factor;
}

/** Formats with a sensible number of significant digits (no trailing noise). */
export function formatConverted(value: number, locale = "fr-FR"): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e15 || abs < 1e-6) return value.toExponential(4).replace(".", ",");
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return value.toLocaleString(locale, { maximumFractionDigits: digits });
}
