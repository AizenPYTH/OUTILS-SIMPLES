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
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes), useWorkerFetch: false, disableFontFace: true, verbosity: 0, standardFontDataUrl: path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts/") });
  const doc = await loadingTask.promise;
  const page = await doc.getPage(pageIndex + 1);
  const content = await page.getTextContent();
  const items = content.items
    .map((item) => ("str" in item ? item.str : ""))
    .filter((s) => s.trim().length > 0);
  await loadingTask.destroy();
  return items;
}

export function decodeLatin1(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("latin1");
}
