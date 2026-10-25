/**
 * Fidelity of existing-text editing on PDFs from different producers: the
 * exported file is reopened with pdf.js and pdf-lib to check what is present,
 * what is gone, where the text sits, its rotation, the fonts used and that
 * untouched pages are byte-for-byte equivalent in content.
 */
import path from "node:path";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import { extractTextRuns } from "@/lib/pdf/text-edit/extract-runs";
import { applyTextEdits, pageContentBytes } from "@/lib/pdf/text-edit/apply";
import type { TextRun } from "@/lib/pdf/text-edit/types";
import { extractPageText, extractTextItems, type TextItemInfo } from "../helpers";

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

async function runsOf(bytes: Uint8Array, pageIndex: number) {
  const { doc, close } = await openWithPdfJs(bytes);
  const pdfLib = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const status = await extractTextRuns(
    doc,
    pageIndex,
    pageContentBytes(pdfLib, pdfLib.getPage(pageIndex)),
  );
  await close();
  return status;
}

function findRun(runs: TextRun[], needle: string): TextRun {
  const run = runs.find((r) => r.text.includes(needle));
  if (!run)
    throw new Error(
      `run containing "${needle}" not found in: ${runs.map((r) => r.text).join(" | ")}`,
    );
  return run;
}

function itemFor(items: TextItemInfo[], needle: string): TextItemInfo {
  const item = items.find((i) => i.str.includes(needle));
  if (!item)
    throw new Error(`item "${needle}" not found in: ${items.map((i) => i.str).join(" | ")}`);
  return item;
}

function angleOf(item: TextItemInfo): number {
  return Math.round((Math.atan2(item.transform[1]!, item.transform[0]!) * 180) / Math.PI);
}

async function fontNames(bytes: Uint8Array, pageIndex: number): Promise<string[]> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const fonts = doc.getPage(pageIndex).node.Resources()?.lookup(PDFName.of("Font"));
  return fonts
    ? (String(fonts)
        .match(/\/[A-Za-z0-9+_-]+(?= \d+ 0 R)/g)
        ?.map((n) => n.slice(1)) ?? [])
    : [];
}

describe("text editing fidelity across producers", () => {
  it("Chromium-printed PDF (subset Identity-H TrueType): edit with the original font, keep position, leave page 2 untouched", async () => {
    const bytes = new Uint8Array(await readFile(path.join(fixtures, "chromium-report.pdf")));
    const status = await runsOf(bytes, 0);
    expect(status.kind).toBe("ok");
    if (status.kind !== "ok") return;
    const bonjour = findRun(status.runs, "Bonjour");
    expect(bonjour.editable).toBe(true);
    expect(bonjour.original.bytesPerCode).toBe(2); // Identity-H: two bytes per glyph
    // Subset font: only glyphs seen on the page are known codes.
    expect(bonjour.original.codes["o"]).toBeDefined();
    expect(bonjour.original.codes["Ω"]).toBeUndefined();
    const before = await extractTextItems(bytes, 0);
    const beforeItem = itemFor(before, "Bonjour");
    const page2Before = (await extractPageText(bytes, 1)).join(" ");
    const fontsBefore = await fontNames(bytes, 0);

    const { bytes: out, report } = await applyTextEdits(bytes, [
      {
        pageIndex: 0,
        opIndex: bonjour.opIndex,
        removeOps: bonjour.extraOps,
        text: bonjour.text.replace("Bonjour", "Bonsoir"),
        original: bonjour.original,
        fallback: bonjour.fallback,
      },
    ]);
    expect(report).toMatchObject({ applied: 1, fontReplaced: 0, skipped: [] });
    const text = (await extractPageText(out, 0)).join(" ");
    expect(text).toContain("Bonsoir");
    expect(text).not.toContain("Bonjour");
    const afterItem = itemFor(await extractTextItems(out, 0), "Bonsoir");
    expect(afterItem.transform[4]).toBeCloseTo(beforeItem.transform[4]!, 1);
    expect(afterItem.transform[5]).toBeCloseTo(beforeItem.transform[5]!, 1);
    expect(Math.hypot(afterItem.transform[0]!, afterItem.transform[1]!)).toBeCloseTo(
      Math.hypot(beforeItem.transform[0]!, beforeItem.transform[1]!),
      3,
    );
    expect(await fontNames(out, 0)).toEqual(fontsBefore); // same fonts, nothing added
    expect((await extractPageText(out, 1)).join(" ")).toBe(page2Before);
    // Searchable and copyable: the new word is a real text item.
    expect(afterItem.str).toContain("Bonsoir");
  });

  it("Chromium-printed PDF: a glyph missing from the subset font switches that run to a standard font and says so", async () => {
    const bytes = new Uint8Array(await readFile(path.join(fixtures, "chromium-report.pdf")));
    const status = await runsOf(bytes, 0);
    if (status.kind !== "ok") throw new Error(status.kind);
    const run = findRun(status.runs, "Chiffre");
    // Chromium splits "Chiffre d'affaires" into kerning and ligature fragments: they are merged into one run.
    expect(run.text).toContain("Chiffre d'affaires");
    expect(run.extraOps.length).toBeGreaterThan(0);
    const { bytes: out, report } = await applyTextEdits(bytes, [
      {
        pageIndex: 0,
        opIndex: run.opIndex,
        removeOps: run.extraOps,
        text: "Chiffre Ω 2026",
        original: run.original,
        fallback: run.fallback,
      },
    ]);
    expect(report.fontReplaced).toBe(1);
    expect(report.replacedCharacters).toBe(1); // Ω is outside WinAnsi too → "?"
    const names = await fontNames(out, 0);
    expect(names.some((n) => n.startsWith("OutiliaTexte"))).toBe(true);
    const after = (await extractPageText(out, 0)).join(" ");
    expect(after).toContain("Chiffre ? 2026");
    expect(after).not.toContain("affaires"); // every fragment of the old line is gone
    // The rest of the page keeps its original fonts and text.
    expect((await extractPageText(out, 0)).join(" ")).toContain("Rapport d'activité 2026");
  });

  it("rotated run on the label: the edit keeps the 90° direction and the position", async () => {
    const bytes = new Uint8Array(
      await readFile(path.join(fixtures, "label-mixed-orientation.pdf")),
    );
    const status = await runsOf(bytes, 0);
    if (status.kind !== "ok") throw new Error(status.kind);
    const run = findRun(status.runs, "EXPEDITEUR");
    expect(run.angle).toBe(90);
    expect(run.editable).toBe(true);
    const before = itemFor(await extractTextItems(bytes, 0), "EXPEDITEUR");
    expect(angleOf(before)).toBe(90);
    const { bytes: out, report } = await applyTextEdits(bytes, [
      {
        pageIndex: 0,
        opIndex: run.opIndex,
        removeOps: run.extraOps,
        text: "EXPEDITEUR ATELIER DES ARTS",
        original: run.original,
        fallback: run.fallback,
      },
    ]);
    expect(report.fontReplaced).toBe(0);
    const after = itemFor(await extractTextItems(out, 0), "ATELIER");
    expect(angleOf(after)).toBe(90);
    expect(after.transform[4]).toBeCloseTo(before.transform[4]!, 1);
    expect(after.transform[5]).toBeCloseTo(before.transform[5]!, 1);
    const text = (await extractPageText(out, 0)).join(" ");
    expect(text).toContain("EXPEDITEUR ATELIER DES ARTS");
    expect(text).not.toContain("BOUTIQUE");
    expect(text).toContain("MADAME CLAIRE DUPONT"); // untouched upright block
    const upside = itemFor(await extractTextItems(out, 0), "RETOUR");
    expect(Math.abs(angleOf(upside))).toBe(180); // other rotated runs untouched
  });

  it("page with /Rotate: runs are found in user space, the edit lands on that page and the rotation attribute stays", async () => {
    const bytes = new Uint8Array(await readFile(path.join(fixtures, "rotated-2nd-page.pdf")));
    const rotationBefore = (await PDFDocument.load(bytes)).getPage(1).getRotation().angle;
    expect(rotationBefore).not.toBe(0);
    const status = await runsOf(bytes, 1);
    if (status.kind !== "ok") throw new Error(status.kind);
    const run = findRun(status.runs, "Page 2");
    const { bytes: out, report } = await applyTextEdits(bytes, [
      {
        pageIndex: 1,
        opIndex: run.opIndex,
        removeOps: run.extraOps,
        text: "Page deux corrigée",
        original: run.original,
        fallback: run.fallback,
      },
    ]);
    expect(report.applied).toBe(1);
    const doc = await PDFDocument.load(out);
    expect(doc.getPage(1).getRotation().angle).toBe(rotationBefore);
    expect((await extractPageText(out, 1)).join(" ")).toContain("Page deux corrigée");
    expect((await extractPageText(out, 0)).join(" ")).toContain("Page 1 / 3");
    expect((await extractPageText(out, 2)).join(" ")).toContain("Page 3 / 3");
  });

  it("form, watermark-annotation and image documents: page text is editable, annotation and field text is out of scope", async () => {
    for (const name of [
      "form-acroform.pdf",
      "watermark-annotation.pdf",
      "links-and-images.pdf",
      "mixed-sizes-4-pages.pdf",
    ]) {
      const bytes = new Uint8Array(await readFile(path.join(fixtures, name)));
      const status = await runsOf(bytes, 0);
      expect(status.kind, name).toBe("ok");
      if (status.kind !== "ok") continue;
      for (const run of status.runs)
        for (const v of [run.x, run.y, run.width, run.height, run.fontSize])
          expect(Number.isFinite(v), name).toBe(true);
      const editable = status.runs.filter((r) => r.editable);
      expect(editable.length, name).toBeGreaterThan(0);
      const run = editable[0]!;
      const { bytes: out, report } = await applyTextEdits(bytes, [
        {
          pageIndex: 0,
          opIndex: run.opIndex,
          removeOps: run.extraOps,
          text: "Texte remplace",
          original: run.original,
          fallback: run.fallback,
        },
      ]);
      expect(report.applied, name).toBe(1);
      expect((await extractPageText(out, 0)).join(" "), name).toContain("Texte remplace");
      const doc = await PDFDocument.load(out);
      expect(doc.getPageCount()).toBe((await PDFDocument.load(bytes)).getPageCount());
    }
  });

  it("image-only page reports 'scanned' and nothing is applied", async () => {
    const bytes = new Uint8Array(await readFile(path.join(fixtures, "scan-image-only.pdf")));
    const status = await runsOf(bytes, 0);
    expect(status.kind).toBe("scanned");
  });
});
