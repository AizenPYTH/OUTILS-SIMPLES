import { expect, test } from "@playwright/test";

/**
 * Design audit N1: on English routes the catalogue chrome (family titles,
 * sub-group titles, category navigation) must not fall back to French. French
 * routes keep their French labels.
 */
const FRENCH =
  /\b(Outils|Numérisation|Développeur|Calculs|couleurs|Organiser|Modifier et|Convertir et|Optimiser|Analyser|Retoucher|Données|Encodages|Générateurs|Utilitaires|Autres|à imprimer|Texte et)\b/;

const EN_PAGES = [
  "/en/tools/",
  "/en/pdf/",
  "/en/scanning/",
  "/en/images/",
  "/en/conversion/",
  "/en/text/",
  "/en/developer/",
  "/en/calculators/",
  "/en/codes/",
  "/en/documents/",
];

async function catalogueLabels(page: import("@playwright/test").Page) {
  return page
    .locator("main h1, main h2, main h3, main nav button, main nav li")
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.trim()).filter(Boolean));
}

test.describe("catalogue labels", () => {
  for (const path of EN_PAGES) {
    test(`English labels on ${path}`, async ({ page, request }) => {
      // Server HTML (what crawlers and the first paint get).
      const html = await (await request.get(path)).text();
      const headings = [...html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)].map((m) =>
        m[1]!.replace(/<[^>]+>/g, "").trim(),
      );
      expect(headings.length).toBeGreaterThan(0);
      for (const h of headings) expect(h, `${path} server heading`).not.toMatch(FRENCH);

      // Hydrated page.
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      const labels = await catalogueLabels(page);
      expect(labels.length).toBeGreaterThan(3);
      for (const label of labels) expect(label, `${path} visible label`).not.toMatch(FRENCH);
    });
  }

  test("French catalogue keeps French family and group titles", async ({ page }) => {
    await page.goto("/outils/");
    await expect(page.getByRole("heading", { name: "Outils PDF" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Organiser les pages" })).toBeVisible();
    await expect(page.getByTestId("category-chip-numerisation")).toContainText("Numérisation");
  });
});

test.describe("tool input limits", () => {
  for (const [path, noFile] of [
    ["/calculatrices/tva/", "Aucun fichier à importer"],
    ["/codes/generateur-qr-code/", "Aucun fichier à importer"],
    ["/documents/calendrier-a-imprimer/", "Aucun fichier à importer"],
    ["/en/calculators/vat/", "No file to import"],
  ] as const) {
    test(`no file size on ${path}`, async ({ page }) => {
      await page.goto(path);
      const limits = page.getByTestId("tool-input-limits");
      await expect(limits).toContainText(noFile);
      await expect(limits).not.toContainText(/0 (o|B)\b|Taille maximale|Maximum size/);
      await expect(limits).not.toContainText(/Formats acceptés|Accepted formats/);
    });
  }

  test("file tools keep their real limits", async ({ page }) => {
    await page.goto("/pdf/fusionner/");
    const limits = page.getByTestId("tool-input-limits");
    await expect(limits).toContainText("Formats acceptés");
    await expect(limits).toContainText("PDF");
    await expect(limits).toContainText(/Taille maximale\s*100 Mo · 30 fichiers max/);
    await page.goto("/conversion/word-vers-pdf/");
    await expect(page.getByTestId("tool-input-limits")).toContainText("Word (.docx)");
  });
});
