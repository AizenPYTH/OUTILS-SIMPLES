/**
 * Tesseract.js wrapper. The worker, the WASM core and the language models are
 * served from this origin (/public/ocr, copied by scripts/copy-pdfjs-assets.mjs):
 * nothing is fetched from a CDN and no image leaves the browser.
 *
 * Approximate download sizes (first use, then cached by the browser):
 *   worker ≈ 0.1 MB · core (WASM, SIMD) ≈ 2.9 MB · fra ≈ 6.3 MB · eng ≈ 4 MB (gzip).
 */
import type { OcrLanguage, OcrLine, OcrPageResult, OcrWord } from "./types";

export const OCR_ASSET_BASE = "/ocr";

type Tesseract = typeof import("tesseract.js");
type Worker = import("tesseract.js").Worker;

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface OcrEngine {
  recognize(image: Blob | HTMLCanvasElement | string, pageIndex: number, onProgress?: (p: OcrProgress) => void): Promise<OcrPageResult>;
  terminate(): Promise<void>;
}

let tesseractModule: Promise<Tesseract> | null = null;

function loadTesseract(): Promise<Tesseract> {
  if (!tesseractModule) tesseractModule = import("tesseract.js");
  return tesseractModule;
}

/** Creates a worker for one language set. Callers must terminate it. */
export async function createOcrEngine(language: OcrLanguage, onProgress?: (p: OcrProgress) => void): Promise<OcrEngine> {
  const { createWorker, PSM } = await loadTesseract();
  const langs = language.split("+");
  let progressSink = onProgress;
  const worker: Worker = await createWorker(langs, 1, {
    workerPath: `${OCR_ASSET_BASE}/worker.min.js`,
    corePath: `${OCR_ASSET_BASE}/core`,
    langPath: `${OCR_ASSET_BASE}/lang`,
    gzip: true,
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => progressSink?.({ status: m.status, progress: m.progress }),
  });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
  return {
    async recognize(image, pageIndex, onPage) {
      progressSink = onPage ?? onProgress;
      const { data } = await worker.recognize(image, {}, { text: true, blocks: true });
      return toPageResult(data as unknown as RecognizeData, pageIndex);
    },
    async terminate() {
      await worker.terminate();
    },
  };
}

interface Bbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
interface RecognizeData {
  text: string;
  confidence: number;
  blocks?: { paragraphs: { lines: { text: string; bbox: Bbox; words: { text: string; confidence: number; bbox: Bbox }[] }[] }[] }[] | null;
  lines?: { text: string; bbox: Bbox; words: { text: string; confidence: number; bbox: Bbox }[] }[];
  imageWidth?: number;
  imageHeight?: number;
}

export function toPageResult(data: RecognizeData, pageIndex: number): OcrPageResult {
  const rawLines = data.blocks ? data.blocks.flatMap((b) => b.paragraphs.flatMap((p) => p.lines)) : (data.lines ?? []);
  const lines: OcrLine[] = rawLines.map((line) => ({
    text: line.text.replace(/\n$/, ""),
    x0: line.bbox.x0,
    y0: line.bbox.y0,
    x1: line.bbox.x1,
    y1: line.bbox.y1,
    words: line.words.map<OcrWord>((w) => ({ text: w.text, confidence: w.confidence, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 })),
  }));
  let width = data.imageWidth ?? 0;
  let height = data.imageHeight ?? 0;
  if (!width || !height) {
    for (const l of lines) {
      width = Math.max(width, l.x1);
      height = Math.max(height, l.y1);
    }
  }
  return { pageIndex, text: cleanOcrText(data.text), confidence: data.confidence, lines, width, height };
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
