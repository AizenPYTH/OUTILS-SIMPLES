/**
 * File kind detection from the first bytes (magic numbers) with the file
 * name as a fallback. Used by the home page drop zone to suggest tools.
 * Deliberately tiny: no library, no full read.
 */
export type FileKind =
  | "pdf"
  | "image"
  | "heic"
  | "docx"
  | "xlsx"
  | "pptx"
  | "csv"
  | "markdown"
  | "text"
  | "zip"
  | "unknown";

/** Bytes to read from the start of the file (ZIP member names of Office files appear early). */
export const DETECT_HEAD_BYTES = 64 * 1024;

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(start, start + length));

function hasText(bytes: Uint8Array, text: string): boolean {
  const needle = Array.from(text, (c) => c.charCodeAt(0));
  outer: for (let i = 0; i + needle.length <= bytes.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) if (bytes[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

function looksLikeText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.length, 4096));
  if (sample.length === 0) return false;
  let suspicious = 0;
  for (const b of sample) {
    if (b === 0) return false;
    if (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) suspicious += 1;
  }
  return suspicious / sample.length < 0.02;
}

function looksLikeCsv(text: string): boolean {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .slice(0, 12);
  if (lines.length < 2) return false;
  for (const delimiter of [",", ";", "\t", "|"]) {
    const counts = lines.map((l) => l.split(delimiter).length);
    if (counts[0]! >= 2 && counts.every((c) => c === counts[0])) return true;
  }
  return false;
}

export function extensionOf(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  return match ? match[1]!.toLowerCase() : "";
}

/** @param head the first bytes of the file (up to DETECT_HEAD_BYTES); the whole file is fine too. */
export function detectFileKind(name: string, head: Uint8Array): FileKind {
  const ext = extensionOf(name);
  const b = head;
  if (b.length >= 5) {
    // %PDF, possibly after a few junk bytes.
    const window = b.subarray(0, Math.min(b.length, 1024));
    if (hasText(window, "%PDF")) return "pdf";
  }
  if (b.length >= 12) {
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image"; // PNG
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image"; // JPEG
    if (ascii(b, 0, 4) === "GIF8") return "image";
    if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "image";
    if (ascii(b, 0, 2) === "BM") return "image"; // BMP
    if (
      (b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a) ||
      (b[0] === 0x4d && b[1] === 0x4d && b[3] === 0x2a)
    )
      return "image"; // TIFF
    if (ascii(b, 4, 4) === "ftyp") {
      const brand = ascii(b, 8, 4).toLowerCase();
      if (/^(heic|heix|hevc|hevx|mif1|msf1|heim|heis|avif|avis)/.test(brand)) return "heic";
    }
  }
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) {
    if (hasText(b, "word/")) return "docx";
    if (hasText(b, "xl/")) return "xlsx";
    if (hasText(b, "ppt/")) return "pptx";
    if (ext === "docx") return "docx";
    if (ext === "xlsx") return "xlsx";
    if (ext === "pptx") return "pptx";
    return "zip";
  }
  if (looksLikeText(b)) {
    if (ext === "csv" || ext === "tsv") return "csv";
    if (ext === "md" || ext === "markdown") return "markdown";
    const text = new TextDecoder("utf-8", { fatal: false }).decode(b.subarray(0, 4096));
    if (!ext || ext === "txt") {
      if (looksLikeCsv(text)) return "csv";
      if (/^#{1,6} |\n#{1,6} |\*\*[^*]+\*\*|\n- |\n\d+\. /.test(text) && ext !== "txt")
        return "markdown";
    }
    if (["txt", "log", "text", ""].includes(ext)) return "text";
    if (
      ext === "svg" ||
      ext === "xml" ||
      ext === "html" ||
      ext === "json" ||
      ext === "js" ||
      ext === "css"
    )
      return "text";
    return "text";
  }
  if (ext === "heic" || ext === "heif") return "heic";
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff"].includes(ext)) return "image";
  return "unknown";
}

export const KIND_LABELS: Record<FileKind, string> = {
  pdf: "Document PDF",
  image: "Image",
  heic: "Photo HEIC / HEIF",
  docx: "Document Word (.docx)",
  xlsx: "Classeur Excel (.xlsx)",
  pptx: "Présentation PowerPoint (.pptx)",
  csv: "Fichier CSV",
  markdown: "Texte Markdown",
  text: "Fichier texte",
  zip: "Archive ZIP",
  unknown: "Type non reconnu",
};

/** Tool ids suggested for a kind, best first. The editor comes first for PDFs on purpose. */
export const KIND_TOOLS: Record<FileKind, string[]> = {
  pdf: [
    "pdf-edit",
    "pdf-merge",
    "pdf-compress",
    "pdf-sign",
    "pdf-split",
    "conv-pdf-docx",
    "pdf-organize",
    "pdf-extract-text",
  ],
  image: [
    "image-compress",
    "image-convert",
    "image-resize",
    "image-crop",
    "pdf-from-images",
    "scan-ocr",
    "scan-perspective",
    "image-watermark",
  ],
  heic: ["image-convert", "image-compress", "pdf-from-images"],
  docx: ["conv-docx-pdf"],
  xlsx: ["conv-sheet-pdf"],
  pptx: [],
  csv: ["conv-sheet-pdf", "dev-csv-json"],
  markdown: ["doc-markdown-pdf", "text-word-counter", "text-clean"],
  text: [
    "doc-text-pdf",
    "doc-markdown-pdf",
    "text-word-counter",
    "text-clean",
    "text-case",
    "text-diff",
  ],
  zip: [],
  unknown: [],
};

/** What to say when nothing applies: honest, with the nearest alternative. */
export const KIND_NOTES: Partial<Record<FileKind, string>> = {
  pptx: "Les présentations PowerPoint ne sont pas prises en charge : exportez-la en PDF depuis PowerPoint ou LibreOffice, puis utilisez les outils PDF.",
  zip: "Les archives ne sont pas traitées : extrayez les fichiers puis déposez-les un par un.",
  unknown:
    "Ce type de fichier n'est pas reconnu. Les outils acceptent les PDF, les images (PNG, JPEG, WebP, HEIC), les documents Word, Excel, CSV, Markdown et texte.",
  heic: "Les photos HEIC sont converties en JPEG ou PNG par l'outil « Convertir une image » (navigateurs récents ; décodeur libheif chargé à la demande).",
};
