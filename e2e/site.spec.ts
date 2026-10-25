import { expect, test } from "@playwright/test";

test.describe("site", () => {
  test("home page shows the catalogue, featured tools and unique metadata", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/OUTILIA/);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("Tous les outils");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /PDF/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /^https?:\/\/[^/]+\/?$/,
    );
    const cards = page.getByTestId("tool-card");
    expect(await cards.count()).toBeGreaterThanOrEqual(13);
    // No planned tool is linked as operational.
    await expect(page.locator('a[href*="/images/"]')).toHaveCount(0);
    await expect(page.getByTestId("consent-banner")).toHaveCount(0);
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toContain("WebSite");
  });

  test("category chips filter and search finds synonyms", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("category-chip-pdf").click();
    await expect(page.getByTestId("tool-grid").first().getByTestId("tool-card")).toHaveCount(13);
    const search = page.getByTestId("catalog-search");
    await search.fill("assembler");
    await expect(page.getByTestId("tool-grid").first().getByTestId("tool-card")).toHaveCount(1);
    await expect(page.getByTestId("tool-grid").first()).toContainText("Fusionner des PDF");
    await search.fill("licorne volante");
    await expect(page.getByTestId("no-results")).toBeVisible();
    await page.getByRole("button", { name: "Réinitialiser la recherche" }).click();
    await expect(page.getByTestId("no-results")).toHaveCount(0);
  });

  test("header search dialog is keyboard accessible", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop shortcut");
    await page.goto("/");
    await page.keyboard.press("Control+k");
    const input = page.getByTestId("search-input");
    await expect(input).toBeFocused();
    await input.fill("signer");
    await expect(page.getByTestId("search-result").first()).toContainText("Signer un PDF");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/pdf\/signer\/$/);
    await expect(page.locator("h1")).toHaveText("Signer un PDF");
  });

  test("navigation, 404 and legal pages", async ({ page, isMobile }) => {
    await page.goto("/");
    if (isMobile) {
      await page.getByTestId("mobile-menu-trigger").click();
      await page
        .getByRole("navigation", { name: "Menu" })
        .getByRole("link", { name: "Outils PDF" })
        .click();
    } else {
      await page
        .getByRole("navigation", { name: "Navigation principale" })
        .getByRole("link", { name: "PDF" })
        .click();
    }
    await expect(page).toHaveURL(/\/pdf\/$/);
    await expect(page.locator("h1")).toHaveText("Outils PDF");
    const missing = await page.goto("/pdf/inexistant/");
    expect(missing?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("Page introuvable");
    await page.goto("/mentions-legales/");
    await expect(page.locator("[data-placeholder]").first()).toBeVisible();
    await page.goto("/gestion-cookies/");
    await expect(page.getByRole("button", { name: "Gérer mes préférences" })).toBeVisible();
  });

  test("sitemap and robots only expose published pages", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/pdf/fusionner/");
    expect(sitemap).toContain("/pdf/modifier/");
    expect(sitemap).not.toContain("/images/");
    expect(sitemap).not.toContain("/outils/");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap:");
    const headers = (await request.get("/")).headers();
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });

  test("tool pages have unique titles, descriptions and canonical URLs", async ({ page }) => {
    const seen = new Set<string>();
    for (const slug of ["fusionner", "diviser", "compresser", "signer"]) {
      await page.goto(`/pdf/${slug}/`);
      const title = await page.title();
      expect(seen.has(title)).toBe(false);
      seen.add(title);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`/pdf/${slug}/$`),
      );
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index/);
      await expect(page.locator("h1")).toHaveCount(1);
    }
  });

  test("theme toggle switches to dark mode", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop control");
    await page.goto("/");
    await page.getByTestId("theme-toggle").click();
    await page.getByRole("menuitemradio", { name: "Sombre" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
