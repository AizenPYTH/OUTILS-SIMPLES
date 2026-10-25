import { describe, expect, it } from "vitest";
import { PDFName, PDFDict } from "pdf-lib";
import { mergePdfs } from "@/lib/pdf/operations/merge";
import { extractPages, organizePages, rotatePages, splitPdf } from "@/lib/pdf/operations/pages";
import { applyAnnotations } from "@/lib/pdf/operations/annotate";
import { addWatermark, analyzeWatermarks, removeWatermarks, stripMarkedContent, readWatermarkRecord } from "@/lib/pdf/operations/watermark";
import { compressPdf, type ImageReencoder } from "@/lib/pdf/operations/compress";
import { fillForm, inspectForm } from "@/lib/pdf/operations/forms";
import { loadPdfDocument } from "@/lib/pdf/load";
import { PdfError } from "@/lib/pdf/errors";
import { parsePageRanges } from "@/lib/pdf/page-ranges";
import type { Annotation } from "@/lib/pdf/annotations/types";
import { extractPageText, fixture, openPdf } from "../helpers";

describe("loadPdfDocument", () => {
  it("loads a valid document", async () => {
    const doc = await loadPdfDocument(await fixture("simple-3-pages.pdf"));
    expect(doc.getPageCount()).toBe(3);
  });
  it("rejects non-PDF, corrupted and encrypted inputs with clear codes", async () => {
    await expect(loadPdfDocument(await fixture("not-a-pdf.txt"))).rejects.toMatchObject({ code: "NOT_PDF" });
    await expect(loadPdfDocument(await fixture("corrupted.pdf"))).rejects.toBeInstanceOf(PdfError);
    await expect(loadPdfDocument(await fixture("encrypted-flag.pdf"))).rejects.toMatchObject({ code: "ENCRYPTED" });
  });
});

describe("merge", () => {
  it("concatenates pages in order and preserves sizes and rotations", async () => {
    const a = await fixture("simple-3-pages.pdf");
    const b = await fixture("rotated-2nd-page.pdf");
    const c = await fixture("mixed-sizes-4-pages.pdf");
    const progress: number[] = [];
    const { bytes, pageCount } = await mergePdfs(
      [
        { name: "a.pdf", bytes: a },
        { name: "b.pdf", bytes: b },
        { name: "c.pdf", bytes: c },
      ],
      (p) => progress.push(p.current),
    );
    expect(pageCount).toBe(10);
    const doc = await openPdf(bytes);
    expect(doc.getPageCount()).toBe(10);
    expect(doc.getPage(4).getRotation().angle).toBe(90); // 2nd page of b
    expect(doc.getPage(7).getSize().width).toBeCloseTo(841.89); // landscape page of c
    expect(progress.at(-1)).toBe(3);
    const text = await extractPageText(bytes, 3);
    expect(text.join(" ")).toContain("Page 1 / 3");
  });

  it("fails on an invalid file without producing output", async () => {
    await expect(
      mergePdfs([
        { name: "ok.pdf", bytes: await fixture("simple-3-pages.pdf") },
        { name: "bad.txt", bytes: await fixture("not-a-pdf.txt") },
      ]),
    ).rejects.toMatchObject({ code: "NOT_PDF" });
    await expect(mergePdfs([])).rejects.toMatchObject({ code: "NO_SELECTION" });
  });
});

describe("extract & split", () => {
  it("extracts exactly the requested pages, in order", async () => {
    const src = await fixture("simple-5-pages.pdf");
    const out = await extractPages(src, [4, 1]);
    const doc = await openPdf(out);
    expect(doc.getPageCount()).toBe(2);
    expect((await extractPageText(out, 0)).join(" ")).toContain("Page 5 / 5");
    expect((await extractPageText(out, 1)).join(" ")).toContain("Page 2 / 5");
  });

  it("rejects empty or invalid selections", async () => {
    const src = await fixture("simple-5-pages.pdf");
    await expect(extractPages(src, [])).rejects.toMatchObject({ code: "NO_SELECTION" });
    await expect(extractPages(src, [9])).rejects.toMatchObject({ code: "INVALID_RANGE" });
  });

  it("splits one file per range, including overlaps when asked", async () => {
    const src = await fixture("simple-5-pages.pdf");
    const { ranges } = parsePageRanges("1-2, 2-3, 5", 5);
    const outputs = await splitPdf(src, ranges, "one-file-per-range");
    expect(outputs).toHaveLength(3);
    expect((await openPdf(outputs[0]!.bytes)).getPageCount()).toBe(2);
    expect((await openPdf(outputs[1]!.bytes)).getPageCount()).toBe(2);
    expect((await extractPageText(outputs[1]!.bytes, 0)).join(" ")).toContain("Page 2 / 5");
    expect((await extractPageText(outputs[2]!.bytes, 0)).join(" ")).toContain("Page 5 / 5");
  });

  it("merges overlapping ranges into one file without duplicates", async () => {
    const src = await fixture("simple-5-pages.pdf");
    const { ranges } = parsePageRanges("4-5, 1-2, 2-3", 5);
    const outputs = await splitPdf(src, ranges, "single-file");
    expect(outputs).toHaveLength(1);
    expect(outputs[0]!.indices).toEqual([0, 1, 2, 3, 4]);
    expect((await openPdf(outputs[0]!.bytes)).getPageCount()).toBe(5);
    expect((await extractPageText(outputs[0]!.bytes, 0)).join(" ")).toContain("Page 1 / 5");
  });
});

describe("rotate & organize", () => {
  it("adds rotation to existing page rotation", async () => {
    const src = await fixture("rotated-2nd-page.pdf");
    const out = await rotatePages(src, { 0: 90, 1: 90, 2: -90 });
    const doc = await openPdf(out);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
    expect(doc.getPage(1).getRotation().angle).toBe(180);
    expect(doc.getPage(2).getRotation().angle).toBe(270);
  });

  it("exports exactly the displayed arrangement (reorder, delete, rotate)", async () => {
    const src = await fixture("simple-5-pages.pdf");
    const out = await organizePages(src, [
      { sourceIndex: 2, rotation: 0 },
      { sourceIndex: 0, rotation: 180 },
      { sourceIndex: 4, rotation: 90 },
    ]);
    const doc = await openPdf(out);
    expect(doc.getPageCount()).toBe(3);
    expect((await extractPageText(out, 0)).join(" ")).toContain("Page 3 / 5");
    expect((await extractPageText(out, 1)).join(" ")).toContain("Page 1 / 5");
    expect(doc.getPage(1).getRotation().angle).toBe(180);
    expect(doc.getPage(2).getRotation().angle).toBe(90);
  });
});

describe("annotations", () => {
  it("draws text, shapes, paths and images into the page content", async () => {
    const src = await fixture("simple-3-pages.pdf");
    const png = await fixture("signature.png");
    const annotations: Annotation[] = [
      {
        id: "t1",
        type: "text",
        pageIndex: 0,
        x: 100,
        y: 500,
        width: 200,
        height: 30,
        text: "Signé électroniquement à Paris",
        fontFamily: "helvetica",
        fontSize: 14,
        bold: true,
        italic: false,
        color: { r: 0, g: 0, b: 1 },
        align: "left",
      },
      { id: "h1", type: "highlight", pageIndex: 0, x: 50, y: 700, width: 300, height: 20, color: { r: 1, g: 1, b: 0 }, opacity: 0.4 },
      { id: "r1", type: "rect", pageIndex: 1, x: 50, y: 50, width: 100, height: 60, strokeWidth: 2, strokeColor: { r: 1, g: 0, b: 0 }, fillColor: null, opacity: 1 },
      { id: "e1", type: "ellipse", pageIndex: 1, x: 200, y: 50, width: 100, height: 60, strokeWidth: 2, strokeColor: null, fillColor: { r: 0, g: 1, b: 0 }, opacity: 0.5 },
      { id: "l1", type: "line", pageIndex: 1, start: { x: 10, y: 10 }, end: { x: 100, y: 100 }, strokeWidth: 3, color: { r: 0, g: 0, b: 0 }, opacity: 1, arrow: true },
      { id: "p1", type: "path", pageIndex: 2, points: [{ x: 10, y: 10 }, { x: 50, y: 80 }, { x: 90, y: 20 }], strokeWidth: 2, color: { r: 0, g: 0, b: 0 }, opacity: 1 },
      { id: "i1", type: "image", pageIndex: 2, x: 300, y: 300, width: 120, height: 60, bytes: png, mimeType: "image/png", role: "signature" },
    ];
    const { bytes, report } = await applyAnnotations(src, annotations);
    expect(report.drawn).toBe(7);
    expect(report.replacedCharacters).toBe(0);
    const doc = await openPdf(bytes);
    expect(doc.getPageCount()).toBe(3);
    const text = await extractPageText(bytes, 0);
    expect(text.join(" ")).toContain("Signé électroniquement à Paris");
    // The image XObject must be referenced by page 3.
    const resources = doc.getPage(2).node.Resources();
    const xobjects = doc.context.lookup(resources?.get(PDFName.of("XObject")));
    expect(xobjects).toBeInstanceOf(PDFDict);
    expect(bytes.byteLength).toBeGreaterThan(src.byteLength);
  });

  it("reports replaced characters instead of failing", async () => {
    const src = await fixture("simple-3-pages.pdf");
    const { report } = await applyAnnotations(src, [
      { id: "t", type: "text", pageIndex: 0, x: 10, y: 10, width: 100, height: 20, text: "Привет 🙂", fontFamily: "times", fontSize: 12, bold: false, italic: true, color: { r: 0, g: 0, b: 0 }, align: "right" },
    ]);
    expect(report.replacedCharacters).toBe(1);
  });

  it("places text on a rotated page without throwing", async () => {
    const src = await fixture("rotated-2nd-page.pdf");
    const { bytes } = await applyAnnotations(src, [
      { id: "t", type: "text", pageIndex: 1, x: 100, y: 100, width: 40, height: 200, text: "Rotated", fontFamily: "courier", fontSize: 12, bold: false, italic: false, color: { r: 0, g: 0, b: 0 }, align: "center" },
    ]);
    expect((await extractPageText(bytes, 1)).join(" ")).toContain("Rotated");
  });
});

describe("watermark", () => {
  it("adds a text watermark to selected pages, records it, and removes it cleanly", async () => {
    const src = await fixture("simple-3-pages.pdf");
    const { bytes, pagesMarked } = await addWatermark(src, {
      kind: "text",
      text: "CONFIDENTIEL",
      fontSize: 48,
      fontFamily: "helvetica",
      bold: true,
      color: { r: 1, g: 0, b: 0 },
      opacity: 0.3,
      rotation: 45,
      position: "center",
      pageIndices: [0, 2],
    });
    expect(pagesMarked).toEqual([0, 2]);
    expect((await extractPageText(bytes, 0)).join(" ")).toContain("CONFIDENTIEL");
    expect((await extractPageText(bytes, 1)).join(" ")).not.toContain("CONFIDENTIEL");
    expect(readWatermarkRecord(await openPdf(bytes))).toEqual([0, 2]);

    const diagnostic = await analyzeWatermarks(bytes);
    expect(diagnostic.outiliaPages).toEqual([0, 2]);
    expect(diagnostic.watermarkAnnotations).toEqual([]);
    expect(diagnostic.recordedButMissing).toEqual([]);

    const removed = await removeWatermarks(bytes, { removeOutilia: true, removeWatermarkAnnotations: false });
    expect(removed.removedBlocks).toBe(2);
    expect((await extractPageText(removed.bytes, 0)).join(" ")).not.toContain("CONFIDENTIEL");
    expect((await extractPageText(removed.bytes, 0)).join(" ")).toContain("Page 1 / 3");
    expect(readWatermarkRecord(await openPdf(removed.bytes))).toEqual([]);
    expect((await analyzeWatermarks(removed.bytes)).outiliaPages).toEqual([]);
  });

  it("adds a tiled image watermark on all pages", async () => {
    const src = await fixture("simple-3-pages.pdf");
    const png = await fixture("signature.png");
    const { bytes, pagesMarked } = await addWatermark(src, {
      kind: "image",
      bytes: png,
      mimeType: "image/png",
      widthRatio: 0.2,
      opacity: 0.2,
      rotation: 0,
      position: "tiled",
      pageIndices: [],
    });
    expect(pagesMarked).toEqual([0, 1, 2]);
    expect((await analyzeWatermarks(bytes)).outiliaPages).toEqual([0, 1, 2]);
  });

  it("detects and removes native /Watermark annotations", async () => {
    const src = await fixture("watermark-annotation.pdf");
    const diagnostic = await analyzeWatermarks(src);
    expect(diagnostic.watermarkAnnotations).toEqual([{ pageIndex: 0, count: 1 }]);
    const result = await removeWatermarks(src, { removeOutilia: false, removeWatermarkAnnotations: true });
    expect(result.removedAnnotations).toBe(1);
    expect((await analyzeWatermarks(result.bytes)).watermarkAnnotations).toEqual([]);
  });

  it("refuses honestly when nothing removable exists", async () => {
    const src = await fixture("simple-3-pages.pdf");
    await expect(removeWatermarks(src, { removeOutilia: true, removeWatermarkAnnotations: true })).rejects.toMatchObject({ code: "UNSUPPORTED" });
  });

  it("strips only tagged blocks, including nested marked content", () => {
    const content = "q 1 0 0 RG BT (keep) Tj ET Q /OutiliaWatermark BMC /Span BDC (wm) Tj EMC (wm2) Tj EMC q (after) Tj Q";
    const { content: cleaned, removed } = stripMarkedContent(content);
    expect(removed).toBe(1);
    expect(cleaned).toContain("(keep) Tj");
    expect(cleaned).toContain("(after) Tj");
    expect(cleaned).not.toContain("wm");
    expect(stripMarkedContent("no markers here").removed).toBe(0);
  });
});

describe("compress", () => {
  it("structure-only mode never touches images and reports sizes", async () => {
    const src = await fixture("image-raw-rgb.pdf");
    const { stats, profile } = await compressPdf(src, "structure", null);
    expect(profile.lossy).toBe(false);
    expect(stats.imagesRecompressed).toBe(0);
    expect(stats.originalSize).toBe(src.byteLength);
    expect(stats.resultSize).toBeGreaterThan(0);
    expect(stats.savedBytes).toBe(stats.originalSize - stats.resultSize);
  });

  it("re-encodes eligible images through the injected encoder and keeps originals when bigger", async () => {
    const src = await fixture("image-raw-rgb.pdf");
    const seen: string[] = [];
    const tinyJpeg = await fixtureJpeg();
    const encoder: ImageReencoder = async (image) => {
      seen.push(`${image.encoding}:${image.width}x${image.height}:${image.colorSpace}`);
      return { jpeg: tinyJpeg, width: image.width, height: image.height };
    };
    const { bytes, stats } = await compressPdf(src, "balanced", encoder);
    expect(seen).toEqual(["raw:400x300:DeviceRGB"]);
    expect(stats.imagesFound).toBe(1);
    expect(stats.imagesRecompressed).toBe(1);
    expect(stats.resultSize).toBeLessThan(stats.originalSize * 0.2);
    const doc = await openPdf(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect((await extractPageText(bytes, 0)).join(" ")).toContain("Image de test");

    const keepOriginal: ImageReencoder = async () => ({ jpeg: new Uint8Array(10_000_000), width: 1, height: 1 });
    const kept = await compressPdf(src, "strong", keepOriginal);
    expect(kept.stats.imagesKeptOriginal).toBe(1);
    expect(kept.stats.imagesRecompressed).toBe(0);
  });
});

describe("forms", () => {
  it("lists interactive fields with their kinds and pages", async () => {
    const src = await fixture("form-acroform.pdf");
    const { fields, hasXfa } = await inspectForm(src);
    expect(hasXfa).toBe(false);
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
    expect(byName.nom?.kind).toBe("text");
    expect(byName.notes?.multiline).toBe(true);
    expect(byName.accepte?.kind).toBe("checkbox");
    expect(byName.civilite?.kind).toBe("radio");
    expect(byName.civilite?.options).toEqual(["Madame", "Monsieur"]);
    expect(byName.pays?.options).toContain("Belgique");
    expect(byName.reference?.readOnly).toBe(true);
    expect(byName.nom?.pageIndex).toBe(0);
  });

  it("fills values, skips read-only fields and can flatten", async () => {
    const src = await fixture("form-acroform.pdf");
    const filled = await fillForm(
      src,
      { nom: "Jeanne Martin", accepte: true, civilite: "Madame", pays: "Suisse", reference: "HACK", unknown: "x" },
      { flatten: false },
    );
    const { fields } = await inspectForm(filled);
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
    expect(byName.nom?.value).toBe("Jeanne Martin");
    expect(byName.accepte?.value).toBe(true);
    expect(byName.civilite?.value).toBe("Madame");
    expect(byName.pays?.value).toBe("Suisse");
    expect(byName.reference?.value).toBe("REF-0001");

    const flat = await fillForm(src, { nom: "Jeanne Martin" }, { flatten: true });
    expect((await inspectForm(flat)).fields).toHaveLength(0);
    expect((await extractPageText(flat, 0)).join(" ")).toContain("Jeanne Martin");
  });
});

/** Smallest valid baseline JPEG (1x1 grey). */
async function fixtureJpeg(): Promise<Uint8Array> {
  return Uint8Array.from(
    Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z",
      "base64",
    ),
  );
}
