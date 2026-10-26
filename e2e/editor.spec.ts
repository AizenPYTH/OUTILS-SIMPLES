import { expect, test } from "@playwright/test";
import {
  expectValidPdf,
  extractPageText,
  extractTextItems,
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

  test("edit a 90° run on the label: the field follows the text direction and the export keeps it", async ({
    page,
  }) => {
    await page.goto("/pdf/modifier/");
    await uploadPdf(page, "label-mixed-orientation.pdf");
    await page.getByTestId("tool-editText").filter({ visible: true }).click();
    const run = page.locator('[data-testid="text-run"][aria-label*="EXPEDITEUR"]');
    await expect(run).toHaveCount(1, { timeout: 20_000 });
    const box = (await run.boundingBox())!;
    expect(box.height).toBeGreaterThan(box.width * 3); // a vertical box, on the right-hand panel
    const pageBox = (await page.getByTestId("editor-page").boundingBox())!;
    expect(box.x).toBeGreaterThan(pageBox.x + pageBox.width * 0.7);
    await run.click();
    const editor = page.getByTestId("text-run-editor");
    await expect(editor).toHaveValue("EXPEDITEUR BOUTIQUE DES ARTS");
    const rotation = await editor.evaluate((el) => getComputedStyle(el).transform);
    expect(rotation).not.toBe("none"); // rotated field, not a horizontal one
    await editor.fill("EXPEDITEUR ATELIER DES ARTS");
    await editor.press("Enter");
    await expect(page.locator('[data-testid="text-run"][data-edited="true"]')).toHaveCount(1, {
      timeout: 20_000,
    });
    await page.getByTestId("editor-download").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download").click({ timeout: 30_000 });
    const bytes = await readDownload(await downloadPromise);
    const items = await extractTextItems(bytes, 0);
    const item = items.find((i) => i.str.includes("ATELIER"))!;
    expect(item).toBeTruthy();
    expect(Math.round((Math.atan2(item.transform[1]!, item.transform[0]!) * 180) / Math.PI)).toBe(
      90,
    );
    expect(items.some((i) => i.str.includes("BOUTIQUE"))).toBe(false);
  });

  test("scanned PDF: diagnosed at import, OCR offered in the editor, text recognised and correctable", async ({
    page,
    isMobile,
  }) => {
    test.slow();
    await page.goto("/pdf/modifier/");
    await uploadPdf(page, "scan-text.pdf");
    const shell = page.getByTestId("editor-shell");
    await expect(shell).toBeVisible();
    // The document is not rejected: it is described, and OCR is offered.
    const diagnosis = page.getByTestId("import-diagnosis");
    await expect(diagnosis).toBeVisible();
    await expect(diagnosis).toHaveAttribute("data-kind", "scanned");
    await expect(diagnosis).toContainText("Document scanné");
    await expect(page.getByTestId("document-status")).toContainText("document scanné");
    await page.getByTestId("diagnosis-continue").click();
    await expect(diagnosis).toHaveCount(0);

    // Text tool on a scanned page: honest message with the OCR action, no editable run.
    await page.getByTestId("tool-editText").filter({ visible: true }).click();
    const status = page.getByTestId("text-edit-status");
    await expect(status).toContainText("document scanné", { timeout: 20_000 });
    await expect(page.getByTestId("text-run")).toHaveCount(0);
    await page.getByTestId("text-edit-run-ocr").click();

    // OCR runs in the editor with visible progress, then the layer is editable.
    await expect(page.getByTestId("side-panel-ocr")).toBeVisible();
    await expect(page.getByTestId("ocr-layer-summary")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByTestId("ocr-layer-summary")).toContainText("Qualité estimée");
    await expect(page.getByTestId("document-status")).toContainText("OCR");
    await page.getByTestId("side-panel-close").click();
    const runs = page.locator('[data-testid="text-run"][data-kind="ocr"]');
    await expect(runs.first()).toBeVisible({ timeout: 20_000 });
    await expect(status).toContainText("Texte reconnu par OCR");
    const count = await runs.count();
    expect(count).toBeGreaterThan(3);

    // Correct one recognised word: the layer changes, the image does not.
    await runs.first().click();
    const editor = page.getByTestId("text-run-editor");
    await expect(editor).toBeVisible();
    await editor.fill("CORRIGE");
    await editor.press("Enter");
    await expect(page.locator('[data-testid="text-run"][data-edited="true"]')).toHaveCount(1, {
      timeout: 20_000,
    });

    await page.getByTestId("editor-download").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download").click({ timeout: 60_000 });
    const bytes = await readDownload(await downloadPromise);
    await expectValidPdf(bytes, 1);
    const text = (await extractPageText(bytes, 0)).join(" ");
    expect(text).toContain("CORRIGE");
    expect(text.length).toBeGreaterThan(40); // the rest of the OCR layer is there (searchable)
    expect(Buffer.from(bytes).toString("latin1")).toContain("/Image"); // the scan itself is kept
    void isMobile;
  });

  test("mixed PDF: page-by-page diagnosis, native pages editable, scanned page announced", async ({
    page,
  }) => {
    await page.goto("/pdf/modifier/");
    await uploadPdf(page, "mixed-text-scan.pdf");
    const diagnosis = page.getByTestId("import-diagnosis");
    await expect(diagnosis).toHaveAttribute("data-kind", "mixed");
    await expect(diagnosis).toContainText("3 pages, dont 1 sans texte sélectionnable");
    await page.getByTestId("diagnosis-continue").click();
    await page.getByTestId("tool-editText").filter({ visible: true }).click();
    await expect(page.getByTestId("text-run").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("text-info")).toContainText("modifiable");
    await page.getByTestId("page-next").click();
    await expect(page.getByTestId("text-edit-status")).toContainText("document scanné", {
      timeout: 20_000,
    });
    await expect(page.getByTestId("text-run")).toHaveCount(0);
    await page.getByTestId("page-next").click();
    await expect(page.getByTestId("text-run").first()).toBeVisible({ timeout: 20_000 });
  });

  test("password-protected PDF: asked for the password, wrong one refused, then opened and exported unlocked", async ({
    page,
  }) => {
    await page.goto("/pdf/modifier/");
    await uploadPdf(page, "protected-user.pdf");
    const panel = page.getByTestId("password-panel");
    await expect(panel).toBeVisible();
    await expect(page.getByTestId("error-panel")).toHaveCount(0);
    await page.getByTestId("password-input").fill("wrong");
    await page.getByTestId("password-submit").click();
    await expect(page.getByTestId("password-error")).toBeVisible();
    await page.getByTestId("password-input").fill("secret42");
    await page.getByTestId("password-submit").click();
    const shell = page.getByTestId("editor-shell");
    await expect(shell).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("page-indicator")).toHaveText("Page 1 sur 3");
    await expect(page.getByTestId("editor-summary")).toContainText("déverrouillé");
    await page.getByTestId("tool-editText").filter({ visible: true }).click();
    await expect(page.getByTestId("text-run").first()).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("editor-download").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download").click({ timeout: 30_000 });
    const bytes = await readDownload(await downloadPromise);
    await expectValidPdf(bytes, 3); // loads without a password: unlocked copy
    expect((await extractPageText(bytes, 0)).join(" ")).toContain("Page 1");
  });

  test("pages panel: rotate, duplicate, delete and reorder, undo included, exported in that order", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/pdf/modifier/");
    await uploadPdf(page, "simple-5-pages.pdf");
    await expect(page.getByTestId("editor-shell")).toBeVisible();
    if (isMobile) await page.getByTestId("panel-pages").filter({ visible: true }).click();
    const panel = page.getByTestId("pages-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("5 pages");
    await page.getByTestId("page-rotate-right-1").click();
    await page.getByTestId("page-duplicate-0").click(); // 1 1 2 3 4 5
    await expect(panel).toContainText("6 pages");
    await page.getByTestId("page-delete-5").click(); // 1 1 2 3 4
    await page.getByTestId("page-up-4").click(); // 1 1 2 4 3
    await expect(page.getByTestId("page-indicator")).toHaveText("Page 4 sur 5");
    await expect(page.getByTestId("editor-summary")).toContainText("réorganisées");
    await page.getByTestId("page-delete-0").click(); // 1 2 4 3
    await expect(panel).toContainText("4 pages");
    await page.getByTestId("undo").click(); // back to 5
    await expect(panel).toContainText("5 pages");
    await page.getByTestId("redo").click();
    await expect(panel).toContainText("4 pages");
    await page.getByTestId("editor-download").click();
    await expect(page.getByTestId("export-verified")).toContainText("4 pages", { timeout: 30_000 });
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download").click();
    const bytes = await readDownload(await downloadPromise);
    const doc = await expectValidPdf(bytes, 4);
    const texts = await Promise.all([0, 1, 2, 3].map((i) => extractPageText(bytes, i)));
    expect(texts.map((t) => t.join(" ").replace(/\s*\/.*$/, ""))).toEqual([
      "Page 1",
      "Page 2",
      "Page 4",
      "Page 3",
    ]);
    expect(doc.getPage(1).getRotation().angle).toBe(90);
  });

  test("undo covers text edits; closing with changes asks for confirmation", async ({ page }) => {
    await page.goto("/pdf/modifier/");
    await uploadPdf(page, "simple-3-pages.pdf");
    await page.getByTestId("tool-editText").filter({ visible: true }).click();
    const runs = page.getByTestId("text-run");
    await expect(runs).toHaveCount(2, { timeout: 20_000 });
    await runs.first().click();
    await page.getByTestId("text-run-editor").fill("Annulable");
    await page.getByTestId("text-run-editor").press("Enter");
    await expect(page.locator('[data-testid="text-run"][data-edited="true"]')).toHaveCount(1, {
      timeout: 20_000,
    });
    await page.getByTestId("undo").click();
    await expect(page.locator('[data-testid="text-run"][data-edited="true"]')).toHaveCount(0, {
      timeout: 20_000,
    });
    await expect(runs.first()).toHaveAttribute("aria-label", "Modifier « Page 1 / 3 »", {
      timeout: 20_000,
    });
    await page.getByTestId("redo").click();
    await expect(page.locator('[data-testid="text-run"][data-edited="true"]')).toHaveCount(1, {
      timeout: 20_000,
    });
    await page.getByTestId("editor-close").click();
    await expect(page.getByTestId("close-confirm")).toBeVisible();
    await page.getByRole("button", { name: "Continuer l'édition" }).click();
    await expect(page.getByTestId("editor-shell")).toBeVisible();
    await page.getByTestId("editor-close").click();
    await page.getByTestId("close-confirm-discard").click();
    await expect(page.getByTestId("pdf-dropzone")).toBeVisible();
    // Re-import after closing works.
    await uploadPdf(page, "simple-3-pages.pdf");
    await expect(page.getByTestId("editor-shell")).toBeVisible();
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
