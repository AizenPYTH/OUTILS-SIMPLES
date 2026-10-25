/**
 * Minimal PDF content-stream tokenizer (ISO 32000-1 §7.2 and §7.8.2).
 *
 * It produces the sequence of operators with their operands and, above all,
 * the exact byte range of each operation and operand, so a stream can be
 * rewritten by splicing bytes without re-serialising anything else: every
 * operator we do not touch stays byte-for-byte identical.
 *
 * Pure (no DOM, no pdf-lib): unit-tested in Node.
 */

export type Operand =
  | { type: "number"; value: number; start: number; end: number }
  | { type: "name"; value: string; start: number; end: number }
  | { type: "string"; bytes: Uint8Array; hex: boolean; start: number; end: number }
  | { type: "array"; items: Operand[]; start: number; end: number }
  | { type: "dict"; start: number; end: number }
  | { type: "keyword"; value: string; start: number; end: number };

export interface ContentOp {
  /** Operator name (`Tj`, `q`, `BI` for a whole inline image…). */
  op: string;
  operands: Operand[];
  /** Byte range of the whole operation: first operand to the end of the operator. */
  start: number;
  end: number;
}

const WHITESPACE = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIMITERS = new Set([0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25]);

function isRegular(byte: number): boolean {
  return !WHITESPACE.has(byte) && !DELIMITERS.has(byte);
}

class Lexer {
  pos = 0;
  constructor(readonly bytes: Uint8Array) {}

  skipSpace(): void {
    while (this.pos < this.bytes.length) {
      const b = this.bytes[this.pos]!;
      if (WHITESPACE.has(b)) this.pos += 1;
      else if (b === 0x25) {
        // Comment up to end of line.
        while (
          this.pos < this.bytes.length &&
          this.bytes[this.pos] !== 0x0a &&
          this.bytes[this.pos] !== 0x0d
        )
          this.pos += 1;
      } else break;
    }
  }

  /** Reads one operand or keyword; `null` at end of stream. */
  next(): Operand | null {
    this.skipSpace();
    if (this.pos >= this.bytes.length) return null;
    const start = this.pos;
    const b = this.bytes[this.pos]!;
    if (b === 0x2f) return this.name(start);
    if (b === 0x28) return this.literalString(start);
    if (b === 0x3c) {
      if (this.bytes[this.pos + 1] === 0x3c) return this.dict(start);
      return this.hexString(start);
    }
    if (b === 0x5b) return this.array(start);
    if (b === 0x5d || b === 0x3e || b === 0x29 || b === 0x7b || b === 0x7d) {
      // Stray delimiter: consume as a keyword so parsing never stalls.
      this.pos += 1;
      return { type: "keyword", value: String.fromCharCode(b), start, end: this.pos };
    }
    // Number or keyword.
    while (this.pos < this.bytes.length && isRegular(this.bytes[this.pos]!)) this.pos += 1;
    const text = latin1(this.bytes, start, this.pos);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(text))
      return { type: "number", value: Number(text), start, end: this.pos };
    return { type: "keyword", value: text, start, end: this.pos };
  }

  private name(start: number): Operand {
    this.pos += 1;
    const begin = this.pos;
    while (this.pos < this.bytes.length && isRegular(this.bytes[this.pos]!)) this.pos += 1;
    const raw = latin1(this.bytes, begin, this.pos);
    const value = raw.replace(/#([0-9A-Fa-f]{2})/g, (_, h: string) =>
      String.fromCharCode(parseInt(h, 16)),
    );
    return { type: "name", value, start, end: this.pos };
  }

  private literalString(start: number): Operand {
    this.pos += 1;
    const out: number[] = [];
    let depth = 1;
    while (this.pos < this.bytes.length) {
      const c = this.bytes[this.pos]!;
      this.pos += 1;
      if (c === 0x5c) {
        const n = this.bytes[this.pos];
        if (n === undefined) break;
        this.pos += 1;
        switch (n) {
          case 0x6e:
            out.push(0x0a);
            break; // n
          case 0x72:
            out.push(0x0d);
            break; // r
          case 0x74:
            out.push(0x09);
            break; // t
          case 0x62:
            out.push(0x08);
            break; // b
          case 0x66:
            out.push(0x0c);
            break; // f
          case 0x0a:
            break; // line continuation
          case 0x0d:
            if (this.bytes[this.pos] === 0x0a) this.pos += 1;
            break;
          default:
            if (n >= 0x30 && n <= 0x37) {
              let code = n - 0x30;
              for (let i = 0; i < 2; i += 1) {
                const d = this.bytes[this.pos];
                if (d !== undefined && d >= 0x30 && d <= 0x37) {
                  code = code * 8 + (d - 0x30);
                  this.pos += 1;
                } else break;
              }
              out.push(code & 0xff);
            } else out.push(n);
        }
      } else if (c === 0x28) {
        depth += 1;
        out.push(c);
      } else if (c === 0x29) {
        depth -= 1;
        if (depth === 0) break;
        out.push(c);
      } else out.push(c);
    }
    return { type: "string", bytes: Uint8Array.from(out), hex: false, start, end: this.pos };
  }

  private hexString(start: number): Operand {
    this.pos += 1;
    const digits: number[] = [];
    while (this.pos < this.bytes.length) {
      const c = this.bytes[this.pos]!;
      this.pos += 1;
      if (c === 0x3e) break;
      const v = hexValue(c);
      if (v >= 0) digits.push(v);
    }
    if (digits.length % 2 === 1) digits.push(0);
    const out = new Uint8Array(digits.length / 2);
    for (let i = 0; i < out.length; i += 1) out[i] = digits[2 * i]! * 16 + digits[2 * i + 1]!;
    return { type: "string", bytes: out, hex: true, start, end: this.pos };
  }

  private array(start: number): Operand {
    this.pos += 1;
    const items: Operand[] = [];
    for (;;) {
      const item = this.next();
      if (!item) break;
      if (item.type === "keyword" && item.value === "]") break;
      items.push(item);
    }
    return { type: "array", items, start, end: this.pos };
  }

  private dict(start: number): Operand {
    this.pos += 2;
    let depth = 1;
    while (this.pos < this.bytes.length && depth > 0) {
      const item = this.next();
      if (!item) break;
      if (item.type === "keyword" && item.value === ">") {
        // `>>` arrives as two stray `>` keywords.
        if (this.bytes[this.pos] === 0x3e) {
          this.pos += 1;
          depth -= 1;
        }
      }
    }
    return { type: "dict", start, end: this.pos };
  }

  /** After `ID`: skips the binary data up to a delimited `EI`. Returns the end offset. */
  skipInlineImageData(): number {
    // A single whitespace byte follows ID.
    if (this.pos < this.bytes.length && WHITESPACE.has(this.bytes[this.pos]!)) this.pos += 1;
    const b = this.bytes;
    for (let i = this.pos; i + 1 < b.length; i += 1) {
      if (
        b[i] === 0x45 &&
        b[i + 1] === 0x49 &&
        (i === 0 || WHITESPACE.has(b[i - 1]!)) &&
        (i + 2 >= b.length || WHITESPACE.has(b[i + 2]!) || DELIMITERS.has(b[i + 2]!))
      ) {
        this.pos = i + 2;
        return this.pos;
      }
    }
    this.pos = b.length;
    return this.pos;
  }
}

function hexValue(c: number): number {
  if (c >= 0x30 && c <= 0x39) return c - 0x30;
  if (c >= 0x41 && c <= 0x46) return c - 0x41 + 10;
  if (c >= 0x61 && c <= 0x66) return c - 0x61 + 10;
  return -1;
}

export function latin1(bytes: Uint8Array, start = 0, end = bytes.length): string {
  let s = "";
  for (let i = start; i < end; i += 1) s += String.fromCharCode(bytes[i]!);
  return s;
}

export function fromLatin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

/** Tokenizes a decoded content stream into operations with byte ranges. */
export function tokenizeContent(bytes: Uint8Array): ContentOp[] {
  const lexer = new Lexer(bytes);
  const ops: ContentOp[] = [];
  let operands: Operand[] = [];
  for (;;) {
    const token = lexer.next();
    if (!token) break;
    if (
      token.type !== "keyword" ||
      token.value === "true" ||
      token.value === "false" ||
      token.value === "null"
    ) {
      operands.push(token);
      continue;
    }
    const start = operands[0]?.start ?? token.start;
    if (token.value === "BI") {
      // Inline image: swallow the dictionary, ID, binary data and EI as one op.
      for (;;) {
        const t = lexer.next();
        if (!t) break;
        if (t.type === "keyword" && t.value === "ID") break;
      }
      const end = lexer.skipInlineImageData();
      ops.push({ op: "BI", operands: [], start: token.start, end });
      operands = [];
      continue;
    }
    ops.push({ op: token.value, operands, start, end: token.end });
    operands = [];
  }
  return ops;
}

/** Splices byte-range replacements (non-overlapping) into a stream. */
export function spliceBytes(
  source: Uint8Array,
  replacements: { start: number; end: number; bytes: Uint8Array }[],
): Uint8Array {
  const sorted = [...replacements].sort((a, b) => a.start - b.start);
  const parts: Uint8Array[] = [];
  let cursor = 0;
  for (const r of sorted) {
    if (r.start < cursor) throw new Error("Overlapping content replacements");
    parts.push(source.subarray(cursor, r.start), r.bytes);
    cursor = r.end;
  }
  parts.push(source.subarray(cursor));
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
