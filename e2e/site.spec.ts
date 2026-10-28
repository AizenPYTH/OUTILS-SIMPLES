import { expect, test } from "@playwright/test";

test.describe("site", () => {
  test("home page shows the search, every tool, the family filters and unique metadata", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/AVEROPDF/);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("Tous les outils pour vos PDF et vos fichiers");
    await expect(page.getByTestId("home-search")).toBeVisible();
    // "Tous" + the nine families.
    await expect(page.getByTestId("home-categories").getByRole("link")).toHaveCount(10);
    await expect(page.getByTestId("home-all-tools")).toHaveAttribute("href", "/outils/");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /PDF/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /^https?:\/\/[^/]+\/?$/,
    );
    // Every published tool is a tile, the most used first.
    const cards = page.getByTestId("tool-grid").getByTestId("tool-card");
    await expect(cards).toHaveCount(69);
    await expect(cards.first()).toContainText("Modifier un PDF");
    await expect(page.getByTestId("home-faq").locator("dt")).toHaveCount(4);
    // Every active family is linked (conversion became active with the Office tools).
    expect(await page.locator('a[href="/conversion/"]').count()).toBeGreaterThanOrEqual(1);
    await expect(page.getByTestId("consent-banner")).toHaveCount(0);
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toContain("WebSite");
  });

  test("home family filters narrow the grid in place", async ({ page }) => {
    await page.goto("/");
    const visible = page
      .getByTestId("tool-grid")
      .getByTestId("tool-card")
      .filter({ visible: true });
    await page.getByTestId("home-filter-pdf").click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("home-filter-pdf")).toHaveAttribute("aria-current", "true");
    await expect(visible).toHaveCount(27);
    await expect(visible.filter({ hasText: "Compresser une image" })).toHaveCount(0);
    await page.getByTestId("home-filter-images").click();
    await expect(visible.filter({ hasText: "Compresser une image" })).toHaveCount(1);
    await page.getByTestId("home-filter-all").click();
    await expect(visible).toHaveCount(69);
    // Without JavaScript the tab is a plain link to the family page.
    await expect(page.getByTestId("home-filter-pdf")).toHaveAttribute("href", "/pdf/");
  });

  test("home search leads to the catalogue with the query", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("home-search").fill("fusionner");
    await page.getByRole("button", { name: "Rechercher", exact: true }).click();
    await expect(page).toHaveURL(/\/outils\/\?q=fusionner$/);
    await expect(page.locator("h1")).toHaveText("Tous les outils");
    await expect(page.getByTestId("tool-grid").first()).toContainText("Fusionner des PDF");
  });

  test("category chips filter and search finds synonyms", async ({ page }) => {
    await page.goto("/outils/");
    await expect(page.locator("h1")).toHaveText("Tous les outils");
    // Every published tool is listed, grouped by family and sub-group (plus the popular row).
    expect(await page.getByTestId("tool-card").count()).toBeGreaterThanOrEqual(66);
    await expect(page.getByRole("heading", { name: "Organiser les pages" })).toBeVisible();
    await page.getByTestId("category-chip-pdf").click();
    await expect(page.locator("#results-heading")).toHaveText("Outils PDF");
    expect(await page.getByTestId("tool-card").count()).toBeGreaterThanOrEqual(27);
    await expect(
      page.getByTestId("tool-card").filter({ hasText: "Compresser une image" }),
    ).toHaveCount(0);
    const search = page.getByTestId("catalog-search");
    await search.fill("assembler");
    await expect(page.getByTestId("tool-grid").first().getByTestId("tool-card")).toHaveCount(1);
    await expect(page.getByTestId("tool-grid").first()).toContainText("Fusionner des PDF");
    await search.fill("licorne volante");
    await expect(page.getByTestId("no-results")).toBeVisible();
    await page.getByRole("button", { name: "Réinitialiser la recherche" }).click();
    await expect(page.getByTestId("no-results")).toHaveCount(0);
  });

  test("home page has no horizontal overflow", async ({ page, isMobile }) => {
    await page.goto("/");
    await page.getByTestId("tool-card").first().waitFor();
    const measure = () =>
      page.evaluate(() => ({
        inner: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
    let widths = await measure();
    expect(widths.scroll).toBeLessThanOrEqual(widths.inner);
    if (!isMobile) {
      for (const width of [1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 800 });
        widths = await measure();
        expect(widths.scroll, `viewport ${width}`).toBeLessThanOrEqual(widths.inner);
      }
    }
  });

  test("tool pages never overflow horizontally on mobile", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile layout check");
    const paths = [
      "/pdf/fusionner/",
      "/pdf/caviarder/",
      "/pdf/comparer-deux-pdf/",
      "/numerisation/scanner-un-document/",
      "/numerisation/ocr/",
      "/images/compresser/",
      "/images/filigrane/",
      "/texte/comparer-deux-textes/",
      "/developpeur/formater-valider-json/",
      "/documents/markdown-vers-pdf/",
      "/codes/generateur-qr-code/",
      "/outils/",
      "/guides/",
    ];
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const wide = await page.evaluate(() => {
        const max = document.documentElement.clientWidth + 1;
        const inScroller = (el: Element) => {
          for (
            let node = el.parentElement;
            node && node !== document.body;
            node = node.parentElement
          ) {
            if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(node).overflowX)) return true;
          }
          return false;
        };
        return Array.from(document.querySelectorAll("body *"))
          .filter((el) => getComputedStyle(el).position !== "fixed" && !inScroller(el))
          .map((el) => ({ el, rect: el.getBoundingClientRect() }))
          .filter(({ rect }) => rect.width > 20 && rect.right > max)
          .slice(0, 3)
          .map(
            ({ el, rect }) =>
              `${el.tagName}.${el.className.toString().slice(0, 60)} right=${Math.round(rect.right)}`,
          );
      });
      expect(wide, path).toEqual([]);
    }
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
        .getByRole("link", { name: /^PDF/ })
        .click();
    } else {
      // Family pages are linked from the footer (the home tabs filter in place).
      await page.getByRole("contentinfo").getByRole("link", { name: /^PDF/ }).click();
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
    expect(sitemap).toContain("/images/compresser/");
    expect(sitemap).toContain("/numerisation/corriger-un-document-photographie/");
    expect(sitemap).toContain("/documents/markdown-vers-pdf/");
    expect(sitemap).toContain("/calculatrices/tva/");
    expect(sitemap).toContain("/conversion/word-vers-pdf/");
    expect(sitemap).toContain("/outils/");
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
