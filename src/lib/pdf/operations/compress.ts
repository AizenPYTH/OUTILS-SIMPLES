import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  decodePDFRawStream,
} from "pdf-lib";
import { toPdfError } from "../errors";
import { createPdfDocument, loadPdfDocument, savePdfDocument } from "../load";
import { copyAllPages } from "./merge";
import type { ProgressReporter } from "./merge";
import { t } from "@/lib/i18n";

export type CompressionLevel = "structure" | "balanced" | "strong";

export interface CompressionProfile {
  level: CompressionLevel;
  recompressImages: boolean;
  jpegQuality: number;
  maxDimension: number;
  lossy: boolean;
}

export const compressionProfiles: Record<CompressionLevel, CompressionProfile> = {
  structure: {
    level: "structure",
    recompressImages: false,
    jpegQuality: 1,
    maxDimension: Infinity,
    lossy: false,
  },
  balanced: {
    level: "balanced",
    recompressImages: true,
    jpegQuality: 0.75,
    maxDimension: 1600,
    lossy: true,
  },
  strong: {
    level: "strong",
    recompressImages: true,
    jpegQuality: 0.5,
    maxDimension: 1200,
    lossy: true,
  },
};

/** Raw image description handed to the environment-specific re-encoder. */
export interface SourceImage {
  width: number;
  height: number;
  /** "jpeg" when the stream is DCTDecode; "raw" for uncompressed/Flate samples. */
  encoding: "jpeg" | "raw";
  /** Encoded JPEG bytes, or raw samples (8 bits per component). */
  data: Uint8Array;
  colorSpace: "DeviceRGB" | "DeviceGray";
  bitsPerComponent: number;
}

export interface ReencodedImage {
  jpeg: Uint8Array;
  width: number;
  height: number;
}

/**
 * Re-encodes an image as JPEG. In the browser this is implemented with a canvas
 * (see src/lib/pdf/browser/image-reencoder.ts); tests inject a stub.
 */
export type ImageReencoder = (
  image: SourceImage,
  quality: number,
  maxDimension: number,
) => Promise<ReencodedImage | null>;

export interface CompressionStats {
  originalSize: number;
  resultSize: number;
  /** Negative when the file grew. */
  savedBytes: number;
  ratio: number;
  imagesFound: number;
  imagesRecompressed: number;
  imagesSkipped: number;
  imagesKeptOriginal: number;
}

export interface CompressResult {
  bytes: Uint8Array;
  stats: CompressionStats;
  profile: CompressionProfile;
}

interface ImageCandidate {
  ref: PDFRef;
  stream: PDFRawStream;
  dict: PDFDict;
}

function nameOf(value: unknown): string | null {
  return value instanceof PDFName ? value.decodeText() : null;
}

function numberOf(value: unknown): number | null {
  return value instanceof PDFNumber ? value.asNumber() : null;
}

/** Collects image XObjects referenced by page resources (including nested form XObjects, one level). */
function collectImages(doc: PDFDocument): ImageCandidate[] {
  const seen = new Set<string>();
  const out: ImageCandidate[] = [];
  const visitResources = (resources: unknown, depth: number) => {
    const resDict = resources instanceof PDFRef ? doc.context.lookup(resources) : resources;
    if (!(resDict instanceof PDFDict)) return;
    const xobjects = doc.context.lookup(resDict.get(PDFName.of("XObject")));
    if (!(xobjects instanceof PDFDict)) return;
    for (const [, value] of xobjects.entries()) {
      if (!(value instanceof PDFRef)) continue;
      if (seen.has(value.toString())) continue;
      const stream = doc.context.lookup(value);
      if (!(stream instanceof PDFRawStream)) continue;
      const subtype = nameOf(stream.dict.get(PDFName.of("Subtype")));
      if (subtype === "Image") {
        seen.add(value.toString());
        out.push({ ref: value, stream, dict: stream.dict });
      } else if (subtype === "Form" && depth < 2) {
        seen.add(value.toString());
        visitResources(stream.dict.get(PDFName.of("Resources")), depth + 1);
      }
    }
  };
  for (const page of doc.getPages()) visitResources(page.node.Resources(), 0);
  return out;
}

function filtersOf(dict: PDFDict, doc: PDFDocument): string[] {
  const filter = doc.context.lookup(dict.get(PDFName.of("Filter")));
  if (filter instanceof PDFName) return [filter.decodeText()];
  if (filter instanceof PDFArray) {
    return filter.asArray().map((f) => nameOf(doc.context.lookup(f)) ?? "?");
  }
  return [];
}

/**
 * Decides whether an image can be safely re-encoded. Anything with
 * transparency, masks, indexed/ICC/separation colour spaces, decode arrays or
 * unusual bit depths is skipped to avoid altering the document.
 */
function toSourceImage(candidate: ImageCandidate, doc: PDFDocument): SourceImage | null {
  const { dict, stream } = candidate;
  if (
    dict.has(PDFName.of("SMask")) ||
    dict.has(PDFName.of("Mask")) ||
    dict.has(PDFName.of("Decode"))
  )
    return null;
  if (dict.has(PDFName.of("ImageMask"))) return null;
  const width = numberOf(doc.context.lookup(dict.get(PDFName.of("Width"))));
  const height = numberOf(doc.context.lookup(dict.get(PDFName.of("Height"))));
  const bpc = numberOf(doc.context.lookup(dict.get(PDFName.of("BitsPerComponent")))) ?? 8;
  const colorSpace = nameOf(doc.context.lookup(dict.get(PDFName.of("ColorSpace"))));
  if (!width || !height || bpc !== 8) return null;
  if (colorSpace !== "DeviceRGB" && colorSpace !== "DeviceGray") return null;
  const filters = filtersOf(dict, doc);
  if (filters.length === 1 && filters[0] === "DCTDecode") {
    return {
      width,
      height,
      encoding: "jpeg",
      data: stream.contents,
      colorSpace,
      bitsPerComponent: bpc,
    };
  }
  if (filters.length === 0 || (filters.length === 1 && filters[0] === "FlateDecode")) {
    let data: Uint8Array;
    try {
      data = filters.length === 0 ? stream.contents : decodePDFRawStream(stream).decode();
    } catch {
      return null;
    }
    const components = colorSpace === "DeviceRGB" ? 3 : 1;
    if (data.length < width * height * components) return null;
    return { width, height, encoding: "raw", data, colorSpace, bitsPerComponent: bpc };
  }
  return null;
}

/**
 * Compresses a PDF honestly:
 *  1. Pages are copied into a fresh document, which drops objects no longer
 *     referenced (orphans left by previous edits, unused fonts/images).
 *  2. Object streams are enabled on save.
 *  3. Optionally, eligible images are re-encoded as JPEG with the chosen
 *     quality and size cap. The original is kept whenever re-encoding would
 *     not shrink it.
 * No page is ever rasterised.
 */
export async function compressPdf(
  bytes: Uint8Array,
  level: CompressionLevel,
  reencode: ImageReencoder | null,
  onProgress?: ProgressReporter,
): Promise<CompressResult> {
  const profile = compressionProfiles[level];
  const source = await loadPdfDocument(bytes);
  onProgress?.({ current: 0, total: 1, label: t.progress.preparing });

  const output = await createPdfDocument();
  // Preserve document metadata that users expect to keep.
  const title = source.getTitle();
  if (title) output.setTitle(title);
  await copyAllPages(source, output);

  const stats: CompressionStats = {
    originalSize: bytes.byteLength,
    resultSize: 0,
    savedBytes: 0,
    ratio: 1,
    imagesFound: 0,
    imagesRecompressed: 0,
    imagesSkipped: 0,
    imagesKeptOriginal: 0,
  };

  if (profile.recompressImages && reencode) {
    const candidates = collectImages(output);
    stats.imagesFound = candidates.length;
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i]!;
      onProgress?.({
        current: i + 1,
        total: candidates.length,
        label: `Image ${i + 1} sur ${candidates.length}…`,
      });
      const sourceImage = toSourceImage(candidate, output);
      if (!sourceImage) {
        stats.imagesSkipped += 1;
        continue;
      }
      let result: ReencodedImage | null = null;
      try {
        result = await reencode(sourceImage, profile.jpegQuality, profile.maxDimension);
      } catch {
        result = null;
      }
      if (!result) {
        stats.imagesSkipped += 1;
        continue;
      }
      if (result.jpeg.byteLength >= candidate.stream.contents.byteLength) {
        stats.imagesKeptOriginal += 1;
        continue;
      }
      try {
        const embedded = await output.embedJpg(result.jpeg);
        await embedded.embed();
        const newStream = output.context.lookup(embedded.ref);
        if (newStream instanceof PDFRawStream) {
          // Carry over the interpolation flag; everything else is defined by the new JPEG.
          const interpolate = candidate.dict.get(PDFName.of("Interpolate"));
          if (interpolate) newStream.dict.set(PDFName.of("Interpolate"), interpolate);
          output.context.assign(candidate.ref, newStream);
          output.context.delete(embedded.ref);
          stats.imagesRecompressed += 1;
        } else {
          stats.imagesSkipped += 1;
        }
      } catch (error) {
        throw toPdfError(error);
      }
    }
  }

  onProgress?.({ current: 1, total: 1, label: t.progress.finalizing });
  const result = await savePdfDocument(output);
  stats.resultSize = result.byteLength;
  stats.savedBytes = stats.originalSize - stats.resultSize;
  stats.ratio = stats.originalSize === 0 ? 1 : stats.resultSize / stats.originalSize;
  return { bytes: result, stats, profile };
}
