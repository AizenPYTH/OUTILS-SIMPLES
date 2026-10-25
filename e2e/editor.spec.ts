import { expect, test } from "@playwright/test";
import { expectValidPdf, extractPageText, readDownload, uploadPdf } from "./helpers";

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
