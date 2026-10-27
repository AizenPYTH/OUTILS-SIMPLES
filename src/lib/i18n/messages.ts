/**
 * Inline message translation for the tool interfaces.
 *
 * The components were written in French; `tr("Fusionner")` keeps the French
 * text as the source and the key, and resolves the English text from the
 * message map when the ambient locale is English. Placeholders use braces:
 * `tr("Page {n} sur {total}", { n, total })`. An unknown key returns the
 * French text (and is reported by the coverage test, not at runtime).
 *
 * `tr` can also be applied to a message produced elsewhere (an error thrown
 * by a library function, possibly inside a worker): map entries whose key
 * holds a placeholder are matched as patterns, so `tr(error.message)` finds
 * "Fichier trop volumineux ({size} Mo)" for "Fichier trop volumineux (12 Mo)".
 */
import { getLocale } from "./locale";

type Vars = Record<string, string | number>;

interface Pattern {
  regex: RegExp;
  names: string[];
  template: string;
}

/**
 * The English map is registered by the English tree only (`src/lib/i18n/register-en.ts`,
 * imported by the English root layout and by its client bundle) so that French pages
 * never download it.
 */
let messagesEn: Record<string, string> = {};
let patterns: Pattern[] | null = null;

/** Adds English texts (merging): the shared chrome at load, the tool maps with the tool. */
export function registerMessages(map: Record<string, string>): void {
  messagesEn = { ...messagesEn, ...map };
  patterns = null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compilePatterns(): Pattern[] {
  const list: Pattern[] = [];
  for (const [key, template] of Object.entries(messagesEn)) {
    if (!key.includes("{")) continue;
    const names: string[] = [];
    const source = key
      .split(/(\{[a-zA-Z0-9_]+\})/)
      .map((part) => {
        const match = /^\{([a-zA-Z0-9_]+)\}$/.exec(part);
        if (match) {
          names.push(match[1]!);
          return "([\\s\\S]+?)";
        }
        return escapeRegex(part);
      })
      .join("");
    list.push({ regex: new RegExp(`^${source}$`), names, template });
  }
  return list;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/** Translates a French source string into the current locale. */
export function tr(fr: string, vars?: Vars): string {
  if (getLocale() === "fr") return interpolate(fr, vars);
  const direct = messagesEn[fr];
  if (direct !== undefined) return interpolate(direct, vars);
  if (!vars) {
    patterns ??= compilePatterns();
    for (const pattern of patterns) {
      const match = pattern.regex.exec(fr);
      if (match) {
        const found: Vars = {};
        pattern.names.forEach((name, index) => {
          found[name] = match[index + 1] ?? "";
        });
        return interpolate(pattern.template, found);
      }
    }
  }
  return interpolate(fr, vars);
}

/** Whether an English text is registered for this French key (used by tests). */
export function hasTranslation(fr: string): boolean {
  return fr in messagesEn;
}
