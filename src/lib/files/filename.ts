/**
 * Filename helpers. User-provided names are never trusted: control characters,
 * path separators and reserved names are removed before a name is reused for
 * a download.
 */
const MAX_BASENAME_LENGTH = 120;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function sanitizeFilename(name: string, fallback = "document"): string {
  let base = name
    .normalize("NFKC")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/\.+$/, "");
  if (base.length > MAX_BASENAME_LENGTH) base = base.slice(0, MAX_BASENAME_LENGTH).trim();
  if (!base || WINDOWS_RESERVED.test(base)) base = fallback;
  return base;
}

export function stripExtension(name: string): string {
  const index = name.lastIndexOf(".");
  if (index <= 0) return name;
  return name.slice(0, index);
}

/** "contrat.pdf" + "signe" → "contrat-signe.pdf" */
export function deriveOutputName(originalName: string, suffix: string, extension = "pdf"): string {
  const base = sanitizeFilename(stripExtension(originalName));
  const safeSuffix = sanitizeFilename(suffix, "").replace(/\s+/g, "-").toLowerCase();
  const stem = safeSuffix ? `${base}-${safeSuffix}` : base;
  return `${stem}.${extension}`;
}
