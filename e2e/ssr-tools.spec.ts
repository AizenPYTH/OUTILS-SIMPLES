import { expect, test } from "@playwright/test";

/**
 * QR code generator, regex tester and UUID generator are server-rendered so
 * that the page does not jump when they load (layout shift measured in
 * docs/RAPPORT_FINALISATION_OUTILIA.md). The server HTML holds the real tool
 * (no loading placeholder), in the page's language, inert until hydration;
 * the browser then takes over without hydration errors.
 */
const PAGES = [
  { path: "/codes/generateur-qr-code/", text: "Adresse web" },
  { path: "/developpeur/testeur-regex/", text: "Expression régulière" },
  { path: "/developpeur/generateur-uuid/", text: "Régénérer" },
  { path: "/en/codes/qr-code-generator/", text: "Web address", notText: "Adresse web" },
  {
    path: "/en/developer/regex-tester/",
    text: "Regular expression",
    notText: "Expression régulière",
  },
  { path: "/en/developer/uuid-generator/", text: "Regenerate", notText: "Régénérer" },
];

test.describe("server-rendered form tools", () => {
  for (const { path, text, notText } of PAGES) {
    test(`server HTML and hydration of ${path}`, async ({ page, request }) => {
      const html = await (await request.get(path)).text();
      const slot = html.slice(html.indexOf("data-tool-slot"));
      expect(slot).toContain('inert=""');
      expect(slot.slice(0, 4000)).not.toContain('aria-busy="true"');
      expect(html).not.toContain('<template id="B:');
      expect(html).toContain(text);
      if (notText) expect(html).not.toContain(notText);

      const problems: string[] = [];
      page.on("pageerror", (e) => problems.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error" || /hydrat/i.test(m.text())) problems.push(m.text());
      });
      await page.goto(path);
      await expect(page.locator("[data-tool-slot] [data-hydrated]")).toBeAttached();
      await expect(page.locator("[data-tool-slot] [inert]")).toHaveCount(0);
      expect(problems).toEqual([]);
    });
  }

  test("tools stay interactive after hydration", async ({ page }) => {
    await page.goto("/developpeur/testeur-regex/");
    await expect(page.locator("[data-tool-slot] [data-hydrated]")).toBeAttached();
    await page.getByTestId("regex-pattern").fill("\\d{5}");
    await expect(page.locator("[data-tool-slot]")).toContainText("75011");
    await page.goto("/codes/generateur-qr-code/");
    await expect(page.locator("[data-tool-slot] [data-hydrated]")).toBeAttached();
    await page.getByTestId("qr-url").fill("https://example.org/");
    await expect(page.getByRole("button", { name: /PNG/ })).toBeEnabled();
  });
});
