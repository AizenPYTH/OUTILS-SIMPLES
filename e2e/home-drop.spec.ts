/**
 * Home page drop zone: the file type is detected locally, matching tools are
 * proposed, and the file follows the visitor to the chosen tool.
 */
import { expect, test } from "@playwright/test";
import { fixture } from "./helpers";

test.describe("accueil : dépôt de fichier", () => {
  test("a PDF proposes the editor first and travels to the merge tool", async ({ page }) => {
    await page.goto("/");
    await page.setInputFiles('[data-testid="home-drop-input"]', fixture("simple-3-pages.pdf"));
    await expect(page.getByTestId("home-drop-kind")).toHaveText("Document PDF");
    const suggestions = page.getByTestId("home-drop-suggestion");
    await expect(suggestions.first()).toContainText("Modifier un PDF");
    await suggestions.filter({ hasText: "Fusionner des PDF" }).click();
    await expect(page).toHaveURL(/\/pdf\/fusionner\/$/);
    await expect(page.getByTestId("merge-file-row")).toHaveCount(1, { timeout: 30_000 });
    await expect(page.getByTestId("merge-file-row").first()).toContainText("simple-3-pages.pdf");
  });

  test("an image, a Word file and an unknown file get the right answer", async ({ page }) => {
    await page.goto("/");
    await page.setInputFiles('[data-testid="home-drop-input"]', fixture("photo-800x600.jpg"));
    await expect(page.getByTestId("home-drop-kind")).toHaveText("Image");
    await expect(page.getByTestId("home-drop-suggestion").first()).toContainText(
      "Compresser une image",
    );
    await page.getByRole("button", { name: "Retirer ce fichier" }).click();

    await page.setInputFiles('[data-testid="home-drop-input"]', fixture("office-sample.docx"));
    await expect(page.getByTestId("home-drop-kind")).toHaveText("Document Word (.docx)");
    await page.getByTestId("home-drop-suggestion").first().click();
    await expect(page).toHaveURL(/\/conversion\/word-vers-pdf\/$/);
    await expect(page.getByTestId("office-file-name")).toHaveText("office-sample.docx", {
      timeout: 30_000,
    });

    await page.goto("/");
    await page.setInputFiles('[data-testid="home-drop-input"]', fixture("corrupted.pdf"));
    // corrupted.pdf still starts with %PDF: detected as PDF, the tool page reports the corruption.
    await expect(page.getByTestId("home-drop-kind")).toHaveText("Document PDF");
  });
});
