import { describe, expect, it } from "vitest";
import { PDFName } from "pdf-lib";
import createQpdf from "@neslinesli93/qpdf-wasm";
import path from "node:path";
import { createRequire } from "node:module";
import { cropPages, uncropPages } from "@/lib/pdf/operations/crop";
import {
  stampPages,
  defaultStampOptions,
  renderTemplate,
  visualToUser,
} from "@/lib/pdf/operations/stamps";
import { readMetadata, stripMetadata, updateMetadata } from "@/lib/pdf/operations/metadata";
import { imagesToPdf, defaultImagesToPdfOptions } from "@/lib/pdf/operations/images-to-pdf";
import { assembleTextItems, pagesToMarkdown, searchPages } from "@/lib/pdf/operations/extract-text";
import {
  buildEncryptArgs,
  checkPdf,
  createQpdfRunner,
  isEncryptedPdf,
  protectPdf,
  passwordOpensFile,
  unlockPdf,
} from "@/lib/pdf/qpdf";
import { extractPageText, fixture, openPdf } from "../helpers";

const require = createRequire(import.meta.url);
const wasmPath = path.join(
  path.dirname(require.resolve("@neslinesli93/qpdf-wasm/package.json")),
  "dist/qpdf.wasm",
);
const qpdf = createQpdfRunner(createQpdf as never, wasmPath);

describe("crop", () => {
  it("sets the crop box and can be undone", async () => {
    const src = await fixture("rotated-2nd-page.pdf");
    const out = await cropPages(src, { top: 10, right: 20, bottom: 30, left: 40 });
    const doc = await openPdf(out);
    const box = doc.getPage(0).getCropBox();
    expect(box.x).toBeCloseTo(40);
    expect(box.y).toBeCloseTo(30);
    expect(box.width).toBeCloseTo(595.28 - 60);
    expect(box.height).toBeCloseTo(841.89 - 40);
    // Rotated page: visual top maps to the user-space right edge.
    const rotated = doc.getPage(1).getCropBox();
    expect(rotated.x).toBeCloseTo(10); // visual bottom(30)? no: rot 90 → left=top(10)
    const restored = await openPdf(await uncropPages(out));
    expect(restored.getPage(0).getCropBox().width).toBeCloseTo(595.28);
    await expect(cropPages(src, { top: 500, right: 0, bottom: 500, left: 0 })).rejects.toThrow(
      /trop petite/,
    );
  });
});

describe("stamps", () => {
  it("renders templates and maps visual coordinates", () => {
    expect(
      renderTemplate("Page {page} / {total} – {date} – {file}", {
        page: 2,
        total: 5,
        date: "25/10/2026",
        file: "a.pdf",
      }),
    ).toBe("Page 2 / 5 – 25/10/2026 – a.pdf");
    expect(visualToUser(10, 20, 90, 595, 842)).toEqual({ x: 575, y: 10 });
    expect(visualToUser(10, 20, 0, 595, 842)).toEqual({ x: 10, y: 20 });
  });
  it("adds page numbers and a header to every page", async () => {
    const src = await fixture("simple-3-pages.pdf");
    const { bytes } = await stampPages(src, {
      ...defaultStampOptions,
      header: { template: "Rapport {date}", position: "right" },
      date: "25/10/2026",
      startNumber: 1,
    });
    expect((await extractPageText(bytes, 1)).join(" ")).toContain("2 / 3");
    expect((await extractPageText(bytes, 2)).join(" ")).toContain("Rapport 25/10/2026");
    const fromPage2 = await stampPages(src, {
      ...defaultStampOptions,
      startPageIndex: 1,
      startNumber: 10,
    });
    expect((await extractPageText(fromPage2.bytes, 0)).join(" ")).not.toContain("/ 2");
    expect((await extractPageText(fromPage2.bytes, 1)).join(" ")).toContain("10 / 2");
  });
});

describe("metadata", () => {
  it("reads, updates and strips metadata", async () => {
    const src = await fixture("simple-3-pages.pdf");
    const meta = await readMetadata(src);
    expect(meta.title).toBe("Fixture 3 pages");
    expect(meta.producer).toContain("pdf-lib");
    expect(meta.pageCount).toBe(3);
    const updated = await updateMetadata(src, { title: "Nouveau titre", author: "Jeanne" });
    expect((await readMetadata(updated)).author).toBe("Jeanne");
    const stripped = await stripMetadata(updated, { title: "Gardé" });
    const after = await readMetadata(stripped);
    expect(after.author).toBe("");
    expect(after.producer).toBe("");
    expect(after.title).toBe("Gardé");
    expect(after.hasXmp).toBe(false);
    const doc = await openPdf(stripped);
    expect(doc.catalog.has(PDFName.of("Metadata"))).toBe(false);
  });
});

describe("images to pdf", () => {
  it("creates one page per image on A4 and fit modes", async () => {
    const png = await fixture("signature.png");
    const out = await imagesToPdf(
      [
        { name: "a.png", bytes: png, mimeType: "image/png" },
        { name: "b.png", bytes: png, mimeType: "image/png" },
      ],
      defaultImagesToPdfOptions,
    );
    const doc = await openPdf(out);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getSize().width).toBeCloseTo(595.28, 0);
    const fit = await openPdf(
      await imagesToPdf([{ name: "a.png", bytes: png, mimeType: "image/png" }], {
        ...defaultImagesToPdfOptions,
        pageSize: "fit-image",
        dpi: 72,
      }),
    );
    expect(fit.getPage(0).getSize()).toEqual({ width: 2, height: 2 });
    await expect(imagesToPdf([], defaultImagesToPdfOptions)).rejects.toMatchObject({
      code: "NO_SELECTION",
    });
  });
});

describe("text extraction helpers", () => {
  it("assembles items into lines and paragraphs", () => {
    const items = [
      { str: "Bonjour", transform: [12, 0, 0, 12, 50, 700], width: 40, height: 12 },
      { str: "monde", transform: [12, 0, 0, 12, 95, 700], width: 30, height: 12 },
      { str: "Suite", transform: [12, 0, 0, 12, 50, 684], width: 30, height: 12 },
      { str: "Paragraphe", transform: [12, 0, 0, 12, 50, 600], width: 60, height: 12 },
    ];
    expect(assembleTextItems(items)).toBe("Bonjour monde\nSuite\n\nParagraphe");
    const pages = [
      { pageIndex: 0, text: "Bonjour monde", empty: false },
      { pageIndex: 1, text: "", empty: true },
    ];
    expect(pagesToMarkdown(pages)).toContain("## Page 2");
    expect(searchPages(pages, "MONDE")).toEqual([{ pageIndex: 0, snippet: "Bonjour monde" }]);
  });
});

describe("qpdf", () => {
  it("protects, detects wrong passwords and unlocks", async () => {
    const src = await fixture("simple-3-pages.pdf");
    const args = buildEncryptArgs({
      userPassword: "u",
      ownerPassword: "",
      level: "aes-256",
      allowPrinting: true,
      allowModification: false,
      allowCopy: false,
      allowAnnotations: false,
    });
    expect(args).toContain("--encrypt");
    expect(args).toContain("--extract=n");
    const locked = await protectPdf(qpdf, src, {
      userPassword: "secret",
      ownerPassword: "owner",
      level: "aes-256",
      allowPrinting: true,
      allowModification: false,
      allowCopy: true,
      allowAnnotations: true,
    });
    expect(isEncryptedPdf(locked)).toBe(true);
    expect(isEncryptedPdf(src)).toBe(false);
    expect(await passwordOpensFile(qpdf, locked, "secret")).toBe(true);
    expect(await passwordOpensFile(qpdf, locked, "wrong")).toBe(false);
    await expect(unlockPdf(qpdf, locked, "wrong")).rejects.toMatchObject({ code: "ENCRYPTED" });
    const unlocked = await unlockPdf(qpdf, locked, "secret");
    expect(isEncryptedPdf(unlocked)).toBe(false);
    expect((await openPdf(unlocked)).getPageCount()).toBe(3);
    const report = await checkPdf(qpdf, src);
    expect(report.ok).toBe(true);
    expect(report.version).toBe("1.7");
    const broken = await checkPdf(qpdf, await fixture("corrupted.pdf"));
    expect(broken.ok).toBe(false);
    expect(broken.errors.length).toBeGreaterThan(0);
  }, 60_000);
});
