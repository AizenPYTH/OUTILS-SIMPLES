/** Colour parsing, conversion and WCAG contrast (pure). */

export interface Rgb {
  r: number;
  g: number;
  b: number;
  /** 0–1 */
  a: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface Cmyk {
  c: number;
  m: number;
  y: number;
  k: number;
}

const NAMED: Record<string, string> = {
  black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff", yellow: "#ffff00", orange: "#ffa500", purple: "#800080", pink: "#ffc0cb", gray: "#808080", grey: "#808080", silver: "#c0c0c0",
  navy: "#000080", teal: "#008080", olive: "#808000", maroon: "#800000", lime: "#00ff00", aqua: "#00ffff", cyan: "#00ffff", magenta: "#ff00ff", fuchsia: "#ff00ff", brown: "#a52a2a", gold: "#ffd700", indigo: "#4b0082", violet: "#ee82ee", coral: "#ff7f50", salmon: "#fa8072", khaki: "#f0e68c", tomato: "#ff6347", turquoise: "#40e0d0", beige: "#f5f5dc", ivory: "#fffff0", crimson: "#dc143c",
};

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/** Parses #rgb, #rrggbb, #rrggbbaa, rgb()/rgba(), hsl()/hsla() and common names. */
export function parseColor(input: string): Rgb | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (NAMED[s]) return parseColor(NAMED[s]!);
  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (hex) {
    let h = hex[1]!;
    if (h.length <= 4) h = h.split("").map((c) => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,?\s*([\d.]+)\s*,?\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/.exec(s);
  if (rgb) return { r: clamp255(Number(rgb[1])), g: clamp255(Number(rgb[2])), b: clamp255(Number(rgb[3])), a: parseAlpha(rgb[4]) };
  const hsl = /^hsla?\(\s*([\d.]+)(?:deg)?\s*,?\s*([\d.]+)%\s*,?\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/.exec(s);
  if (hsl) return { ...hslToRgb({ h: Number(hsl[1]), s: Number(hsl[2]), l: Number(hsl[3]) }), a: parseAlpha(hsl[4]) };
  return null;
}

function parseAlpha(value: string | undefined): number {
  if (value === undefined) return 1;
  const n = value.endsWith("%") ? Number(value.slice(0, -1)) / 100 : Number(value);
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 1));
}

export function rgbToHex({ r, g, b, a }: Rgb, withAlpha = false): string {
  const hex = [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, "0")).join("");
  return `#${hex}${withAlpha && a < 1 ? clamp255(a * 255).toString(16).padStart(2, "0") : ""}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let [r, g, b] = [0, 0, 0];
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = ln - c / 2;
  return { r: clamp255((r + m) * 255), g: clamp255((g + m) * 255), b: clamp255((b + m) * 255), a: 1 };
}

export function rgbToCmyk({ r, g, b }: Rgb): Cmyk {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return { c: Math.round(((1 - rn - k) / (1 - k)) * 100), m: Math.round(((1 - gn - k) / (1 - k)) * 100), y: Math.round(((1 - bn - k) / (1 - k)) * 100), k: Math.round(k * 100) };
}

export function formatRgb({ r, g, b, a }: Rgb): string {
  return a < 1 ? `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})` : `rgb(${r}, ${g}, ${b})`;
}

export function formatHsl(hsl: Hsl, a = 1): string {
  return a < 1 ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${Number(a.toFixed(2))})` : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

export function formatCmyk({ c, m, y, k }: Cmyk): string {
  return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;
}

/** WCAG relative luminance (sRGB). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

export interface WcagResult {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
  uiComponents: boolean;
}

export function wcagContrast(foreground: Rgb, background: Rgb): WcagResult {
  const ratio = contrastRatio(foreground, background);
  return { ratio: Math.round(ratio * 100) / 100, aaNormal: ratio >= 4.5, aaLarge: ratio >= 3, aaaNormal: ratio >= 7, aaaLarge: ratio >= 4.5, uiComponents: ratio >= 3 };
}

/** Lighter / darker variants and the complementary colour, handy for palettes. */
export function colorVariants(rgb: Rgb): { label: string; rgb: Rgb }[] {
  const hsl = rgbToHsl(rgb);
  const at = (l: number) => hslToRgb({ ...hsl, l: Math.max(0, Math.min(100, l)) });
  return [
    { label: "Plus clair (+20)", rgb: at(hsl.l + 20) },
    { label: "Plus clair (+10)", rgb: at(hsl.l + 10) },
    { label: "Couleur", rgb: { ...rgb, a: 1 } },
    { label: "Plus foncé (−10)", rgb: at(hsl.l - 10) },
    { label: "Plus foncé (−20)", rgb: at(hsl.l - 20) },
    { label: "Complémentaire", rgb: hslToRgb({ ...hsl, h: (hsl.h + 180) % 360 }) },
  ];
}
