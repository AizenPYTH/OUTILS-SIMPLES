/**
 * Camera flows with Chromium's FAKE media device (a synthetic moving pattern).
 * This proves the getUserMedia → <video> → canvas → page pipeline and the
 * permission handling, not a physical camera: see docs/AUDIT_QUALITE.md for
 * the manual procedure on real phones.
 */
import { expect, test } from "@playwright/test";
import { expectValidPdf, readDownload } from "./helpers";

test.use({
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
  permissions: ["camera"],
});

test.describe("clôture — caméra (périphérique factice Chromium)", () => {
  test("scanner : photographier avec la caméra ajoute une page et exporte un PDF", async ({
    page,
  }) => {
    await page.goto("/numerisation/scanner-un-document/");
    await page.getByTestId("scan-camera").first().click();
    const shutter = page.getByTestId("camera-shutter");
    await expect(shutter).toBeEnabled({ timeout: 30_000 });
    await shutter.click();
    // Review step: the photo is shown as captured, nothing is added yet.
    const review = page.getByTestId("camera-review");
    await expect(review).toBeVisible();
    await expect(page.getByTestId("scan-thumb")).toHaveCount(0);
    await page.getByTestId("camera-retake").click();
    await expect(review).toHaveCount(0);
    await shutter.click();
    await page.getByTestId("camera-keep").click();
    await expect(page.getByTestId("camera-page-count")).toHaveText("1 page");
    await expect(page.getByTestId("scan-thumb")).toHaveCount(1, { timeout: 30_000 });
    // The camera stays open to chain pages: second shot, keep, then finish.
    await expect(shutter).toBeEnabled();
    await shutter.click();
    await page.getByTestId("camera-keep").click();
    await expect(page.getByTestId("scan-thumb")).toHaveCount(2, { timeout: 30_000 });
    await expect(page.getByTestId("camera-page-count")).toHaveText("2 pages");
    await page.getByTestId("camera-done").click();
    // The page keeps the original colours (fake device = green frame), no filter applied by default.
    await expect(page.getByRole("radio", { name: /Couleur/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const sample = await page.evaluate(() => {
      const canvas = document.querySelector(
        '[data-testid="scan-preview"] canvas',
      ) as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      const d = ctx.getImageData(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height * 0.1),
        1,
        1,
      ).data;
      return [d[0], d[1], d[2]];
    });
    expect(sample[1]!).toBeGreaterThan(sample[0]! + 40);
    expect(sample[1]!).toBeGreaterThan(sample[2]! + 40);
    // Straighten (four corners) is available on the page and applies without destroying the original.
    await page.getByTestId("scan-straighten").click();
    await expect(page.getByRole("dialog", { name: "Redresser la page" })).toBeVisible();
    await page.getByTestId("scan-straighten-apply").click();
    await expect(page.getByRole("dialog", { name: "Redresser la page" })).toHaveCount(0);
    await page.getByRole("radio", { name: /Noir et blanc/ }).click();
    await page.getByRole("radio", { name: /Couleur/ }).click();
    await expect(page.getByRole("radio", { name: /Couleur/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const download = page.waitForEvent("download");
    await page.getByTestId("scan-export").click();
    await expect(page.getByTestId("done-panel")).toBeVisible({ timeout: 90_000 });
    await page.getByTestId("download-button").click();
    await expectValidPdf(await readDownload(await download), 2);
    // The stream must be stopped once the dialog is closed.
    const live = await page.evaluate(() =>
      Array.from(document.querySelectorAll("video")).some((v) =>
        (v.srcObject as MediaStream | null)?.getTracks().some((t) => t.readyState === "live"),
      ),
    );
    expect(live).toBe(false);
  });

  test("lecteur de QR : une photo prise à la caméra sans code donne un message honnête", async ({
    page,
  }) => {
    await page.goto("/codes/lire-un-qr-code/");
    await page.getByRole("button", { name: "Photographier un QR code" }).click();
    const shutter = page.getByTestId("camera-shutter");
    await expect(shutter).toBeEnabled({ timeout: 30_000 });
    await shutter.click();
    await page.getByTestId("camera-keep").click();
    await expect(page.getByTestId("qr-result")).toContainText("Aucun QR code lisible", {
      timeout: 30_000,
    });
  });

  test("caméra refusée : message explicite et import toujours possible", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ permissions: [] });
    await context.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" }));
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}/numerisation/scanner-un-document/`);
    await page.getByTestId("scan-camera").first().click();
    await expect(page.getByText("Accès à la caméra refusé")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("camera-shutter")).toBeDisabled();
    await page.getByTestId("camera-done").click();
    await expect(page.getByTestId("scan-dropzone-input")).toBeAttached();
    await context.close();
  });
});
