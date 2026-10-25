/**
 * Run extraction against the Node build of pdf.js: positions, codes and the
 * alignment with the raw content stream, on real fixtures.
 */
import path from "node:path";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { extractTextRuns } from "@/lib/pdf/text-edit/extract-runs";
import { applyTextEdits, pageContentBytes } from "@/lib/pdf/text-edit/apply";

const require = createRequire(import.meta.url);
const fixtures = path.resolve(__dirname, "../fixtures");

async function openWithPdfJs(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useWorkerFetch: false,
    disableFontFace: true,
    verbosity: 0,
    fontExtraProperties: true,
    standardFontDataUrl: path.join(
      path.dirname(require.resolve("pdfjs-dist/package.json")),
      "standard_fonts/",
    ),
  });
  return { doc: await task.promise, close: () => task.destroy() };
}

async function content(bytes: Uint8Array, pageIndex: number) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return pageContentBytes(doc, doc.getPage(pageIndex));
}

describe("extractTextRuns", () => {
  it("finds the runs of a simple page with their position, size and codes", async () => {
    const bytes = new Uint8Array(await readFile(path.join(fixtures, "simple-3-pages.pdf")));
    const { doc, close } = await openWithPdfJs(bytes);
    const status = await extractTextRuns(doc, 0, await content(bytes, 0));
    await close();
    expect(status.kind).toBe("ok");
    if (status.kind !== "ok") return;
    expect(status.runs.map((r) => r.text)).toEqual([
      "Page 1 / 3",
      "Document de test OUTILIA — contenu synthétique.",
    ]);
    const [title, body] = status.runs;
    // Raw stream: /Helvetica 24 Tf, 1 0 0 1 60 761.89 Tm.
    expect(title!.x).toBeCloseTo(60, 3);
    expect(title!.y).toBeCloseTo(761.89, 2);
    expect(title!.fontSize).toBeCloseTo(24, 3);
    expect(title!.angle).toBe(0);
    expect(title!.width).toBeGreaterThan(90);
    expect(title!.width).toBeLessThan(130);
    expect(title!.editable).toBe(true);
    expect(title!.original.bytesPerCode).toBe(1);
    expect(title!.original.codes["P"]).toBe(0x50);
    expect(body!.fontSize).toBeCloseTo(12, 3);
    expect(body!.y).toBeCloseTo(721.89, 2);
    expect(body!.original.codes["é"]).toBe(0xe9); // WinAnsi, seen on the page
    expect(body!.original.codes["è"]).toBe(0xe8); // not on the page: from the font's /Encoding (non-subset font)
    expect(body!.original.codes["€"]).toBe(0x80);
    expect(body!.fallback.family).toBe("helvetica");
    for (const run of status.runs)
      for (const v of [run.x, run.y, run.width, run.height]) expect(Number.isFinite(v)).toBe(true);
  });

  it("keeps operator indexes stable after an edit, so a second edit targets the same run", async () => {
    const bytes = new Uint8Array(await readFile(path.join(fixtures, "simple-3-pages.pdf")));
    const first = await openWithPdfJs(bytes);
    const before = await extractTextRuns(first.doc, 0, await content(bytes, 0));
    await first.close();
    if (before.kind !== "ok") throw new Error(before.kind);
    const run = before.runs[0]!;
    const { bytes: edited } = await applyTextEdits(bytes, [
      {
        pageIndex: 0,
        opIndex: run.opIndex,
        text: "Titre corrigé",
        original: run.original,
        fallback: run.fallback,
      },
    ]);
    const second = await openWithPdfJs(edited);
    const after = await extractTextRuns(second.doc, 0, await content(edited, 0));
    await second.close();
    expect(after.kind).toBe("ok");
    if (after.kind !== "ok") return;
    expect(after.runs.map((r) => [r.opIndex, r.text])).toEqual([
      [0, "Titre corrigé"],
      [1, "Document de test OUTILIA — contenu synthétique."],
    ]);
    expect(after.runs[0]!.x).toBeCloseTo(run.x, 3);
    expect(after.runs[0]!.fontSize).toBeCloseTo(run.fontSize, 3);
  });

  it("reports a rotated page's runs in user space and an image-only page as scanned", async () => {
    const rotated = new Uint8Array(await readFile(path.join(fixtures, "rotated-2nd-page.pdf")));
    const { doc, close } = await openWithPdfJs(rotated);
    const status = await extractTextRuns(doc, 1, await content(rotated, 1));
    await close();
    expect(status.kind).toBe("ok");
    if (status.kind === "ok") expect(status.runs.length).toBeGreaterThan(0);

    // An image-only page (what a scanner app produces).
    const scan = await PDFDocument.create();
    const png = await scan.embedPng(await readFile(path.join(fixtures, "logo-alpha.png")));
    scan.addPage([400, 500]).drawImage(png, { x: 20, y: 20, width: 360, height: 460 });
    const image = await scan.save();
    const opened = await openWithPdfJs(image);
    const scanned = await extractTextRuns(opened.doc, 0, await content(image, 0));
    await opened.close();
    expect(scanned.kind).toBe("scanned");
  });
});
