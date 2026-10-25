/**
 * Fixtures produced by a different PDF producer than pdf-lib: Chromium's
 * print engine (Skia), which embeds subset TrueType fonts with Identity-H
 * encoding. Run with: node scripts/generate-browser-fixtures.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../tests/fixtures");

const html = `<!doctype html><html lang="fr"><meta charset="utf-8">
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: "DejaVu Serif", serif; color: #111; }
  h1 { font-family: "DejaVu Sans", sans-serif; font-size: 24px; margin: 0 0 12px; }
  p { font-size: 14px; line-height: 1.5; margin: 0 0 8px; }
  .cols { column-count: 2; column-gap: 24px; font-size: 12px; }
  .rot { position: absolute; left: 480px; top: 420px; transform: rotate(-90deg); transform-origin: left top; font-family: "DejaVu Sans", sans-serif; font-size: 12px; white-space: nowrap; }
  .small { font-size: 8px; }
</style>
<body>
<h1>Rapport d'activité 2026</h1>
<p>Bonjour à toutes et à tous, voici le résumé de l'année écoulée.</p>
<p>Chiffre d'affaires : 1 250 000 € (+12 %). Clients satisfaits : 98 %.</p>
<div class="cols">
<p>Première colonne, premier paragraphe du rapport, avec quelques mots supplémentaires pour remplir la ligne.</p>
<p>Première colonne, second paragraphe.</p>
<p>Seconde colonne, premier paragraphe du rapport, lui aussi un peu long pour occuper deux lignes.</p>
<p>Seconde colonne, second paragraphe.</p>
</div>
<p class="small">Mentions en petits caractères : document généré pour les tests.</p>
<div class="rot">Référence interne ABC-42 tournée</div>
<div style="page-break-after: always"></div>
<h1>Deuxième page</h1>
<p>Cette page ne doit pas changer quand on modifie la première.</p>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({
  path: path.join(outDir, "chromium-report.pdf"),
  format: "A4",
  printBackground: true,
});
await browser.close();
console.log("wrote chromium-report.pdf");
