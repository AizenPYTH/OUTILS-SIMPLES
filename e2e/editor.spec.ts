import { expect, test } from "@playwright/test";
import {
  expectValidPdf,
  extractPageText,
  pageContentOps,
  readDownload,
  uploadPdf,
} from "./helpers";

test.describe("editor", () => {
  test("add text, draw, undo/redo and export a modified PDF", async ({ page, isMobile }) => {
    await page.goto("/pdf/modifier/");
    await uploadPdf(page, "simple-3-pages.pdf");
    const shell = page.getByTestId("editor-shell");
    await expect(shell).toBeVisible();
    const overlay = page.getByTestId("annotation-overlay");
    await expect(overlay).toBeVisible();

    // Text tool is active by default in editor mode.
    await page.getByTestId("tool-text").filter({ visible: true }).click();
    const box = (await overlay.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.5);
    const editor = page.getByTestId("text-annotation-editor");
    await expect(editor).toBeVisible();
    await editor.fill("Bonjour OUTILIA");
    await page.getByTestId("page-indicator").click(); // blur commits
    await expect(shell).toContainText("1 élément");

    // Freehand drawing.
    await page.getByTestId("tool-pen").filter({ visible: true }).click();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.7);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.75, { steps: 8 });
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.65, { steps: 8 });
    await page.mouse.up();
    await expect(shell).toContainText("2 éléments");

    await page.getByTestId("undo").click();
    await expect(shell).toContainText("1 élément");
    await page.getByTestId("redo").click();
    await expect(shell).toContainText("2 éléments");

    // Page navigation and zoom.
    await page.getByTestId("page-next").click();
    await expect(page.getByTestId("page-indicator")).toHaveText("Page 2 sur 3");
    if (!isMobile) {
      await page.getByTestId("thumb-0").click();
      await expect(page.getByTestId("page-indicator")).toHaveText("Page 1 sur 3");
    }
    await page.getByRole("button", { name: "Zoom avant" }).click();
    await expect(page.getByTestId("zoom-level")).toHaveText("125 %");

    await page.getByTestId("editor-download").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download").click({ timeout: 30_000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("simple-3-pages-modifie.pdf");
    const bytes = await readDownload(download);
    await expectValidPdf(bytes, 3);
    expect((await extractPageText(bytes, 0)).join(" ")).toContain("Bonjour OUTILIA");
  });

  test("edit existing text: the run is replaced in the file, re-rendered, and exported as real text", async ({
    page,
  }) => {
    await page.goto("/pdf/modifier/");
    await uploadPdf(page, "simple-3-pages.pdf");
    const shell = page.getByTestId("editor-shell");
    await expect(shell).toBeVisible();
    await page.getByTestId("tool-editText").filter({ visible: true }).click();
    const runs = page.getByTestId("text-run");
    await expect(runs).toHaveCount(2, { timeout: 20_000 });
    await expect(runs.first()).toHaveAttribute("aria-label", "Modifier « Page 1 / 3 »");
    // The run box sits on the rendered text (not at the page corner).
    const pageBox = (await page.getByTestId("editor-page").boundingBox())!;
    const runBox = (await runs.first().boundingBox())!;
    expect(runBox.x - pageBox.x).toBeGreaterThan(pageBox.width * 0.05);
    expect(runBox.y - pageBox.y).toBeGreaterThan(pageBox.height * 0.03);
    expect(runBox.width).toBeGreaterThan(pageBox.width * 0.1);

    await runs.first().click();
    const editor = page.getByTestId("text-run-editor");
    await expect(editor).toBeVisible();
    await expect(editor).toHaveValue("Page 1 / 3");
    await editor.fill("Titre corrigé");
    await editor.press("Enter");
    await expect(page.locator('[data-testid="text-run"][data-edited="true"]')).toHaveCount(1, {
      timeout: 20_000,
    });
    await expect(shell).toContainText("1 texte modifié");
    // The re-rendered page exposes the new run text (preview built from the real file).
    await expect(runs.first()).toHaveAttribute("aria-label", "Modifier « Titre corrigé »", {
      timeout: 20_000,
    });

    // Revert, then edit again with a character outside the original font (fallback font path).
    await runs.first().click();
    await page.getByTestId("text-run-revert").click();
    await expect(page.locator('[data-testid="text-run"][data-edited="true"]')).toHaveCount(0, {
      timeout: 20_000,
    });
    await expect(runs.first()).toHaveAttribute("aria-label", "Modifier « Page 1 / 3 »", {
      timeout: 20_000,
    });
    await runs.nth(1).click();
    await page.getByTestId("text-run-editor").fill("Résumé ✓ corrigé");
    await page.getByTestId("text-run-editor").press("Enter");
    await expect(page.locator('[data-testid="text-run"][data-edited="true"]')).toHaveCount(1, {
      timeout: 20_000,
    });

    await page.getByTestId("editor-download").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download").click({ timeout: 30_000 });
    const bytes = await readDownload(await downloadPromise);
    await expectValidPdf(bytes, 3);
    const text = (await extractPageText(bytes, 0)).join(" ");
    expect(text).toContain("Page 1 / 3");
    expect(text).toContain("Résumé ? corrigé"); // ✓ is outside WinAnsi: replaced, and announced in the UI
    expect(text).not.toContain("Document de test");
    // No white rectangle was painted: the page content has no fill of a white rectangle.
    const ops = await pageContentOps(bytes, 0);
    expect(ops).not.toContain("1 1 1 rg");
    // Other pages are untouched.
    expect((await extractPageText(bytes, 1)).join(" ")).toContain("Page 2 / 3");
  });

  test("edit text on a scanned page: honest message and link to OCR", async ({ page }) => {
    await page.goto("/pdf/modifier/");
    await uploadPdf(page, "scan-image-only.pdf");
    await page.getByTestId("tool-editText").filter({ visible: true }).click();
    const status = page.getByTestId("text-edit-status");
    await expect(status).toContainText("document scanné", { timeout: 20_000 });
    await expect(status.getByRole("link", { name: "OCR" })).toHaveAttribute(
      "href",
      "/numerisation/ocr/",
    );
    await expect(page.getByTestId("text-run")).toHaveCount(0);
  });

  test("sign: typed signature is placed and exported", async ({ page }) => {
    await page.goto("/pdf/signer/");
    await uploadPdf(page, "simple-3-pages.pdf");
    await expect(page.getByTestId("editor-shell")).toBeVisible();
    await page.getByTestId("tool-signature").filter({ visible: true }).click();
    await page.getByRole("tab", { name: "Taper" }).click();
    await page.getByLabel("Votre nom").fill("Jeanne Martin");
    await page.getByTestId("signature-confirm").click();
    await expect(page.getByTestId("editor-shell")).toContainText("1 élément");
    await expect(page.getByTestId("selection-frame")).toBeVisible();
    await page.getByTestId("editor-download").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download").click({ timeout: 30_000 });
    const bytes = await readDownload(await downloadPromise);
    const doc = await expectValidPdf(bytes, 3);
    expect(Buffer.from(bytes).toString("latin1")).toContain("/Image");
    expect(doc.getPageCount()).toBe(3);
  });

  test("selected annotation can be deleted with the keyboard and the editor closes", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "keyboard flow");
    await page.goto("/pdf/annoter/");
    await uploadPdf(page, "simple-3-pages.pdf");
    const overlay = page.getByTestId("annotation-overlay");
    const box = (await overlay.boundingBox())!;
    await page.getByTestId("tool-rect").filter({ visible: true }).click();
    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 150, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByTestId("editor-shell")).toContainText("1 élément");
    await page.getByTestId("tool-select").filter({ visible: true }).click();
    await page.mouse.click(box.x + 120, box.y + 100);
    await expect(page.getByTestId("selection-frame")).toBeVisible();
    await page.keyboard.press("Delete");
    await expect(page.getByTestId("editor-shell")).toContainText("0 élément");
    await page.getByTestId("editor-close").click();
    await expect(page.getByTestId("pdf-dropzone")).toBeVisible();
  });
});
