/**
 * Screenshots of the PDF editor for docs/RAPPORT_MODIFICATEUR_PDF.md, taken
 * in Chromium (desktop 1366×860 and Pixel 7 emulation) against a running
 * production build. Run with: BASE_URL=http://127.0.0.1:3200 node scripts/capture-editor-screenshots.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../docs/captures/modificateur");
const fixtures = path.resolve(here, "../tests/fixtures");
const base = process.env.BASE_URL ?? "http://127.0.0.1:3200";

const browser = await chromium.launch();
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`) });
const upload = (page, name) => page.setInputFiles('[data-testid="pdf-input"]', path.join(fixtures, name));

// Desktop
{
  const context = await browser.newContext({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${base}/pdf/modifier/`);
  await upload(page, "protected-user.pdf");
  await page.getByTestId("password-panel").waitFor();
  await shot(page, "01-import-mot-de-passe");
  await page.getByTestId("password-input").fill("secret42");
  await page.getByTestId("password-submit").click();
  await page.getByTestId("editor-shell").waitFor({ timeout: 60_000 });
  await page.getByTestId("tool-editText").first().click();
  await page.getByTestId("text-run").first().waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: "Afficher toutes les zones de texte modifiables" }).click();
  await page.waitForTimeout(400);
  await shot(page, "02-editeur-texte-natif-zones");
  await page.getByTestId("text-run").first().click();
  await page.getByTestId("text-run-editor").fill("Titre corrigé");
  await page.getByTestId("text-run-editor").press("Enter");
  await page.locator('[data-testid="text-run"][data-edited="true"]').first().waitFor({ timeout: 20_000 });
  await page.getByTestId("page-item-1").hover();
  await page.waitForTimeout(300);
  await shot(page, "03-texte-modifie-panneau-pages");
  await page.getByTestId("page-rotate-right-1").click();
  await page.getByTestId("page-duplicate-0").click();
  await page.getByTestId("panel-document").first().click();
  await page.waitForTimeout(400);
  await shot(page, "04-pages-reorganisees-panneau-document");
  await page.getByTestId("editor-download").click();
  await page.getByTestId("export-verified").waitFor({ timeout: 30_000 });
  await shot(page, "05-export-verifie");
  await page.keyboard.press("Escape");
  await page.getByTestId("editor-close").click();
  await page.getByTestId("close-confirm").waitFor();
  await shot(page, "06-fermeture-confirmation");
  await page.getByTestId("close-confirm-discard").click();

  await upload(page, "scan-text.pdf");
  await page.getByTestId("import-diagnosis").waitFor();
  await page.waitForTimeout(500);
  await shot(page, "07-import-diagnostic-scan");
  await page.getByTestId("diagnosis-run-ocr").click();
  await page.getByTestId("ocr-progress").waitFor();
  await shot(page, "08-ocr-en-cours");
  await page.getByTestId("ocr-layer-summary").waitFor({ timeout: 120_000 });
  await page.locator('[data-testid="text-run"][data-kind="ocr"]').first().waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: "Afficher toutes les zones de texte modifiables" }).click();
  await page.waitForTimeout(400);
  await shot(page, "09-ocr-termine-zones-reconnues");
  await page.locator('[data-testid="text-run"][data-kind="ocr"]').nth(2).click();
  await page.getByTestId("text-run-editor").waitFor();
  await page.waitForTimeout(200);
  await shot(page, "10-correction-passage-ocr");
  await page.keyboard.press("Escape");
  await page.getByTestId("panel-shortcuts").first().click();
  await page.waitForTimeout(300);
  await shot(page, "11-raccourcis");
  await context.close();
}

// Mobile (Pixel 7)
{
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  await page.goto(`${base}/pdf/modifier/`);
  await upload(page, "mixed-text-scan.pdf");
  await page.getByTestId("import-diagnosis").waitFor();
  await page.waitForTimeout(500);
  await shot(page, "12-mobile-diagnostic-mixte");
  await page.getByTestId("diagnosis-continue").click();
  await page.getByTestId("tool-editText").last().click();
  await page.getByTestId("text-run").first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(300);
  await shot(page, "13-mobile-editeur");
  await page.getByTestId("panel-pages").last().click();
  await page.getByTestId("pages-panel").waitFor();
  await page.waitForTimeout(300);
  await shot(page, "14-mobile-panneau-pages");
  await page.getByTestId("pages-panel-close").click();
  await page.getByTestId("panel-ocr").last().click();
  await page.getByTestId("side-panel-ocr").waitFor();
  await page.waitForTimeout(300);
  await shot(page, "15-mobile-panneau-ocr");
  await context.close();
}
await browser.close();
console.log(`captures écrites dans ${outDir}`);
