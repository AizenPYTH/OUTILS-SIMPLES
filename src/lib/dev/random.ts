/**
 * Cryptographically secure random helpers (Web Crypto). Nothing generated is
 * ever stored or transmitted.
 */
function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error("maxExclusive must be > 0");
  // Rejection sampling to avoid modulo bias.
  const range = 0x100000000;
  const limit = range - (range % maxExclusive);
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const value = buffer[0]!;
    if (value < limit) return value % maxExclusive;
  }
}

export function generateUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface PasswordOptions {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  /** Exclude look-alike characters (0/O, 1/l/I). */
  excludeAmbiguous: boolean;
}

const SETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/",
};
const AMBIGUOUS = /[0O1lI|]/g;

export function generatePassword(options: PasswordOptions): string {
  const pools = (["lowercase", "uppercase", "digits", "symbols"] as const)
    .filter((k) => options[k])
    .map((k) => (options.excludeAmbiguous ? SETS[k].replace(AMBIGUOUS, "") : SETS[k]));
  if (pools.length === 0) throw new Error("Sélectionnez au moins un type de caractères.");
  const length = Math.max(4, Math.min(128, Math.floor(options.length)));
  const all = pools.join("");
  const chars: string[] = [];
  // Guarantee at least one character from each selected pool.
  for (const pool of pools) chars.push(pool[randomInt(pool.length)]!);
  while (chars.length < length) chars.push(all[randomInt(all.length)]!);
  // Fisher–Yates shuffle with secure randomness.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

/** Entropy in bits for a password drawn uniformly from its alphabet. */
export function passwordEntropyBits(options: PasswordOptions): number {
  const size = (["lowercase", "uppercase", "digits", "symbols"] as const)
    .filter((k) => options[k])
    .reduce(
      (sum, k) =>
        sum + (options.excludeAmbiguous ? SETS[k].replace(AMBIGUOUS, "") : SETS[k]).length,
      0,
    );
  return size > 0 ? Math.round(Math.log2(size) * options.length) : 0;
}

export function randomString(length: number, alphabet: string): string {
  if (!alphabet) throw new Error("Alphabet vide.");
  let out = "";
  for (let i = 0; i < length; i += 1) out += alphabet[randomInt(alphabet.length)];
  return out;
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashHex(
  algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512",
  input: string | Uint8Array,
): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest(algorithm, data as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
