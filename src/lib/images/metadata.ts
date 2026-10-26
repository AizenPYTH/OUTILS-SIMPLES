/**
 * Image metadata helpers: lossless removal of EXIF/XMP/IPTC segments from
 * JPEG and PNG files (the pixel data is copied untouched) and a readable
 * summary of the tags parsed by exifr. Pure byte operations, testable in Node.
 */

export interface StripResult {
  bytes: Uint8Array;
  /** Number of metadata segments/chunks removed. */
  removed: number;
}

const JPEG_SOI = 0xd8;
const JPEG_SOS = 0xda;
const JPEG_APP0 = 0xe0;
const JPEG_APP14_ADOBE = 0xee;
const JPEG_COM = 0xfe;

/**
 * Removes APP1–APP15 (EXIF, XMP, ICC, IPTC…) and COM segments from a JPEG.
 * APP0 (JFIF) and APP14 (Adobe colour transform) are kept: they describe how
 * to decode the pixels, not who took the picture.
 */
export function stripJpegMetadata(input: Uint8Array): StripResult {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== JPEG_SOI)
    throw new Error("Ce fichier n'est pas un JPEG valide.");
  const parts: Uint8Array[] = [input.subarray(0, 2)];
  let removed = 0;
  let pos = 2;
  while (pos + 4 <= input.length) {
    if (input[pos] !== 0xff) throw new Error("Structure JPEG inattendue.");
    const marker = input[pos + 1]!;
    if (marker === 0xff) {
      pos += 1; // padding byte
      continue;
    }
    if (marker === JPEG_SOS) {
      parts.push(input.subarray(pos));
      break;
    }
    const length = (input[pos + 2]! << 8) | input[pos + 3]!;
    const end = pos + 2 + length;
    if (length < 2 || end > input.length) throw new Error("Segment JPEG tronqué.");
    const isMetadata =
      (marker > JPEG_APP0 && marker <= 0xef && marker !== JPEG_APP14_ADOBE) || marker === JPEG_COM;
    if (isMetadata) removed += 1;
    else parts.push(input.subarray(pos, end));
    pos = end;
  }
  return { bytes: concat(parts), removed };
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_METADATA_CHUNKS = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

/** Removes textual, EXIF and timestamp chunks from a PNG; colour chunks stay. */
export function stripPngMetadata(input: Uint8Array): StripResult {
  if (input.length < 8 || PNG_SIGNATURE.some((b, i) => input[i] !== b))
    throw new Error("Ce fichier n'est pas un PNG valide.");
  const parts: Uint8Array[] = [input.subarray(0, 8)];
  let removed = 0;
  let pos = 8;
  while (pos + 12 <= input.length) {
    const length = readUint32(input, pos);
    const type = String.fromCharCode(
      input[pos + 4]!,
      input[pos + 5]!,
      input[pos + 6]!,
      input[pos + 7]!,
    );
    const end = pos + 12 + length;
    if (end > input.length) throw new Error("Chunk PNG tronqué.");
    if (PNG_METADATA_CHUNKS.has(type)) removed += 1;
    else parts.push(input.subarray(pos, end));
    pos = end;
    if (type === "IEND") break;
  }
  return { bytes: concat(parts), removed };
}

export function detectMetadataFormat(bytes: Uint8Array): "jpeg" | "png" | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (bytes.length > 8 && PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return "png";
  return null;
}

/** Lossless strip for JPEG/PNG; returns null for other formats (re-encode needed). */
export function stripImageMetadata(bytes: Uint8Array): StripResult | null {
  const format = detectMetadataFormat(bytes);
  if (format === "jpeg") return stripJpegMetadata(bytes);
  if (format === "png") return stripPngMetadata(bytes);
  return null;
}

export interface ExifRow {
  key: string;
  label: string;
  value: string;
  /** Tags that identify a person, a place or a device. */
  sensitive: boolean;
}

export interface ExifSummary {
  rows: ExifRow[];
  gps: { latitude: number; longitude: number } | null;
  /** Total number of tags found, including those not listed. */
  total: number;
}

const KNOWN: {
  key: string;
  label: string;
  sensitive?: boolean;
  format?: (v: unknown) => string;
}[] = [
  { key: "Make", label: "Marque de l'appareil", sensitive: true },
  { key: "Model", label: "Modèle de l'appareil", sensitive: true },
  { key: "LensModel", label: "Objectif" },
  { key: "Software", label: "Logiciel", sensitive: true },
  { key: "DateTimeOriginal", label: "Date de prise de vue", sensitive: true, format: formatDate },
  { key: "CreateDate", label: "Date de création", sensitive: true, format: formatDate },
  { key: "ModifyDate", label: "Date de modification", sensitive: true, format: formatDate },
  {
    key: "ExposureTime",
    label: "Temps d'exposition",
    format: (v) =>
      typeof v === "number" ? (v >= 1 ? `${v} s` : `1/${Math.round(1 / v)} s`) : String(v),
  },
  { key: "FNumber", label: "Ouverture", format: (v) => `f/${String(v)}` },
  { key: "ISO", label: "Sensibilité ISO" },
  { key: "FocalLength", label: "Focale", format: (v) => `${String(v)} mm` },
  {
    key: "FocalLengthIn35mmFormat",
    label: "Focale équivalente 35 mm",
    format: (v) => `${String(v)} mm`,
  },
  { key: "Flash", label: "Flash" },
  { key: "WhiteBalance", label: "Balance des blancs" },
  { key: "Orientation", label: "Orientation" },
  { key: "ExifImageWidth", label: "Largeur (EXIF)", format: (v) => `${String(v)} px` },
  { key: "ExifImageHeight", label: "Hauteur (EXIF)", format: (v) => `${String(v)} px` },
  { key: "XResolution", label: "Résolution horizontale", format: (v) => `${String(v)} dpi` },
  { key: "ColorSpace", label: "Espace colorimétrique" },
  { key: "Artist", label: "Auteur", sensitive: true },
  { key: "Copyright", label: "Droits d'auteur", sensitive: true },
  { key: "ImageDescription", label: "Description", sensitive: true },
  { key: "UserComment", label: "Commentaire", sensitive: true },
  { key: "OwnerName", label: "Propriétaire", sensitive: true },
  { key: "SerialNumber", label: "Numéro de série", sensitive: true },
  { key: "BodySerialNumber", label: "Numéro de série du boîtier", sensitive: true },
  {
    key: "GPSAltitude",
    label: "Altitude GPS",
    sensitive: true,
    format: (v) => `${Math.round(Number(v))} m`,
  },
  { key: "GPSDateStamp", label: "Date GPS", sensitive: true },
];

function formatDate(v: unknown): string {
  if (v instanceof Date && !Number.isNaN(v.getTime()))
    return v.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
  return String(v);
}

/** Turns exifr's merged output into labelled rows; unknown tags are counted only. */
export function describeExif(tags: Record<string, unknown> | null | undefined): ExifSummary {
  if (!tags) return { rows: [], gps: null, total: 0 };
  const rows: ExifRow[] = [];
  for (const def of KNOWN) {
    const value = tags[def.key];
    if (value === undefined || value === null || value === "") continue;
    const text = def.format ? def.format(value) : stringify(value);
    if (!text) continue;
    rows.push({ key: def.key, label: def.label, value: text, sensitive: def.sensitive ?? false });
  }
  const lat = tags.latitude;
  const lon = tags.longitude;
  const gps =
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon)
      ? { latitude: lat, longitude: lon }
      : null;
  if (gps)
    rows.unshift({
      key: "GPS",
      label: "Position GPS",
      value: `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}`,
      sensitive: true,
    });
  const total = Object.keys(tags).filter((k) => !["latitude", "longitude"].includes(k)).length;
  return { rows, gps, total };
}

function stringify(value: unknown): string {
  if (value instanceof Date) return formatDate(value);
  if (Array.isArray(value)) return value.map(stringify).join(", ");
  if (value instanceof Uint8Array) return `${value.length} octets`;
  if (typeof value === "object" && value !== null) return "";
  return String(value);
}

function readUint32(bytes: Uint8Array, pos: number): number {
  return (
    ((bytes[pos]! << 24) >>> 0) + (bytes[pos + 1]! << 16) + (bytes[pos + 2]! << 8) + bytes[pos + 3]!
  );
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
