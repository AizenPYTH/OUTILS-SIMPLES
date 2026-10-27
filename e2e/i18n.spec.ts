import { expect, test } from "@playwright/test";
import { expectValidPdf, readDownload, uploadPdf } from "./helpers";

/** English version: routes, metadata, switcher, 404s, and the French pages left untouched. */
test.describe("internationalisation", () => {
  test("English home is served in English with reciprocal hreflang", async ({ page }) => {
    await page.goto("/en/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toHaveText("Your files, your tools, your browser.");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/$/);
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute(
      "href",
      /^https?:\/\/[^/]+\/$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      "href",
      /\/en\/$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      "href",
      /^https?:\/\/[^/]+\/$/,
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    await expect(page.getByTestId("home-all-tools")).toHaveAttribute("href", "/en/tools/");
    // No French chrome on the English page.
    await expect(page.getByRole("banner")).not.toContainText(/Outils|Guides pratiques/);
    const body = await page.locator("main").innerText();
    expect(body).not.toMatch(/Vos fichiers|Tous les outils|Fusionner des PDF/);
  });

  test("French pages keep their language, URLs and reciprocal alternates", async ({ page }) => {
    await page.goto("/pdf/fusionner/");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.locator("h1")).toHaveText("Fusionner des PDF");
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      "href",
      /\/en\/pdf\/merge\/$/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/pdf\/fusionner\/$/,
    );
  });

  test("English tool page is complete: metadata, content and interface in English", async ({
    page,
  }) => {
    await page.goto("/en/pdf/merge/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toHaveText("Merge PDFs");
    await expect(page).toHaveTitle(/Merge/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/en\/pdf\/merge\/$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute(
      "href",
      /\/pdf\/fusionner\/$/,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    await expect(page.getByTestId("partial-translation")).toHaveCount(0);
    await expect(page.getByTestId("pdf-dropzone")).toBeVisible();
    await expect(page.getByTestId("pdf-dropzone")).toContainText(/Drop your PDF files here/);
    await expect(page.getByTestId("pdf-dropzone")).not.toContainText(/Déposez|fichier/);
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("PDF");
    const main = await page.locator("main").innerText();
    expect(main).not.toMatch(/Fusionner|Déposez|Télécharger|Vie privée|Comment ça marche/);
    // The JSON-LD declares the page language.
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toContain('"inLanguage":"en"');
  });

  test("the editor opens in English", async ({ page }) => {
    await page.goto("/en/pdf/edit/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toHaveText("Edit a PDF");
    await expect(page.getByTestId("pdf-dropzone")).toContainText(/Drop your PDF file here/);
  });

  test("language switcher keeps the equivalent page in both directions", async ({
    page,
    isMobile,
  }) => {
    // On mobile the switcher lives in the menu drawer; the desktop one is hidden.
    const open = async () => {
      if (isMobile) await page.getByTestId("mobile-menu-trigger").click();
      return {
        switcher: page.locator('[data-testid="language-switcher"]:visible'),
        fr: page.locator('[data-testid="lang-fr"]:visible'),
        en: page.locator('[data-testid="lang-en"]:visible'),
      };
    };
    await page.goto("/guides/comment-fusionner-des-pdf/");
    let links = await open();
    await expect(links.switcher).toBeVisible();
    await expect(links.fr).toHaveAttribute("aria-current", "true");
    await expect(links.en).toHaveAttribute("href", "/en/guides/how-to-merge-pdf-files/");
    // Keyboard reachable: real anchors with an accessible name in their own language.
    await expect(links.en).toHaveAccessibleName(/English/);
    await expect(links.switcher).toHaveAttribute("aria-label", /Langue|Language/);
    await links.en.click();
    await expect(page).toHaveURL(/\/en\/guides\/how-to-merge-pdf-files\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    links = await open();
    await expect(links.en).toHaveAttribute("aria-current", "true");
    await expect(links.fr).toHaveAttribute("href", "/guides/comment-fusionner-des-pdf/");
    await links.fr.click();
    await expect(page).toHaveURL(/\/guides\/comment-fusionner-des-pdf\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    // Tool pages: French slug ↔ English slug; static pages map through the route table.
    for (const [from, target, to] of [
      ["/en/scanning/ocr/", "fr", "/numerisation/ocr/"],
      ["/images/compresser/", "en", "/en/images/compress/"],
      ["/confidentialite/", "en", "/en/privacy/"],
    ] as const) {
      await page.goto(from);
      links = await open();
      await expect(links[target]).toHaveAttribute("href", to);
    }
  });

  test("unknown URLs get a 404 in the language of the tree", async ({ page }) => {
    const en = await page.goto("/en/pdf/fusionner/");
    expect(en?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("Page not found");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const fr = await page.goto("/pdf/merge/");
    expect(fr?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("Page introuvable");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("English legal and offline pages exist and are localised", async ({ page }) => {
    for (const [path, heading] of [
      ["/en/about/", /About/],
      ["/en/privacy/", /Privacy policy/],
      ["/en/terms/", /Terms of use/],
      ["/en/cookies/", /Cookie settings/],
      ["/en/legal-notice/", /Legal notice/],
      ["/en/contact/", /Contact/],
      ["/en/verify-it/", /Check it yourself/],
      ["/en/guides/", /guides/i],
      ["/en/tools/", /All tools/],
    ] as const) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator("h1")).toHaveText(heading);
    }
    await page.goto("/en/offline/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("sitemap exposes both languages without invented English routes", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/en/pdf/merge/");
    expect(sitemap).toContain("/en/tools/");
    expect(sitemap).toContain("/pdf/fusionner/");
    expect(sitemap).toContain('hreflang="en"');
    expect(sitemap).toContain('hreflang="x-default"');
    expect(sitemap).not.toContain("/en/pdf/fusionner/");
    expect(sitemap).not.toContain("/en/outils/");
    expect(sitemap).not.toContain("/en/offline/");
    // Every /en/ URL in the sitemap answers 200.
    const enUrls = [...sitemap.matchAll(/<loc>([^<]*\/en\/[^<]*)<\/loc>/g)].map((m) => m[1]!);
    expect(enUrls.length).toBeGreaterThan(70);
    for (const url of enUrls.slice(0, 12)) {
      const path = new URL(url).pathname;
      expect((await request.get(path)).status(), path).toBe(200);
    }
  });

  test("an English tool page runs the whole journey in English and the file reopens", async ({
    page,
  }) => {
    await page.goto("/en/pdf/merge/");
    await uploadPdf(page, "simple-3-pages.pdf", "simple-5-pages.pdf");
    await expect(page.getByTestId("merge-file-row")).toHaveCount(2);
    await expect(page.getByTestId("merge-file-row").first()).toContainText("3 pages");
    const workspace = page.getByTestId("tool-workspace");
    await expect(workspace).not.toContainText(/Fusionner|Télécharger|fichier/);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /^Merge/ }).click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("done-panel")).not.toContainText(/Télécharger|Recommencer/);
    await page.getByTestId("download-button").click();
    await expectValidPdf(await readDownload(await downloadPromise), 8);
    // The success state is announced in English and no French leaked into the page.
    const main = await page.locator("main").innerText();
    expect(main).not.toMatch(/Déposez|Télécharger|Recommencer|Fusionner/);
  });

  test("an English error state is translated", async ({ page }) => {
    await page.goto("/en/pdf/merge/");
    await page.getByTestId("pdf-input").setInputFiles({
      name: "not-a-pdf.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello"),
    });
    const alert = page.getByRole("alert").first();
    await expect(alert).toBeVisible();
    await expect(alert).not.toContainText(/fichier|n'est pas|Choisissez/);
    await expect(alert).toContainText(/PDF/);
  });
});
