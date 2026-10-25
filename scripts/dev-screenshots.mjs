import { chromium } from "@playwright/test";
const out =
  "/tmp/claude-0/-home-user-OUTILS-SIMPLES/5b0bd9eb-a26f-5557-be36-5eb9728720c7/scratchpad/shots";
const base = "http://127.0.0.1:3100";
const browser = await chromium.launch();
const errors = [];
async function shot(name, url, opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.viewport ?? { width: 1366, height: 900 },
    colorScheme: opts.dark ? "dark" : "light",
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${name} console: ${m.text()}`));
  await page.goto(base + url, { waitUntil: "networkidle" });
  if (opts.action) await opts.action(page);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: opts.full ?? false });
  await ctx.close();
}
await shot("home", "/");
await shot("home-mobile", "/", { viewport: { width: 390, height: 844 }, full: true });
await shot("home-dark", "/", { dark: true });
await shot("tool-merge", "/pdf/fusionner/", { full: true });
await shot("tool-merge-mobile", "/pdf/fusionner/", { viewport: { width: 390, height: 844 } });
await shot("category-pdf", "/pdf/");
await shot("guide", "/guides/comment-fusionner-des-pdf/");
await shot("legal", "/mentions-legales/");
await shot("editor", "/pdf/modifier/", {
  action: async (page) => {
    await page.setInputFiles(
      '[data-testid="pdf-input"]',
      "/home/user/OUTILS-SIMPLES/tests/fixtures/simple-3-pages.pdf",
    );
    await page.waitForSelector('[data-testid="editor-shell"]');
    await page.waitForTimeout(1500);
  },
});
await shot("editor-mobile", "/pdf/signer/", {
  viewport: { width: 390, height: 844 },
  action: async (page) => {
    await page.setInputFiles(
      '[data-testid="pdf-input"]',
      "/home/user/OUTILS-SIMPLES/tests/fixtures/simple-3-pages.pdf",
    );
    await page.waitForSelector('[data-testid="editor-shell"]');
    await page.waitForTimeout(1500);
  },
});
await shot("organize", "/pdf/organiser/", {
  action: async (page) => {
    await page.setInputFiles(
      '[data-testid="pdf-input"]',
      "/home/user/OUTILS-SIMPLES/tests/fixtures/simple-5-pages.pdf",
    );
    await page.waitForSelector('[data-testid="organize-grid"]');
    await page.waitForTimeout(1500);
  },
});
await shot("watermark", "/pdf/ajouter-filigrane/", {
  full: true,
  action: async (page) => {
    await page.setInputFiles(
      '[data-testid="pdf-input"]',
      "/home/user/OUTILS-SIMPLES/tests/fixtures/simple-3-pages.pdf",
    );
    await page.waitForSelector('[data-testid="watermark-preview"]');
    await page.waitForTimeout(1500);
  },
});
await browser.close();
console.log("errors:", JSON.stringify(errors, null, 1));
