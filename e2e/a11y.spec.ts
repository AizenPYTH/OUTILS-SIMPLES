/**
 * Accessibility audit: axe-core (injected from node_modules) on key pages,
 * keyboard navigation and dialog behaviour.
 */
import { expect, test, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import path from "node:path";
import { uploadPdf } from "./helpers";

const require = createRequire(__filename);
const axePath = path.join(path.dirname(require.resolve("axe-core/package.json")), "axe.min.js");

interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[] }[];
}

async function runAxe(page: Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async () => {
    // @ts-expect-error axe is injected at runtime
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } });
    return r.violations as AxeViolation[];
  });
  return result;
}

const PAGES = ["/", "/outils/", "/pdf/", "/pdf/fusionner/", "/numerisation/ocr/", "/images/compresser/", "/texte/compteur-de-mots/", "/developpeur/formater-valider-json/", "/calculatrices/tva/", "/codes/generateur-qr-code/", "/documents/markdown-vers-pdf/", "/guides/", "/mentions-legales/"];

test.describe("audit — accessibilité", () => {
  test("no serious or critical axe violation on key pages", async ({ page, isMobile }) => {
    test.skip(isMobile, "axe run on desktop layout");
    test.setTimeout(240_000);
    const report: Record<string, string[]> = {};
    for (const url of PAGES) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      const violations = await runAxe(page);
      const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      report[url] = violations.map((v) => `${v.impact}:${v.id} (${v.nodes.length})`);
      expect(blocking.map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`), url).toEqual([]);
    }
    console.log("axe minor/moderate findings:", JSON.stringify(report, null, 1));
  });

  test("a loaded tool page (with dropzone replaced) still passes axe", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop layout");
    await page.goto("/pdf/diviser/");
    await uploadPdf(page, "simple-5-pages.pdf");
    await expect(page.getByTestId("file-summary")).toBeVisible({ timeout: 30_000 });
    const blocking = (await runAxe(page)).filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test("keyboard: skip link, search dialog, tab order and file chooser", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard flow on desktop");
    await page.goto("/pdf/fusionner/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contenu$/);
    // Ctrl+K opens the search dialog with focus inside; Escape closes it and restores focus.
    await page.keyboard.press("Control+k");
    await expect(page.getByTestId("search-input")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("search-input")).toHaveCount(0);
    // The dropzone button is reachable and opens the file chooser with Enter.
    const button = page.getByRole("button", { name: /choisir/i }).first();
    await button.focus();
    await expect(button).toBeFocused();
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Enter");
    expect((await chooser).isMultiple()).toBe(true);
  });

  test("mobile menu traps focus and closes with Escape", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile menu");
    await page.goto("/");
    await page.getByTestId("mobile-menu-trigger").click();
    const nav = page.getByRole("navigation", { name: "Menu" });
    await expect(nav).toBeVisible();
    await page.keyboard.press("Tab");
    const inDialog = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    expect(inDialog).toBe(true);
    await page.keyboard.press("Escape");
    await expect(nav).toHaveCount(0);
    await expect(page.getByTestId("mobile-menu-trigger")).toBeFocused();
  });

  test("busy and error states are announced", async ({ page }) => {
    await page.goto("/pdf/compresser/");
    await uploadPdf(page, "corrupted.pdf");
    const error = page.getByTestId("error-panel");
    await expect(error).toBeVisible({ timeout: 30_000 });
    await expect(error).toHaveAttribute("role", "alert");
    await page.getByRole("button", { name: /autre fichier|recommencer/i }).first().click();
    await expect(page.getByTestId("pdf-input")).toBeAttached();
  });
});
