/**
 * Audit regression tests: behaviours that the e2e suite only checked through
 * the interface, or that were never exercised (permissions actually written by
 * qpdf, owner-only encryption, rotated pages in redaction, limit enforcement).
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { createRequire } from "node:module";
import createQpdf from "@neslinesli93/qpdf-wasm";
import { PDFDocument } from "pdf-lib";
import { buildEncryptArgs, createQpdfRunner, checkPdf, isEncryptedPdf, passwordOpensFile, protectPdf, unlockPdf } from "@/lib/pdf/qpdf";
import { loadPdfDocument } from "@/lib/pdf/load";
import { replacePagesWithImages } from "@/lib/pdf/operations/redact";
import { stampPages, defaultStampOptions } from "@/lib/pdf/operations/stamps";
import { cropPages } from "@/lib/pdf/operations/crop";
import { imagesToPdf } from "@/lib/pdf/operations/images-to-pdf";
import { assertPageCount, looksLikePdf, validateFileBatch, validatePdfFileMeta } from "@/lib/files/validation";
import { extractText, searchPages } from "@/lib/pdf/operations/extract-text";
import { extractPageText, fixture, openPdf } from "../helpers";

const require = createRequire(import.meta.url);
const wasmPath = path.join(path.dirname(require.resolve("@neslinesli93/qpdf-wasm/package.json")), "dist/qpdf.wasm");
const qpdf = createQpdfRunner(createQpdf as never, wasmPath);

/** Opens a PDF with pdf.js (optionally with a password) and returns its permission flags. */
async function pdfjsPermissions(bytes: Uint8Array, password?: string): Promise<{ permissions: Set<number> | null; pageCount: number }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), password, useWorkerFetch: false, disableFontFace: true, verbosity: 0, standardFontDataUrl: path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts/") });
  const doc = await task.promise;
  try {
    return { permissions: await doc.getPermissions(), pageCount: doc.numPages };
  } finally {
    await task.destroy();
  }
}

// pdf.js PermissionFlag values (PDF 32000-1 table 22).
const PRINT = 4;
const MODIFY_CONTENTS = 8;
const COPY = 16;
const MODIFY_ANNOTATIONS = 32;

describe("audit — protection par mot de passe (qpdf)", () => {
  it("writes the chosen permissions into the file and the user password really locks it", async () => {
    const src = await fixture("simple-3-pages.pdf");
    const locked = await protectPdf(qpdf, src, { userPassword: "lecture", ownerPassword: "proprio", level: "aes-256", allowPrinting: false, allowModification: false, allowCopy: false, allowAnnotations: true });
    // Without the password pdf.js refuses the document.
    await expect(pdfjsPermissions(locked)).rejects.toMatchObject({ name: "PasswordException" });
    const { permissions, pageCount } = await pdfjsPermissions(locked, "lecture");
    expect(pageCount).toBe(3);
    expect(permissions).not.toBeNull();
    expect(permissions!.has(PRINT)).toBe(false);
    expect(permissions!.has(MODIFY_CONTENTS)).toBe(false);
    expect(permissions!.has(COPY)).toBe(false);
    expect(permissions!.has(MODIFY_ANNOTATIONS)).toBe(true);
    // The owner password opens it too and the file declares AES-256.
    expect(await passwordOpensFile(qpdf, locked, "proprio")).toBe(true);
    expect(Buffer.from(locked).toString("latin1")).toMatch(/\/AESV3|\/V 5/);
    // pdf-lib based tools refuse encrypted input with a clear code (no silent corruption).
    await expect(loadPdfDocument(locked)).rejects.toMatchObject({ code: "ENCRYPTED" });
  }, 60_000);

  it("accepts a single password (owner defaults to the user password) and AES-128", async () => {
    const src = await fixture("simple-3-pages.pdf");
    const locked = await protectPdf(qpdf, src, { userPassword: "seul", ownerPassword: "", level: "aes-128", allowPrinting: true, allowModification: true, allowCopy: true, allowAnnotations: true });
    expect(isEncryptedPdf(locked)).toBe(true);
    // Regression: qpdf ≥ 11 refuses RC4, so 128-bit must request AES explicitly.
    expect(buildEncryptArgs({ userPassword: "x", ownerPassword: "", level: "aes-128", allowPrinting: true, allowModification: true, allowCopy: true, allowAnnotations: true })).toContain("--use-aes=y");
    const restricted = await protectPdf(qpdf, src, { userPassword: "seul", ownerPassword: "", level: "aes-128", allowPrinting: true, allowModification: false, allowCopy: false, allowAnnotations: false });
    expect((await pdfjsPermissions(restricted, "seul")).permissions!.has(COPY)).toBe(false);
    const { permissions } = await pdfjsPermissions(locked, "seul");
    // Everything allowed → pdf.js reports no restriction set or a set containing all four flags.
    expect(permissions === null || [PRINT, MODIFY_CONTENTS, COPY, MODIFY_ANNOTATIONS].every((f) => permissions.has(f))).toBe(true);
    expect(Buffer.from(locked).toString("latin1")).toMatch(/\/AESV2|\/V 4/);
  }, 60_000);

  it("owner-only protection opens without password but restricts, and unlock removes it", async () => {
    const src = await fixture("simple-3-pages.pdf");
    const locked = await protectPdf(qpdf, src, { userPassword: "", ownerPassword: "proprio", level: "aes-256", allowPrinting: false, allowModification: false, allowCopy: false, allowAnnotations: false });
    const { permissions } = await pdfjsPermissions(locked);
    expect(permissions).not.toBeNull();
    expect(permissions!.has(COPY)).toBe(false);
    // Unlocking with the owner password yields an unrestricted, unencrypted file.
    const unlocked = await unlockPdf(qpdf, locked, "proprio");
    expect(isEncryptedPdf(unlocked)).toBe(false);
    expect((await pdfjsPermissions(unlocked)).permissions).toBeNull();
    expect((await openPdf(unlocked)).getPageCount()).toBe(3);
  }, 60_000);

  it("refuses to protect an already encrypted file and reports encryption in the check", async () => {
    const src = await fixture("simple-3-pages.pdf");
    const locked = await protectPdf(qpdf, src, { userPassword: "a1b2", ownerPassword: "", level: "aes-256", allowPrinting: true, allowModification: false, allowCopy: false, allowAnnotations: false });
    await expect(protectPdf(qpdf, locked, { userPassword: "autre", ownerPassword: "", level: "aes-256", allowPrinting: true, allowModification: false, allowCopy: false, allowAnnotations: false })).rejects.toBeTruthy();
    const report = await checkPdf(qpdf, locked);
    expect(report.encrypted).toBe(true);
    expect(report.repaired).toBeNull();
    // Unlocking a file that is not encrypted is harmless and keeps the content.
    const same = await unlockPdf(qpdf, src, "peu-importe");
    expect((await extractPageText(same, 0)).join(" ")).toContain("Page 1");
  }, 60_000);
});

describe("audit — caviardage sur page pivotée", () => {
  it("keeps the visual orientation when a rotated page is replaced by its raster", async () => {
    const src = await fixture("rotated-2nd-page.pdf");
    const original = await openPdf(src);
    const page = original.getPage(1);
    const angle = page.getRotation().angle;
    const { width, height } = page.getSize();
    expect(angle % 180).toBe(90);
    const photo = await fixture("photo-800x600.jpg");
    const out = await replacePagesWithImages(src, [{ pageIndex: 1, bytes: photo, mimeType: "image/jpeg" }]);
    const doc = await openPdf(out);
    expect(doc.getPageCount()).toBe(original.getPageCount());
    const replaced = doc.getPage(1);
    expect(replaced.getRotation().angle).toBe(0);
    expect(replaced.getSize()).toEqual({ width: height, height: width });
    expect(await extractPageText(out, 1)).toHaveLength(0);
    expect(doc.getPage(0).getSize()).toEqual(original.getPage(0).getSize());
  });
});

describe("audit — fidélité des options", () => {
  it("numbers pages from the requested start and only from the requested page", async () => {
    const src = await fixture("simple-5-pages.pdf");
    const { bytes } = await stampPages(src, { ...defaultStampOptions, startPageIndex: 1, startNumber: 10, footer: { template: "Page {page} sur {total}", position: "right" }, header: { template: "{file}", position: "left" }, fileName: "rapport.pdf" });
    expect((await extractPageText(bytes, 0)).join(" ")).not.toContain("Page 10");
    expect((await extractPageText(bytes, 1)).join(" ")).toContain("Page 10 sur 4");
    expect((await extractPageText(bytes, 4)).join(" ")).toContain("Page 13 sur 4");
    expect((await extractPageText(bytes, 1)).join(" ")).toContain("rapport.pdf");
  });

  it("stamps a rotated page without throwing and keeps its rotation", async () => {
    const src = await fixture("rotated-2nd-page.pdf");
    const { bytes } = await stampPages(src, defaultStampOptions);
    const doc = await openPdf(bytes);
    expect(doc.getPage(1).getRotation().angle % 180).toBe(90);
    expect((await extractPageText(bytes, 1)).join(" ")).toMatch(/2 \/ \d/);
  });

  it("crops only the selected pages", async () => {
    const src = await fixture("simple-3-pages.pdf");
    const out = await cropPages(src, { top: 20, right: 30, bottom: 40, left: 50 }, [1]);
    const doc = await openPdf(out);
    const untouched = doc.getPage(0);
    const cropped = doc.getPage(1);
    expect(untouched.getCropBox()).toEqual(untouched.getMediaBox());
    const media = cropped.getMediaBox();
    const crop = cropped.getCropBox();
    expect(crop.x).toBeCloseTo(media.x + 50);
    expect(crop.width).toBeCloseTo(media.width - 80);
    expect(crop.height).toBeCloseTo(media.height - 60);
  });

  it("sizes fit-image pages from the dpi option", async () => {
    const photo = await fixture("photo-800x600.jpg");
    const out = await imagesToPdf([{ name: "p.jpg", bytes: photo, mimeType: "image/jpeg" }], { pageSize: "fit-image", margin: 0, dpi: 200 });
    const page = (await openPdf(out)).getPage(0);
    expect(page.getWidth()).toBeCloseTo((800 * 72) / 200, 3);
    expect(page.getHeight()).toBeCloseTo((600 * 72) / 200, 3);
    const landscape = await imagesToPdf([{ name: "p.jpg", bytes: photo, mimeType: "image/jpeg" }], { pageSize: "a4-landscape", margin: 24, dpi: 150 });
    const landscapePage = (await openPdf(landscape)).getPage(0);
    expect(landscapePage.getWidth()).toBeCloseTo(841.89, 1);
    expect(landscapePage.getHeight()).toBeCloseTo(595.28, 1);
  });

  it("search mode finds accent-insensitive matches with page numbers", async () => {
    const src = await fixture("simple-5-pages.pdf");
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = pdfjs.getDocument({ data: new Uint8Array(src), useWorkerFetch: false, disableFontFace: true, verbosity: 0, standardFontDataUrl: path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts/") });
    const doc = await task.promise;
    const text = await extractText(doc);
    await task.destroy();
    expect(text.pages).toHaveLength(5);
    expect(text.emptyPages).toHaveLength(0);
    const hits = searchPages(text.pages, "PAGE 4");
    expect(hits.map((h) => h.pageIndex)).toEqual([3]);
    expect(searchPages(text.pages, "introuvable")).toHaveLength(0);
  });
});

describe("audit — limites et fichiers invalides", () => {
  it("rejects empty, oversized and mistyped files before reading them", () => {
    expect(() => validatePdfFileMeta({ name: "x.pdf", size: 0, type: "application/pdf" })).toThrow();
    expect(() => validatePdfFileMeta({ name: "x.pdf", size: 101 * 1024 * 1024, type: "application/pdf" }, { maxFileSizeBytes: 100 * 1024 * 1024 })).toThrow(/100/);
    expect(() => validatePdfFileMeta({ name: "x.png", size: 10, type: "image/png" })).toThrow();
    expect(() => validatePdfFileMeta({ name: "sans-type.pdf", size: 10, type: "" })).not.toThrow();
    expect(() => validateFileBatch(Array.from({ length: 31 }, (_, i) => ({ name: `${i}.pdf`, size: 1, type: "application/pdf" })))).toThrow();
    expect(() => assertPageCount(0)).toThrow(/vide|aucune/i);
    expect(() => assertPageCount(1001)).toThrow();
    expect(looksLikePdf(new Uint8Array([1, 2, 3, 4, 5]))).toBe(false);
    expect(looksLikePdf(new TextEncoder().encode("﻿\n%PDF-1.4"))).toBe(true);
  });

  it("loads refuse non-PDF, empty page trees and encrypted flags with distinct codes", async () => {
    await expect(loadPdfDocument(await fixture("not-a-pdf.txt"))).rejects.toMatchObject({ code: "NOT_PDF" });
    await expect(loadPdfDocument(await fixture("corrupted.pdf"))).rejects.toMatchObject({ code: "CORRUPTED" });
    await expect(loadPdfDocument(await fixture("encrypted-flag.pdf"))).rejects.toMatchObject({ code: "ENCRYPTED" });
    const empty = await PDFDocument.create();
    await expect(loadPdfDocument(await empty.save({ addDefaultPage: false }))).rejects.toMatchObject({ code: "EMPTY" });
  });
});
