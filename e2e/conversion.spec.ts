/**
 * Office conversions run on real fixture files; every download is opened and checked.
 */
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { expectValidPdf, extractPageText, fixture, readDownload } from "./helpers";

test.describe("conversions Office", () => {
  test("Word → PDF keeps the structure and reports the simplified layout", async ({ page }) => {
    await page.goto("/conversion/word-vers-pdf/");
    await page.setInputFiles(
      '[data-testid="office-dropzone-input"]',
      fixture("office-sample.docx"),
    );
    await expect(page.getByTestId("office-file-name")).toHaveText("office-sample.docx");
    const download = page.waitForEvent("download");
    await page.getByTestId("office-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("done-panel")).toContainText("1 image");
    await page.getByTestId("download-button").click();
    const bytes = await readDownload(await download);
    await expectValidPdf(bytes);
    const text = (await extractPageText(bytes, 0)).join(" ");
    expect(text).toContain("Rapport de test AVEROPDF");
    expect(text).toContain("Prix unitaire");
    expect(text).toContain("Seconde page");
  });

  test("rejects a .doc / non-Word file with a clear message", async ({ page }) => {
    await page.goto("/conversion/word-vers-pdf/");
    await page.setInputFiles('[data-testid="office-dropzone-input"]', fixture("not-a-pdf.txt"));
    await expect(page.getByRole("alert").first()).toContainText(".docx");
  });

  test("Excel → PDF converts every sheet in landscape; CSV → PDF too", async ({ page }) => {
    await page.goto("/conversion/excel-vers-pdf/");
    await page.setInputFiles(
      '[data-testid="office-dropzone-input"]',
      fixture("office-sample.xlsx"),
    );
    let download = page.waitForEvent("download");
    await page.getByTestId("office-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("conversion-warnings")).toContainText("Vide");
    await page.getByTestId("download-button").click();
    let bytes = await readDownload(await download);
    let doc = await expectValidPdf(bytes);
    expect(doc.getPage(0).getWidth()).toBeGreaterThan(doc.getPage(0).getHeight());
    let text = (await extractPageText(bytes, 0)).join(" ");
    expect(text).toContain("Produit");
    expect(text).toContain("12/03/2026");
    expect(text).toContain("Relire avant envoi");

    await page.getByRole("button", { name: "Traiter un autre fichier" }).click();
    await page.setInputFiles('[data-testid="office-dropzone-input"]', fixture("office-sample.csv"));
    download = page.waitForEvent("download");
    await page.getByTestId("office-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("download-button").click();
    bytes = await readDownload(await download);
    doc = await expectValidPdf(bytes, 1);
    text = (await extractPageText(bytes, 0)).join(" ");
    expect(text).toContain("Saint-Étienne");
  });

  test("PDF → Word produces a .docx with one page per PDF page and the text", async ({ page }) => {
    await page.goto("/conversion/pdf-vers-word/");
    await page.setInputFiles('[data-testid="pdf-input"]', fixture("simple-3-pages.pdf"));
    await expect(page.getByTestId("docx-run")).toBeVisible({ timeout: 30_000 });
    const download = page.waitForEvent("download");
    await page.getByTestId("docx-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("download-button").click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("simple-3-pages.docx");
    const bytes = await readDownload(file);
    const xml = strFromU8(unzipSync(bytes)["word/document.xml"]!);
    expect(xml).toContain("Page 1 / 3");
    expect(xml).toContain("Page 3 / 3");
    expect((xml.match(/w:type="page"/g) ?? []).length).toBe(2);
  });
});
