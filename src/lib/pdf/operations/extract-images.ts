import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFStream,
  PDFString,
  decodePDFRawStream,
} from "pdf-lib";
import { loadPdfDocument } from "../load";
import { encodePng, type PngChannels } from "@/lib/images/png-encode";
import { tr } from "@/lib/i18n/messages";

export type ExtractedImageType = "image/jpeg" | "image/png" | "image/jp2";

export interface ExtractedImage {
  pageIndex: number;
  name: string;
  bytes: Uint8Array;
  mimeType: ExtractedImageType;
  width: number;
  height: number;
  note?: string;
}

export interface SkippedImage {
  pageIndex: number;
  reason: string;
}

export interface ExtractImagesResult {
  images: ExtractedImage[];
  skipped: SkippedImage[];
}

export interface ExtractImagesOptions {
  /** Images smaller than this (either dimension) are ignored (spacers, bullets). */
  minDimension?: number;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Extracts the embedded raster images of a PDF without re-rendering them:
 * JPEG (DCTDecode) and JPEG 2000 streams are copied as they are; Flate/raw
 * images in Gray, RGB, CMYK, ICC or Indexed colour spaces (1–16 bits) are
 * converted to PNG. CCITT fax and JBIG2 images (some scanners) are reported
 * as skipped rather than silently dropped.
 */
export async function extractImages(
  bytes: Uint8Array,
  options: ExtractImagesOptions = {},
): Promise<ExtractImagesResult> {
  const minDimension = options.minDimension ?? 8;
  const doc = await loadPdfDocument(bytes);
  const pages = doc.getPages();
  const result: ExtractImagesResult = { images: [], skipped: [] };
  const seen = new Set<string>();

  const visit = (
    resources: PDFDict | undefined,
    pageIndex: number,
    depth: number,
    counter: { n: number },
  ) => {
    if (!resources || depth > 4) return;
    const xobjects = doc.context.lookup(resources.get(PDFName.of("XObject")));
    if (!(xobjects instanceof PDFDict)) return;
    for (const [, value] of xobjects.entries()) {
      const key = value instanceof PDFRef ? value.toString() : null;
      if (key && seen.has(key)) continue;
      const stream = doc.context.lookup(value);
      if (!(stream instanceof PDFStream)) continue;
      const subtype = stream.dict.get(PDFName.of("Subtype"));
      const subtypeName = subtype instanceof PDFName ? subtype.decodeText() : "";
      if (subtypeName === "Form") {
        if (key) seen.add(key);
        const inner = doc.context.lookup(stream.dict.get(PDFName.of("Resources")));
        visit(inner instanceof PDFDict ? inner : undefined, pageIndex, depth + 1, counter);
        continue;
      }
      if (subtypeName !== "Image") continue;
      if (key) seen.add(key);
      counter.n += 1;
      try {
        const image = convertImageStream(doc.context, stream, pageIndex, counter.n, minDimension);
        if (image) result.images.push(image);
      } catch (error) {
        result.skipped.push({
          pageIndex,
          reason: error instanceof Error ? error.message : tr("image illisible"),
        });
      }
    }
  };

  pages.forEach((page, pageIndex) => {
    options.onProgress?.(pageIndex + 1, pages.length);
    const counter = { n: 0 };
    visit(page.node.Resources(), pageIndex, 0, counter);
  });
  return result;
}

type Context =
  ReturnType<typeof loadPdfDocument> extends Promise<infer D>
    ? D extends { context: infer C }
      ? C
      : never
    : never;

function filterNames(context: Context, dict: PDFDict): string[] {
  const filter = context.lookup(dict.get(PDFName.of("Filter")));
  if (filter instanceof PDFName) return [filter.decodeText()];
  if (filter instanceof PDFArray)
    return filter.asArray().map((f) => (f instanceof PDFName ? f.decodeText() : ""));
  return [];
}

function numberOf(context: Context, dict: PDFDict, key: string, fallback: number): number {
  const value = context.lookup(dict.get(PDFName.of(key)));
  return value instanceof PDFNumber ? value.asNumber() : fallback;
}

function convertImageStream(
  context: Context,
  stream: PDFStream,
  pageIndex: number,
  index: number,
  minDimension: number,
): ExtractedImage | null {
  const dict = stream.dict;
  const width = numberOf(context, dict, "Width", 0);
  const height = numberOf(context, dict, "Height", 0);
  if (width < minDimension || height < minDimension) return null;
  const filters = filterNames(context, dict);
  const hasSMask = dict.has(PDFName.of("SMask"));
  const baseName = `page-${pageIndex + 1}-image-${index}`;

  if (!(stream instanceof PDFRawStream)) throw new Error(tr("flux d'image non lisible"));

  const codec = filters[filters.length - 1];
  if (codec === "DCTDecode") {
    if (filters.length > 1) throw new Error(tr("JPEG encapsulé dans un second filtre"));
    return {
      pageIndex,
      name: `${baseName}.jpg`,
      bytes: stream.contents,
      mimeType: "image/jpeg",
      width,
      height,
      note: hasSMask ? tr("transparence non conservée") : undefined,
    };
  }
  if (codec === "JPXDecode") {
    if (filters.length > 1) throw new Error(tr("JPEG 2000 encapsulé dans un second filtre"));
    return {
      pageIndex,
      name: `${baseName}.jp2`,
      bytes: stream.contents,
      mimeType: "image/jp2",
      width,
      height,
      note: tr("JPEG 2000 : ouvrir avec un logiciel compatible"),
    };
  }
  if (codec === "CCITTFaxDecode")
    throw new Error(tr("image fax CCITT non prise en charge (utilisez « PDF vers images »)"));
  if (codec === "JBIG2Decode")
    throw new Error(tr("image JBIG2 non prise en charge (utilisez « PDF vers images »)"));
  if (
    filters.some(
      (f) =>
        ![
          "FlateDecode",
          "LZWDecode",
          "ASCIIHexDecode",
          "ASCII85Decode",
          "RunLengthDecode",
        ].includes(f),
    )
  )
    throw new Error(tr("filtre {codec} non pris en charge", { codec: String(codec) }));

  const samples = filters.length ? decodePDFRawStream(stream).decode() : stream.contents;
  const isMask =
    context.lookup(dict.get(PDFName.of("ImageMask"))) instanceof PDFBool &&
    (context.lookup(dict.get(PDFName.of("ImageMask"))) as PDFBool).asBoolean();
  const bpc = isMask ? 1 : numberOf(context, dict, "BitsPerComponent", 8);
  const color = isMask
    ? {
        components: 1 as const,
        kind: "gray" as const,
        palette: null,
        paletteComponents: 1 as const,
      }
    : describeColorSpace(context, context.lookup(dict.get(PDFName.of("ColorSpace"))));
  const rowBits = width * color.components * bpc;
  const rowBytes = Math.ceil(rowBits / 8);
  if (samples.length < rowBytes * height) throw new Error(tr("données d'image incomplètes"));

  // Unpack to one 8-bit value per component.
  const unpacked = new Uint8Array(width * height * color.components);
  const maxValue = (1 << bpc) - 1;
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowBytes;
    for (let i = 0; i < width * color.components; i += 1) {
      let value: number;
      if (bpc === 8) value = samples[rowStart + i]!;
      else if (bpc === 16) value = samples[rowStart + i * 2]!;
      else {
        const bitPos = i * bpc;
        const byte = samples[rowStart + (bitPos >> 3)]!;
        const shift = 8 - bpc - (bitPos & 7);
        const raw = (byte >> shift) & maxValue;
        value = color.palette ? raw : Math.round((raw * 255) / maxValue);
      }
      unpacked[y * width * color.components + i] = value;
    }
  }

  let channels: PngChannels;
  let pixels: Uint8Array;
  if (color.palette) {
    const n = color.paletteComponents;
    channels = n === 1 ? 1 : 3;
    pixels = new Uint8Array(width * height * channels);
    for (let p = 0; p < width * height; p += 1) {
      const idx = unpacked[p]!;
      if (n === 1) pixels[p] = color.palette[idx] ?? 0;
      else if (n === 3) {
        pixels[p * 3] = color.palette[idx * 3] ?? 0;
        pixels[p * 3 + 1] = color.palette[idx * 3 + 1] ?? 0;
        pixels[p * 3 + 2] = color.palette[idx * 3 + 2] ?? 0;
      } else {
        const [c, m, yy, k] = [
          color.palette[idx * 4] ?? 0,
          color.palette[idx * 4 + 1] ?? 0,
          color.palette[idx * 4 + 2] ?? 0,
          color.palette[idx * 4 + 3] ?? 0,
        ];
        const rgb = cmykToRgb(c, m, yy, k);
        pixels.set(rgb, p * 3);
      }
    }
  } else if (color.components === 4) {
    channels = 3;
    pixels = new Uint8Array(width * height * 3);
    for (let p = 0; p < width * height; p += 1)
      pixels.set(
        cmykToRgb(
          unpacked[p * 4]!,
          unpacked[p * 4 + 1]!,
          unpacked[p * 4 + 2]!,
          unpacked[p * 4 + 3]!,
        ),
        p * 3,
      );
  } else {
    channels = color.components === 3 ? 3 : 1;
    pixels = unpacked;
  }
  if (isMask) {
    // Decode [0 1] (default): sample 0 = paint (black), 1 = transparent (white here).
    const decode = context.lookup(dict.get(PDFName.of("Decode")));
    const inverted =
      decode instanceof PDFArray &&
      decode.asArray()[0] instanceof PDFNumber &&
      (decode.asArray()[0] as PDFNumber).asNumber() === 1;
    for (let p = 0; p < pixels.length; p += 1) pixels[p] = pixels[p]! > 127 !== inverted ? 255 : 0;
  }

  let note: string | undefined;
  const alpha = hasSMask ? readSoftMask(context, dict, width, height) : null;
  if (alpha) {
    const withAlpha = new Uint8Array(width * height * (channels + 1));
    for (let p = 0; p < width * height; p += 1) {
      for (let c = 0; c < channels; c += 1)
        withAlpha[p * (channels + 1) + c] = pixels[p * channels + c]!;
      withAlpha[p * (channels + 1) + channels] = alpha[p]!;
    }
    pixels = withAlpha;
    channels = (channels + 1) as PngChannels;
  } else if (hasSMask) note = tr("transparence non conservée");

  return {
    pageIndex,
    name: `${baseName}.png`,
    bytes: encodePng(width, height, channels, pixels),
    mimeType: "image/png",
    width,
    height,
    note,
  };
}

interface ColorInfo {
  components: 1 | 3 | 4;
  kind: "gray" | "rgb" | "cmyk";
  palette: Uint8Array | null;
  paletteComponents: 1 | 3 | 4;
}

function describeColorSpace(context: Context, cs: unknown): ColorInfo {
  if (cs instanceof PDFName) return byName(cs.decodeText());
  if (cs instanceof PDFArray && cs.size() > 0) {
    const family = cs.get(0);
    const familyName = family instanceof PDFName ? family.decodeText() : "";
    if (familyName === "ICCBased") {
      const profile = context.lookup(cs.get(1));
      const n = profile instanceof PDFStream ? numberOf(context, profile.dict, "N", 3) : 3;
      return n === 1 ? byName("DeviceGray") : n === 4 ? byName("DeviceCMYK") : byName("DeviceRGB");
    }
    if (familyName === "CalRGB" || familyName === "Lab") return byName("DeviceRGB");
    if (familyName === "CalGray") return byName("DeviceGray");
    if (familyName === "Separation" || familyName === "DeviceN") {
      // Approximation: render the tint as a grey level (1 = full ink).
      const names = familyName === "DeviceN" ? context.lookup(cs.get(1)) : null;
      const count = names instanceof PDFArray ? names.size() : 1;
      if (count !== 1) throw new Error(tr("espace colorimétrique DeviceN non pris en charge"));
      return { components: 1, kind: "gray", palette: invertedGrayPalette(), paletteComponents: 1 };
    }
    if (familyName === "Indexed" || familyName === "I") {
      const base = describeColorSpace(context, context.lookup(cs.get(1)));
      const lookup = context.lookup(cs.get(3));
      let table: Uint8Array;
      if (lookup instanceof PDFHexString || lookup instanceof PDFString) table = lookup.asBytes();
      else if (lookup instanceof PDFRawStream) table = decodePDFRawStream(lookup).decode();
      else throw new Error(tr("palette Indexed illisible"));
      return { components: 1, kind: base.kind, palette: table, paletteComponents: base.components };
    }
  }
  throw new Error(tr("espace colorimétrique non pris en charge"));
}

function byName(name: string): ColorInfo {
  switch (name) {
    case "DeviceGray":
    case "G":
      return { components: 1, kind: "gray", palette: null, paletteComponents: 1 };
    case "DeviceCMYK":
    case "CMYK":
      return { components: 4, kind: "cmyk", palette: null, paletteComponents: 4 };
    case "DeviceRGB":
    case "RGB":
      return { components: 3, kind: "rgb", palette: null, paletteComponents: 3 };
    case "Pattern":
      throw new Error(tr("motif (Pattern) non pris en charge"));
    default:
      return { components: 3, kind: "rgb", palette: null, paletteComponents: 3 };
  }
}

function invertedGrayPalette(): Uint8Array {
  const table = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) table[i] = 255 - i;
  return table;
}

function cmykToRgb(c: number, m: number, y: number, k: number): [number, number, number] {
  return [
    Math.round(((255 - c) * (255 - k)) / 255),
    Math.round(((255 - m) * (255 - k)) / 255),
    Math.round(((255 - y) * (255 - k)) / 255),
  ];
}

function readSoftMask(
  context: Context,
  dict: PDFDict,
  width: number,
  height: number,
): Uint8Array | null {
  try {
    const smask = context.lookup(dict.get(PDFName.of("SMask")));
    if (!(smask instanceof PDFRawStream)) return null;
    const w = numberOf(context, smask.dict, "Width", 0);
    const h = numberOf(context, smask.dict, "Height", 0);
    const bpc = numberOf(context, smask.dict, "BitsPerComponent", 8);
    if (w !== width || h !== height || bpc !== 8) return null;
    const filters = filterNames(context, smask.dict);
    if (filters.some((f) => f === "DCTDecode" || f === "JPXDecode")) return null;
    const data = filters.length ? decodePDFRawStream(smask).decode() : smask.contents;
    return data.length >= w * h ? data.subarray(0, w * h) : null;
  } catch {
    return null;
  }
}
