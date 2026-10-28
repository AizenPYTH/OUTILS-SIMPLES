/**
 * Offline mode: the service worker stores a tool on demand, serves it without
 * network (hard load and client-side link), runs it, and sends unknown pages
 * to /hors-ligne/. Chromium only: Playwright's offline emulation covers
 * service worker fetches there.
 */
import { expect, test } from "@playwright/test";
import { expectValidPdf, readDownload, uploadPdf } from "./helpers";

test.describe("mode hors ligne", () => {
  test.beforeEach(async ({ browserName }) => {
    test.skip(browserName !== "chromium", "service worker offline emulation is Chromium-only");
  });

  test("a saved tool loads and works without network; unknown pages fall back", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await page.goto("/pdf/fusionner/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    const save = page.getByTestId("offline-save");
    await expect(save).toBeEnabled({ timeout: 20_000 });
    // Size shown in the button; the explanation is its accessible description.
    await expect(page.getByTestId("offline-size")).toContainText(/\d.*Mo/);
    await expect(save).toHaveAccessibleDescription(/à télécharger une seule fois/);
    await save.click();
    await expect(page.getByTestId("offline-available")).toBeVisible({ timeout: 120_000 });

    // The home page is kept simply because it was visited (network-first with cache).
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();

    await context.setOffline(true);
    try {
      // Hard load of the saved tool.
      await page.goto("/pdf/fusionner/");
      await expect(page.locator("h1")).toHaveText("Fusionner des PDF");
      await expect(page.getByTestId("offline-banner")).toBeVisible();
      await expect(page.getByTestId("offline-available")).toBeVisible({ timeout: 20_000 });

      // The tool runs entirely offline.
      await uploadPdf(page, "simple-3-pages.pdf", "simple-5-pages.pdf");
      await expect(page.getByTestId("merge-file-row")).toHaveCount(2);
      const downloadPromise = page.waitForEvent("download");
      await page.getByTestId("merge-button").click();
      await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 60_000 });
      await page.getByTestId("download-button").click();
      await expectValidPdf(await readDownload(await downloadPromise), 8);

      // The visited home page is served from the cache; a client-side link to the saved tool works.
      await page.goto("/");
      await expect(page.locator("h1")).toBeVisible();
      await page.locator('a[href="/pdf/fusionner/"]').filter({ visible: true }).first().click();
      await expect(page.locator("h1")).toHaveText("Fusionner des PDF", { timeout: 20_000 });

      // A page never stored falls back to the offline page, which lists the saved tool.
      await page.goto("/pdf/diviser/");
      await expect(page).toHaveURL(/\/hors-ligne\/$/);
      await expect(page.locator("h1")).toHaveText("Hors connexion");
      await expect(page.getByTestId("offline-list")).toContainText("Fusionner des PDF", {
        timeout: 20_000,
      });
    } finally {
      await context.setOffline(false);
    }
  });

  test("the offline page lists nothing on a fresh device and the manifest is served fresh", async ({
    page,
  }) => {
    await page.goto("/hors-ligne/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect(page.getByTestId("offline-list-empty")).toBeVisible({ timeout: 20_000 });
    const sw = await page.request.get("/sw.js");
    expect(sw.headers()["cache-control"]).toContain("no-cache");
    const manifest = await (await page.request.get("/offline-manifest.json")).json();
    expect(Object.keys(manifest.groups).sort()).toEqual(["fonts", "ocr", "pdf"]);
    expect(manifest.groups.pdf.files).toContain("/pdfjs/pdf.worker.min.mjs");
    expect(manifest.groups.pdf.files).toContain("/qpdf/qpdf.wasm");
  });

  test("an English page never stored falls back to the English offline page", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/en/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect(page.locator("h1")).toHaveText("Every tool for your PDFs and files");
    // Give the worker time to finish precaching both offline pages.
    await page.waitForTimeout(2_000);
    await context.setOffline(true);
    try {
      await page.goto("/en/pdf/split/");
      await expect(page).toHaveURL(/\/en\/offline\/$/, { timeout: 20_000 });
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator("h1")).toHaveText("Offline");
      await expect(page.getByTestId("offline-list-empty")).toBeVisible({ timeout: 20_000 });
    } finally {
      await context.setOffline(false);
    }
  });
});
