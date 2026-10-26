/**
 * Acceptance journeys of the editor's interactions (user feedback audit):
 * A zoom, B rectangle, C text, D several objects. Every journey checks the
 * real outcome (page size, object geometry, exported file) — never only that
 * a button was clicked.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { PDFDocument, PDFDict, PDFName } from "pdf-lib";
import {
  expectValidPdf,
  extractPageText,
  extractTextItems,
  pageContentOps,
  readDownload,
  uploadPdf,
} from "./helpers";

const STEPS = [25, 50, 75, 100, 125, 150, 200, 300, 400];
const percent = async (page: Page) =>
  Number((await page.getByTestId("zoom-level").textContent())!.replace(/\D/g, ""));
const pageWidth = async (page: Page) =>
  (await page.getByTestId("editor-page").boundingBox())!.width;

async function openEditor(page: Page, fixture = "simple-3-pages.pdf") {
  await page.goto("/pdf/modifier/");
  await uploadPdf(page, fixture);
  const shell = page.getByTestId("editor-shell");
  await expect(shell).toBeVisible();
  if (
    await page
      .getByTestId("diagnosis-continue")
      .isVisible()
      .catch(() => false)
  )
    await page.getByTestId("diagnosis-continue").click();
  await expect(page.getByTestId("annotation-overlay")).toBeVisible();
  return shell;
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
}

const center = (box: { x: number; y: number; width: number; height: number }) => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

async function exportPdf(page: Page): Promise<Uint8Array> {
  await page.getByTestId("editor-download").click();
  const download = page.waitForEvent("download");
  await page.getByTestId("export-download").click({ timeout: 30_000 });
  return readDownload(await download);
}

async function fontNames(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes);
  const names: string[] = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict) {
      const base = obj.get(PDFName.of("BaseFont"));
      if (base) names.push(base.toString());
    }
  }
  return names;
}

test.describe("parcours A — zoom", () => {
  test("ten + then ten − change the page size step by step, in both directions, and − after + returns to the start", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "desktop zoom controls; mobile covered by the pinch note in the report");
    await openEditor(page);
    const plus = page.getByRole("button", { name: "Zoom avant" });
    const minus = page.getByRole("button", { name: "Zoom arrière" });
    const start = await percent(page);
    expect(start).toBeGreaterThan(25);
    let previous = await pageWidth(page);
    const seen: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      const p = await percent(page);
      if (p >= 400) break;
      await plus.click();
      const next = STEPS.find((s) => s > p + 0.5)!;
      await expect(page.getByTestId("zoom-level")).toHaveText(`${next} %`);
      await expect.poll(async () => pageWidth(page)).toBeGreaterThan(previous);
      previous = await pageWidth(page);
      seen.push(next);
    }
    expect(seen.at(-1)).toBe(400);
    await expect(plus).toBeDisabled();
    for (let i = 0; i < 10; i += 1) {
      const p = await percent(page);
      if (p <= 25) break;
      await minus.click();
      const next = [...STEPS].reverse().find((s) => s < p - 0.5)!;
      await expect(page.getByTestId("zoom-level")).toHaveText(`${next} %`);
      await expect.poll(async () => pageWidth(page)).toBeLessThan(previous);
      previous = await pageWidth(page);
    }
    await expect(page.getByTestId("zoom-level")).toHaveText("25 %");
    await expect(minus).toBeDisabled();
    // Exact round trip from a documented level: 100 % → + → − → 100 %, same page width.
    await page.getByTestId("zoom-level").click();
    await page.getByTestId("zoom-100").click();
    await expect(page.getByTestId("zoom-level")).toHaveText("100 %");
    const at100 = await pageWidth(page);
    await plus.click();
    await expect(page.getByTestId("zoom-level")).toHaveText("125 %");
    await minus.click();
    await expect(page.getByTestId("zoom-level")).toHaveText("100 %");
    expect(Math.abs((await pageWidth(page)) - at100)).toBeLessThan(1);
    // 100 % is the actual size: an A4 page (595 pt) is 793 CSS px wide at 96 dpi.
    expect(Math.abs(at100 - 793.3)).toBeLessThan(1.5);
  });

  test("Ctrl + wheel zooms in on wheel up, out on wheel down, around the pointer; keyboard and fit modes work", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "no wheel on touch devices");
    await openEditor(page);
    // Start where the page already overflows the area: the anchor can then be honoured
    // (a page smaller than the area stays centred, as in every desktop viewer).
    await page.getByTestId("zoom-level").click();
    await page.getByTestId("zoom-150").click();
    await expect(page.getByTestId("zoom-level")).toHaveText("150 %");
    await page.waitForTimeout(300);
    const area = (await page.getByTestId("editor-canvas-area").boundingBox())!;
    const pointer = { x: area.x + area.width * 0.6, y: area.y + area.height * 0.4 };
    const before = (await page.getByTestId("editor-page").boundingBox())!;
    const docX = (pointer.x - before.x) / before.width; // document point under the pointer (fraction of the page)
    const docY = (pointer.y - before.y) / before.height;
    await page.mouse.move(pointer.x, pointer.y);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -100);
    await expect.poll(async () => percent(page)).toBeGreaterThan(150);
    await page.waitForTimeout(300);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(300);
    await page.mouse.wheel(0, -100);
    await page.keyboard.up("Control");
    const zoomed = await percent(page);
    expect(zoomed).toBeGreaterThan(200);
    await page.waitForTimeout(400);
    const after = (await page.getByTestId("editor-page").boundingBox())!;
    expect(after.width).toBeGreaterThan(before.width * 1.3);
    // The same document point is still under the pointer (anchored zoom), within 8 px.
    expect(Math.abs(after.x + docX * after.width - pointer.x)).toBeLessThan(8);
    expect(Math.abs(after.y + docY * after.height - pointer.y)).toBeLessThan(8);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, 100);
    await page.keyboard.up("Control");
    await expect.poll(async () => percent(page)).toBeLessThan(zoomed);
    // Plain wheel scrolls, it does not zoom.
    const held = await percent(page);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(200);
    expect(await percent(page)).toBe(held);
    // Keyboard: Ctrl + "+" / "-" / "0" are the document's, not the browser's.
    await page.keyboard.press("Control+Equal");
    await expect.poll(async () => percent(page)).toBeGreaterThan(held);
    await page.keyboard.press("Control+Minus");
    await expect
      .poll(async () => percent(page))
      .toBe(
        STEPS.find((s) => s > held + 0.5)! > held
          ? [...STEPS].reverse().find((s) => s < STEPS.find((x) => x > held + 0.5)! - 0.5)!
          : held,
      );
    await page.keyboard.press("Control+0");
    await expect(page.getByTestId("zoom-level")).toHaveAttribute("data-fit", "width");
    // Fit width and fit page are distinct: on a portrait page, fit page is smaller.
    const fitWidth = await percent(page);
    await page.getByTestId("zoom-level").click();
    await page.getByTestId("zoom-fit-page").click();
    await expect(page.getByTestId("zoom-level")).toHaveAttribute("data-fit", "page");
    const fitPage = await percent(page);
    expect(fitPage).toBeLessThan(fitWidth);
    const box = (await page.getByTestId("editor-page").boundingBox())!;
    const areaNow = (await page.getByTestId("editor-canvas-area").boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(areaNow.height);
  });

  test("the zoom level survives a page change, a panel and a document change; a narrow window still fits", async ({
    page,
    isMobile,
  }) => {
    await openEditor(page, "simple-5-pages.pdf");
    await page.getByTestId("zoom-level").click();
    await page.getByTestId("zoom-150").click();
    await expect(page.getByTestId("zoom-level")).toHaveText("150 %");
    const width = await pageWidth(page);
    await page.getByTestId("page-next").click();
    await expect(page.getByTestId("page-indicator")).toHaveText("Page 2 sur 5");
    await expect(page.getByTestId("zoom-level")).toHaveText("150 %");
    expect(Math.abs((await pageWidth(page)) - width)).toBeLessThan(1);
    await page.getByTestId("panel-document").filter({ visible: true }).click();
    await expect(page.getByTestId("side-panel-document")).toBeVisible();
    await expect(page.getByTestId("zoom-level")).toHaveText("150 %");
    expect(Math.abs((await pageWidth(page)) - width)).toBeLessThan(1);
    await page.getByTestId("side-panel-close").click();
    // A modification of the document (a drawing) does not touch the zoom either.
    await page.getByTestId("tool-rect").filter({ visible: true }).click();
    // The page is larger than the area at 150 %: draw inside the visible part.
    const visible = (await page.getByTestId("editor-canvas-area").boundingBox())!;
    await drag(
      page,
      { x: visible.x + 80, y: visible.y + 80 },
      { x: visible.x + 200, y: visible.y + 160 },
    );
    await expect(page.getByTestId("floating-bar")).toBeVisible();
    await expect(page.getByTestId("zoom-level")).toHaveText("150 %");
    if (!isMobile) {
      await page.setViewportSize({ width: 640, height: 700 });
      await page.keyboard.press("Escape");
      await page.keyboard.press("0");
      await expect(page.getByTestId("zoom-level")).toHaveAttribute("data-fit", "width");
      const area = (await page.getByTestId("editor-canvas-area").boundingBox())!;
      const box = (await page.getByTestId("editor-page").boundingBox())!;
      expect(box.width).toBeLessThanOrEqual(area.width);
      expect(box.width).toBeGreaterThan(area.width * 0.8);
    }
  });
});

test.describe("parcours B — rectangle", () => {
  test("draw, then change colour, thickness, fill, move, resize, undo/redo, export", async ({
    page,
  }) => {
    await openEditor(page);
    const overlay = page.getByTestId("annotation-overlay");
    const o = (await overlay.boundingBox())!;
    await page.getByTestId("tool-rect").filter({ visible: true }).click();
    await drag(page, { x: o.x + 80, y: o.y + 120 }, { x: o.x + 260, y: o.y + 240 });
    // Drawn immediately, selected, back to the selection tool, properties available.
    const bar = page.getByTestId("floating-bar");
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute("data-type", "rect");
    await expect(page.getByTestId("tool-select").filter({ visible: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("editor-summary")).toContainText("1 élément");
    const frame = page.getByTestId("selection-frame");
    const drawn = (await frame.boundingBox())!;
    expect(Math.abs(drawn.width - 184)).toBeLessThan(4);
    expect(Math.abs(drawn.height - 124)).toBeLessThan(4);
    // Live property changes keep the selection.
    await page.getByTestId("prop-stroke-color").fill("#ff0000");
    await page.getByTestId("prop-stroke-width").fill("6");
    await expect(bar).toBeVisible();
    await page.getByTestId("prop-fill-toggle").click(); // filled
    await expect(page.getByTestId("prop-fill-color")).toBeVisible();
    await page.getByTestId("prop-fill-toggle").click(); // transparent again
    await expect(page.getByTestId("prop-fill-color")).toHaveCount(0);
    await page.getByTestId("prop-dash").selectOption("dashed");
    await expect(overlay.locator("rect[stroke-dasharray]")).toHaveCount(1);
    await expect(bar).toBeVisible();
    // Move by dragging its inside: no new rectangle is created.
    const c = center(drawn);
    await drag(page, c, { x: c.x + 100, y: c.y + 60 });
    await expect(page.getByTestId("editor-summary")).toContainText("1 élément");
    const moved = (await frame.boundingBox())!;
    expect(Math.abs(moved.x - drawn.x - 100)).toBeLessThan(3);
    expect(Math.abs(moved.y - drawn.y - 60)).toBeLessThan(3);
    // Resize with the bottom-right handle.
    const handle = (await page.getByTestId("handle-se").boundingBox())!;
    await drag(page, center(handle), { x: center(handle).x + 50, y: center(handle).y + 30 });
    const resized = (await frame.boundingBox())!;
    expect(Math.abs(resized.width - moved.width - 50)).toBeLessThan(3);
    expect(Math.abs(resized.height - moved.height - 30)).toBeLessThan(3);
    // Undo the resize and redo it: geometry follows exactly.
    await page.getByTestId("undo").click();
    expect(Math.abs((await frame.boundingBox())!.width - moved.width)).toBeLessThan(1);
    await page.getByTestId("redo").click();
    expect(Math.abs((await frame.boundingBox())!.width - resized.width)).toBeLessThan(1);
    // Duplicate, then delete the copy with the keyboard.
    await page.getByTestId("duplicate-annotation").click();
    await expect(page.getByTestId("editor-summary")).toContainText("2 éléments");
    await page.keyboard.press("Delete");
    await expect(page.getByTestId("editor-summary")).toContainText("1 élément");
    // Export: red 6 pt dashed stroke, no fill, at the moved position.
    const bytes = await exportPdf(page);
    await expectValidPdf(bytes, 3);
    const ops = await pageContentOps(bytes, 0);
    expect(ops).toContain("1 0 0 RG");
    expect(ops).toContain("6 w");
    expect(ops).toMatch(/\[24 15\] 0 d/);
    expect(ops).not.toMatch(/\nB\n/); // stroke only: no fill-and-stroke operator
    // Position: the rectangle's origin in PDF points matches the frame on screen (scale = page px / 595 pt).
    const pageBox = (await page.getByTestId("editor-page").boundingBox())!;
    const scale = pageBox.width / 595;
    const expectedX = (resized.x + 2 - pageBox.x) / scale;
    const match = ops.slice(ops.indexOf("6 w")).match(/1 0 0 1 ([\d.]+) ([\d.]+) cm/);
    expect(match).toBeTruthy();
    expect(Math.abs(Number(match![1]) - expectedX)).toBeLessThan(2);
    expect(await pageContentOps(bytes, 1)).not.toContain("6 w");
  });
});

test.describe("parcours C — texte", () => {
  test("add text, double-click to edit and select a word, change font and size, move, undo/redo, export in the embedded font", async ({
    page,
    isMobile,
  }) => {
    await openEditor(page);
    const overlay = page.getByTestId("annotation-overlay");
    const o = (await overlay.boundingBox())!;
    await page.getByTestId("tool-text").filter({ visible: true }).click();
    await page.mouse.click(o.x + 100, o.y + 100);
    const editor = page.getByTestId("text-annotation-editor");
    await expect(editor).toBeVisible();
    await editor.fill("Bonjour le monde");
    await page.getByTestId("page-indicator").click(); // blur commits the block (one undo step)
    await expect(page.getByTestId("editor-summary")).toContainText("1 élément");
    await expect(editor).toHaveCount(0);
    // Select tool: a single click selects; a double-click edits and the field keeps native selection.
    await page.getByTestId("tool-select").filter({ visible: true }).click();
    const textBox = (await overlay.locator("div[aria-hidden]").first().boundingBox())!;
    await page.mouse.click(textBox.x + 10, textBox.y + textBox.height / 2);
    await expect(page.getByTestId("floating-bar")).toHaveAttribute("data-type", "text");
    await page.mouse.dblclick(textBox.x + 10, textBox.y + textBox.height / 2);
    await expect(editor).toBeVisible();
    await expect(editor).toHaveValue("Bonjour le monde");
    // Double-click on a word inside the field selects that word (native behaviour preserved).
    const field = (await editor.boundingBox())!;
    await page.mouse.dblclick(field.x + 8, field.y + field.height / 2);
    const selection = await editor.evaluate((el: HTMLTextAreaElement) =>
      el.value.slice(el.selectionStart, el.selectionEnd),
    );
    expect(selection.trim()).toBe("Bonjour");
    // Keyboard selection and replacement inside the field.
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Texte corrigé ici");
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
    await expect(page.getByTestId("editor-summary")).toContainText("1 élément");
    // Still selected after editing: change the font and the size from the floating bar.
    const bar = page.getByTestId("floating-bar");
    await expect(bar).toBeVisible();
    const frameBefore = (await page.getByTestId("selection-frame").boundingBox())!;
    await page.getByTestId("prop-font-family").selectOption("liberation-serif");
    await page.getByTestId("prop-font-size").fill("24");
    await expect
      .poll(async () => (await page.getByTestId("selection-frame").boundingBox())!.height)
      .toBeGreaterThan(frameBefore.height * 1.4);
    await page.getByTestId("prop-bold").click();
    await page.getByTestId("prop-underline").click();
    await expect(bar).toBeVisible();
    // Move the block.
    const f = (await page.getByTestId("selection-frame").boundingBox())!;
    await drag(
      page,
      { x: f.x + 12, y: f.y + f.height / 2 },
      { x: f.x + 132, y: f.y + f.height / 2 + 80 },
    );
    const movedFrame = (await page.getByTestId("selection-frame").boundingBox())!;
    expect(Math.abs(movedFrame.x - f.x - 120)).toBeLessThan(3);
    // Undo the move, redo it.
    await page.getByTestId("undo").click();
    expect(
      Math.abs((await page.getByTestId("selection-frame").boundingBox())!.x - f.x),
    ).toBeLessThan(1);
    await page.getByTestId("redo").click();
    expect(
      Math.abs((await page.getByTestId("selection-frame").boundingBox())!.x - movedFrame.x),
    ).toBeLessThan(1);
    // Export: the text is real text in the embedded serif font, bold, at 24 pt, with an underline.
    const bytes = await exportPdf(page);
    await expectValidPdf(bytes, 3);
    expect((await extractPageText(bytes, 0)).join(" ")).toContain("Texte corrigé ici");
    const names = await fontNames(bytes);
    expect(names.some((n) => n.includes("LiberationSerif-Bold"))).toBe(true);
    const item = (await extractTextItems(bytes, 0)).find((i) => i.str.includes("Texte corrigé"))!;
    expect(Math.round(Math.hypot(item.transform[0]!, item.transform[1]!))).toBe(24);
    const ops = await pageContentOps(bytes, 0);
    expect(ops).toMatch(/[\d.]+ [\d.]+ m\n[\d.]+ [\d.]+ l\nS/); // the underline stroke
    void isMobile;
  });

  test("the text tool edits an existing block instead of stacking a new one; an empty block disappears", async ({
    page,
  }) => {
    await openEditor(page);
    const overlay = page.getByTestId("annotation-overlay");
    const o = (await overlay.boundingBox())!;
    await page.getByTestId("tool-text").filter({ visible: true }).click();
    await page.mouse.click(o.x + 120, o.y + 160);
    const editor = page.getByTestId("text-annotation-editor");
    await editor.fill("Première note");
    await page.getByTestId("page-indicator").click();
    await expect(page.getByTestId("editor-summary")).toContainText("1 élément");
    await page.getByTestId("tool-text").filter({ visible: true }).click();
    const textBox = (await overlay.locator("div[aria-hidden]").first().boundingBox())!;
    await page.mouse.click(textBox.x + 8, textBox.y + textBox.height / 2);
    await expect(editor).toHaveValue("Première note");
    await expect(page.getByTestId("editor-summary")).toContainText("1 élément");
    await page.keyboard.press("Escape");
    // An empty new block is not kept, and leaves no history step.
    await page.mouse.click(o.x + 300, o.y + 400);
    await expect(editor).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("editor-summary")).toContainText("1 élément");
    await page.getByTestId("undo").click();
    await expect(page.getByTestId("editor-summary")).toContainText("0 élément");
  });
});

test.describe("parcours D — plusieurs objets", () => {
  test("text, arrow, image and ellipse are selected, moved and deleted independently", async ({
    page,
  }) => {
    await openEditor(page);
    const overlay = page.getByTestId("annotation-overlay");
    const o = (await overlay.boundingBox())!;
    // Text
    await page.getByTestId("tool-text").filter({ visible: true }).click();
    await page.mouse.click(o.x + 60, o.y + 60);
    await page.getByTestId("text-annotation-editor").fill("Repère");
    await page.getByTestId("page-indicator").click();
    // Arrow
    await page.getByTestId("tool-arrow").filter({ visible: true }).click();
    await drag(page, { x: o.x + 80, y: o.y + 300 }, { x: o.x + 260, y: o.y + 360 });
    await expect(page.getByTestId("floating-bar")).toHaveAttribute("data-type", "line");
    // Image
    await page.getByTestId("editor-image-input").setInputFiles("tests/fixtures/signature.png");
    await expect(page.getByTestId("floating-bar")).toHaveAttribute("data-type", "image");
    // Ellipse
    await page.getByTestId("tool-ellipse").filter({ visible: true }).click();
    await drag(page, { x: o.x + 300, y: o.y + 80 }, { x: o.x + 420, y: o.y + 160 });
    await expect(page.getByTestId("floating-bar")).toHaveAttribute("data-type", "ellipse");
    await expect(page.getByTestId("editor-summary")).toContainText("4 éléments");
    const ellipseFrame = (await page.getByTestId("selection-frame").boundingBox())!;
    // Select the arrow by clicking on its stroke (not its bounding box corner), move it.
    const arrowMid = { x: o.x + 170, y: o.y + 330 };
    await page.mouse.click(arrowMid.x, arrowMid.y);
    await expect(page.getByTestId("floating-bar")).toHaveAttribute("data-type", "line");
    const startHandle = (await page.getByTestId("handle-start").boundingBox())!;
    await drag(page, arrowMid, { x: arrowMid.x + 40, y: arrowMid.y + 20 });
    const startAfter = (await page.getByTestId("handle-start").boundingBox())!;
    expect(Math.abs(startAfter.x - startHandle.x - 40)).toBeLessThan(3);
    // Move an endpoint only.
    await drag(page, center(startAfter), { x: center(startAfter).x - 30, y: center(startAfter).y });
    const endHandle = (await page.getByTestId("handle-end").boundingBox())!;
    expect(
      Math.abs((await page.getByTestId("handle-start").boundingBox())!.x - startAfter.x + 30),
    ).toBeLessThan(3);
    // Clicking near the arrow's bounding box but away from the stroke selects nothing (precise hit test).
    await page.mouse.click(o.x + 85, o.y + 378);
    await expect(page.getByTestId("floating-bar")).toHaveCount(0);
    // Select the text, then the ellipse: each shows its own bar; the ellipse did not move.
    const text = (await overlay.locator("div[aria-hidden]").first().boundingBox())!;
    await page.mouse.click(text.x + 8, text.y + text.height / 2);
    await expect(page.getByTestId("floating-bar")).toHaveAttribute("data-type", "text");
    await page.mouse.click(ellipseFrame.x + 10, center(ellipseFrame).y);
    await expect(page.getByTestId("floating-bar")).toHaveAttribute("data-type", "ellipse");
    expect(
      Math.abs((await page.getByTestId("selection-frame").boundingBox())!.x - ellipseFrame.x),
    ).toBeLessThan(1);
    // Delete the ellipse: three objects remain, the arrow's end is where it was.
    await page.getByTestId("delete-annotation").click();
    await expect(page.getByTestId("editor-summary")).toContainText("3 éléments");
    await page.mouse.click(center(endHandle).x - 12, center(endHandle).y - 4);
    await expect(page.getByTestId("floating-bar")).toHaveAttribute("data-type", "line");
    expect(
      Math.abs((await page.getByTestId("handle-end").boundingBox())!.x - endHandle.x),
    ).toBeLessThan(2);
    // Export: text present, image embedded, arrow head drawn (three stroked segments), no ellipse.
    const bytes = await exportPdf(page);
    await expectValidPdf(bytes, 3);
    expect((await extractPageText(bytes, 0)).join(" ")).toContain("Repère");
    expect(Buffer.from(bytes).toString("latin1")).toContain("/Image");
    const ops = await pageContentOps(bytes, 0);
    expect((ops.match(/\bl\nS\b/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(ops).not.toMatch(/ c\n[^\n]* c\n[^\n]* c\n[^\n]* c\n/); // no Bézier ellipse
  });
});

test.describe("parcours E — régression", () => {
  test("search finds text across pages and replaces one occurrence through the text editor", async ({
    page,
  }) => {
    await openEditor(page, "simple-5-pages.pdf");
    await page.keyboard.press("Control+F");
    const input = page.getByTestId("search-input");
    await expect(input).toBeVisible();
    await input.fill("page 3");
    await expect(page.getByTestId("search-status")).toContainText("1 résultat", {
      timeout: 15_000,
    });
    await page.getByTestId("search-result").first().click();
    await expect(page.getByTestId("page-indicator")).toHaveText("Page 3 sur 5");
    await expect(
      page.locator('[data-testid="search-highlight"][data-current="true"]'),
    ).toBeVisible();
    await page.getByTestId("replace-input").fill("Page trois");
    await page.getByTestId("replace-one").first().click();
    await expect(page.getByTestId("editor-summary")).toContainText("1 texte modifié", {
      timeout: 20_000,
    });
    const bytes = await exportPdf(page);
    const text = (await extractPageText(bytes, 2)).join(" ");
    expect(text).toContain("Page trois");
    expect(text).not.toMatch(/Page 3 \//);
    expect((await extractPageText(bytes, 1)).join(" ")).toContain("Page 2");
  });
});

void (undefined as unknown as Locator);
