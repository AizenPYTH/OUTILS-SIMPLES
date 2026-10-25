import { describe, expect, it } from "vitest";
import { deriveOutputName, sanitizeFilename, stripExtension } from "@/lib/files/filename";
import { formatBytes } from "@/lib/files/format";
import {
  assertPdfBytes,
  detectImageType,
  looksLikePdf,
  validateFileBatch,
  validatePdfFileMeta,
} from "@/lib/files/validation";
import { PdfError } from "@/lib/pdf/errors";
import { fixture } from "../helpers";

describe("sanitizeFilename", () => {
  it("removes path separators and control characters", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("-..-..-etc-passwd".replace(/^-/, "").replace(/^\.+/, "") || "document");
    expect(sanitizeFilename("rapport\u0000final.pdf")).toBe("rapportfinal.pdf");
    expect(sanitizeFilename("a/b\\c:d*e?f\"g<h>i|j")).toBe("a-b-c-d-e-f-g-h-i-j");
  });
  it("falls back for empty or reserved names", () => {
    expect(sanitizeFilename("   ")).toBe("document");
    expect(sanitizeFilename("CON")).toBe("document");
    expect(sanitizeFilename("...")).toBe("document");
  });
  it("truncates very long names", () => {
    expect(sanitizeFilename("a".repeat(500)).length).toBeLessThanOrEqual(120);
  });
});

describe("deriveOutputName", () => {
  it("adds a suffix and keeps the pdf extension", () => {
    expect(deriveOutputName("Contrat 2026.pdf", "signé")).toBe("Contrat 2026-signé.pdf");
    expect(deriveOutputName("dossier", "fusionne")).toBe("dossier-fusionne.pdf");
    expect(stripExtension(".hidden")).toBe(".hidden");
  });
});

describe("formatBytes", () => {
  it("formats in French units", () => {
    expect(formatBytes(512)).toBe("512 o");
    expect(formatBytes(2048)).toBe("2 Ko");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2,5 Mo");
  });
});

describe("validation", () => {
  it("detects PDF magic bytes even after a BOM", async () => {
    expect(looksLikePdf(await fixture("simple-3-pages.pdf"))).toBe(true);
    expect(looksLikePdf(new Uint8Array([0xef, 0xbb, 0xbf, 0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(looksLikePdf(await fixture("not-a-pdf.txt"))).toBe(false);
    expect(() => assertPdfBytes(new Uint8Array([1, 2, 3]))).toThrowError(PdfError);
  });

  it("detects PNG and JPEG signatures", async () => {
    expect(detectImageType(await fixture("signature.png"))).toBe("image/png");
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectImageType(new Uint8Array([0, 0, 0]))).toBeNull();
  });

  it("enforces size and count limits", () => {
    expect(() => validatePdfFileMeta({ name: "a.pdf", size: 0, type: "application/pdf" })).toThrowError(PdfError);
    expect(() => validatePdfFileMeta({ name: "a.pdf", size: 10, type: "application/pdf" }, { maxFileSizeBytes: 5 })).toThrowError(/maximale/);
    expect(() => validatePdfFileMeta({ name: "a.png", size: 10, type: "image/png" })).toThrowError(PdfError);
    // Empty type with .pdf extension is accepted (common on Windows).
    expect(() => validatePdfFileMeta({ name: "a.pdf", size: 10, type: "" })).not.toThrow();
    expect(() => validateFileBatch([{ name: "a", size: 1, type: "" }, { name: "b", size: 1, type: "" }], { maxFileCount: 1 })).toThrowError(PdfError);
    expect(() => validateFileBatch([{ name: "a", size: 10, type: "" }], { maxTotalSizeBytes: 5 })).toThrowError(PdfError);
  });
});
