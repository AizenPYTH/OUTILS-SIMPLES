/**
 * JSON helpers. Validation reports the exact line/column of the first error
 * with a small hand-written parser (browsers' error messages differ and
 * rarely expose a position reliably).
 */
import { tr } from "@/lib/i18n/messages";

export interface JsonError {
  message: string;
  line: number;
  column: number;
  offset: number;
}

export type JsonValidation = { ok: true; value: unknown } | { ok: false; error: JsonError };

export function validateJson(text: string): JsonValidation {
  const parser = new Parser(text);
  try {
    const value = parser.parseDocument();
    return { ok: true, value };
  } catch (error) {
    if (error instanceof ParseError) return { ok: false, error: error.toJsonError(text) };
    throw error;
  }
}

export function formatJson(text: string, indent: number | "tab" = 2, sortKeys = false): string {
  const parsed = validateJson(text);
  if (!parsed.ok) throw parsed.error;
  const value = sortKeys ? sortObjectKeys(parsed.value) : parsed.value;
  return JSON.stringify(value, null, indent === "tab" ? "\t" : indent);
}

export function minifyJson(text: string): string {
  const parsed = validateJson(text);
  if (!parsed.ok) throw parsed.error;
  return JSON.stringify(parsed.value);
}

export function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort())
      out[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

/** Describes the shape of a parsed value for the UI (type, size). */
export function describeJson(value: unknown): string {
  if (Array.isArray(value)) return tr("tableau de {n} élément(s)", { n: value.length });
  if (value === null) return "null";
  if (typeof value === "object")
    return tr("objet avec {n} clé(s)", { n: Object.keys(value as object).length });
  return typeof value === "string"
    ? tr("chaîne")
    : typeof value === "number"
      ? tr("nombre")
      : typeof value === "boolean"
        ? tr("booléen")
        : typeof value;
}

class ParseError extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(message);
  }
  toJsonError(text: string): JsonError {
    const before = text.slice(0, this.offset);
    const line = before.split("\n").length;
    const column = this.offset - (before.lastIndexOf("\n") + 1) + 1;
    return { message: this.message, line, column, offset: this.offset };
  }
}

class Parser {
  private pos = 0;
  constructor(private readonly text: string) {}

  parseDocument(): unknown {
    this.skipWhitespace();
    if (this.pos >= this.text.length)
      throw new ParseError(tr("Document vide : aucune valeur JSON trouvée."), this.pos);
    const value = this.parseValue();
    this.skipWhitespace();
    if (this.pos < this.text.length)
      throw new ParseError(
        tr("Caractère inattendu « {char} » après la fin du document.", {
          char: this.peekDisplay(),
        }),
        this.pos,
      );
    return value;
  }

  private peek(): string {
    return this.text[this.pos] ?? "";
  }
  private peekDisplay(): string {
    const c = this.peek();
    return c === "" ? tr("fin du texte") : c === "\n" ? tr("saut de ligne") : c;
  }
  private skipWhitespace(): void {
    while (this.pos < this.text.length && /[ \t\n\r]/.test(this.text[this.pos]!)) this.pos += 1;
  }

  private parseValue(): unknown {
    const c = this.peek();
    if (c === "{") return this.parseObject();
    if (c === "[") return this.parseArray();
    if (c === '"') return this.parseString();
    if (c === "-" || (c >= "0" && c <= "9")) return this.parseNumber();
    if (this.text.startsWith("true", this.pos)) return ((this.pos += 4), true);
    if (this.text.startsWith("false", this.pos)) return ((this.pos += 5), false);
    if (this.text.startsWith("null", this.pos)) return ((this.pos += 4), null);
    if (c === "'")
      throw new ParseError(
        tr('Les chaînes JSON doivent utiliser des guillemets doubles ("), pas des apostrophes.'),
        this.pos,
      );
    if (c === "") throw new ParseError(tr("Fin du texte inattendue : valeur manquante."), this.pos);
    throw new ParseError(
      tr("Valeur inattendue à partir de « {char} ».", { char: this.peekDisplay() }),
      this.pos,
    );
  }

  private parseObject(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    this.pos += 1;
    this.skipWhitespace();
    if (this.peek() === "}") return ((this.pos += 1), out);
    for (;;) {
      this.skipWhitespace();
      if (this.peek() !== '"') {
        if (this.peek() === "}") throw new ParseError(tr("Virgule en trop avant « } »."), this.pos);
        if (this.peek() === "'")
          throw new ParseError(
            tr('Les clés JSON doivent utiliser des guillemets doubles ("), pas des apostrophes.'),
            this.pos,
          );
        throw new ParseError(
          tr("Nom de clé attendu entre guillemets, trouvé « {char} ».", {
            char: this.peekDisplay(),
          }),
          this.pos,
        );
      }
      const key = this.parseString();
      this.skipWhitespace();
      if (this.peek() !== ":")
        throw new ParseError(tr('« : » attendu après la clé "{key}".', { key }), this.pos);
      this.pos += 1;
      this.skipWhitespace();
      out[key] = this.parseValue();
      this.skipWhitespace();
      const c = this.peek();
      if (c === ",") {
        this.pos += 1;
        continue;
      }
      if (c === "}") return ((this.pos += 1), out);
      throw new ParseError(
        tr("« , » ou « } » attendu, trouvé « {char} ».", { char: this.peekDisplay() }),
        this.pos,
      );
    }
  }

  private parseArray(): unknown[] {
    const out: unknown[] = [];
    this.pos += 1;
    this.skipWhitespace();
    if (this.peek() === "]") return ((this.pos += 1), out);
    for (;;) {
      this.skipWhitespace();
      if (this.peek() === "]") throw new ParseError(tr("Virgule en trop avant « ] »."), this.pos);
      out.push(this.parseValue());
      this.skipWhitespace();
      const c = this.peek();
      if (c === ",") {
        this.pos += 1;
        continue;
      }
      if (c === "]") return ((this.pos += 1), out);
      throw new ParseError(
        tr("« , » ou « ] » attendu, trouvé « {char} ».", { char: this.peekDisplay() }),
        this.pos,
      );
    }
  }

  private parseString(): string {
    const start = this.pos;
    this.pos += 1;
    let out = "";
    for (;;) {
      if (this.pos >= this.text.length)
        throw new ParseError(tr("Chaîne non terminée : guillemet fermant manquant."), start);
      const c = this.text[this.pos]!;
      if (c === '"') return ((this.pos += 1), out);
      if (c === "\\") {
        const next = this.text[this.pos + 1] ?? "";
        const map: Record<string, string> = {
          '"': '"',
          "\\": "\\",
          "/": "/",
          b: "\b",
          f: "\f",
          n: "\n",
          r: "\r",
          t: "\t",
        };
        if (next in map) {
          out += map[next];
          this.pos += 2;
        } else if (next === "u") {
          const hex = this.text.slice(this.pos + 2, this.pos + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex))
            throw new ParseError(
              tr("Séquence \\u invalide (4 chiffres hexadécimaux attendus)."),
              this.pos,
            );
          out += String.fromCharCode(Number.parseInt(hex, 16));
          this.pos += 6;
        } else {
          throw new ParseError(
            tr("Séquence d'échappement invalide « \\{c} ».", { c: next }),
            this.pos,
          );
        }
        continue;
      }
      if (c === "\n")
        throw new ParseError(tr("Saut de ligne dans une chaîne : utilisez \\n."), this.pos);
      out += c;
      this.pos += 1;
    }
  }

  private parseNumber(): number {
    const match = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(this.text.slice(this.pos));
    if (!match) throw new ParseError(tr("Nombre invalide."), this.pos);
    const raw = match[0];
    const after = this.text[this.pos + raw.length] ?? "";
    if (/[0-9.]/.test(after))
      throw new ParseError(tr("Nombre invalide (zéro initial ou point mal placé)."), this.pos);
    this.pos += raw.length;
    return Number(raw);
  }
}
