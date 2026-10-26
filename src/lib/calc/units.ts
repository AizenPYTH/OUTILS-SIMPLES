/** Unit conversion tables (factor to a base unit) plus temperature special-casing. */

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
    label: "Longueur",
    units: [
      { id: "mm", label: "millimètre", symbol: "mm", factor: 0.001 },
      { id: "cm", label: "centimètre", symbol: "cm", factor: 0.01 },
      { id: "m", label: "mètre", symbol: "m", factor: 1 },
      { id: "km", label: "kilomètre", symbol: "km", factor: 1000 },
      { id: "in", label: "pouce", symbol: "in", factor: 0.0254 },
      { id: "ft", label: "pied", symbol: "ft", factor: 0.3048 },
      { id: "yd", label: "yard", symbol: "yd", factor: 0.9144 },
      { id: "mi", label: "mile", symbol: "mi", factor: 1609.344 },
      { id: "nmi", label: "mille marin", symbol: "NM", factor: 1852 },
    ],
  },
  {
    id: "mass",
    label: "Masse",
    units: [
      { id: "mg", label: "milligramme", symbol: "mg", factor: 1e-6 },
      { id: "g", label: "gramme", symbol: "g", factor: 0.001 },
      { id: "kg", label: "kilogramme", symbol: "kg", factor: 1 },
      { id: "t", label: "tonne", symbol: "t", factor: 1000 },
      { id: "oz", label: "once", symbol: "oz", factor: 0.028349523125 },
      { id: "lb", label: "livre", symbol: "lb", factor: 0.45359237 },
    ],
  },
  {
    id: "temperature",
    label: "Température",
    units: [
      { id: "c", label: "degré Celsius", symbol: "°C", factor: 1 },
      { id: "f", label: "degré Fahrenheit", symbol: "°F", factor: 1 },
      { id: "k", label: "kelvin", symbol: "K", factor: 1 },
    ],
  },
  {
    id: "volume",
    label: "Volume",
    units: [
      { id: "ml", label: "millilitre", symbol: "ml", factor: 0.001 },
      { id: "cl", label: "centilitre", symbol: "cl", factor: 0.01 },
      { id: "l", label: "litre", symbol: "L", factor: 1 },
      { id: "m3", label: "mètre cube", symbol: "m³", factor: 1000 },
      { id: "tsp", label: "cuillère à café (US)", symbol: "tsp", factor: 0.00492892 },
      { id: "tbsp", label: "cuillère à soupe (US)", symbol: "tbsp", factor: 0.0147868 },
      { id: "cup", label: "tasse (US)", symbol: "cup", factor: 0.236588 },
      { id: "pt", label: "pinte (US)", symbol: "pt", factor: 0.473176 },
      { id: "gal", label: "gallon (US)", symbol: "gal", factor: 3.785411784 },
    ],
  },
  {
    id: "area",
    label: "Surface",
    units: [
      { id: "cm2", label: "centimètre carré", symbol: "cm²", factor: 0.0001 },
      { id: "m2", label: "mètre carré", symbol: "m²", factor: 1 },
      { id: "a", label: "are", symbol: "a", factor: 100 },
      { id: "ha", label: "hectare", symbol: "ha", factor: 10000 },
      { id: "km2", label: "kilomètre carré", symbol: "km²", factor: 1e6 },
      { id: "ft2", label: "pied carré", symbol: "ft²", factor: 0.09290304 },
      { id: "ac", label: "acre", symbol: "ac", factor: 4046.8564224 },
    ],
  },
  {
    id: "speed",
    label: "Vitesse",
    units: [
      { id: "ms", label: "mètre par seconde", symbol: "m/s", factor: 1 },
      { id: "kmh", label: "kilomètre par heure", symbol: "km/h", factor: 1 / 3.6 },
      { id: "mph", label: "mile par heure", symbol: "mph", factor: 0.44704 },
      { id: "kn", label: "nœud", symbol: "kn", factor: 0.514444 },
    ],
  },
  {
    id: "data",
    label: "Données",
    units: [
      { id: "bit", label: "bit", symbol: "b", factor: 0.125 },
      { id: "B", label: "octet", symbol: "o", factor: 1 },
      { id: "kB", label: "kilooctet (10³)", symbol: "ko", factor: 1e3 },
      { id: "MB", label: "mégaoctet (10⁶)", symbol: "Mo", factor: 1e6 },
      { id: "GB", label: "gigaoctet (10⁹)", symbol: "Go", factor: 1e9 },
      { id: "TB", label: "téraoctet (10¹²)", symbol: "To", factor: 1e12 },
      { id: "KiB", label: "kibioctet (2¹⁰)", symbol: "Kio", factor: 1024 },
      { id: "MiB", label: "mébioctet (2²⁰)", symbol: "Mio", factor: 1024 ** 2 },
      { id: "GiB", label: "gibioctet (2³⁰)", symbol: "Gio", factor: 1024 ** 3 },
      { id: "TiB", label: "tébioctet (2⁴⁰)", symbol: "Tio", factor: 1024 ** 4 },
    ],
  },
  {
    id: "time",
    label: "Durée",
    units: [
      { id: "ms", label: "milliseconde", symbol: "ms", factor: 0.001 },
      { id: "s", label: "seconde", symbol: "s", factor: 1 },
      { id: "min", label: "minute", symbol: "min", factor: 60 },
      { id: "h", label: "heure", symbol: "h", factor: 3600 },
      { id: "d", label: "jour", symbol: "j", factor: 86400 },
      { id: "wk", label: "semaine", symbol: "sem.", factor: 604800 },
      { id: "yr", label: "année (365,25 j)", symbol: "an", factor: 31557600 },
    ],
  },
  {
    id: "energy",
    label: "Énergie",
    units: [
      { id: "J", label: "joule", symbol: "J", factor: 1 },
      { id: "kJ", label: "kilojoule", symbol: "kJ", factor: 1000 },
      { id: "cal", label: "calorie", symbol: "cal", factor: 4.184 },
      { id: "kcal", label: "kilocalorie", symbol: "kcal", factor: 4184 },
      { id: "Wh", label: "wattheure", symbol: "Wh", factor: 3600 },
      { id: "kWh", label: "kilowattheure", symbol: "kWh", factor: 3.6e6 },
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
