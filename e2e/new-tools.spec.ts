import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { expectValidPdf, extractPageText, fixture, readDownload, uploadPdf } from "./helpers";

test.describe("catalogue with the extended registry", () => {
  test("catalogue lists several categories and search understands intents", async ({ page }) => {
    await page.goto("/outils/");
    await expect(page.getByTestId("category-chip-images")).toBeVisible();
    await expect(page.getByTestId("category-chip-numerisation")).toBeVisible();
    const search = page.getByTestId("catalog-search");
    await search.fill("rendre un pdf recherchable");
    await expect(page.getByTestId("tool-grid").first()).toContainText("OCR");
    await search.fill("scanner une feuille");
    await expect(page.getByTestId("tool-grid").first()).toContainText("Scanner un document");
    await search.fill("png en jpg");
    await expect(page.getByTestId("tool-grid").first()).toContainText("Convertir une image");
  });
});

test.describe("PDF extras", () => {
  test("extract text and search", async ({ page }) => {
    await page.goto("/pdf/extraire-le-texte/");
    await uploadPdf(page, "simple-5-pages.pdf");
    await expect(page.getByTestId("pdf-text-output")).toHaveValue(/Page 3 \/ 5/, {
      timeout: 30_000,
    });
    await page.getByLabel("Rechercher un mot ou une expression").fill("page 4");
    await expect(page.getByTestId("pdf-search")).toContainText("1 occurrence(s)");
  });

  test("pdf to images renders every page", async ({ page }) => {
    await page.goto("/pdf/convertir-en-images/");
    await uploadPdf(page, "simple-3-pages.pdf");
    await page.getByTestId("segmented-image/png").click();
    await page.getByTestId("pdf-to-images-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("pdf-images-results").locator("li")).toHaveCount(3);
    const download = page.waitForEvent("download");
    await page.getByTestId("download-button").click();
    expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  });

  test("images to pdf builds a multipage document", async ({ page }) => {
    await page.goto("/pdf/images-en-pdf/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', [
      fixture("photo-800x600.jpg"),
      fixture("logo-alpha.png"),
    ]);
    await expect(page.getByTestId("images-item")).toHaveCount(2);
    const download = page.waitForEvent("download");
    await page.getByTestId("images-to-pdf-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("download-button").click();
    const doc = await expectValidPdf(await readDownload(await download), 2);
    expect(doc.getPage(0).getSize().width).toBeCloseTo(595.28, 0);
  });

  test("page numbering adds a footer", async ({ page }) => {
    await page.goto("/pdf/numeroter-les-pages/");
    await uploadPdf(page, "simple-3-pages.pdf");
    const download = page.waitForEvent("download");
    await page.getByTestId("stamp-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("download-button").click();
    const bytes = await readDownload(await download);
    expect((await extractPageText(bytes, 1)).join(" ")).toContain("2 / 3");
  });

  test("crop pages sets the crop box", async ({ page }) => {
    await page.goto("/pdf/recadrer/");
    await uploadPdf(page, "simple-3-pages.pdf");
    await page.getByTestId("crop-top").fill("20");
    const download = page.waitForEvent("download");
    await page.getByTestId("crop-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("download-button").click();
    const doc = await expectValidPdf(await readDownload(await download), 3);
    expect(doc.getPage(0).getCropBox().height).toBeLessThan(841);
  });

  test("protect then unlock with qpdf (WebAssembly)", async ({ page }) => {
    await page.goto("/pdf/proteger-par-mot-de-passe/");
    await uploadPdf(page, "simple-3-pages.pdf");
    await page.getByTestId("pw-user").fill("secret1");
    const download = page.waitForEvent("download");
    await page.getByTestId("protect-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 90_000 });
    await page.getByTestId("download-button").click();
    const locked = await readDownload(await download);
    expect(Buffer.from(locked).toString("latin1")).toContain("/Encrypt");
    await expect(PDFDocument.load(locked)).rejects.toThrow();

    await page.goto("/pdf/deverrouiller/");
    await page.setInputFiles('[data-testid="pdf-input"]', {
      name: "locked.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(locked),
    });
    await page.getByTestId("unlock-pw").fill("wrong");
    await page.getByTestId("unlock-auth").click();
    await page.getByTestId("unlock-run").click();
    await expect(page.getByTestId("error-panel")).toContainText("Mot de passe incorrect", {
      timeout: 90_000,
    });
    await page.getByRole("button", { name: "Réessayer" }).click();
    await page.getByTestId("unlock-pw").fill("secret1");
    const unlockedDownload = page.waitForEvent("download");
    await page.getByTestId("unlock-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 90_000 });
    await page.getByTestId("download-button").click();
    await expectValidPdf(await readDownload(await unlockedDownload), 3);
  });

  test("metadata can be read and stripped", async ({ page }) => {
    await page.goto("/pdf/metadonnees/");
    await uploadPdf(page, "simple-3-pages.pdf");
    await expect(page.getByTestId("metadata-list")).toContainText("Fixture 3 pages");
    const download = page.waitForEvent("download");
    await page.getByTestId("meta-strip").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("download-button").click();
    const doc = await expectValidPdf(await readDownload(await download), 3);
    expect(doc.getTitle()).toBeUndefined();
  });
});

test.describe("images", () => {
  test("compress a batch and download a zip", async ({ page }) => {
    await page.goto("/images/compresser/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', [
      fixture("photo-800x600.jpg"),
      fixture("logo-alpha.png"),
    ]);
    await expect(page.getByTestId("batch-item")).toHaveCount(2);
    await page.getByTestId("segmented-image/webp").click();
    await page.getByTestId("batch-run").click();
    await expect(page.getByTestId("batch-item").nth(1)).toHaveAttribute("data-status", "done", {
      timeout: 30_000,
    });
    await expect(page.getByTestId("batch-summary")).toContainText("→");
    const download = page.waitForEvent("download");
    await page.getByTestId("batch-download-all").click();
    expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  });

  test("resize to a width", async ({ page }) => {
    await page.goto("/images/redimensionner/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', fixture("photo-800x600.jpg"));
    await page.getByLabel("Largeur (px)").fill("400");
    await page.getByTestId("batch-run").click();
    await expect(page.getByTestId("batch-item")).toContainText("400×300 px", { timeout: 30_000 });
    const download = page.waitForEvent("download");
    await page.getByTestId("batch-download-all").click();
    expect((await download).suggestedFilename()).toContain("400x300");
  });

  test("convert png with alpha to jpg flattens transparency", async ({ page }) => {
    await page.goto("/images/convertir/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', fixture("logo-alpha.png"));
    await page.getByTestId("segmented-image/jpeg").click();
    await page.getByTestId("batch-run").click();
    await expect(page.getByTestId("batch-item")).toContainText("transparence aplatie", {
      timeout: 30_000,
    });
    const download = page.waitForEvent("download");
    await page.getByTestId("batch-download-all").click();
    expect((await download).suggestedFilename()).toMatch(/\.jpg$/);
  });

  test("crop an image with the numeric fields", async ({ page }) => {
    await page.goto("/images/recadrer/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', fixture("photo-800x600.jpg"));
    await expect(page.getByTestId("crop-box")).toBeVisible();
    await page.getByTestId("crop-width").fill("200");
    await page.getByTestId("crop-height").fill("100");
    await page.getByTestId("crop-run").click();
    await expect(page.getByTestId("done-panel")).toContainText("200×100 px", { timeout: 30_000 });
  });

  test("rejects a non-image file", async ({ page }) => {
    await page.goto("/images/pivoter-retourner/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', fixture("not-a-pdf.txt"));
    await expect(page.getByRole("alert").first()).toContainText("format non pris en charge");
  });
});

test.describe("scanner and OCR", () => {
  test("scanner builds a PDF from imported photos", async ({ page }) => {
    await page.goto("/numerisation/scanner-un-document/");
    await page.setInputFiles('[data-testid="scan-dropzone-input"]', [
      fixture("sheet-perspective.jpg"),
      fixture("text-french.png"),
    ]);
    await expect(page.getByTestId("scan-thumb")).toHaveCount(2);
    await page.getByTestId("scan-rotate").click();
    await page.getByTestId("segmented-bw").click();
    const download = page.waitForEvent("download");
    await page.getByTestId("scan-export").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 90_000 });
    await page.getByTestId("download-button").click();
    await expectValidPdf(await readDownload(await download), 2);
  });

  test("OCR recognises printed French text and exports a searchable PDF", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/numerisation/ocr/");
    await page.setInputFiles('[data-testid="ocr-dropzone-input"]', fixture("text-french.png"));
    await page.getByTestId("ocr-run").click();
    await expect(page.getByTestId("ocr-page-text")).toHaveValue(/Facture/, { timeout: 180_000 });
    const text = await page.getByTestId("ocr-page-text").inputValue();
    expect(text).toContain("2026");
    expect(text.toLowerCase()).toContain("montant");
    await page.getByRole("tab", { name: "PDF recherchable" }).click();
    const download = page.waitForEvent("download");
    await page.getByTestId("ocr-export-pdf").click();
    const bytes = await readDownload(await download);
    await expectValidPdf(bytes, 1);
    expect((await extractPageText(bytes, 0)).join(" ")).toContain("Facture");
  });
});

test.describe("text, QR and developer tools", () => {
  test("word counter and cleaner work without any upload", async ({ page }) => {
    await page.goto("/texte/compteur-de-mots/");
    await page.getByTestId("word-counter-input").fill("Bonjour le monde. Ceci est un test.");
    await expect(page.getByTestId("stat-grid")).toContainText("Mots7");
    await page.goto("/texte/nettoyer-un-texte/");
    await page.getByTestId("clean-input-input").fill("  a   b  \n\n\n c ");
    await expect(page.getByTestId("clean-output-output")).toHaveValue("a b\n\nc");
  });

  test("diff highlights changes", async ({ page }) => {
    await page.goto("/texte/comparer-deux-textes/");
    await page.getByTestId("diff-a-input").fill("Le chat dort.");
    await page.getByTestId("diff-b-input").fill("Le chien dort.");
    await expect(page.getByTestId("diff-result")).toContainText("chien");
    await expect(page.getByTestId("diff-result")).toContainText("+5");
  });

  test("JSON tool reports the error position", async ({ page }) => {
    await page.goto("/developpeur/formater-valider-json/");
    await page.getByTestId("json-input-input").fill('{"a": 1,}');
    await expect(page.getByTestId("json-error")).toContainText("ligne 1, colonne 9");
    await page.getByTestId("json-input-input").fill('{"b":1,"a":[1,2]}');
    await expect(page.getByTestId("json-valid")).toContainText("objet avec 2 clé(s)");
    await expect(page.getByTestId("json-output-output")).toHaveValue(
      '{\n  "b": 1,\n  "a": [\n    1,\n    2\n  ]\n}',
    );
  });

  test("QR generator produces PNG and SVG downloads", async ({ page }) => {
    await page.goto("/codes/generateur-qr-code/");
    await page.getByTestId("qr-url").fill("https://outilia.fr/");
    await expect(page.getByTestId("qr-payload")).toHaveText("https://outilia.fr/");
    const png = page.waitForEvent("download");
    await page.getByTestId("qr-download-png").click();
    expect((await png).suggestedFilename()).toBe("qr-code-url.png");
    const svg = page.waitForEvent("download");
    await page.getByTestId("qr-download-svg").click();
    const svgBytes = await readDownload(await svg);
    expect(Buffer.from(svgBytes).toString("utf8")).toContain("<svg");
  });
});

test.describe("lot 2 : perspective, EXIF, filigrane, slug, encodeurs", () => {
  test("perspective tool detects corners and exports a straightened JPG", async ({ page }) => {
    await page.goto("/numerisation/corriger-un-document-photographie/");
    await page.setInputFiles(
      '[data-testid="perspective-dropzone-input"]',
      fixture("sheet-perspective.jpg"),
    );
    await expect(page.getByTestId("quad-editor")).toBeVisible();
    await expect(page.getByText(/coins détectés/)).toBeVisible();
    await page.getByTestId("perspective-rotate").click();
    const download = page.waitForEvent("download");
    await page.getByTestId("perspective-run").click();
    await expect(page.getByTestId("perspective-result")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("download-button").click();
    expect((await download).suggestedFilename()).toMatch(/redresse\.jpg$/);
  });

  test("EXIF tool reads an image and produces a cleaned copy", async ({ page }) => {
    await page.goto("/images/metadonnees-exif/");
    await page.setInputFiles('[data-testid="exif-dropzone-input"]', fixture("photo-800x600.jpg"));
    await expect(page.getByTestId("exif-table")).toBeVisible();
    await page.getByTestId("exif-strip").click();
    await expect(page.getByTestId("exif-cleaned")).toContainText("Plus aucune métadonnée", {
      timeout: 30_000,
    });
    const download = page.waitForEvent("download");
    await page.getByTestId("exif-download").click();
    expect((await download).suggestedFilename()).toMatch(/sans-metadonnees\.jpg$/);
  });

  test("watermark is applied to a batch", async ({ page }) => {
    await page.goto("/images/filigrane/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', [
      fixture("photo-800x600.jpg"),
      fixture("logo-alpha.png"),
    ]);
    await expect(page.getByTestId("batch-run")).toBeDisabled();
    await page.getByTestId("wm-text").fill("© Test");
    await page.getByTestId("batch-run").click();
    await expect(page.getByTestId("batch-item").nth(1)).toHaveAttribute("data-status", "done", {
      timeout: 30_000,
    });
    const download = page.waitForEvent("download");
    await page.getByTestId("batch-download-all").click();
    expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  });

  test("slug and encoders work instantly", async ({ page }) => {
    await page.goto("/texte/generateur-de-slug/");
    await page
      .getByTestId("slug-input-input")
      .fill("Été 2026 : les 10 meilleurs outils PDF !\nDeuxième ligne");
    await expect(page.getByTestId("slug-output-output")).toHaveValue(
      "ete-2026-les-10-meilleurs-outils-pdf\ndeuxieme-ligne",
    );
    await page.goto("/developpeur/encoder-decoder-base64/");
    await page.getByTestId("base64-input-input").fill("Café ☕");
    await expect(page.getByTestId("base64-output-output")).toHaveValue("Q2Fmw6kg4piV");
    await page.getByRole("radio", { name: "Décoder du Base64" }).click();
    await page.getByTestId("base64-input-input").fill("Q2Fmw6kg4piV");
    await expect(page.getByTestId("base64-output-output")).toHaveValue("Café ☕");
    await page.getByTestId("base64-input-input").fill("%%%");
    await expect(page.getByTestId("base64-error")).toBeVisible();
    await page.goto("/developpeur/caracteres-html/");
    await page.getByTestId("html-input-input").fill('<a href="x">Tom & Jerry</a>');
    await expect(page.getByTestId("html-output-output")).toHaveValue(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;",
    );
    await page.goto("/developpeur/encoder-decoder-url/");
    await page.getByTestId("url-input-input").fill("été & co");
    await expect(page.getByTestId("url-output-output")).toHaveValue("%C3%A9t%C3%A9%20%26%20co");
  });
});

test.describe("lot 2 : liens, images, comparaison, caviardage, Markdown", () => {
  test("links tool lists annotations and text addresses", async ({ page }) => {
    await page.goto("/pdf/extraire-les-liens/");
    await uploadPdf(page, "links-and-images.pdf");
    await expect(page.getByTestId("pdf-links")).toBeVisible({ timeout: 30_000 });
    const rows = page.getByTestId("pdf-link-row");
    await expect(rows).toHaveCount(4);
    await expect(page.getByTestId("pdf-links")).toContainText("https://outilia.fr/documentation/");
    await expect(page.getByTestId("pdf-links")).toContainText("mailto:bonjour@exemple.fr");
    await expect(page.getByTestId("pdf-links")).toContainText("https://www.exemple.org");
    await expect(page.getByTestId("stat-grid")).toContainText("Liens internes (pages)1");
  });

  test("extract images keeps the original JPEG and rebuilds the PNG", async ({ page }) => {
    await page.goto("/pdf/extraire-les-images/");
    await uploadPdf(page, "links-and-images.pdf");
    await page.getByTestId("extract-images-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("pdf-extracted-images").locator("li")).toHaveCount(2);
    await expect(page.getByTestId("pdf-extracted-images")).toContainText("800×600");
    const download = page.waitForEvent("download");
    await page.getByTestId("download-button").click();
    expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  });

  test("compare highlights page differences", async ({ page }) => {
    await page.goto("/pdf/comparer-deux-pdf/");
    await page
      .locator('[data-testid="compare-a"] [data-testid="pdf-input"]')
      .setInputFiles(fixture("simple-3-pages.pdf"));
    await expect(page.getByTestId("compare-a")).toContainText("texte lu", { timeout: 30_000 });
    await page
      .locator('[data-testid="compare-b"] [data-testid="pdf-input"]')
      .setInputFiles(fixture("simple-5-pages.pdf"));
    await expect(page.getByTestId("compare-pages")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("stat-grid")).toContainText("Pages comparées5");
    const pages = page.getByTestId("compare-page");
    expect(await pages.count()).toBeGreaterThanOrEqual(2);
    await expect(pages.last()).toHaveAttribute("data-status", "added");
  });

  test("redaction removes the searched text from the page", async ({ page }) => {
    await page.goto("/pdf/caviarder/");
    await uploadPdf(page, "links-and-images.pdf");
    await expect(page.getByTestId("redact-page")).toHaveCount(2);
    await page.getByTestId("redact-search").fill("DOSSIER-4242");
    await page.getByTestId("redact-search-run").click();
    await expect(page.getByTestId("redact-rect")).toHaveCount(2, { timeout: 30_000 });
    await expect(page.getByTestId("redact-summary")).toContainText("2 zone(s) sur 2 page(s)");
    // Remove one and draw another by hand on page 2.
    await page.getByTestId("redact-rect").nth(1).click();
    await expect(page.getByTestId("redact-rect")).toHaveCount(1);
    const surface = page.getByTestId("redact-surface").nth(1);
    const box = (await surface.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + 60, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByTestId("redact-rect")).toHaveCount(2);
    const download = page.waitForEvent("download");
    await page.getByTestId("redact-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 90_000 });
    await page.getByTestId("download-button").click();
    const bytes = await readDownload(await download);
    const doc = await expectValidPdf(bytes, 2);
    expect(doc.getTitle()).toBeUndefined();
    expect(await extractPageText(bytes, 0)).toHaveLength(0);
    expect(await extractPageText(bytes, 1)).toHaveLength(0);
  });

  test("markdown is converted to a paginated PDF", async ({ page }) => {
    await page.goto("/documents/markdown-vers-pdf/");
    await page.getByTestId("md-sample").click();
    await page.getByRole("tab", { name: "Aperçu" }).click();
    await expect(page.getByTestId("md-preview").locator("h1")).toHaveText(
      "Compte rendu de réunion",
    );
    await page.getByRole("tab", { name: "Markdown" }).click();
    const download = page.waitForEvent("download");
    await page.getByTestId("doc-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("download-button").click();
    const bytes = await readDownload(await download);
    await expectValidPdf(bytes, 1);
    const text = (await extractPageText(bytes, 0)).join(" ");
    expect(text).toContain("Compte rendu de réunion");
    expect(text).toContain("Responsable");
    await page.goto("/documents/texte-vers-pdf/");
    await page
      .getByTestId("txt-input-input")
      .fill("Première ligne\nDeuxième ligne\n\nNouveau paragraphe");
    await page.getByTestId("doc-run").click();
    await expect(page.getByTestId("done-panel")).toContainText("1 page", { timeout: 60_000 });
  });
});

test.describe("lot 3 : développeur, calculatrices, codes, documents", () => {
  test("uuid, password, hash, regex and timestamp tools", async ({ page }) => {
    await page.goto("/developpeur/generateur-uuid/");
    const first = await page.getByTestId("uuid-output-output").inputValue();
    expect(first.split("\n")).toHaveLength(5);
    expect(first.split("\n")[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    await page.getByTestId("uuid-regenerate").click();
    expect(await page.getByTestId("uuid-output-output").inputValue()).not.toBe(first);

    await page.goto("/developpeur/generateur-de-mot-de-passe/");
    await expect(page.getByTestId("pw-item")).toHaveCount(5);
    expect((await page.getByTestId("pw-item").first().textContent())!.length).toBe(16);

    await page.goto("/developpeur/calculer-hash-sha256/");
    await page.getByTestId("hash-input-input").fill("abc");
    await expect(page.getByTestId("hash-text-sha-256")).toHaveText(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    await page
      .getByTestId("hash-expected")
      .fill("BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD");
    await expect(page.getByText("correspond", { exact: true })).toBeVisible();

    await page.goto("/developpeur/testeur-regex/");
    await expect(page.getByTestId("regex-results")).toContainText("2 correspondances");
    await page.getByTestId("regex-pattern").fill("(");
    await expect(page.getByTestId("regex-error")).toBeVisible();

    await page.goto("/developpeur/convertisseur-timestamp/");
    await page.getByTestId("ts-input").fill("1700000000");
    await expect(page.getByTestId("ts-results")).toContainText("2023-11-14T22:13:20.000Z");
  });

  test("percentage, VAT, dates and unit calculators", async ({ page }) => {
    await page.goto("/calculatrices/pourcentage/");
    await expect(page.getByTestId("pct-a-result")).toHaveText("30,00");
    await page.getByTestId("pct-c-to").fill("60");
    await expect(page.getByTestId("pct-c-result")).toHaveText("-25,00 %");

    await page.goto("/calculatrices/tva/");
    await page.getByTestId("vat-amount").fill("1 000");
    await expect(page.getByTestId("vat-ttc")).toContainText("200,00 €");
    await expect(page.getByTestId("vat-tva")).toContainText("200,00 €");

    await page.goto("/calculatrices/jours-entre-deux-dates/");
    await page.getByTestId("dates-from").fill("2026-05-01");
    await page.getByTestId("dates-to").fill("2026-05-31");
    await expect(page.getByTestId("stat-grid")).toContainText("Jours ouvrés17");
    await expect(page.getByTestId("dates-detail")).toContainText("Ascension");

    await page.goto("/calculatrices/convertisseur-unites/");
    await page.getByTestId("units-value").fill("10");
    await expect(page.getByTestId("units-result")).toContainText("10 000 mm");
  });

  test("barcode, colour, palette and QR reader", async ({ page }) => {
    await page.goto("/codes/generateur-code-barres/");
    await expect(page.getByTestId("bc-preview").locator("svg")).toBeVisible();
    await expect(page.getByTestId("bc-preview")).toContainText("4006381333931");
    await page.getByTestId("bc-value").fill("4006381333930");
    await expect(page.getByTestId("bc-error")).toContainText("attendue 1");
    await page.getByTestId("bc-value").fill("4006381333931");
    const svg = page.waitForEvent("download");
    await page.getByTestId("bc-download-svg").click();
    expect(Buffer.from(await readDownload(await svg)).toString("utf8")).toContain("<svg");
    const png = page.waitForEvent("download");
    await page.getByTestId("bc-download-png").click();
    expect((await png).suggestedFilename()).toBe("code-barres-ean13.png");

    await page.goto("/codes/convertisseur-couleurs/");
    await page.getByTestId("color-input").fill("tomato");
    await expect(page.getByTestId("color-rgb")).toHaveText("rgb(255, 99, 71)");
    await expect(page.getByTestId("color-hsl")).toHaveText("hsl(9, 100%, 64%)");
    await expect(page.getByTestId("color-contrast")).toContainText(
      "AA grand texte (≥ 3) : insuffisant",
    );
    await page.getByTestId("color-bg").fill("#000000");
    await expect(page.getByTestId("color-contrast")).toContainText(
      "AA texte normal (≥ 4,5) : conforme",
    );

    await page.goto("/codes/palette-couleurs-image/");
    await page.setInputFiles('[data-testid="palette-dropzone-input"]', fixture("logo-alpha.png"));
    await expect(page.getByTestId("palette-list").locator("li").first()).toBeVisible({
      timeout: 30_000,
    });
    expect(await page.getByTestId("palette-list").locator("li").count()).toBeGreaterThanOrEqual(2);
    await expect(page.getByTestId("palette-css-output")).toHaveValue(/--couleur-1: #[0-9a-f]{6};/);

    await page.goto("/codes/lire-un-qr-code/");
    await page.setInputFiles('[data-testid="qr-dropzone-input"]', fixture("qr-outilia.png"));
    await expect(page.getByTestId("qr-text")).toHaveText("https://outilia.fr/aide", {
      timeout: 30_000,
    });
    await expect(page.getByTestId("qr-result")).toContainText("Lien web");
    await page.setInputFiles('[data-testid="qr-dropzone-input"]', fixture("photo-800x600.jpg"));
    await expect(page.getByTestId("qr-result")).toContainText("Aucun QR code lisible", {
      timeout: 30_000,
    });
  });

  test("printable paper, calendar and cover page PDFs", async ({ page }) => {
    await page.goto("/documents/feuilles-a-imprimer/");
    await page.getByTestId("segmented-seyes").click();
    let download = page.waitForEvent("download");
    await page.getByTestId("paper-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("download-button").click();
    await expectValidPdf(await readDownload(await download), 1);

    await page.goto("/documents/calendrier-a-imprimer/");
    await page.getByTestId("cal-year").fill("2027");
    download = page.waitForEvent("download");
    await page.getByTestId("cal-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("download-button").click();
    const cal = await readDownload(await download);
    await expectValidPdf(cal, 1);
    expect((await extractPageText(cal, 0)).join(" ")).toContain("2027");

    await page.goto("/documents/page-de-garde/");
    await expect(page.getByTestId("cover-run")).toBeDisabled();
    await page.getByTestId("cover-title").fill("Rapport annuel");
    download = page.waitForEvent("download");
    await page.getByTestId("cover-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("download-button").click();
    const cover = await readDownload(await download);
    expect((await extractPageText(cover, 0)).join(" ")).toContain("Rapport annuel");
  });
});
