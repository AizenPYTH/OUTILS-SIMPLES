import path from "node:path";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { expect, type Download, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

export const fixtures = path.resolve(__dirname, "../tests/fixtures");
export const fixture = (name: string) => path.join(fixtures, name);

export async function uploadPdf(page: Page, ...names: string[]) {
  await page.setInputFiles('[data-testid="pdf-input"]', names.map(fixture));
}

export async function readDownload(download: Download): Promise<Uint8Array> {
  const file = await download.path();
  expect(file).toBeTruthy();
  return new Uint8Array(await readFile(file!));
}

export async function expectValidPdf(bytes: Uint8Array, pageCount?: number): Promise<PDFDocument> {
  expect(Buffer.from(bytes.subarray(0, 5)).toString("latin1")).toBe("%PDF-");
  const doc = await PDFDocument.load(bytes);
  if (pageCount !== undefined) expect(doc.getPageCount()).toBe(pageCount);
  return doc;
}

const require = createRequire(__filename);

/** Extracts text with pdf.js (Node build) to verify exported content. */
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
