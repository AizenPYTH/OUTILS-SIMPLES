import { expect, test } from "@playwright/test";
import { expectValidPdf, readDownload, uploadPdf } from "./helpers";

test.describe("PDF tools", () => {
  test("merge two PDFs into one valid document", async ({ page }) => {
    await page.goto("/pdf/fusionner/");
    await uploadPdf(page, "simple-3-pages.pdf", "simple-5-pages.pdf");
    await expect(page.getByTestId("merge-file-row")).toHaveCount(2);
    await expect(page.getByTestId("merge-file-row").first()).toContainText("3 pages");
    // Move the second file first.
    await page.getByRole("button", { name: "Monter" }).nth(1).click();
    await expect(page.getByTestId("merge-file-row").first()).toContainText("simple-5-pages.pdf");
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("merge-button").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("download-button").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("simple-5-pages-fusionne.pdf");
    const doc = await expectValidPdf(await readDownload(download), 8);
    expect(doc.getPage(0).getSize().height).toBeCloseTo(841.89, 0);
  });

  test("rejects a non-PDF file with a clear message", async ({ page }) => {
    await page.goto("/pdf/fusionner/");
    await uploadPdf(page, "not-a-pdf.txt");
    await expect(page.getByRole("alert").first()).toContainText("PDF");
    await expect(page.getByTestId("merge-file-row")).toHaveCount(0);
  });

  test("reports a corrupted PDF without crashing", async ({ page }) => {
    await page.goto("/pdf/diviser/");
    await uploadPdf(page, "corrupted.pdf");
    await expect(page.getByTestId("error-panel")).toBeVisible();
    await page.getByRole("button", { name: "Recommencer avec un autre fichier" }).click();
    await expect(page.getByTestId("pdf-dropzone")).toBeVisible();
  });

  test("split by ranges produces the right pages and a ZIP", async ({ page }) => {
    await page.goto("/pdf/diviser/");
    await uploadPdf(page, "simple-5-pages.pdf");
    await expect(page.getByTestId("file-summary")).toContainText("5 pages");
    const input = page.getByTestId("page-range-input");
    await input.fill("1-9");
    await expect(page.locator("text=entre 1 et 5")).toBeVisible();
    await input.fill("1-2, 5");
    await expect(page.getByTestId("split-preview")).toContainText("2 fichier(s)");
    await page.getByTestId("split-button").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("split-results").locator("li")).toHaveCount(2);
    const first = page.waitForEvent("download");
    await page.getByTestId("split-results").locator("li").nth(1).getByRole("button").click();
    const download = await first;
    expect(download.suggestedFilename()).toBe("simple-5-pages-pages-5-5.pdf");
    await expectValidPdf(await readDownload(download), 1);
    const zip = page.waitForEvent("download");
    await page.getByTestId("download-zip").click();
    expect((await zip).suggestedFilename()).toMatch(/\.zip$/);
  });

  test("rotate a single page and export", async ({ page }) => {
    await page.goto("/pdf/rotation/");
    await uploadPdf(page, "simple-3-pages.pdf");
    await page.getByTestId("rotate-page-1").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("rotate-export").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("download-button").click();
    const doc = await expectValidPdf(await readDownload(await downloadPromise), 3);
    expect(doc.getPage(0).getRotation().angle).toBe(0);
    expect(doc.getPage(1).getRotation().angle).toBe(90);
  });

  test("organize: delete a page and export the displayed order", async ({ page }) => {
    await page.goto("/pdf/organiser/");
    await uploadPdf(page, "simple-5-pages.pdf");
    await expect(page.getByTestId("organize-page")).toHaveCount(5);
    await page.getByRole("button", { name: "Supprimer la page 2" }).click();
    await expect(page.getByTestId("organize-page")).toHaveCount(4);
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("organize-export").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("download-button").click();
    await expectValidPdf(await readDownload(await downloadPromise), 4);
  });

  test("extract selected pages from thumbnails", async ({ page }) => {
    await page.goto("/pdf/extraire-pages/");
    await uploadPdf(page, "simple-5-pages.pdf");
    await page.getByRole("button", { name: "Page 2", exact: true }).click();
    await page.getByRole("button", { name: "Page 4", exact: true }).click();
    await expect(page.getByTestId("extract-summary")).toContainText("2, 4");
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("extract-button").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("download-button").click();
    await expectValidPdf(await readDownload(await downloadPromise), 2);
  });

  test("compress shows an honest before/after and recompresses images", async ({ page }) => {
    await page.goto("/pdf/compresser/");
    await uploadPdf(page, "image-raw-rgb.pdf");
    await page.getByTestId("segmented-balanced").click();
    await page.getByTestId("compress-button").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("compress-verdict")).toContainText("Réduction");
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("download-button").click();
    const bytes = await readDownload(await downloadPromise);
    await expectValidPdf(bytes, 1);
    expect(bytes.byteLength).toBeLessThan(124301 * 0.5);
  });

  test("watermark is applied and can be removed by the manage tool", async ({ page }) => {
    await page.goto("/pdf/ajouter-filigrane/");
    await uploadPdf(page, "simple-3-pages.pdf");
    await page.getByTestId("wm-text").fill("SPECIMEN");
    await expect(page.getByTestId("watermark-preview")).toContainText("SPECIMEN");
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("watermark-button").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("download-button").click();
    const download = await downloadPromise;
    const bytes = await readDownload(download);
    await expectValidPdf(bytes, 3);

    await page.goto("/pdf/gerer-filigrane/");
    await page.setInputFiles('[data-testid="pdf-input"]', {
      name: "filigrane.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(bytes),
    });
    await expect(page.getByTestId("watermark-diagnostic")).toContainText("pages 1-3");
    await page.getByTestId("authorized-checkbox").click();
    const cleaned = page.waitForEvent("download");
    await page.getByTestId("remove-watermark-button").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("download-button").click();
    await expectValidPdf(await readDownload(await cleaned), 3);
  });

  test("manage watermark explains when nothing can be removed", async ({ page }) => {
    await page.goto("/pdf/gerer-filigrane/");
    await uploadPdf(page, "simple-3-pages.pdf");
    await expect(page.getByText("Aucun filigrane retirable de manière fiable")).toBeVisible();
    await expect(page.getByTestId("remove-watermark-button")).toHaveCount(0);
  });

  test("fill an AcroForm and export flattened", async ({ page }) => {
    await page.goto("/pdf/remplir-formulaire/");
    await uploadPdf(page, "form-acroform.pdf");
    await page.getByLabel("nom", { exact: true }).fill("Jeanne Martin");
    await page.getByLabel("accepte").click();
    await page.getByLabel("Aplatir le formulaire").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("fill-form-export").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("download-button").click();
    const doc = await expectValidPdf(await readDownload(await downloadPromise), 1);
    expect(doc.getForm().getFields()).toHaveLength(0);
  });
});
