import { describe, expect, it } from "vitest";
import { buildViewportTransform, pdfRectToViewport, pdfToViewport, viewportRectToPdf, viewportToPdf, viewportScale } from "@/lib/pdf/coordinates";

const A4: readonly [number, number, number, number] = [0, 0, 595.28, 841.89];

describe("coordinate transforms", () => {
  it("round-trips points at any zoom on an upright page", () => {
    const viewport = buildViewportTransform(A4, 1.5, 0);
    expect(viewport.width).toBeCloseTo(595.28 * 1.5);
    expect(viewport.height).toBeCloseTo(841.89 * 1.5);
    const pdfPoint = { x: 100, y: 700 };
    const screen = pdfToViewport(viewport, pdfPoint);
    // y is flipped: a point near the top of the page is near the top of the canvas.
    expect(screen.y).toBeCloseTo((841.89 - 700) * 1.5);
    const back = viewportToPdf(viewport, screen);
    expect(back.x).toBeCloseTo(100);
    expect(back.y).toBeCloseTo(700);
    expect(viewportScale(viewport)).toBeCloseTo(1.5);
  });

  it("handles rotated pages", () => {
    const viewport = buildViewportTransform(A4, 1, 90);
    expect(viewport.width).toBeCloseTo(841.89);
    expect(viewport.height).toBeCloseTo(595.28);
    const bottomLeft = pdfToViewport(viewport, { x: 0, y: 0 });
    // With a 90° rotation the PDF bottom-left corner lands at the canvas top-left.
    expect(bottomLeft.x).toBeCloseTo(0);
    expect(bottomLeft.y).toBeCloseTo(0);
    const back = viewportToPdf(viewport, { x: 200, y: 100 });
    const again = pdfToViewport(viewport, back);
    expect(again.x).toBeCloseTo(200);
    expect(again.y).toBeCloseTo(100);
  });

  it("converts rectangles both ways", () => {
    const viewport = buildViewportTransform(A4, 2, 0);
    const rect = { x: 50, y: 60, width: 100, height: 40 };
    const box = pdfRectToViewport(viewport, rect);
    expect(box.width).toBeCloseTo(200);
    expect(box.height).toBeCloseTo(80);
    const back = viewportRectToPdf(viewport, box);
    expect(back.x).toBeCloseTo(50);
    expect(back.y).toBeCloseTo(60);
    expect(back.width).toBeCloseTo(100);
    expect(back.height).toBeCloseTo(40);
  });
});
