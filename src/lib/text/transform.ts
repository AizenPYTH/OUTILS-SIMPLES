/** Pure text transformations shared by the text tools. */

export type CaseMode = "upper" | "lower" | "sentence" | "title" | "capitalize-words" | "invert" | "snake" | "kebab" | "camel";

const FRENCH_LOWER_WORDS = new Set(["de", "des", "du", "la", "le", "les", "et", "ou", "à", "au", "aux", "en", "un", "une", "d'", "l'", "sur", "pour", "par", "dans"]);

export function changeCase(text: string, mode: CaseMode): string {
  switch (mode) {
    case "upper":
      return text.toLocaleUpperCase("fr-FR");
    case "lower":
      return text.toLocaleLowerCase("fr-FR");
    case "sentence":
      return text
        .toLocaleLowerCase("fr-FR")
        .replace(/(^\s*[\p{L}]|[.!?…]\s+[\p{L}]|\n\s*[\p{L}])/gu, (m) => m.toLocaleUpperCase("fr-FR"));
    case "capitalize-words":
      return text.replace(/[\p{L}\p{N}'’]+/gu, (w) => capitalize(w));
    case "title":
      return text.replace(/[\p{L}\p{N}'’]+/gu, (w, offset: number) =>
        offset > 0 && FRENCH_LOWER_WORDS.has(w.toLocaleLowerCase("fr-FR")) ? w.toLocaleLowerCase("fr-FR") : capitalize(w),
      );
    case "invert":
      return Array.from(text)
        .map((c) => (c === c.toLocaleUpperCase("fr-FR") ? c.toLocaleLowerCase("fr-FR") : c.toLocaleUpperCase("fr-FR")))
        .join("");
    case "snake":
      return words(text).join("_").toLowerCase();
    case "kebab":
      return words(text).join("-").toLowerCase();
    case "camel":
      return words(text)
        .map((w, i) => (i === 0 ? w.toLowerCase() : capitalize(w.toLowerCase())))
        .join("");
  }
}

function capitalize(word: string): string {
  const chars = Array.from(word);
  if (chars.length === 0) return word;
  return (chars[0] ?? "").toLocaleUpperCase("fr-FR") + chars.slice(1).join("").toLocaleLowerCase("fr-FR");
}

function words(text: string): string[] {
  return stripAccents(text)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

export function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export interface CleanOptions {
  trimLines: boolean;
  collapseSpaces: boolean;
  removeEmptyLines: boolean;
  joinWrappedLines: boolean;
  removeDuplicateLines: boolean;
  sortLines: "none" | "asc" | "desc";
  fixPdfHyphenation: boolean;
  normalizeQuotes: boolean;
  normalizeLineBreaks: boolean;
}

export const defaultCleanOptions: CleanOptions = {
  trimLines: true,
  collapseSpaces: true,
  removeEmptyLines: false,
  joinWrappedLines: false,
  removeDuplicateLines: false,
  sortLines: "none",
  fixPdfHyphenation: false,
  normalizeQuotes: false,
  normalizeLineBreaks: true,
};

export function cleanText(input: string, options: CleanOptions): string {
  let text = input;
  if (options.normalizeLineBreaks) text = text.replace(/\r\n?/g, "\n").replace(/ /g, " ");
  if (options.fixPdfHyphenation) text = text.replace(/(\p{Ll})-\n(\p{Ll})/gu, "$1$2");
  if (options.joinWrappedLines) {
    // Keep paragraph breaks (blank lines); join single line breaks inside a paragraph.
    text = text
      .split(/\n{2,}/)
      .map((p) => p.replace(/[ \t]*\n[ \t]*/g, " "))
      .join("\n\n");
  }
  let lines = text.split("\n");
  if (options.trimLines) lines = lines.map((l) => l.trim());
  if (options.collapseSpaces) lines = lines.map((l) => l.replace(/[ \t]{2,}/g, " "));
  if (options.removeEmptyLines) lines = lines.filter((l) => l.trim().length > 0);
  else lines = lines.reduce<string[]>((acc, line) => {
    // Collapse 3+ blank lines into one blank line.
    if (line.trim() === "" && acc.length >= 1 && acc[acc.length - 1]?.trim() === "") return acc;
    acc.push(line);
    return acc;
  }, []);
  if (options.removeDuplicateLines) {
    const seen = new Set<string>();
    lines = lines.filter((l) => {
      if (l.trim() === "") return true;
      if (seen.has(l)) return false;
      seen.add(l);
      return true;
    });
  }
  if (options.sortLines !== "none") {
    const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });
    lines = [...lines].sort((a, b) => collator.compare(a, b));
    if (options.sortLines === "desc") lines.reverse();
  }
  if (options.normalizeQuotes) text = lines.join("\n").replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'");
  else text = lines.join("\n");
  return text;
}

export function slugify(text: string, separator = "-"): string {
  return stripAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^${separator}+|${separator}+$`, "g"), "");
}

const EMAIL_RE = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
const URL_RE = /\bhttps?:\/\/[^\s<>"'()]+[^\s<>"'().,;:!?]/gi;
/** French numbers (+33 or 0X) in common written forms; international numbers with + and 8–15 digits. */
const PHONE_RE = /(?:\+33\s?[1-9](?:[\s.-]?\d{2}){4}|\b0[1-9](?:[\s.-]?\d{2}){4}\b|\+\d{1,3}[\s.-]?(?:\d[\s.-]?){7,14}\d)/g;

export function extractEmails(text: string): string[] {
  return unique(text.match(EMAIL_RE) ?? []);
}
export function extractUrls(text: string): string[] {
  return unique(text.match(URL_RE) ?? []);
}
export function extractPhones(text: string): string[] {
  return unique((text.match(PHONE_RE) ?? []).map((p) => p.trim()));
}

export function unique<T>(list: T[]): T[] {
  return Array.from(new Set(list));
}

export interface ListCompare {
  onlyA: string[];
  onlyB: string[];
  both: string[];
}

export function compareLists(a: string, b: string, caseInsensitive = false): ListCompare {
  const norm = (s: string) => (caseInsensitive ? s.trim().toLocaleLowerCase("fr-FR") : s.trim());
  const la = unique(a.split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
  const lb = unique(b.split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
  const setA = new Set(la.map(norm));
  const setB = new Set(lb.map(norm));
  return {
    onlyA: la.filter((x) => !setB.has(norm(x))),
    onlyB: lb.filter((x) => !setA.has(norm(x))),
    both: la.filter((x) => setB.has(norm(x))),
  };
}

export function findAndReplace(text: string, search: string, replacement: string, options: { regex: boolean; caseInsensitive: boolean; wholeWord: boolean }): { result: string; count: number } {
  if (!search) return { result: text, count: 0 };
  let pattern: RegExp;
  const flags = `g${options.caseInsensitive ? "i" : ""}u`;
  if (options.regex) {
    pattern = new RegExp(search, flags);
  } else {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    pattern = new RegExp(options.wholeWord ? `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])` : escaped, flags);
  }
  let count = 0;
  const result = text.replace(pattern, (...args) => {
    count += 1;
    if (!options.regex) return replacement;
    // Support $1-style groups when regex mode is on.
    const groups = args.slice(1, -2) as string[];
    return replacement.replace(/\$(\d+)/g, (_, n: string) => groups[Number(n) - 1] ?? "");
  });
  return { result, count };
}

const LOREM =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum".split(" ");

/** Deterministic pseudo-random generator so the same seed yields the same text. */
export function loremIpsum(paragraphs: number, sentencesPerParagraph = 5, seed = 1): string {
  let state = seed >>> 0 || 1;
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const out: string[] = [];
  for (let p = 0; p < paragraphs; p += 1) {
    const sentences: string[] = [];
    for (let s = 0; s < sentencesPerParagraph; s += 1) {
      const length = 6 + Math.floor(rand() * 10);
      const words: string[] = [];
      for (let w = 0; w < length; w += 1) words.push(LOREM[Math.floor(rand() * LOREM.length)]!);
      const sentence = words.join(" ");
      sentences.push(sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".");
    }
    out.push(sentences.join(" "));
  }
  return out.join("\n\n");
}
