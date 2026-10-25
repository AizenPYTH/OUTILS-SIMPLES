/**
 * Tesseract.js wrapper. The worker, the WASM core and the language models are
 * served from this origin (/public/ocr, copied by scripts/copy-pdfjs-assets.mjs):
 * nothing is fetched from a CDN and no image leaves the browser.
 *
 * Recognition runs one pass per orientation the caller asks for (or that the
 * automatic mode finds necessary): the working copy is preprocessed, rotated
 * so that text of that orientation is upright, deskewed, recognised, and every
 * box is mapped back to the original image. The passes are then merged, the
 * most confident reading of each region winning.
 *
 * Approximate download sizes (first use, then cached by the browser):
 *   worker ≈ 0.1 MB · core (single-file .wasm.js, SIMD) ≈ 3.9 MB · fra ≈ 6.3 MB · eng ≈ 10.9 MB (gzip).
 */
import type { RgbaImage } from "@/lib/images/pixels";
import {
  angleFromBaseline,
  assembleText,
  estimateSkew,
  mapBoxFromPass,
  mapPointFromPass,
  mergePassLines,
  orderByColumns,
  rotateBoxAround,
  rotatePointAround,
  rotateRgba,
  rotateRgbaByDegrees,
  splitWideGaps,
  weightedConfidence,
} from "./orientation";
import { preprocessForOcr } from "./preprocess";
import type {
  OcrAngle,
  OcrLanguage,
  OcrLine,
  OcrOrientationMode,
  OcrPageResult,
  OcrPreprocessMode,
  OcrWord,
} from "./types";

export const OCR_ASSET_BASE = "/ocr";

type Tesseract = typeof import("tesseract.js");
type Worker = import("tesseract.js").Worker;

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface OcrRunOptions {
  orientation: OcrOrientationMode;
  preprocess: OcrPreprocessMode;
  /** Correct the tilt of text lines on the working copy (default true). */
  deskew?: boolean;
}

export const defaultOcrRunOptions: OcrRunOptions = {
  orientation: "auto",
  preprocess: "auto",
  deskew: true,
};

export interface OcrEngine {
  recognize(
    image: RgbaImage,
    pageIndex: number,
    options?: Partial<OcrRunOptions>,
    onProgress?: (p: OcrProgress) => void,
  ): Promise<OcrPageResult>;
  terminate(): Promise<void>;
}

export interface OcrEngineConfig {
  /** Encodes a working image for the Tesseract worker (PNG in the browser via canvas, our encoder in Node). */
  encode: (img: RgbaImage) => Promise<Blob | Uint8Array>;
  onProgress?: (p: OcrProgress) => void;
  /** Overrides for Node tests (local core and language files). */
  workerPath?: string;
  corePath?: string;
  langPath?: string;
  cachePath?: string;
}

let tesseractModule: Promise<Tesseract> | null = null;

function loadTesseract(): Promise<Tesseract> {
  if (!tesseractModule) tesseractModule = import("tesseract.js");
  return tesseractModule;
}

/** Creates a worker for one language set. Callers must terminate it. */
export async function createOcrEngine(
  language: OcrLanguage,
  config: OcrEngineConfig,
): Promise<OcrEngine> {
  const { createWorker, PSM } = await loadTesseract();
  const langs = language.split("+");
  let progressSink = config.onProgress;
  const browser = typeof window !== "undefined";
  const worker: Worker = await createWorker(langs, 1, {
    ...(browser
      ? {
          workerPath: config.workerPath ?? `${OCR_ASSET_BASE}/worker.min.js`,
          corePath: config.corePath ?? `${OCR_ASSET_BASE}/core`,
          workerBlobURL: false,
        }
      : {}),
    langPath: config.langPath ?? `${OCR_ASSET_BASE}/lang`,
    ...(config.cachePath ? { cachePath: config.cachePath } : {}),
    gzip: true,
    logger: (m: { status: string; progress: number }) =>
      progressSink?.({ status: m.status, progress: m.progress }),
  });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });

  const runPass = async (
    working: RgbaImage,
    pass: OcrAngle,
    pageIndex: number,
    deskew: boolean,
  ): Promise<{ lines: OcrLine[]; skew: number }> => {
    const rotated = rotateRgba(working, pass);
    const skew = deskew ? estimateSkew(rotated) : 0;
    const input = skew !== 0 ? rotateRgbaByDegrees(rotated, skew) : rotated;
    const encoded = await config.encode(input);
    const { data } = await worker.recognize(encoded as Blob, {}, { text: true, blocks: true });
    const lines = linesFromTesseract(data as unknown as RecognizeData, {
      pass,
      skew,
      passWidth: rotated.width,
      passHeight: rotated.height,
      originalWidth: working.width,
      originalHeight: working.height,
    });
    void pageIndex;
    return { lines, skew };
  };

  return {
    async recognize(image, pageIndex, options, onPage) {
      progressSink = onPage ?? config.onProgress;
      const opts: OcrRunOptions = { ...defaultOcrRunOptions, ...options };
      const working = preprocessForOcr(image, opts.preprocess);
      const deskew = opts.deskew !== false;
      const passes: OcrAngle[] = [];
      let lines: OcrLine[] = [];
      let skewCorrected = 0;
      const run = async (pass: OcrAngle) => {
        progressSink?.({ status: `pass-${pass}`, progress: 0 });
        const result = await runPass(working, pass, pageIndex, deskew);
        if (pass === 0) skewCorrected = result.skew;
        passes.push(pass);
        lines = mergePassLines([...lines, ...result.lines]);
      };
      if (opts.orientation === "auto") {
        await run(0);
        if (needsMorePasses(lines)) await run(180);
        if (needsMorePasses(lines)) {
          await run(90);
          await run(270);
        }
      } else if (opts.orientation === "mixed") {
        await run(0);
        await run(180);
      } else if (opts.orientation === "mixed-all") {
        for (const pass of [0, 90, 180, 270] as OcrAngle[]) await run(pass);
      } else {
        await run(Number(opts.orientation) as OcrAngle);
      }
      lines = orderByColumns(splitWideGaps(lines));
      const assembled = assembleText(lines);
      return {
        pageIndex,
        text: cleanOcrText(assembled.text),
        confidence: weightedConfidence(lines),
        lines,
        width: image.width,
        height: image.height,
        passes,
        dominantAngle: assembled.dominantAngle,
        mixedOrientation: assembled.mixed,
        skewCorrected,
      };
    },
    async terminate() {
      await worker.terminate();
    },
  };
}

/**
 * After a pass, is a meaningful share of the page still unreadable? True when
 * the character-weighted confidence is low or when a sizeable group of
 * characters sits in lines Tesseract did not trust.
 */
export function needsMorePasses(lines: OcrLine[]): boolean {
  if (lines.length === 0) return true;
  const total = lines.reduce((n, l) => n + l.text.replace(/\s/g, "").length, 0);
  const weak = lines
    .filter((l) => l.confidence < 60)
    .reduce((n, l) => n + l.text.replace(/\s/g, "").length, 0);
  return weightedConfidence(lines) < 75 || weak >= Math.max(6, total * 0.08);
}

interface Bbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export interface RecognizeData {
  text: string;
  confidence: number;
  blocks?: { paragraphs: { lines: TessLine[] }[] }[] | null;
  lines?: TessLine[];
  imageWidth?: number;
  imageHeight?: number;
}
interface TessLine {
  text: string;
  bbox: Bbox;
  confidence?: number;
  baseline?: Bbox & { has_baseline?: boolean };
  words: { text: string; confidence: number; bbox: Bbox }[];
}

export interface PassContext {
  pass: OcrAngle;
  /** Skew corrected on the rotated working copy before recognition. */
  skew: number;
  passWidth: number;
  passHeight: number;
  originalWidth: number;
  originalHeight: number;
}

const IDENTITY_CONTEXT: Omit<
  PassContext,
  "passWidth" | "passHeight" | "originalWidth" | "originalHeight"
> = { pass: 0, skew: 0 };

/**
 * Converts Tesseract's block tree into lines in ORIGINAL-image coordinates:
 * undoes the deskew rotation, then the pass rotation; reads the direction of
 * each line from its baseline.
 */
export function linesFromTesseract(data: RecognizeData, ctx?: PassContext): OcrLine[] {
  const context: PassContext = ctx ?? {
    ...IDENTITY_CONTEXT,
    passWidth: data.imageWidth ?? 0,
    passHeight: data.imageHeight ?? 0,
    originalWidth: data.imageWidth ?? 0,
    originalHeight: data.imageHeight ?? 0,
  };
  const cx = (context.passWidth - 1) / 2;
  const cy = (context.passHeight - 1) / 2;
  const toOriginalBox = (b: Bbox): Bbox => {
    const unskewed = context.skew !== 0 ? rotateBoxAround(b, -context.skew, cx, cy) : b;
    return mapBoxFromPass(unskewed, context.pass, context.originalWidth, context.originalHeight);
  };
  const toOriginalPoint = (p: { x: number; y: number }) => {
    const unskewed = context.skew !== 0 ? rotatePointAround(p, -context.skew, cx, cy) : p;
    return mapPointFromPass(unskewed, context.pass, context.originalWidth, context.originalHeight);
  };
  const out: OcrLine[] = [];
  const paragraphs: TessLine[][] = data.blocks
    ? data.blocks.flatMap((b) => b.paragraphs.map((p) => p.lines))
    : [data.lines ?? []];
  for (const paragraph of paragraphs) {
    paragraph.forEach((line, i) => {
      const text = line.text.replace(/\n$/, "").trim();
      const words = line.words
        .filter((w) => w.text.trim().length > 0)
        .map<OcrWord>((w) => {
          const box = toOriginalBox(w.bbox);
          return { text: w.text.trim(), confidence: w.confidence, ...box };
        });
      if (words.length === 0 && text.length === 0) return;
      const box = toOriginalBox(line.bbox);
      const rawBaseline =
        line.baseline && line.baseline.has_baseline !== false
          ? line.baseline
          : { x0: line.bbox.x0, y0: line.bbox.y1, x1: line.bbox.x1, y1: line.bbox.y1 };
      const b0 = toOriginalPoint({ x: rawBaseline.x0, y: rawBaseline.y0 });
      const b1 = toOriginalPoint({ x: rawBaseline.x1, y: rawBaseline.y1 });
      const baseline = { x0: b0.x, y0: b0.y, x1: b1.x, y1: b1.y };
      const { angle, skew } = angleFromBaseline(baseline);
      const confidence = words.length
        ? Math.round(words.reduce((s, w) => s + w.confidence, 0) / words.length)
        : Math.round(line.confidence ?? 0);
      out.push({
        text,
        words,
        ...box,
        confidence,
        angle,
        skew,
        baseline,
        pass: context.pass,
        paragraphEnd: i === paragraph.length - 1,
      });
    });
  }
  return out;
}

/**
 * Result for a single upright pass without any transformation, from raw
 * Tesseract data (kept for tests and callers that already hold the output).
 */
export function toPageResult(data: RecognizeData, pageIndex: number): OcrPageResult {
  const lines = linesFromTesseract(data);
  let width = data.imageWidth ?? 0;
  let height = data.imageHeight ?? 0;
  if (!width || !height) {
    for (const l of lines) {
      width = Math.max(width, l.x1);
      height = Math.max(height, l.y1);
    }
  }
  const assembled = assembleText(lines);
  return {
    pageIndex,
    text: cleanOcrText(assembled.text || data.text),
    confidence: lines.length ? weightedConfidence(lines) : data.confidence,
    lines,
    width,
    height,
    passes: [0],
    dominantAngle: assembled.dominantAngle,
    mixedOrientation: assembled.mixed,
    skewCorrected: 0,
  };
}

/** Normalises Tesseract output: trailing spaces, form feeds, excessive blank lines. */
export function cleanOcrText(text: string): string {
  return text
    .replace(/\f/g, "")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
