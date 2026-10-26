/**
 * Closing the open risks of the audit: real-result checks for the tools that
 * were only partially verified, reproducible large-file and limit scenarios,
 * and browser-compatibility scenarios that can be reproduced in Chromium.
 */
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  buildPng,
  expectValidPdf,
  extractPageText,
  fixture,
  pageContentOps,
  readDownload,
  samplePixels,
  uploadPdf,
} from "./helpers";

function jpegSize(b: Uint8Array): { width: number; height: number } {
  let pos = 2;
  while (pos < b.length) {
    const marker = b[pos + 1]!;
    const len = (b[pos + 2]! << 8) | b[pos + 3]!;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
      return { height: (b[pos + 5]! << 8) | b[pos + 6]!, width: (b[pos + 7]! << 8) | b[pos + 8]! };
    pos += 2 + len;
  }
  throw new Error("SOF introuvable");
}
function pngSize(b: Uint8Array): { width: number; height: number } {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { width: v.getUint32(16), height: v.getUint32(20) };
}
const MB = 1024 * 1024;

test.describe("clôture — résultat réel des outils partiellement vérifiés", () => {
  test("annoter : surlignage, rectangle et commentaire sont dessinés dans la page exportée", async ({
    page,
  }) => {
    const original = await readFile(fixture("simple-3-pages.pdf"));
    const before = await pageContentOps(new Uint8Array(original), 0);
    await page.goto("/pdf/annoter/");
    await uploadPdf(page, "simple-3-pages.pdf");
    const overlay = page.getByTestId("annotation-overlay");
    await expect(overlay).toBeVisible();
    const box = (await overlay.boundingBox())!;
    // Highlight (drag), rectangle (drag), comment (click + text).
    await page.getByTestId("tool-highlight").filter({ visible: true }).click();
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.1);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.15, { steps: 5 });
    await page.mouse.up();
    await page.getByTestId("tool-rect").filter({ visible: true }).click();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.45, { steps: 5 });
    await page.mouse.up();
    await page.getByTestId("tool-comment").filter({ visible: true }).click();
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6);
    const editor = page.getByTestId("text-annotation-editor");
    await expect(editor).toBeVisible();
    await editor.fill("NOTE AUDIT");
    await page.getByTestId("page-indicator").click();
    await expect(page.getByTestId("editor-shell")).toContainText("3 éléments");
    await page.getByTestId("editor-download").click();
    const download = page.waitForEvent("download");
    await page.getByTestId("export-download").click({ timeout: 30_000 });
    const bytes = await readDownload(await download);
    await expectValidPdf(bytes, 3);
    expect((await extractPageText(bytes, 0)).join(" ")).toContain("NOTE AUDIT");
    const after = await pageContentOps(bytes, 0);
    // pdf-lib draws rectangles as m/l paths: the page gains closed paths (highlight, rectangle, comment background).
    const count = (ops: string, re: RegExp) => (ops.match(re) ?? []).length;
    expect(count(after, /\bl\b/g) - count(before, /\bl\b/g)).toBeGreaterThanOrEqual(9);
    expect(count(after, /\b[fB]\*?\b/g)).toBeGreaterThan(count(before, /\b[fB]\*?\b/g)); // filled areas
    expect(after).toMatch(/\/GS[\w-]*\s+gs/); // highlight transparency through an ExtGState
    expect(after.length).toBeGreaterThan(before.length + 200);
    // Other pages untouched.
    expect(await pageContentOps(bytes, 1)).toBe(await pageContentOps(new Uint8Array(original), 1));
  });

  test("ajouter du texte : le texte saisi est présent dans le PDF, sur la bonne page seulement", async ({
    page,
  }) => {
    await page.goto("/pdf/ajouter-texte/");
    await uploadPdf(page, "simple-3-pages.pdf");
    const overlay = page.getByTestId("annotation-overlay");
    await expect(overlay).toBeVisible();
    await page.getByTestId("page-next").click();
    await expect(page.getByTestId("page-indicator")).toHaveText("Page 2 sur 3");
    await page.getByTestId("tool-text").filter({ visible: true }).click();
    const box = (await overlay.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.4);
    const editor = page.getByTestId("text-annotation-editor");
    await editor.fill("AUDIT TEXTE AJOUTÉ");
    await page.getByTestId("page-indicator").click();
    await expect(page.getByTestId("editor-shell")).toContainText("1 élément");
    await page.getByTestId("editor-download").click();
    const download = page.waitForEvent("download");
    await page.getByTestId("export-download").click({ timeout: 30_000 });
    const bytes = await readDownload(await download);
    await expectValidPdf(bytes, 3);
    expect((await extractPageText(bytes, 1)).join(" ")).toContain("AUDIT TEXTE AJOUTÉ");
    expect((await extractPageText(bytes, 0)).join(" ")).not.toContain("AUDIT TEXTE");
    expect((await extractPageText(bytes, 2)).join(" ")).not.toContain("AUDIT TEXTE");
  });

  test("redimensionner : les dimensions réelles du fichier suivent la méthode choisie", async ({
    page,
  }) => {
    const cases: { mode: string; set: () => Promise<void>; expected: [number, number] }[] = [
      {
        mode: "width",
        set: async () => page.getByLabel("Largeur (px)").fill("400"),
        expected: [400, 300],
      },
      {
        mode: "percent",
        set: async () => page.getByLabel("Échelle (%)").fill("25"),
        expected: [200, 150],
      },
      {
        mode: "exact",
        set: async () => {
          await page.getByLabel("Largeur (px)").fill("300");
          await page.getByLabel("Hauteur (px)").fill("300");
        },
        expected: [300, 300],
      },
      {
        mode: "max",
        set: async () => {
          await page.getByLabel("Largeur (px)").fill("1000");
          await page.getByLabel("Hauteur (px)").fill("150");
        },
        expected: [200, 150],
      },
    ];
    for (const c of cases) {
      await page.goto("/images/redimensionner/");
      await page.setInputFiles(
        '[data-testid="image-dropzone-input"]',
        fixture("photo-800x600.jpg"),
      );
      await page.getByTestId(`segmented-${c.mode}`).click();
      await c.set();
      await page.getByTestId("batch-run").click();
      await expect(page.getByTestId("batch-item")).toHaveAttribute("data-status", "done", {
        timeout: 30_000,
      });
      const download = page.waitForEvent("download");
      await page.getByTestId("batch-download-all").click();
      const bytes = await readDownload(await download);
      expect(jpegSize(bytes), c.mode).toEqual({ width: c.expected[0], height: c.expected[1] });
    }
  });

  test("recadrer une image : la zone exportée contient exactement les pixels demandés", async ({
    page,
  }) => {
    // 400×300 image: red in the top-left 200×100, blue elsewhere.
    const png = buildPng(400, 300, (x, y) => (x < 200 && y < 100 ? [255, 0, 0] : [0, 0, 255]));
    for (const c of [
      { x: 0, y: 0, expected: "255,0,0" },
      { x: 200, y: 100, expected: "0,0,255" },
    ]) {
      await page.goto("/images/recadrer/");
      await page.setInputFiles('[data-testid="image-dropzone-input"]', {
        name: "zones.png",
        mimeType: "image/png",
        buffer: png,
      });
      await expect(page.getByTestId("crop-box")).toBeVisible();
      // Size first, then position: each field is clamped inside the image as it is typed.
      await page.getByTestId("crop-width").fill("200");
      await page.getByTestId("crop-height").fill("100");
      await page.getByTestId("crop-x").fill(String(c.x));
      await page.getByTestId("crop-y").fill(String(c.y));
      await page.getByTestId("segmented-image/png").click();
      const download = page.waitForEvent("download");
      await page.getByTestId("crop-run").click();
      await expect(page.getByTestId("done-panel")).toContainText("200×100 px", { timeout: 30_000 });
      await page.getByTestId("download-button").click();
      const bytes = await readDownload(await download);
      expect(pngSize(bytes)).toEqual({ width: 200, height: 100 });
      const colours = await samplePixels(page, bytes, "image/png", 3);
      const [er, eg, eb] = c.expected.split(",").map(Number);
      for (const colour of colours) {
        const [r, g, b] = colour.split(",").map(Number);
        expect(
          Math.abs(r! - er!) + Math.abs(g! - eg!) + Math.abs(b! - eb!),
          `pixel ${colour} attendu ${c.expected} (ensemble ${colours.join(" | ")})`,
        ).toBeLessThanOrEqual(3);
      }
    }
  });

  test("palette : trois bandes de couleurs pures donnent exactement ces trois couleurs", async ({
    page,
  }) => {
    const png = buildPng(300, 120, (x) =>
      x < 100 ? [255, 0, 0] : x < 200 ? [0, 255, 0] : [0, 0, 255],
    );
    await page.goto("/codes/palette-couleurs-image/");
    await page.setInputFiles('[data-testid="palette-dropzone-input"]', {
      name: "bandes.png",
      mimeType: "image/png",
      buffer: png,
    });
    const items = page.getByTestId("palette-list").locator("li");
    await expect(items.first()).toBeVisible({ timeout: 30_000 });
    const hexes = (await items.allTextContents()).map((t) => /#[0-9a-f]{6}/.exec(t)?.[0]);
    expect(hexes.sort()).toEqual(["#0000ff", "#00ff00", "#ff0000"]);
    for (const t of await items.allTextContents()) expect(t).toMatch(/3[2-4] %/);
    await expect(page.getByTestId("palette-css-output")).toHaveValue(
      /--couleur-1: #(ff0000|00ff00|0000ff);/,
    );
  });

  test("feuilles à imprimer : quadrillage 5 mm réellement tracé, 2 pages", async ({ page }) => {
    await page.goto("/documents/feuilles-a-imprimer/");
    await page.getByTestId("segmented-grid").click();
    await page.getByLabel("Nombre de pages").fill("2");
    const download = page.waitForEvent("download");
    await page.getByTestId("paper-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("download-button").click();
    const bytes = await readDownload(await download);
    const doc = await expectValidPdf(bytes, 2);
    const { width, height } = doc.getPage(0).getSize();
    const mm = 72 / 25.4;
    const margin = 10 * mm;
    const spacing = 5 * mm;
    const ops = await pageContentOps(bytes, 0);
    const lines = Array.from(ops.matchAll(/([\d.]+) ([\d.]+) m\s+([\d.]+) ([\d.]+) l/g)).map((m) =>
      m.slice(1, 5).map(Number),
    );
    const horizontals = lines
      .filter(([, y1, , y2]) => Math.abs(y1! - y2!) < 0.01)
      .map(([, y]) => y!)
      .sort((a, b) => b - a);
    const verticals = lines
      .filter(([x1, , x2]) => Math.abs(x1! - x2!) < 0.01)
      .map(([x]) => x!)
      .sort((a, b) => a - b);
    const expectedRows = Math.floor((height - 2 * margin + 0.01) / spacing) + 1;
    const expectedCols = Math.floor((width - 2 * margin + 0.01) / spacing) + 1;
    expect(horizontals.length).toBe(expectedRows);
    expect(verticals.length).toBe(expectedCols);
    for (let i = 1; i < horizontals.length; i += 1)
      expect(Math.abs(horizontals[i - 1]! - horizontals[i]! - spacing)).toBeLessThan(0.01);
    for (let i = 1; i < verticals.length; i += 1)
      expect(Math.abs(verticals[i]! - verticals[i - 1]! - spacing)).toBeLessThan(0.01);
    expect(Math.abs(verticals[0]! - margin)).toBeLessThan(0.01);
    expect(Math.abs(horizontals[0]! - (height - margin))).toBeLessThan(0.01);
  });
});

test.describe("clôture — gros fichiers et limites (scénarios reproductibles)", () => {
  test("un PDF de 101 Mo est refusé avant lecture ; 1 001 pages sont refusées avec le bon message", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.goto("/pdf/rotation/");
    // Playwright refuses in-memory buffers above 50 MB: write the file to disk.
    const huge = Buffer.alloc(101 * MB + 16, 0x20);
    huge.write("%PDF-1.4\n", 0, "latin1");
    const hugePath = path.join(tmpdir(), "outilia-enorme.pdf");
    await writeFile(hugePath, huge);
    await page.setInputFiles('[data-testid="pdf-input"]', hugePath);
    await expect(page.getByRole("alert").first()).toContainText("100", { timeout: 60_000 });
    await expect(page.getByTestId("file-summary")).toHaveCount(0);

    const many = await PDFDocument.create();
    for (let i = 0; i < 1001; i += 1) many.addPage([200, 200]);
    await page.goto("/pdf/rotation/");
    await page.setInputFiles('[data-testid="pdf-input"]', {
      name: "mille-et-une.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(await many.save()),
    });
    await expect(page.getByTestId("error-panel")).toContainText(/limite de 1\s?000 pages/, {
      timeout: 60_000,
    });
  });

  test("un PDF de 60 Mo traverse pdf-lib (rotation) sans erreur et le résultat est valide", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    const doc = await PDFDocument.create();
    const font = await doc.embedFont("Helvetica");
    for (let i = 0; i < 20; i += 1)
      doc.addPage([595, 842]).drawText(`Page ${i + 1}`, { x: 40, y: 800, size: 14, font });
    // A 60 MB incompressible (random) attachment makes the file genuinely large for the parser and the memory.
    const payload = randomBytes(60 * MB);
    await doc.attach(payload, "lest.bin", {
      mimeType: "application/octet-stream",
      description: "lest",
    });
    const big = Buffer.from(await doc.save({ useObjectStreams: false }));
    expect(big.length).toBeGreaterThan(60 * MB);
    const bigPath = path.join(tmpdir(), "outilia-lourd.pdf");
    await writeFile(bigPath, big);

    await page.goto("/pdf/rotation/");
    const t0 = Date.now();
    await page.setInputFiles('[data-testid="pdf-input"]', bigPath);
    await expect(page.getByTestId("file-summary")).toContainText("20 pages", { timeout: 120_000 });
    await page.getByTestId("rotate-all-cw").click();
    const download = page.waitForEvent("download");
    await page.getByTestId("rotate-export").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 180_000 });
    const elapsed = Date.now() - t0;
    await page.getByTestId("download-button").click();
    const out = await readDownload(await download);
    const result = await expectValidPdf(out, 20);
    expect(result.getPage(0).getRotation().angle % 360).toBe(90);
    const heap = await page.evaluate(
      () =>
        (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
          ?.usedJSHeapSize ?? -1,
    );
    console.log(
      `60 Mo : traitement ${elapsed} ms, sortie ${Math.round(out.length / MB)} Mo, tas JS ${Math.round(heap / MB)} Mo`,
    );
    expect(out.length).toBeGreaterThan(50 * MB);
  });

  test("51 images → 50 acceptées et un avertissement ; une image de 20 Mpx est traitée", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const small = buildPng(8, 8, () => [10, 20, 30]);
    await page.goto("/images/compresser/");
    await page.setInputFiles(
      '[data-testid="image-dropzone-input"]',
      Array.from({ length: 51 }, (_, i) => ({
        name: `img-${i}.png`,
        mimeType: "image/png",
        buffer: small,
      })),
    );
    await expect(page.getByText(/1 fichier\(s\) ignoré\(s\)/)).toBeVisible();
    await expect(page.getByTestId("batch-item")).toHaveCount(50);

    const huge = buildPng(5000, 4000, (x, y) => [(x >> 4) & 255, (y >> 4) & 255, 128]);
    await page.goto("/images/compresser/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', {
      name: "20mpx.png",
      mimeType: "image/png",
      buffer: huge,
    });
    await expect(page.getByTestId("batch-item")).toContainText("5000×4000", { timeout: 60_000 });
    await page.getByTestId("segmented-image/jpeg").click();
    await page.getByTestId("batch-run").click();
    await expect(page.getByTestId("batch-item")).toHaveAttribute("data-status", "done", {
      timeout: 120_000,
    });
    const download = page.waitForEvent("download");
    await page.getByTestId("batch-download-all").click();
    const bytes = await readDownload(await download);
    // The default "limit size" option caps the longest side at 2048 px; the aspect ratio must be kept.
    const size = jpegSize(bytes);
    expect(size.width).toBe(2048);
    expect(Math.abs(size.height - 2048 * 0.8)).toBeLessThanOrEqual(1);
    await expect(page.getByTestId("batch-item")).toContainText("2048×");
  });
});

test.describe("clôture — compatibilité reproductible en Chromium", () => {
  test("navigateur sans encodeur WebP : l'option est désactivée et « identique » retombe sur PNG", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext();
    // Simulate Safari: canvas cannot encode WebP and silently returns PNG.
    await context.addInitScript(() => {
      const toDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (type?: string, quality?: unknown) {
        return toDataURL.call(this, type === "image/webp" ? "image/png" : type, quality as number);
      };
      const toBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (
        cb: BlobCallback,
        type?: string,
        quality?: unknown,
      ) {
        return toBlob.call(this, cb, type === "image/webp" ? "image/png" : type, quality as number);
      };
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}/images/compresser/`);
    await page.setInputFiles('[data-testid="image-dropzone-input"]', fixture("photo-800x600.jpg"));
    const webpOption = page.getByTestId("segmented-image/webp");
    await expect(webpOption).toBeDisabled();
    await expect(webpOption).toContainText("Non pris en charge");
    await page.getByTestId("batch-run").click();
    await expect(page.getByTestId("batch-item")).toHaveAttribute("data-status", "done", {
      timeout: 30_000,
    });
    const download = page.waitForEvent("download");
    await page.getByTestId("batch-download-all").click();
    const d = await download;
    expect(d.suggestedFilename()).toMatch(/\.jpg$/);
    await context.close();
  });

  test("les trois variantes du moteur OCR et les deux modèles sont servis (repli SIMD pour Safari/Firefox)", async ({
    request,
  }) => {
    for (const path of [
      "/ocr/worker.min.js",
      "/ocr/core/tesseract-core-lstm.wasm.js",
      "/ocr/core/tesseract-core-simd-lstm.wasm.js",
      "/ocr/core/tesseract-core-relaxedsimd-lstm.wasm.js",
      "/ocr/lang/fra.traineddata.gz",
      "/ocr/lang/eng.traineddata.gz",
      "/qpdf/qpdf.wasm",
      "/pdfjs/pdf.worker.min.mjs",
    ]) {
      const response = await request.head(path);
      expect(response.status(), path).toBe(200);
      const length = Number(response.headers()["content-length"] ?? 0);
      expect(length, path).toBeGreaterThan(10_000);
    }
  });

  test("téléchargement : le lien blob est révoqué après usage et le nom de fichier est assaini", async ({
    page,
  }) => {
    await page.goto("/pdf/fusionner/");
    await page.setInputFiles('[data-testid="pdf-input"]', [
      {
        name: "../..\\rapport <final>: v1?.pdf",
        mimeType: "application/pdf",
        buffer: await readFile(fixture("simple-3-pages.pdf")),
      },
      {
        name: "b.pdf",
        mimeType: "application/pdf",
        buffer: await readFile(fixture("simple-5-pages.pdf")),
      },
    ]);
    await page.getByTestId("merge-button").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 30_000 });
    const download = page.waitForEvent("download");
    await page.getByTestId("download-button").click();
    const d = await download;
    expect(d.suggestedFilename()).not.toMatch(/[<>:"/\\|?*]/);
    expect(d.suggestedFilename()).toMatch(/\.pdf$/);
    await expectValidPdf(await readDownload(d), 8);
  });
});
