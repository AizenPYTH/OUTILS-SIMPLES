/**
 * Barcode encoders producing a module sequence (true = bar) that the UI turns
 * into SVG/PNG. Pure functions, no dependency. Symbologies: EAN-13, EAN-8,
 * UPC-A, Code 128 (subsets B/C), Code 39.
 */

export type BarcodeType = "ean13" | "ean8" | "upca" | "code128" | "code39";

export interface Barcode {
  type: BarcodeType;
  /** Human-readable text printed under the bars (with check digit). */
  text: string;
  modules: boolean[];
  /** Quiet zone in modules on each side. */
  quietZone: number;
}

export type BarcodeResult = { ok: true; barcode: Barcode } | { ok: false; error: string };

export const BARCODE_TYPES: { id: BarcodeType; label: string; hint: string }[] = [
  { id: "ean13", label: "EAN-13", hint: "12 ou 13 chiffres (produits en Europe)" },
  { id: "ean8", label: "EAN-8", hint: "7 ou 8 chiffres (petits emballages)" },
  { id: "upca", label: "UPC-A", hint: "11 ou 12 chiffres (Amérique du Nord)" },
  { id: "code128", label: "Code 128", hint: "Texte ASCII, logistique, étiquettes" },
  { id: "code39", label: "Code 39", hint: "Majuscules, chiffres, - . $ / + % espace" },
];

// ------------------------------------------------------------------ EAN / UPC

const EAN_L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const EAN_G = EAN_L.map((p) => p.split("").reverse().map((c) => (c === "0" ? "1" : "0")).join(""));
const EAN_R = EAN_L.map((p) => p.split("").map((c) => (c === "0" ? "1" : "0")).join(""));
/** First-digit parity patterns for EAN-13 (L = L-code, G = G-code). */
const EAN13_PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export function eanCheckDigit(digits: string): number {
  let sum = 0;
  const fromRight = digits.split("").reverse();
  for (let i = 0; i < fromRight.length; i += 1) sum += Number(fromRight[i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}

function bits(pattern: string): boolean[] {
  return pattern.split("").map((c) => c === "1");
}

function encodeEan13(input: string): BarcodeResult {
  const digits = input.replace(/\s/g, "");
  if (!/^\d{12,13}$/.test(digits)) return { ok: false, error: "EAN-13 : saisissez 12 chiffres (ou 13 avec la clé)." };
  const body = digits.slice(0, 12);
  const check = eanCheckDigit(body);
  if (digits.length === 13 && Number(digits[12]) !== check) return { ok: false, error: `Clé de contrôle incorrecte : attendue ${check}.` };
  const full = body + check;
  const parity = EAN13_PARITY[Number(full[0])]!;
  const modules: boolean[] = [...bits("101")];
  for (let i = 1; i <= 6; i += 1) modules.push(...bits((parity[i - 1] === "L" ? EAN_L : EAN_G)[Number(full[i])]!));
  modules.push(...bits("01010"));
  for (let i = 7; i <= 12; i += 1) modules.push(...bits(EAN_R[Number(full[i])]!));
  modules.push(...bits("101"));
  return { ok: true, barcode: { type: "ean13", text: full, modules, quietZone: 11 } };
}

function encodeEan8(input: string): BarcodeResult {
  const digits = input.replace(/\s/g, "");
  if (!/^\d{7,8}$/.test(digits)) return { ok: false, error: "EAN-8 : saisissez 7 chiffres (ou 8 avec la clé)." };
  const body = digits.slice(0, 7);
  const check = eanCheckDigit(body);
  if (digits.length === 8 && Number(digits[7]) !== check) return { ok: false, error: `Clé de contrôle incorrecte : attendue ${check}.` };
  const full = body + check;
  const modules: boolean[] = [...bits("101")];
  for (let i = 0; i < 4; i += 1) modules.push(...bits(EAN_L[Number(full[i])]!));
  modules.push(...bits("01010"));
  for (let i = 4; i < 8; i += 1) modules.push(...bits(EAN_R[Number(full[i])]!));
  modules.push(...bits("101"));
  return { ok: true, barcode: { type: "ean8", text: full, modules, quietZone: 7 } };
}

function encodeUpcA(input: string): BarcodeResult {
  const digits = input.replace(/\s/g, "");
  if (!/^\d{11,12}$/.test(digits)) return { ok: false, error: "UPC-A : saisissez 11 chiffres (ou 12 avec la clé)." };
  const asEan = encodeEan13(`0${digits}`);
  if (!asEan.ok) return asEan;
  return { ok: true, barcode: { ...asEan.barcode, type: "upca", text: asEan.barcode.text.slice(1), quietZone: 9 } };
}

// ------------------------------------------------------------------ Code 128

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];
const CODE128_START_B = 104;
const CODE128_START_C = 105;
const CODE128_CODE_C = 99;
const CODE128_CODE_B = 100;
const CODE128_STOP = 106;

export { CODE128_PATTERNS };

function widthsToModules(widths: string, startWithBar = true): boolean[] {
  const out: boolean[] = [];
  let bar = startWithBar;
  for (const w of widths) {
    for (let i = 0; i < Number(w); i += 1) out.push(bar);
    bar = !bar;
  }
  return out;
}

/** Code 128 with automatic subset selection: runs of 4+ digit pairs use subset C. */
function encodeCode128(input: string): BarcodeResult {
  if (!input.length) return { ok: false, error: "Saisissez le texte à encoder." };
  if (input.length > 80) return { ok: false, error: "Code 128 : 80 caractères maximum pour rester lisible." };
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) return { ok: false, error: `Caractère non pris en charge par le Code 128 (sous-ensemble B) : « ${ch} ».` };
  }
  const values: number[] = [];
  let i = 0;
  let subset: "B" | "C" | null = null;
  const digitRun = (from: number) => {
    let n = 0;
    while (from + n < input.length && /\d/.test(input[from + n]!)) n += 1;
    return n;
  };
  while (i < input.length) {
    const run = digitRun(i);
    const useC = run >= 4 || (run === input.length && run % 2 === 0 && run >= 2);
    if (useC) {
      const pairs = Math.floor(run / 2) * 2;
      if (subset === null) values.push(CODE128_START_C);
      else if (subset !== "C") values.push(CODE128_CODE_C);
      subset = "C";
      for (let k = 0; k < pairs; k += 2) values.push(Number(input.slice(i + k, i + k + 2)));
      i += pairs;
      continue;
    }
    if (subset === null) values.push(CODE128_START_B);
    else if (subset !== "B") values.push(CODE128_CODE_B);
    subset = "B";
    values.push(input.charCodeAt(i) - 32);
    i += 1;
  }
  let checksum = values[0]!;
  for (let k = 1; k < values.length; k += 1) checksum += values[k]! * k;
  values.push(checksum % 103, CODE128_STOP);
  const modules = values.flatMap((v) => widthsToModules(CODE128_PATTERNS[v]!));
  return { ok: true, barcode: { type: "code128", text: input, modules, quietZone: 10 } };
}

// ------------------------------------------------------------------- Code 39

const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn",
  A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn",
  K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww", O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn",
  U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn", "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", $: "nwnwnwnnn", "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn", "*": "nwnnwnwnn",
};

export { CODE39 };

function encodeCode39(input: string): BarcodeResult {
  const text = input.toUpperCase();
  if (!text.length) return { ok: false, error: "Saisissez le texte à encoder." };
  if (text.length > 40) return { ok: false, error: "Code 39 : 40 caractères maximum pour rester lisible." };
  for (const ch of text) if (!CODE39[ch] || ch === "*") return { ok: false, error: `Caractère non pris en charge par le Code 39 : « ${ch} ». Autorisés : A-Z, 0-9, espace, - . $ / + %` };
  const modules: boolean[] = [];
  const wide = 3;
  const encodeChar = (pattern: string) => {
    let bar = true;
    for (const w of pattern) {
      for (let i = 0; i < (w === "w" ? wide : 1); i += 1) modules.push(bar);
      bar = !bar;
    }
    modules.push(false); // inter-character gap
  };
  encodeChar(CODE39["*"]!);
  for (const ch of text) encodeChar(CODE39[ch]!);
  encodeChar(CODE39["*"]!);
  modules.pop();
  return { ok: true, barcode: { type: "code39", text, modules, quietZone: 10 } };
}

export function encodeBarcode(type: BarcodeType, value: string): BarcodeResult {
  switch (type) {
    case "ean13":
      return encodeEan13(value);
    case "ean8":
      return encodeEan8(value);
    case "upca":
      return encodeUpcA(value);
    case "code128":
      return encodeCode128(value);
    case "code39":
      return encodeCode39(value);
  }
}

export interface BarcodeRenderOptions {
  moduleWidth: number;
  height: number;
  showText: boolean;
  foreground: string;
  background: string;
}

export const defaultBarcodeRender: BarcodeRenderOptions = { moduleWidth: 3, height: 90, showText: true, foreground: "#000000", background: "#ffffff" };

/** Renders the module sequence as an SVG string with a quiet zone and optional text. */
export function barcodeToSvg(barcode: Barcode, options: BarcodeRenderOptions = defaultBarcodeRender): string {
  const { moduleWidth: mw, height, showText } = options;
  const width = (barcode.modules.length + barcode.quietZone * 2) * mw;
  const fontSize = Math.max(10, mw * 4);
  const totalHeight = height + (showText ? fontSize + 6 : 0);
  const rects: string[] = [];
  let run = 0;
  for (let i = 0; i <= barcode.modules.length; i += 1) {
    const bar = i < barcode.modules.length && barcode.modules[i];
    if (bar) run += 1;
    else if (run > 0) {
      rects.push(`<rect x="${(barcode.quietZone + i - run) * mw}" y="0" width="${run * mw}" height="${height}" />`);
      run = 0;
    }
  }
  const text = showText ? `<text x="${width / 2}" y="${height + fontSize}" text-anchor="middle" font-family="Helvetica, Arial, monospace" font-size="${fontSize}" letter-spacing="${mw * 0.6}">${escapeXml(barcode.text)}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${options.background}" /><g fill="${options.foreground}">${rects.join("")}${text}</g></svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}
