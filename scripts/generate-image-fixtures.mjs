/**
 * Renders synthetic image fixtures with Chromium (Playwright) into tests/fixtures:
 *  - photo-800x600.jpg : gradient + shapes (compression / resize tests)
 *  - logo-alpha.png    : transparent PNG (format conversion tests)
 *  - text-french.png   : printed French paragraph, 1200×700, for OCR tests
 *  - sheet-perspective.jpg : a white "sheet" drawn in perspective on a dark desk, for corner detection
 * Run with: node scripts/generate-image-fixtures.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../tests/fixtures");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<canvas id=c></canvas>");

async function render(width, height, drawSource, type, quality) {
  const dataUrl = await page.evaluate(
    ({ width, height, drawSource, type, quality }) => {
      const canvas = document.getElementById("c");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      new Function("ctx", "width", "height", drawSource)(ctx, width, height);
      return canvas.toDataURL(type, quality);
    },
    { width, height, drawSource, type, quality },
  );
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

const photo = await render(
  800,
  600,
  `const g = ctx.createLinearGradient(0,0,width,height); g.addColorStop(0,'#2b6cb0'); g.addColorStop(1,'#f6ad55'); ctx.fillStyle=g; ctx.fillRect(0,0,width,height);
   for (let i=0;i<40;i++){ ctx.fillStyle = 'hsla(' + (i*37)%360 + ',70%,55%,0.7)'; ctx.beginPath(); ctx.arc((i*173)%width,(i*97)%height,20+(i%7)*8,0,Math.PI*2); ctx.fill(); }
   ctx.fillStyle='#fff'; ctx.font='bold 48px sans-serif'; ctx.fillText('OUTILIA', 40, 80);`,
  "image/jpeg",
  0.92,
);
const logo = await render(
  256,
  256,
  `ctx.clearRect(0,0,width,height); ctx.fillStyle='#5146E5'; ctx.beginPath(); ctx.arc(128,128,100,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.font='bold 90px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('O',128,132);`,
  "image/png",
);
const text = await render(
  1200,
  700,
  `ctx.fillStyle='#fff'; ctx.fillRect(0,0,width,height); ctx.fillStyle='#111'; ctx.font='34px Arial, Helvetica, sans-serif';
   const lines=['Facture numéro 2026-0042','Le présent document est un exemple de texte imprimé.','Montant total : 1 250,00 euros','Merci de régler avant le 30 novembre 2026.','Numérisation et reconnaissance de caractères.'];
   lines.forEach((l,i)=>ctx.fillText(l, 80, 120 + i*90));`,
  "image/png",
);
const sheet = await render(
  900,
  700,
  `ctx.fillStyle='#4a3b2a'; ctx.fillRect(0,0,width,height);
   for (let i=0;i<300;i++){ ctx.fillStyle='rgba(0,0,0,'+(Math.random()*0.15)+')'; ctx.fillRect(Math.random()*width, Math.random()*height, 3, 3); }
   ctx.fillStyle='#f4f1ea'; ctx.beginPath(); ctx.moveTo(220,120); ctx.lineTo(700,90); ctx.lineTo(740,600); ctx.lineTo(180,560); ctx.closePath(); ctx.fill();
   ctx.fillStyle='#333'; ctx.font='28px sans-serif'; ctx.fillText('Document photographié', 300, 250); ctx.fillRect(300, 300, 320, 6); ctx.fillRect(300, 340, 260, 6); ctx.fillRect(300, 380, 300, 6);`,
  "image/jpeg",
  0.9,
);
await browser.close();
for (const [name, bytes] of [["photo-800x600.jpg", photo], ["logo-alpha.png", logo], ["text-french.png", text], ["sheet-perspective.jpg", sheet]]) {
  await writeFile(path.join(outDir, name), bytes);
  console.log(`wrote ${name} (${bytes.length} bytes)`);
}
