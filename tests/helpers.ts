import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
import { PDFDocument } from "pdf-lib";

export const fixturesDir = path.resolve(__dirname, "fixtures");

export async function fixture(name: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(path.join(fixturesDir, name)));
}

export async function openPdf(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

/** Extracts text with pdf.js (Node build, no canvas needed) to verify content positions. */
export async function extractPageText(bytes: Uint8Array, pageIndex: number): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useWorkerFetch: false,
    disableFontFace: true,
    verbosity: 0,
    standardFontDataUrl: path.join(
      path.dirname(require.resolve("pdfjs-dist/package.json")),
      "standard_fonts/",
    ),
  });
  const doc = await loadingTask.promise;
  const page = await doc.getPage(pageIndex + 1);
  const content = await page.getTextContent();
  const items = content.items
    .map((item) => ("str" in item ? item.str : ""))
    .filter((s) => s.trim().length > 0);
  await loadingTask.destroy();
  return items;
}

export interface TextItemInfo {
  str: string;
  /** pdf.js text matrix [a b c d e f] in PDF user space. */
  transform: number[];
  width: number;
  height: number;
}

/** Text items with their matrices (position, size and rotation of each run). */
export async function extractTextItems(
  bytes: Uint8Array,
  pageIndex: number,
): Promise<TextItemInfo[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useWorkerFetch: false,
    disableFontFace: true,
    verbosity: 0,
    standardFontDataUrl: path.join(
      path.dirname(require.resolve("pdfjs-dist/package.json")),
      "standard_fonts/",
    ),
  });
  const doc = await loadingTask.promise;
  const page = await doc.getPage(pageIndex + 1);
  const content = await page.getTextContent();
  const items = content.items
    .filter((item): item is import("pdfjs-dist/types/src/display/api").TextItem => "str" in item)
    .filter((item) => item.str.trim().length > 0)
    .map((item) => ({
      str: item.str,
      transform: item.transform as number[],
      width: item.width,
      height: item.height,
    }));
  await loadingTask.destroy();
  return items;
}

export function decodeLatin1(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("latin1");
}
