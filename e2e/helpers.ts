import path from "node:path";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { expect, type Download, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

export const fixtures = path.resolve(__dirname, "../tests/fixtures");
export const fixture = (name: string) => path.join(fixtures, name);

/**
 * Server-rendered tools (QR code, regex, UUID) are visible before hydration
 * but inert until React takes over: wait for that before interacting
 * (Playwright's fill() would otherwise set a value that hydration resets).
 */
export async function gotoTool(page: Page, path: string) {
  await page.goto(path);
  await page.locator("[data-tool-slot]").waitFor();
  if (
    (await page.locator("[data-tool-slot] [inert], [data-tool-slot] [data-hydrated]").count()) > 0
  )
    await page.locator("[data-tool-slot] [data-hydrated]").waitFor({ state: "attached" });
}

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

export interface TextItemInfo {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/** Text items with their matrices (position, size, rotation), via pdf.js in Node. */
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

// ------------------------------------------------------------------ audit helpers

import { PDFArray, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { zlibSync } from "fflate";

/** Decoded content stream(s) of a page, as latin1 text, to inspect drawing operators. */
export async function pageContentOps(bytes: Uint8Array, pageIndex: number): Promise<string> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const page = doc.getPage(pageIndex);
  const contents = page.node.Contents();
  if (!contents) return "";
  const streams =
    contents instanceof PDFArray
      ? contents.asArray().map((ref) => doc.context.lookup(ref))
      : [contents];
  return streams
    .map((s) =>
      s instanceof PDFRawStream
        ? Buffer.from(decodePDFRawStream(s).decode()).toString("latin1")
        : "",
    )
    .join("\n");
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1)
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Builds an 8-bit RGB PNG whose pixel colour is given by `paint(x, y)`. */
export function buildPng(
  width: number,
  height: number,
  paint: (x: number, y: number) => [number, number, number],
): Buffer {
  const raw = new Uint8Array((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = paint(x, y);
      const o = y * (width * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const chunk = (type: string, data: Uint8Array) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, "latin1");
    out.set(data, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlibSync(raw, { level: 6 })),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

/** Samples the pixels of an encoded image inside the page and returns the distinct RGB triplets seen. */
export async function samplePixels(
  page: Page,
  bytes: Uint8Array,
  mimeType: string,
  step = 7,
): Promise<string[]> {
  return page.evaluate(
    async ({ b64, mime, step }) => {
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
      const bitmap = await createImageBitmap(new Blob([arr], { type: mime }));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const seen = new Set<string>();
      for (let i = 0; i < data.length; i += 4 * step)
        seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      return Array.from(seen);
    },
    { b64: Buffer.from(bytes).toString("base64"), mime: mimeType, step },
  );
}
