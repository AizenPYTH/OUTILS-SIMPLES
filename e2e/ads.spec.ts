import { expect, test } from "@playwright/test";

/**
 * Advertising infrastructure, default (disabled) configuration: no ad slot,
 * no preview box, no advertising request, in both languages. Pages are the
 * ones that host a placement (home, tool, guide, category) plus pages that
 * must never host one (legal, 404).
 */
const PAGES = [
  "/",
  "/en/",
  "/pdf/fusionner/",
  "/en/pdf/merge/",
  "/pdf/modifier/",
  "/guides/comment-fusionner-des-pdf/",
  "/en/guides/how-to-merge-pdf-files/",
  "/pdf/",
  "/en/pdf/",
  "/outils/",
  "/confidentialite/",
  "/en/privacy/",
  "/page-inexistante/",
];

test.describe("advertising placements (disabled by default)", () => {
  test("no slot, no preview, no advertising script or request on any page", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (/googlesyndication|doubleclick|googleadservices|adsbygoogle/.test(url))
        external.push(url);
    });
    for (const url of PAGES) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await expect(page.locator('[data-testid^="ad-slot-"]'), url).toHaveCount(0);
      await expect(page.getByTestId("ad-preview"), url).toHaveCount(0);
      await expect(page.locator("ins.adsbygoogle"), url).toHaveCount(0);
      await expect(page.locator('script[src*="googlesyndication"]'), url).toHaveCount(0);
      const text = await page.locator("body").innerText();
      expect(text, url).not.toMatch(/\bPublicité\b|\bAdvertisement\b/);
    }
    expect(external).toEqual([]);
  });

  test("the editor keeps its controls reachable with the placements in place", async ({ page }) => {
    await page.goto("/pdf/modifier/");
    await expect(page.getByTestId("pdf-dropzone")).toBeVisible();
    const box = (await page.getByTestId("pdf-dropzone").boundingBox())!;
    expect(box.width).toBeGreaterThan(200);
    // No element overlaps the drop zone's centre.
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const topElement = await page.evaluate(
      ({ x, y }: { x: number; y: number }) => {
        const el = document.elementFromPoint(x, y);
        return el?.closest('[data-testid="pdf-dropzone"]') ? "dropzone" : el?.tagName;
      },
      { x: cx, y: cy },
    );
    expect(topElement).toBe("dropzone");
  });
});
