/**
 * Foundations of the PDF editor's import, OCR layer, page plan and OCR-run
 * editing: document diagnosis (native / scanned / mixed / empty), password
 * handling, invisible text layer added to existing (and rotated) pages,
 * reorder / rotate / delete / duplicate at export, correction of an OCR run
 * and explicit visual rewrite. Every produced file is reopened with pdf.js.
 */
import path from "node:path";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import createQpdf from "@neslinesli93/qpdf-wasm";
import { diagnoseDocument, pagesToAnalyse, DIAGNOSIS_FULL_LIMIT } from "@/lib/pdf/browser/diagnose";
import { openPdf, PdfPasswordError } from "@/lib/pdf/browser/pdfjs";
import { addOcrLayer, rotateOcrResultIntoUserSpace } from "@/lib/ocr/searchable-pdf";
import {
  applyPagePlan,
  duplicatePlanned,
  identityPlan,
  isIdentityPlan,
  movePlanned,
  removePlanned,
  rotatePlanned,
} from "@/lib/pdf/operations/page-plan";
import { extractTextRuns } from "@/lib/pdf/text-edit/extract-runs";
import { applyTextEdits, pageContentBytes } from "@/lib/pdf/text-edit/apply";
import { createQpdfRunner, isEncryptedPdf, unlockPdf } from "@/lib/pdf/qpdf";
import { assertPdfBytes } from "@/lib/files/validation";
import { PdfError } from "@/lib/pdf/errors";
import type { OcrLine, OcrPageResult, OcrWord } from "@/lib/ocr/types";
import { decodeLatin1, extractPageText, extractTextItems } from "../helpers";

const require = createRequire(import.meta.url);
const fixtures = path.resolve(__dirname, "../fixtures");
const fixture = async (name: string) => new Uint8Array(await readFile(path.join(fixtures, name)));

async function openWithPdfJs(bytes: Uint8Array, password?: string) {
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
    ...(password ? { password } : {}),
  });
  return { doc: await task.promise, close: () => task.destroy() };
}

async function diagnose(name: string) {
  const { doc, close } = await openWithPdfJs(await fixture(name));
  const progress: number[] = [];
  const result = await diagnoseDocument(doc, (done) => progress.push(done));
  await close();
  return { result, progress };
}

/** A synthetic OCR result: one horizontal line of words in a displayed image. */
function ocrResult(
  words: { text: string; x0: number; y0: number; x1: number; y1: number }[],
  width: number,
  height: number,
  angle: OcrLine["angle"] = 0,
): OcrPageResult {
  const ws: OcrWord[] = words.map((w) => ({ ...w, confidence: 95 }));
  const x0 = Math.min(...ws.map((w) => w.x0));
  const y0 = Math.min(...ws.map((w) => w.y0));
  const x1 = Math.max(...ws.map((w) => w.x1));
  const y1 = Math.max(...ws.map((w) => w.y1));
  const line: OcrLine = {
    text: ws.map((w) => w.text).join(" "),
    words: ws,
    x0,
    y0,
    x1,
    y1,
    confidence: 95,
    angle,
    skew: 0,
    baseline: angle === 0 ? { x0, y0: y1, x1, y1 } : { x0: x1, y0: y1, x1, y1: y0 },
    pass: 0,
    paragraphEnd: true,
  };
  return {
    pageIndex: 0,
    text: line.text,
    confidence: 95,
    lines: [line],
    width,
    height,
    passes: [0],
    dominantAngle: 0,
    mixedOrientation: false,
    skewCorrected: 0,
  };
}

describe("document diagnosis at import", () => {
  it("recognises a native document and reports progress", async () => {
    const { result, progress } = await diagnose("simple-3-pages.pdf");
    expect(result.kind).toBe("native");
    expect(result.textPages).toBe(3);
    expect(result.scannedPages).toBe(0);
    expect(result.sampled).toBe(false);
    expect(progress).toEqual([1, 2, 3]);
  });

  it("recognises a fully scanned document without rejecting it", async () => {
    const { result } = await diagnose("scan-image-only.pdf");
    expect(result.kind).toBe("scanned");
    expect(result.pages[0]?.hasImages).toBe(true);
    expect(result.pages[0]?.chars).toBe(0);
  });

  it("recognises a mixed document page by page", async () => {
    const { result } = await diagnose("mixed-text-scan.pdf");
    expect(result.kind).toBe("mixed");
    expect(result.pages.map((p) => p.kind)).toEqual(["text", "scanned", "text"]);
  });

  it("is not fooled by rotated pages or mixed sizes", async () => {
    expect((await diagnose("rotated-2nd-page.pdf")).result.kind).toBe("native");
    expect((await diagnose("mixed-sizes-4-pages.pdf")).result.kind).toBe("native");
  });

  it("counts an invisible OCR layer as text that came from recognition", async () => {
    const base = await fixture("scan-image-only.pdf");
    const { doc, close } = await openWithPdfJs(base);
    const view = (await doc.getPage(1)).getViewport({ scale: 2 });
    await close();
    const ocr = ocrResult(
      [
        { text: "Facture", x0: 100, y0: 100, x1: 300, y1: 140 },
        { text: "numero", x0: 320, y0: 100, x1: 500, y1: 140 },
        { text: "2024-17", x0: 520, y0: 100, x1: 700, y1: 140 },
      ],
      view.width,
      view.height,
    );
    const layered = await addOcrLayer(base, [
      { pageIndex: 0, ocr, imageWidth: view.width, imageHeight: view.height },
    ]);
    const opened = await openWithPdfJs(layered.bytes);
    const result = await diagnoseDocument(opened.doc);
    await opened.close();
    expect(result.kind).toBe("native");
    expect(result.ocrLayerPages).toBe(1);
  });

  it("samples very long documents", () => {
    expect(pagesToAnalyse(DIAGNOSIS_FULL_LIMIT)).toHaveLength(DIAGNOSIS_FULL_LIMIT);
    const sample = pagesToAnalyse(500);
    expect(sample.length).toBeLessThan(100);
    expect(sample.slice(0, 40)).toEqual(Array.from({ length: 40 }, (_, i) => i));
    expect(sample).toContain(499);
    expect(sample).toContain(250);
  });
});

describe("protected, corrupted and fake PDF files", () => {
  it("asks for a password, then opens with the right one", async () => {
    const bytes = await fixture("protected-user.pdf");
    expect(isEncryptedPdf(bytes)).toBe(true);
    await expect(openPdf(bytes)).rejects.toMatchObject({
      name: "PdfPasswordError",
      reason: "required",
    });
    await expect(openPdf(bytes, { password: "wrong" })).rejects.toBeInstanceOf(PdfPasswordError);
    await expect(openPdf(bytes, { password: "wrong" })).rejects.toMatchObject({
      reason: "incorrect",
    });
    const opened = await openPdf(bytes, { password: "secret42" });
    expect(opened.pageCount).toBe(3);
    await opened.destroy();
  });

  it("decrypts with qpdf so pdf-lib can edit the document afterwards", async () => {
    const bytes = await fixture("protected-user.pdf");
    const wasmPath = path.join(
      path.dirname(require.resolve("@neslinesli93/qpdf-wasm/package.json")),
      "dist/qpdf.wasm",
    );
    const runner = createQpdfRunner(createQpdf as never, wasmPath);
    await expect(unlockPdf(runner, bytes, "wrong")).rejects.toMatchObject({ code: "ENCRYPTED" });
    const unlocked = await unlockPdf(runner, bytes, "secret42");
    expect(isEncryptedPdf(unlocked)).toBe(false);
    const doc = await PDFDocument.load(unlocked);
    expect(doc.getPageCount()).toBe(3);
    expect((await extractPageText(unlocked, 0)).join(" ")).toContain("Page 1");
  }, 60_000);

  it("distinguishes a corrupted file and a renamed non-PDF from a protected one", async () => {
    const corrupted = await fixture("corrupted.pdf");
    expect(isEncryptedPdf(corrupted)).toBe(false);
    await expect(openPdf(corrupted)).rejects.toSatisfy(
      (e: unknown) => !(e instanceof PdfPasswordError),
    );
    const text = await fixture("not-a-pdf.txt");
    expect(() => assertPdfBytes(text)).toThrow(PdfError);
    try {
      assertPdfBytes(text);
    } catch (error) {
      expect((error as PdfError).code).toBe("NOT_PDF");
    }
  });
});

describe("OCR layer on existing pages", () => {
  it("places words of an upright page where they were recognised", async () => {
    const base = await fixture("scan-image-only.pdf");
    const { doc, close } = await openWithPdfJs(base);
    const page = await doc.getPage(1);
    const view = page.getViewport({ scale: 2 });
    await close();
    const ocr = ocrResult(
      [{ text: "Bonjour", x0: 200, y0: 300, x1: 400, y1: 340 }],
      view.width,
      view.height,
    );
    const { bytes, wordsPlaced } = await addOcrLayer(base, [
      { pageIndex: 0, ocr, imageWidth: view.width, imageHeight: view.height },
    ]);
    expect(wordsPlaced).toBe(1);
    const items = await extractTextItems(bytes, 0);
    const word = items.find((i) => i.str.includes("Bonjour"));
    expect(word).toBeDefined();
    // Image pixel (200, 340 − descent) at scale 2 → user space (100, pageHeight − 166).
    expect(word!.transform[4]).toBeCloseTo(100, 0);
    expect(word!.transform[5]).toBeCloseTo(view.height / 2 - (340 - 8) / 2, 0);
    const reopened = await PDFDocument.load(bytes);
    expect(reopened.getPageCount()).toBe(1);
  });

  it("maps a rotated page's words back into its user space", async () => {
    const base = await fixture("rotated-2nd-page.pdf");
    const { doc, close } = await openWithPdfJs(base);
    const page = await doc.getPage(2);
    expect(page.rotate).toBe(90);
    const displayed = page.getViewport({ scale: 1 });
    await close();
    // The word sits near the top-left of the page AS DISPLAYED (rotation applied).
    const ocr = ocrResult(
      [{ text: "Tourne", x0: 100, y0: 50, x1: 220, y1: 70 }],
      displayed.width,
      displayed.height,
    );
    const { bytes } = await addOcrLayer(base, [
      { pageIndex: 1, ocr, imageWidth: displayed.width, imageHeight: displayed.height },
    ]);
    const items = await extractTextItems(bytes, 1);
    const word = items.find((i) => i.str.includes("Tourne"));
    expect(word).toBeDefined();
    const { doc: out, close: closeOut } = await openWithPdfJs(bytes);
    const outPage = await out.getPage(2);
    const view = outPage.getViewport({ scale: 1 });
    const [a, b, , , e, f] = word!.transform as [number, number, number, number, number, number];
    const origin = view.convertToViewportPoint(e, f);
    const along = view.convertToViewportPoint(e + a, f + b);
    await closeOut();
    // Origin back at the displayed position (baseline, with the 20 % descent)…
    expect(origin[0]).toBeCloseTo(100, 0);
    expect(origin[1]).toBeCloseTo(70 - 4, 0);
    // …and the text reads left to right on screen.
    expect(along[0] - origin[0]).toBeGreaterThan(0);
    expect(Math.abs(along[1] - origin[1])).toBeLessThan(0.01);
    expect((await extractPageText(bytes, 0)).join(" ")).toContain("Page 1");
  });

  it("rotates boxes consistently for every /Rotate value", () => {
    const ocr = ocrResult([{ text: "A", x0: 10, y0: 20, x1: 30, y1: 40 }], 200, 100);
    for (const r of [90, 180, 270]) {
      const out = rotateOcrResultIntoUserSpace(ocr, r, 200, 100);
      expect(out.width).toBe(r === 180 ? 200 : 100);
      expect(out.height).toBe(r === 180 ? 100 : 200);
      const w = out.lines[0]!.words[0]!;
      expect(w.x0).toBeGreaterThanOrEqual(0);
      expect(w.x1).toBeLessThanOrEqual(out.width);
      expect(w.y1).toBeLessThanOrEqual(out.height);
      expect(out.lines[0]!.angle).toBe(r);
    }
    expect(rotateOcrResultIntoUserSpace(ocr, 360, 200, 100)).toBe(ocr);
  });
});

describe("page plan at export", () => {
  it("reorders, rotates, deletes and duplicates pages", async () => {
    const bytes = await fixture("simple-5-pages.pdf");
    let plan = identityPlan(5);
    expect(isIdentityPlan(plan, 5)).toBe(true);
    expect(await applyPagePlan(bytes, plan)).toBe(bytes);
    plan = movePlanned(plan, 4, 0); // 5 1 2 3 4
    plan = removePlanned(plan, 2); // 5 1 3 4
    plan = duplicatePlanned(plan, 1); // 5 1 1 3 4
    plan = rotatePlanned(plan, 3, 90); // page 3 rotated
    plan = rotatePlanned(plan, 4, -90); // page 4 rotated 270
    expect(isIdentityPlan(plan, 5)).toBe(false);
    const out = await applyPagePlan(bytes, plan);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(5);
    const texts = await Promise.all([0, 1, 2, 3, 4].map((i) => extractPageText(out, i)));
    expect(texts.map((t) => t.join(" ").replace(/\s*\/.*$/, ""))).toEqual([
      "Page 5",
      "Page 1",
      "Page 1",
      "Page 3",
      "Page 4",
    ]);
    expect(doc.getPage(3).getRotation().angle).toBe(90);
    expect(doc.getPage(4).getRotation().angle).toBe(270);
    expect(doc.getPage(0).getRotation().angle).toBe(0);
  });

  it("keeps a page's own rotation when adding to it and refuses to empty the document", async () => {
    const bytes = await fixture("rotated-2nd-page.pdf");
    const out = await applyPagePlan(bytes, rotatePlanned(identityPlan(2), 1, 90));
    const doc = await PDFDocument.load(out);
    expect(doc.getPage(1).getRotation().angle).toBe(180);
    expect(removePlanned([{ source: 0, rotation: 0 }], 0)).toHaveLength(1);
    expect(movePlanned(identityPlan(2), 0, 5)).toEqual(identityPlan(2));
  });
});

describe("editing recognised (OCR) text", () => {
  async function layeredScan() {
    const base = await fixture("scan-image-only.pdf");
    const { doc, close } = await openWithPdfJs(base);
    const view = (await doc.getPage(1)).getViewport({ scale: 2 });
    await close();
    const ocr = ocrResult(
      [
        { text: "Montant", x0: 100, y0: 200, x1: 300, y1: 240 },
        { text: "120", x0: 320, y0: 200, x1: 400, y1: 240 },
      ],
      view.width,
      view.height,
    );
    return (
      await addOcrLayer(base, [
        { pageIndex: 0, ocr, imageWidth: view.width, imageHeight: view.height },
      ])
    ).bytes;
  }

  async function runsOf(bytes: Uint8Array) {
    const { doc, close } = await openWithPdfJs(bytes);
    const pdfLib = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const status = await extractTextRuns(doc, 0, pageContentBytes(pdfLib, pdfLib.getPage(0)));
    await close();
    return status;
  }

  it("exposes OCR runs as editable corrections of the invisible layer", async () => {
    const bytes = await layeredScan();
    const status = await runsOf(bytes);
    expect(status.kind).toBe("ok");
    const run = status.runs.find((r) => r.text === "120");
    expect(run).toBeDefined();
    expect(run!.kind).toBe("ocr");
    expect(run!.editable).toBe(true);
    const { bytes: edited, report } = await applyTextEdits(bytes, [
      {
        pageIndex: 0,
        opIndex: run!.opIndex,
        removeOps: run!.extraOps,
        text: "125",
        original: run!.original,
        fallback: run!.fallback,
      },
    ]);
    expect(report.applied).toBe(1);
    const text = await extractPageText(edited, 0);
    expect(text).toContain("125");
    expect(text).not.toContain("120");
    // The layer stays invisible: the only `0 Tr` is the layer's own trailer, no box was painted.
    const doc = await PDFDocument.load(edited);
    const content = decodeLatin1(pageContentBytes(doc, doc.getPage(0)));
    expect(content.match(/0 Tr/g)).toHaveLength(1);
    expect(content.indexOf("0 Tr")).toBeGreaterThan(content.indexOf("<313235>"));
    expect(content).not.toMatch(/h f Q BT/);
  });

  it("rewrites a run visibly only when asked, repainting its box", async () => {
    const bytes = await layeredScan();
    const status = await runsOf(bytes);
    const run = status.runs.find((r) => r.text === "Montant")!;
    const polygon = [
      { x: run.x, y: run.y - run.height * 0.25 },
      { x: run.x + run.width, y: run.y - run.height * 0.25 },
      { x: run.x + run.width, y: run.y + run.height },
      { x: run.x, y: run.y + run.height },
    ];
    const { bytes: edited, report } = await applyTextEdits(bytes, [
      {
        pageIndex: 0,
        opIndex: run.opIndex,
        removeOps: run.extraOps,
        text: "Total",
        original: run.original,
        fallback: run.fallback,
        visual: { polygon, fill: { r: 1, g: 1, b: 1 } },
      },
    ]);
    expect(report.applied).toBe(1);
    const items = await extractTextItems(edited, 0);
    const total = items.find((i) => i.str.includes("Total"));
    expect(total).toBeDefined();
    expect(total!.transform[4]).toBeCloseTo(run.x, 0);
    expect(total!.transform[5]).toBeCloseTo(run.y, 0);
    expect(items.some((i) => i.str.includes("Montant"))).toBe(false);
    expect(items.some((i) => i.str.includes("120"))).toBe(true);
    const doc = await PDFDocument.load(edited);
    const content = decodeLatin1(pageContentBytes(doc, doc.getPage(0)));
    expect(content).toMatch(/1 1 1 rg [\d. ]+ m( [\d. -]+ l){3} h f Q BT/);
    expect(content).toMatch(/0 Tr .*3 Tr/s);
  });
});

describe("large documents", () => {
  it("reports progress while opening a long document and samples its diagnosis", async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 120; i += 1) doc.addPage([595, 842]);
    const bytes = await doc.save();
    const steps: number[] = [];
    const opened = await openPdf(bytes, { onProgress: (done) => steps.push(done) });
    expect(opened.pageCount).toBe(120);
    expect(steps.length).toBeGreaterThanOrEqual(4);
    expect(steps.at(-1)).toBe(120);
    const diagnosis = await diagnoseDocument(opened.doc);
    expect(diagnosis.sampled).toBe(true);
    expect(diagnosis.pages.length).toBeLessThan(120);
    expect(diagnosis.kind).toBe("empty");
    await opened.destroy();
  }, 30_000);
});
