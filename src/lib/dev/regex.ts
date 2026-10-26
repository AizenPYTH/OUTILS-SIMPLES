/** Regular-expression tester helpers (pure). */

export interface RegexMatch {
  index: number;
  end: number;
  text: string;
  groups: (string | undefined)[];
  named: Record<string, string | undefined>;
}

export type RegexResult =
  | { ok: true; matches: RegexMatch[]; truncated: boolean; global: boolean }
  | { ok: false; error: string };

export const REGEX_FLAGS: { flag: string; label: string }[] = [
  { flag: "g", label: "g — toutes les occurrences" },
  { flag: "i", label: "i — ignorer la casse" },
  { flag: "m", label: "m — ^ et $ par ligne" },
  { flag: "s", label: "s — le point inclut les sauts de ligne" },
  { flag: "u", label: "u — Unicode" },
];

export function compileRegex(
  pattern: string,
  flags: string,
): { ok: true; regex: RegExp } | { ok: false; error: string } {
  try {
    return { ok: true, regex: new RegExp(pattern, flags) };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message.replace(/^Invalid regular expression: /, "Expression invalide : ")
          : "Expression invalide.",
    };
  }
}

/** Runs the pattern over the text; without the g flag only the first match is returned. */
export function runRegex(
  pattern: string,
  flags: string,
  text: string,
  maxMatches = 2000,
): RegexResult {
  if (!pattern) return { ok: true, matches: [], truncated: false, global: flags.includes("g") };
  const global = flags.includes("g");
  const compiled = compileRegex(pattern, flags.includes("g") ? flags : `${flags}g`);
  if (!compiled.ok) return compiled;
  const regex = compiled.regex;
  const matches: RegexMatch[] = [];
  let truncated = false;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    matches.push({
      index: m.index,
      end: m.index + m[0].length,
      text: m[0],
      groups: m.slice(1),
      named: { ...(m.groups ?? {}) },
    });
    if (m[0].length === 0) regex.lastIndex += 1; // avoid infinite loops on empty matches
    if (!global) break;
    if (matches.length >= maxMatches) {
      truncated = true;
      break;
    }
  }
  return { ok: true, matches, truncated, global };
}

export function replaceWithRegex(
  pattern: string,
  flags: string,
  text: string,
  replacement: string,
): { ok: true; result: string } | { ok: false; error: string } {
  if (!pattern) return { ok: true, result: text };
  const compiled = compileRegex(pattern, flags);
  if (!compiled.ok) return compiled;
  try {
    return { ok: true, result: text.replace(compiled.regex, replacement) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Remplacement impossible." };
  }
}

/** Splits text into alternating plain / matched segments for highlighting. */
export function segmentMatches(
  text: string,
  matches: RegexMatch[],
): { text: string; match: RegexMatch | null }[] {
  const out: { text: string; match: RegexMatch | null }[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.index > cursor) out.push({ text: text.slice(cursor, match.index), match: null });
    if (match.end > match.index) out.push({ text: text.slice(match.index, match.end), match });
    cursor = Math.max(cursor, match.end);
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), match: null });
  return out;
}

export const REGEX_PRESETS: { label: string; pattern: string; flags: string }[] = [
  { label: "Adresse e-mail", pattern: "[\\w.+-]+@[\\w-]+\\.[\\w.-]+", flags: "gi" },
  { label: "URL", pattern: "https?://[^\\s<>\"']+", flags: "gi" },
  { label: "Téléphone français", pattern: "(?:\\+33\\s?|0)[1-9](?:[\\s.-]?\\d{2}){4}", flags: "g" },
  { label: "Code postal français", pattern: "\\b\\d{5}\\b", flags: "g" },
  {
    label: "Date JJ/MM/AAAA",
    pattern: "\\b(0[1-9]|[12]\\d|3[01])/(0[1-9]|1[0-2])/(\\d{4})\\b",
    flags: "g",
  },
  { label: "Nombre décimal", pattern: "-?\\d+(?:[.,]\\d+)?", flags: "g" },
  {
    label: "IBAN",
    pattern: "\\b[A-Z]{2}\\d{2}(?:\\s?[A-Z0-9]{4}){2,7}\\s?[A-Z0-9]{1,4}\\b",
    flags: "g",
  },
];
