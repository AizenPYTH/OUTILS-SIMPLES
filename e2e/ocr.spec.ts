/**
 * OCR through the real interface, with the synthetic parcel label whose
 * regions read at 0°, 90° and 180° (regression case for mixed orientations).
 * Runs the self-hosted Tesseract in Chromium; nothing leaves the browser.
 */
import { expect, test } from "@playwright/test";
import { extractTextItems, fixture, readDownload } from "./helpers";

test.describe("OCR — orientations mixtes", () => {
  test("the label's upright, rotated and upside-down regions are read, shown and exported in place", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.goto("/numerisation/ocr/");
    await page.setInputFiles(
      '[data-testid="ocr-dropzone"] input[type=file]',
      fixture("label-mixed-orientation.pdf"),
    );
    await expect(page.getByTestId("ocr-run")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("ocr-advanced-toggle").click();
    await expect(page.getByTestId("ocr-orientation")).toContainText("Automatique");
    await page.getByTestId("ocr-run").click();
    const text = page.getByTestId("ocr-page-text");
    await expect(text).toHaveValue(/LIVRAISON EXPRESS 24H/, { timeout: 180_000 });
    const value = await text.inputValue();
    expect(value).toContain("MADAME CLAIRE DUPONT");
    expect(value).toContain("EXPEDITEUR BOUTIQUE DES ARTS");
    expect(value).toContain("REFERENCE CMD 48213");
    // The 180° line is read by the extra pass, its garbage reading discarded.
    expect(value).toContain("RETOUR SI ABSENT");
    expect(value).not.toMatch(/SIVTIF|YNOLIU/);
    await expect(page.getByTestId("ocr-page-meta")).toContainText("Orientations mixtes");
    await expect(page.getByTestId("ocr-zones").locator("rect").first()).toBeAttached();

    await page.getByRole("tab", { name: "PDF recherchable" }).click();
    const download = page.waitForEvent("download");
    await page.getByTestId("ocr-export-pdf").click();
    const bytes = await readDownload(await download);
    const items = await extractTextItems(bytes, 0);
    const angleOf = (s: string) => {
      const item = items.find((i) => i.str === s)!;
      expect(item, s).toBeTruthy();
      return Math.round((Math.atan2(item.transform[1]!, item.transform[0]!) * 180) / Math.PI);
    };
    expect(angleOf("DUPONT")).toBe(0);
    expect(angleOf("BOUTIQUE")).toBe(90);
    expect(Math.abs(angleOf("RETOUR"))).toBe(180);
    // Rotated words keep a plausible size (from the box width), not a page-high glyph.
    const boutique = items.find((i) => i.str === "BOUTIQUE")!;
    expect(Math.hypot(boutique.transform[0]!, boutique.transform[1]!)).toBeLessThan(16);
    expect(boutique.transform[4]).toBeGreaterThan(300); // right-hand panel of a 420pt-wide page
  });
});
