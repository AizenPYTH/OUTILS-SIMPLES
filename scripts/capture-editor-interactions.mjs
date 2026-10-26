/**
 * Screenshots of the reworked interactions (zoom, shapes, text, floating bar,
 * search) for docs/RAPPORT_RETOUR_UTILISATEUR_MODIFICATEUR.md. Chromium,
 * desktop 1366×860 and Pixel 7. Run with:
 * BASE_URL=http://127.0.0.1:3200 node scripts/capture-editor-interactions.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../docs/captures/retour-utilisateur");
const fixtures = path.resolve(here, "../tests/fixtures");
const base = process.env.BASE_URL ?? "http://127.0.0.1:3200";

const browser = await chromium.launch();
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`) });
const upload = (page, name) =>
  page.setInputFiles('[data-testid="pdf-input"]', path.join(fixtures, name));
const drag = async (page, a, b) => {
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
};

{
  const context = await browser.newContext({
    viewport: { width: 1366, height: 860 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${base}/pdf/modifier/`);
  await upload(page, "simple-3-pages.pdf");
  await page.getByTestId("editor-shell").waitFor();
  await page.waitForTimeout(500);
  // Zoom: 100 % then 200 % with Ctrl+wheel around a point.
  await page.getByTestId("zoom-level").click();
  await page.getByTestId("zoom-100").click();
  await page.waitForTimeout(400);
  await shot(page, "apres-01-zoom-100-taille-reelle");
  const area = await page.getByTestId("editor-canvas-area").boundingBox();
  await page.mouse.move(area.x + area.width * 0.5, area.y + 120);
  await page.keyboard.down("Control");
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -100);
  await page.keyboard.up("Control");
  await page.waitForTimeout(500);
  await shot(page, "apres-02-zoom-molette-ancree");
  await page.getByTestId("zoom-level").click();
  await page.waitForTimeout(200);
  await shot(page, "apres-03-menu-zoom");
  await page.getByTestId("zoom-fit-width").click();
  await page.waitForTimeout(400);
  // Rectangle: draw, then the floating bar.
  await page.getByTestId("tool-rect").first().click();
  const o = await page.getByTestId("annotation-overlay").boundingBox();
  await drag(page, { x: o.x + 90, y: o.y + 150 }, { x: o.x + 330, y: o.y + 290 });
  await page.waitForTimeout(300);
  await shot(page, "apres-04-rectangle-dessine-barre-flottante");
  await page.getByTestId("prop-stroke-color").fill("#d9262a");
  await page.getByTestId("prop-stroke-width").fill("5");
  await page.getByTestId("prop-dash").selectOption("dashed");
  await page.getByTestId("prop-fill-toggle").click();
  await page.waitForTimeout(300);
  await shot(page, "apres-05-rectangle-proprietes-modifiees");
  // Arrow + ellipse defaults.
  await page.getByTestId("tool-arrow").first().click();
  await drag(page, { x: o.x + 120, y: o.y + 420 }, { x: o.x + 360, y: o.y + 360 });
  await page.getByTestId("tool-ellipse").first().click();
  await drag(page, { x: o.x + 400, y: o.y + 150 }, { x: o.x + 560, y: o.y + 260 });
  await page.waitForTimeout(300);
  await shot(page, "apres-06-formes-styles-par-intention");
  // Text with the font palette.
  await page.getByTestId("tool-text").first().click();
  await page.mouse.click(o.x + 100, o.y + 520);
  await page.getByTestId("text-annotation-editor").fill("Texte ajouté — résumé, œuvre, 1 250,00 €");
  await page.getByTestId("page-indicator").click();
  await page.getByTestId("tool-select").first().click();
  const t = await page
    .getByTestId("annotation-overlay")
    .locator("div[aria-hidden]")
    .first()
    .boundingBox();
  await page.mouse.click(t.x + 10, t.y + t.height / 2);
  await page.getByTestId("prop-font-family").selectOption("gelasio");
  await page.getByTestId("prop-font-size").fill("22");
  await page.getByTestId("prop-underline").click();
  await page.waitForTimeout(600);
  await shot(page, "apres-07-texte-police-incorporee-barre");
  await page.mouse.dblclick(t.x + 10, t.y + t.height / 2);
  await page.waitForTimeout(300);
  const field = await page.getByTestId("text-annotation-editor").boundingBox();
  await page.mouse.dblclick(field.x + 40, field.y + field.height / 2);
  await page.waitForTimeout(200);
  await shot(page, "apres-08-double-clic-selection-mot");
  await page.keyboard.press("Escape");
  // Search panel with replacement.
  await page.keyboard.press("Control+f");
  await page.getByTestId("search-input").fill("page");
  await page
    .getByTestId("search-status")
    .filter({ hasText: "résultat" })
    .waitFor({ timeout: 15_000 });
  await page.getByTestId("replace-input").fill("Feuille");
  await page.waitForTimeout(300);
  await shot(page, "apres-09-recherche-remplacement");
  await page.getByTestId("side-panel-close").click();
  // Mask tool.
  await page.getByTestId("tool-mask").first().click();
  await drag(page, { x: o.x + 400, y: o.y + 500 }, { x: o.x + 560, y: o.y + 560 });
  await page.waitForTimeout(300);
  await shot(page, "apres-10-masque-visuel");
  await page.getByTestId("panel-shortcuts").first().click();
  await page.waitForTimeout(300);
  await shot(page, "apres-11-raccourcis");
  await context.close();
}

{
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  await page.goto(`${base}/pdf/modifier/`);
  await upload(page, "simple-3-pages.pdf");
  await page.getByTestId("editor-shell").waitFor();
  await page.getByTestId("tool-rect").last().click();
  const o = await page.getByTestId("annotation-overlay").boundingBox();
  await drag(page, { x: o.x + 40, y: o.y + 120 }, { x: o.x + 220, y: o.y + 240 });
  await page.waitForTimeout(400);
  await shot(page, "apres-12-mobile-rectangle-barre-flottante");
  await page.getByRole("button", { name: "Zoom avant" }).click();
  await page.getByRole("button", { name: "Zoom avant" }).click();
  await page.waitForTimeout(400);
  await shot(page, "apres-13-mobile-zoom");
  await context.close();
}
await browser.close();
console.log(`captures écrites dans ${outDir}`);
