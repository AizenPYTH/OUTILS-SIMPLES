/**
 * Lot 5: HEIC photos, pages inserted from another PDF in the editor, visual
 * comparison, batch compression.
 */
import { expect, test } from "@playwright/test";
import { unzipSync } from "fflate";
import { expectValidPdf, extractPageText, fixture, readDownload, uploadPdf } from "./helpers";

test.describe("compléments", () => {
  test("a HEIC photo is converted to JPEG (libheif in the browser)", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/images/convertir/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', fixture("photo-sample.heic"));
    await expect(page.getByTestId("batch-item")).toHaveCount(1);
    await page.getByTestId("segmented-image/jpeg").click();
    await page.getByTestId("batch-run").click();
    await expect(page.getByTestId("batch-item")).toHaveAttribute("data-status", "done", {
      timeout: 90_000,
    });
    await expect(page.getByTestId("batch-item")).toContainText("1280×854 px");
    const download = page.waitForEvent("download");
    await page.getByTestId("batch-download-all").click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.jpe?g$/);
    const bytes = await readDownload(file);
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xff, 0xd8, 0xff]);
  });

  test("editor: pages of another PDF are inserted after the current page and exported in order", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "pages panel is docked on desktop only");
    test.setTimeout(120_000);
    await page.goto("/pdf/modifier/");
    await uploadPdf(page, "simple-3-pages.pdf");
    await expect(page.getByTestId("editor-shell")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("pages-panel")).toContainText("3 pages");
    await page.setInputFiles('[data-testid="pages-insert-input"]', fixture("simple-5-pages.pdf"));
    await expect(page.getByTestId("pages-panel")).toContainText("8 pages", { timeout: 30_000 });
    const download = page.waitForEvent("download");
    await page.getByTestId("editor-download").click();
    await expect(page.getByTestId("export-verified")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("export-download").click();
    const bytes = await readDownload(await download);
    await expectValidPdf(bytes, 8);
    expect((await extractPageText(bytes, 0)).join(" ")).toContain("Page 1 / 3");
    expect((await extractPageText(bytes, 1)).join(" ")).toContain("Page 1 / 5");
    expect((await extractPageText(bytes, 6)).join(" ")).toContain("Page 2 / 3");
  });

  test("visual comparison renders both pages and reports changed pixels", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/pdf/comparer-deux-pdf/");
    await page
      .locator('[data-testid="compare-a"] [data-testid="pdf-input"]')
      .setInputFiles(fixture("simple-3-pages.pdf"));
    await expect(page.getByTestId("compare-a")).toContainText("texte lu", { timeout: 30_000 });
    await page
      .locator('[data-testid="compare-b"] [data-testid="pdf-input"]')
      .setInputFiles(fixture("simple-5-pages.pdf"));
    await expect(page.getByTestId("compare-pages")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("radio", { name: /Visuel/ }).click();
    await expect(page.getByTestId("visual-compare")).toBeVisible();
    await expect(page.getByTestId("visual-ratio")).toContainText("%", { timeout: 60_000 });
    await page.getByTestId("visual-summary-run").click();
    await expect(page.getByTestId("visual-summary").locator("li")).toHaveCount(5, {
      timeout: 90_000,
    });
    await expect(page.getByTestId("visual-summary")).toContainText("ajoutée");
  });

  test("several PDFs are compressed in one go and downloaded as a ZIP", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/pdf/compresser/");
    await page.getByTestId("compress-tab-batch").click();
    await page.setInputFiles('[data-testid="pdf-input"]', [
      fixture("simple-3-pages.pdf"),
      fixture("links-and-images.pdf"),
    ]);
    await expect(page.getByTestId("pdf-batch-list").locator("li")).toHaveCount(2);
    await page.getByTestId("pdf-batch-run").click();
    await expect(page.getByTestId("pdf-batch-done")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId("pdf-batch-row")).toHaveCount(2);
    const download = page.waitForEvent("download");
    await page.getByTestId("pdf-batch-download-zip").click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.zip$/);
    const entries = unzipSync(await readDownload(file));
    expect(Object.keys(entries).sort()).toEqual([
      "links-and-images-compresse.pdf",
      "simple-3-pages-compresse.pdf",
    ]);
    await expectValidPdf(entries["simple-3-pages-compresse.pdf"]!, 3);
  });
});
