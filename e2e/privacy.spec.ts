/**
 * Privacy audit: while real tools run on real files, every network request
 * must stay on the site's own origin, carry no request body, and the browser
 * must not persist anything but the consent choice.
 */
import { expect, test, type Page, type Request } from "@playwright/test";
import { fixture, uploadPdf } from "./helpers";

function watch(page: Page): Request[] {
  const requests: Request[] = [];
  page.on("request", (r) => requests.push(r));
  return requests;
}

function offending(requests: Request[], origin: string): string[] {
  return requests
    .filter((r) => {
      const url = new URL(r.url());
      if (url.protocol === "blob:" || url.protocol === "data:") return false;
      return url.origin !== origin || (r.method() !== "GET" && r.method() !== "HEAD") || r.postData() !== null;
    })
    .map((r) => `${r.method()} ${r.url()}`);
}

test.describe("audit — confidentialité", () => {
  test("merging, compressing, QR and OCR never leave the origin and send no body", async ({ page, baseURL }) => {
    test.setTimeout(300_000);
    const origin = new URL(baseURL!).origin;
    const requests = watch(page);

    await page.goto("/pdf/fusionner/");
    await uploadPdf(page, "simple-3-pages.pdf", "simple-5-pages.pdf");
    await page.getByTestId("merge-button").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 30_000 });

    await page.goto("/images/compresser/");
    await page.setInputFiles('[data-testid="image-dropzone-input"]', fixture("photo-800x600.jpg"));
    await page.getByTestId("batch-run").click();
    await expect(page.getByTestId("batch-item")).toHaveAttribute("data-status", "done", { timeout: 30_000 });

    await page.goto("/codes/generateur-qr-code/");
    await page.getByTestId("qr-url").fill("https://exemple.fr/secret?token=abc");
    await expect(page.getByTestId("qr-payload")).toHaveText("https://exemple.fr/secret?token=abc");

    await page.goto("/numerisation/ocr/");
    await page.setInputFiles('[data-testid="ocr-dropzone-input"]', fixture("text-french.png"));
    await page.getByTestId("ocr-run").click();
    await expect(page.getByTestId("ocr-page-text")).toHaveValue(/Facture/, { timeout: 180_000 });

    expect(offending(requests, origin)).toEqual([]);
    // The OCR engine and language model were fetched from this origin only.
    const ocrAssets = requests.map((r) => new URL(r.url()).pathname).filter((p) => p.startsWith("/ocr/"));
    expect(ocrAssets.some((p) => p.includes("/core/tesseract-core-") && p.endsWith(".wasm.js"))).toBe(true);
    expect(ocrAssets.some((p) => p.includes("/lang/fra"))).toBe(true);
    // No CDN: every request mentioning tesseract or traineddata is a same-origin one.
    expect(requests.filter((r) => /tesseract|traineddata/i.test(r.url())).every((r) => new URL(r.url()).origin === origin)).toBe(true);

    // Nothing but the consent preference may be persisted.
    const storage = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookies: document.cookie }));
    expect(storage.local.filter((k) => !k.toLowerCase().includes("consent") && !k.toLowerCase().includes("theme"))).toEqual([]);
    expect(storage.session).toEqual([]);
    expect(storage.cookies).toBe("");
  });

  test("protecting a PDF keeps the password in the browser (no request carries it)", async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const requests = watch(page);
    await page.goto("/pdf/proteger-par-mot-de-passe/");
    await uploadPdf(page, "simple-3-pages.pdf");
    await page.getByTestId("pw-user").fill("motdepasse-ultra-secret");
    await page.getByTestId("protect-run").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 90_000 });
    expect(offending(requests, origin)).toEqual([]);
    expect(requests.some((r) => r.url().includes("ultra-secret") || (r.postData() ?? "").includes("ultra-secret"))).toBe(false);
    const indexed = await page.evaluate(async () => (await indexedDB.databases?.())?.map((d) => d.name ?? "") ?? []);
    expect(indexed).toEqual([]);
  });
});
