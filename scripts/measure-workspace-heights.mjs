// Measures the loaded height of every tool's work area and rewrites
// src/lib/tools/workspace-heights.ts (reserved while the tool loads, see
// src/components/tools/tool-renderer.tsx).
//
//   pnpm build && pnpm start -p 3100
//   node scripts/measure-workspace-heights.mjs http://127.0.0.1:3100
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://127.0.0.1:3100";
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
const paths = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)]
  .map((m) => m[1])
  .filter((p) => !p.startsWith("/en/") && !p.startsWith("/guides/"))
  .filter((p) => p.split("/").filter(Boolean).length === 2)
  // Form-based families only. Measured (Lighthouse mobile, docs/AUDIT_DESIGN.md
  // §7.7): their tools grow far beyond the skeleton (CLS 0.17–0.24 without a
  // reservation). Drop-zone tools (PDF, scanning, images, conversion) stay
  // close to the skeleton (CLS ≤ 0.02) and a reservation pushed their large
  // text below the fold, delaying LCP from 3.3 s to 6.3 s.
  .filter((p) => /^\/(texte|developpeur|calculatrices|codes|documents)\//.test(p))
  // Measured exceptions: with a reservation their lab LCP went above 4 s (the
  // large text that moves below the fold was their early LCP). Left as they
  // were; see the open items of docs/AUDIT_DESIGN.md §7.5.
  .filter(
    (p) =>
      ![
        "/codes/generateur-qr-code/",
        "/developpeur/testeur-regex/",
        "/developpeur/generateur-uuid/",
      ].includes(p),
  );

const browser = await chromium.launch();
const heights = {};
for (const [index, width] of [
  [0, 390],
  [1, 1440],
]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  for (const path of paths) {
    const page = await context.newPage();
    await page.goto(base + path, { waitUntil: "networkidle" });
    const slot = page.locator("[data-tool-slot]");
    if ((await slot.count()) === 1) {
      await page.waitForFunction(
        () => !document.querySelector("[data-tool-slot] > [aria-busy='true']"),
      );
      const id = await slot.getAttribute("data-tool-slot");
      const box = await slot.boundingBox();
      heights[id] ??= [0, 0];
      heights[id][index] = Math.round(box.height);
    }
    await page.close();
  }
  await context.close();
}
await browser.close();

const lines = Object.keys(heights)
  .sort()
  .map((id) => `  "${id}": [${heights[id][0]}, ${heights[id][1]}],`);
const file = new URL("../src/lib/tools/workspace-heights.ts", import.meta.url);
writeFileSync(
  file,
  `/**
 * Height (CSS px) of each tool's work area once loaded, measured on the
 * production build at 390 px (phones) and 1440 px (from the "sm" breakpoint
 * up) by \`scripts/measure-workspace-heights.mjs\`. Tools are client-only
 * components: while one loads, its slot reserves this height so that the
 * content below does not jump when it appears (CLS). Approximate by nature:
 * re-run the script after changing a tool's initial layout.
 */
export const workspaceHeights: Record<string, readonly [phone: number, wide: number]> = {
${lines.join("\n")}
};
`,
);
console.log(`${lines.length} tools measured`);
