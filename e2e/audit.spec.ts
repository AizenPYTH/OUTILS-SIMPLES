/**
 * Audit regression suite: restricted modes of shared implementations, tools
 * that had no end-to-end coverage, and result checks on downloads for tools
 * whose tests only looked at the interface.
 */
import { expect, test } from "@playwright/test";
import { unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import exifr from "exifr";
import { readFile } from "node:fs/promises";
import { expectValidPdf, extractPageText, fixture, readDownload, uploadPdf } from "./helpers";

function magic(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  return sig.every((b, i) => bytes[offset + i] === b);
}
const isJpeg = (b: Uint8Array) => magic(b, [0xff, 0xd8, 0xff]);
const isPng = (b: Uint8Array) => magic(b, [0x89, 0x50, 0x4e, 0x47]);
const isWebp = (b: Uint8Array) => magic(b, [0x52, 0x49, 0x46, 0x46]) && magic(b, [0x57, 0x45, 0x42, 0x50], 8);

/** PNG IHDR dimensions. */
function pngSize(b: Uint8Array): { width: number; height: number } {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** JPEG SOF dimensions. */
function jpegSize(b: Uint8Array): { width: number; height: number } {
  let pos = 2;
  while (pos < b.length) {
    const marker = b[pos + 1]!;
    const len = (b[pos + 2]! << 8) | b[pos + 3]!;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: (b[pos + 5]! << 8) | b[pos + 6]!, width: (b[pos + 7]! << 8) | b[pos + 8]! };
    }
    pos += 2 + len;
  }
  throw new Error("SOF introuvable");
}

test.describe("audit — implémentations partagées et modes restreints", () => {
  test("annotation workspace exposes only the tools of each mode", async ({ page, isMobile }) => {
    test.skip(isMobile, "toolbar layout checked on desktop");
    const expectations: Record<string, { present: string[]; absent: string[] }> = {
      "/pdf/ajouter-texte/": { present: ["tool-select", "tool-text"], absent: ["tool-pen", "tool-signature", "tool-highlight", "tool-image"] },
      "/pdf/signer/": { present: ["tool-signature", "tool-text"], absent: ["tool-pen", "tool-highlight", "tool-image"] },
      "/pdf/annoter/": { present: ["tool-highlight", "tool-pen", "tool-comment"], absent: ["tool-signature", "tool-image", "tool-text"] },
      "/pdf/modifier/": { present: ["tool-text", "tool-pen", "tool-image", "tool-signature"], absent: ["tool-comment", "tool-underline"] },
    };
    for (const [path, rule] of Object.entries(expectations)) {
      await page.goto(path);
      await uploadPdf(page, "simple-3-pages.pdf");
      const toolbar = page.getByRole("toolbar", { name: "Outils d'édition" }).first();
      await expect(toolbar).toBeVisible({ timeout: 30_000 });
      for (const id of rule.present) await expect(toolbar.getByTestId(id), `${path} should offer ${id}`).toBeVisible();
      for (const id of rule.absent) await expect(toolbar.getByTestId(id), `${path} must not offer ${id}`).toHaveCount(0);
    }
  });

  test("pdf-search route starts in search mode and finds a term", async ({ page }) => {
    await page.goto("/pdf/rechercher-dans-un-pdf/");
    await uploadPdf(page, "simple-5-pages.pdf");
    await expect(page.getByTestId("pdf-search")).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Rechercher un mot ou une expression").fill("page 2");
    await expect(page.getByTestId("pdf-search")).toContainText("1 occurrence(s) sur 1 page(s)");
    await page.getByLabel("Rechercher un mot ou une expression").fill("zzzz");
    await expect(page.getByTestId("pdf-search")).toContainText("Aucune occurrence");
  });

  test("pdf-check reports a clean file, a damaged file and an encrypted file honestly", async ({ page }) => {
    await page.goto("/pdf/verifier-reparer/");
    await uploadPdf(page, "simple-3-pages.pdf");
    await expect(page.getByTestId("check-report")).toContainText("Aucune erreur de structure détectée", { timeout: 60_000 });
    await expect(page.getByTestId("check-report")).toContainText("1.7");
    await page.getByRole("button", { name: /autre fichier|changer/i }).first().click();
    await uploadPdf(page, "corrupted.pdf");
    await expect(page.getByTestId("check-report")).toContainText("Problèmes détectés", { timeout: 60_000 });
    await page.getByRole("button", { name: /autre fichier|changer/i }).first().click();
    await uploadPdf(page, "encrypted-flag.pdf");
    await expect(page.getByTestId("check-report")).toContainText("Document chiffré", { timeout: 60_000 });
    await expect(page.getByTestId("check-report")).toContainText("ChiffrementOui");
    await expect(page.getByTestId("check-report")).not.toContainText("copie réparée");
    await expect(page.getByTestId("check-report")).not.toContainText("trop endommagée");
  });

  test("text case and CSV → JSON produce the expected output", async ({ page }) => {
    await page.goto("/texte/majuscules-minuscules/");
    await page.getByTestId("case-input-input").fill("bonjour le monde. ça va ?");
    await page.getByTestId("case-sentence").click();
    await expect(page.getByTestId("case-output-output")).toHaveValue("Bonjour le monde. Ça va ?");
    await page.getByTestId("case-kebab").click();
    await expect(page.getByTestId("case-output-output")).toHaveValue("bonjour-le-monde-ca-va");
    await page.goto("/developpeur/csv-vers-json/");
    const input = page.locator("textarea").first();
    await input.fill("nom;age;actif\nAna;31;true\n\"Dupont, Jean\";45;false");
    const output = page.locator("textarea").nth(1);
    await expect(output).toHaveValue(/"nom": "Ana"/);
    await expect(output).toHaveValue(/"age": 31/);
    await expect(output).toHaveValue(/"Dupont, Jean"/);
  });
});

test.describe("audit — fidélité des fichiers produits", () => {
  test("pdf to images: PNG at the requested dpi, one file per page", async ({ page }) => {
    await page.goto("/pdf/convertir-en-images/");
    await uploadPdf(page, "simple-3-pages.pdf");
    await page.getByTestId("segmented-image/png").click();
    await page.getByTestId("segmented-300").click();
    const download = page.waitForEvent("download");
    await page.getByTestId("pdf-to-images-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("download-button").click();
    const zip = unzipSync(await readDownload(await download));
    const names = Object.keys(zip).sort();
    expect(names).toHaveLength(3);
    expect(names.every((n) => n.endsWith(".png"))).toBe(true);
    const first = zip[names[0]!]!;
    expect(isPng(first)).toBe(true);
    // A4 at 300 dpi → 2480 × 3508 px (±2 for rounding).
    const size = pngSize(first);
    expect(Math.abs(size.width - 2480)).toBeLessThanOrEqual(2);
    expect(Math.abs(size.height - 3508)).toBeLessThanOrEqual(2);
  });

  test("image compress to WebP produces a smaller WebP file", async ({ page }) => {
    const original = await readFile(fixture("photo-800x600.jpg"));
    await page.goto("/images/compresser/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', fixture("photo-800x600.jpg"));
    await page.getByTestId("segmented-image/webp").click();
    await page.getByTestId("batch-run").click();
    await expect(page.getByTestId("batch-item")).toHaveAttribute("data-status", "done", { timeout: 30_000 });
    const download = page.waitForEvent("download");
    await page.getByTestId("batch-download-all").click();
    const bytes = await readDownload(await download);
    expect(isWebp(bytes)).toBe(true);
    expect(bytes.length).toBeLessThan(original.length);
  });

  test("image convert to JPG and rotate 90° give the right format and dimensions", async ({ page }) => {
    await page.goto("/images/convertir/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', fixture("logo-alpha.png"));
    await page.getByTestId("segmented-image/jpeg").click();
    await page.getByTestId("batch-run").click();
    await expect(page.getByTestId("batch-item")).toHaveAttribute("data-status", "done", { timeout: 30_000 });
    let download = page.waitForEvent("download");
    await page.getByTestId("batch-download-all").click();
    const jpg = await readDownload(await download);
    expect(isJpeg(jpg)).toBe(true);

    await page.goto("/images/pivoter-retourner/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', fixture("photo-800x600.jpg"));
    await page.getByTestId("batch-run").click();
    await expect(page.getByTestId("batch-item")).toHaveAttribute("data-status", "done", { timeout: 30_000 });
    download = page.waitForEvent("download");
    await page.getByTestId("batch-download-all").click();
    const rotated = await readDownload(await download);
    expect(isJpeg(rotated)).toBe(true);
    expect(jpegSize(rotated)).toEqual({ width: 600, height: 800 });
  });

  test("EXIF tool really removes an injected EXIF block", async ({ page }) => {
    const photo = await readFile(fixture("photo-800x600.jpg"));
    // Minimal EXIF APP1 segment with Make = "AUDIT".
    const value = Buffer.from("AUDIT\0");
    const tiff = Buffer.alloc(8 + 2 + 12 + 4 + value.length);
    tiff.set([0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0], 0);
    tiff.set([1, 0], 8);
    tiff.set([0x0f, 0x01, 2, 0], 10);
    tiff.writeUInt32LE(value.length, 14);
    tiff.writeUInt32LE(26, 18);
    tiff.set(value, 26);
    const header = Buffer.from("Exif\0\0");
    const len = 2 + header.length + tiff.length;
    const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, len >> 8, len & 0xff]), header, tiff]);
    const withExif = Buffer.concat([photo.subarray(0, 2), app1, photo.subarray(2)]);
    expect(((await exifr.parse(withExif, { tiff: true })) as { Make?: string })?.Make).toBe("AUDIT");

    await page.goto("/images/metadonnees-exif/");
    await page.setInputFiles('[data-testid="exif-dropzone-input"]', { name: "avec-exif.jpg", mimeType: "image/jpeg", buffer: withExif });
    await expect(page.getByTestId("exif-table")).toContainText("AUDIT");
    await expect(page.getByTestId("exif-table")).toContainText("sensible");
    await page.getByTestId("exif-strip").click();
    await expect(page.getByTestId("exif-cleaned")).toBeVisible({ timeout: 30_000 });
    const download = page.waitForEvent("download");
    await page.getByTestId("exif-download").click();
    const cleaned = await readDownload(await download);
    expect(isJpeg(cleaned)).toBe(true);
    expect(await exifr.parse(cleaned, { tiff: true })).toBeUndefined();
    expect(jpegSize(cleaned)).toEqual({ width: 800, height: 600 });
  });

  test("watermark changes the pixels but keeps the size; perspective output is a straightened JPG", async ({ page }) => {
    await page.goto("/images/filigrane/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', fixture("logo-alpha.png"));
    await page.getByTestId("wm-text").fill("AUDIT");
    await page.getByTestId("segmented-image/png").click();
    await page.getByTestId("batch-run").click();
    await expect(page.getByTestId("batch-item")).toHaveAttribute("data-status", "done", { timeout: 30_000 });
    let download = page.waitForEvent("download");
    await page.getByTestId("batch-download-all").click();
    const marked = await readDownload(await download);
    const original = new Uint8Array(await readFile(fixture("logo-alpha.png")));
    expect(isPng(marked)).toBe(true);
    expect(pngSize(marked)).toEqual(pngSize(original));
    expect(Buffer.compare(Buffer.from(marked), Buffer.from(original))).not.toBe(0);

    await page.goto("/numerisation/corriger-un-document-photographie/");
    await page.setInputFiles('[data-testid="perspective-dropzone-input"]', fixture("sheet-perspective.jpg"));
    await expect(page.getByTestId("quad-editor")).toBeVisible();
    download = page.waitForEvent("download");
    await page.getByTestId("perspective-run").click();
    await expect(page.getByTestId("perspective-result")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("download-button").click();
    const straightened = await readDownload(await download);
    expect(isJpeg(straightened)).toBe(true);
    const size = jpegSize(straightened);
    const source = jpegSize(new Uint8Array(await readFile(fixture("sheet-perspective.jpg"))));
    // The detected sheet is smaller than the photo and roughly portrait/rectangular.
    expect(size.width).toBeGreaterThan(100);
    expect(size.height).toBeGreaterThan(100);
    expect(size.width * size.height).toBeLessThan(source.width * source.height);
  });

  test("scanner respects the chosen filter: black and white output has only two tones", async ({ page }) => {
    await page.goto("/numerisation/scanner-un-document/");
    await page.setInputFiles('[data-testid="scan-dropzone-input"]', fixture("text-french.png"));
    await expect(page.getByTestId("scan-thumb")).toHaveCount(1);
    await page.getByTestId("segmented-bw").click();
    await page.getByTestId("segmented-png").click();
    const download = page.waitForEvent("download");
    await page.getByTestId("scan-export").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 90_000 });
    await page.getByTestId("download-button").click();
    const png = await readDownload(await download);
    expect(isPng(png)).toBe(true);
    // Decode in the page to inspect pixel values.
    const tones = await page.evaluate(async (b64) => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const values = new Set<number>();
      for (let i = 0; i < data.length; i += 4 * 97) values.add(data[i]!);
      return Array.from(values);
    }, Buffer.from(png).toString("base64"));
    expect(tones.length).toBeLessThanOrEqual(2);
    expect(tones).toContain(255);
  });
});

test.describe("audit — OCR sur PDF scanné et protection AES-128", () => {
  test("a scanned PDF (image only) is OCRed page by page and exported as a searchable PDF", async ({ page }) => {
    test.setTimeout(300_000);
    // Build a "scan": one page containing only the French text image.
    const doc = await PDFDocument.create();
    const png = await doc.embedPng(await readFile(fixture("text-french.png")));
    const pageA4 = doc.addPage([595.28, 841.89]);
    const scale = Math.min(500 / png.width, 700 / png.height);
    pageA4.drawImage(png, { x: 40, y: 841.89 - 60 - png.height * scale, width: png.width * scale, height: png.height * scale });
    const scanned = Buffer.from(await doc.save());
    expect(await extractPageText(new Uint8Array(scanned), 0)).toHaveLength(0);

    await page.goto("/numerisation/ocr/");
    await page.setInputFiles('[data-testid="ocr-dropzone-input"]', { name: "scan.pdf", mimeType: "application/pdf", buffer: scanned });
    await page.getByTestId("ocr-run").click();
    await expect(page.getByTestId("ocr-page-text")).toHaveValue(/Facture/, { timeout: 240_000 });
    await page.getByRole("tab", { name: "PDF recherchable" }).click();
    const download = page.waitForEvent("download");
    await page.getByTestId("ocr-export-pdf").click();
    const bytes = await readDownload(await download);
    await expectValidPdf(bytes, 1);
    const text = (await extractPageText(bytes, 0)).join(" ");
    expect(text).toContain("Facture");
    expect(text).toMatch(/2026/);
  });

  test("AES-128 protection produces an encrypted file that pdf-lib cannot open", async ({ page }) => {
    await page.goto("/pdf/proteger-par-mot-de-passe/");
    await uploadPdf(page, "simple-3-pages.pdf");
    await page.getByTestId("pw-user").fill("cle128");
    await page.getByTestId("segmented-aes-128").click();
    await page.getByLabel("Autoriser l'impression").click();
    const download = page.waitForEvent("download");
    await page.getByTestId("protect-run").click();
    await expect(page.getByTestId("done-panel")).toContainText("AES-128", { timeout: 90_000 });
    await page.getByTestId("download-button").click();
    const locked = await readDownload(await download);
    const latin1 = Buffer.from(locked).toString("latin1");
    expect(latin1).toContain("/Encrypt");
    expect(latin1).toMatch(/\/AESV2|\/V 4/);
    await expect(PDFDocument.load(locked)).rejects.toThrow();
  });
});

test.describe("audit — fichiers invalides et limites", () => {
  test("empty, encrypted and non-PDF uploads are refused with a clear message", async ({ page }) => {
    await page.goto("/pdf/diviser/");
    await page.setInputFiles('[data-testid="pdf-input"]', { name: "vide.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(0) });
    await expect(page.getByRole("alert").first()).toContainText("PDF");
    await page.goto("/pdf/fusionner/");
    await uploadPdf(page, "encrypted-flag.pdf", "simple-3-pages.pdf");
    await expect(page.getByText(/mot de passe/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("merge-file-row")).toHaveCount(1);
    await page.goto("/images/compresser/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', { name: "vide.png", mimeType: "image/png", buffer: Buffer.alloc(0) });
    await expect(page.getByRole("alert").first()).toContainText("fichier vide");
    await page.goto("/numerisation/ocr/");
    await page.setInputFiles('[data-testid="ocr-dropzone-input"]', fixture("not-a-pdf.txt"));
    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("a PDF declared as PDF but with a wrong body is caught after reading", async ({ page }) => {
    await page.goto("/pdf/rotation/");
    await page.setInputFiles('[data-testid="pdf-input"]', { name: "faux.pdf", mimeType: "application/pdf", buffer: Buffer.from("ceci n'est pas un pdf") });
    await expect(page.getByTestId("error-panel")).toContainText("PDF", { timeout: 30_000 });
  });

  test("the redaction output of a rotated page keeps its orientation", async ({ page }) => {
    await page.goto("/pdf/caviarder/");
    await uploadPdf(page, "rotated-2nd-page.pdf");
    await expect(page.getByTestId("redact-page")).toHaveCount(3);
    const surface = page.getByTestId("redact-surface").nth(1);
    // Pages render lazily when scrolled into view; the preview also shrinks to the container once measured.
    await surface.scrollIntoViewIfNeeded();
    await expect(surface.locator("canvas")).toHaveAttribute("style", /width/, { timeout: 30_000 });
    const box = (await surface.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y + 40, { steps: 4 });
    await page.mouse.up();
    await expect(page.getByTestId("redact-rect")).toHaveCount(1);
    const download = page.waitForEvent("download");
    await page.getByTestId("redact-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 90_000 });
    await page.getByTestId("download-button").click();
    const bytes = await readDownload(await download);
    const doc = await expectValidPdf(bytes, 3);
    const original = await PDFDocument.load(await readFile(fixture("rotated-2nd-page.pdf")));
    const { width, height } = original.getPage(1).getSize();
    expect(doc.getPage(1).getRotation().angle).toBe(0);
    expect(doc.getPage(1).getSize()).toEqual({ width: height, height: width });
    expect(await extractPageText(bytes, 1)).toHaveLength(0);
  });
});
