import { describe, expect, it } from "vitest";
import {
  ACTUAL_SIZE_SCALE,
  ZOOM_MAX_PERCENT,
  ZOOM_MIN_PERCENT,
  anchoredScroll,
  fitScaleFor,
  percentOf,
  scaleOfPercent,
  stepScale,
  wheelScale,
  zoomLabel,
} from "@/lib/pdf/editor/zoom";

describe("zoom model", () => {
  it("steps through the documented levels in both directions and back", () => {
    let scale = scaleOfPercent(100);
    const up: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      scale = stepScale(scale, 1);
      up.push(Math.round(percentOf(scale)));
    }
    expect(up).toEqual([125, 150, 200, 300, 400, 400, 400, 400, 400, 400]);
    const down: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      scale = stepScale(scale, -1);
      down.push(Math.round(percentOf(scale)));
    }
    expect(down).toEqual([300, 200, 150, 125, 100, 75, 50, 25, 25, 25]);
    // + then − from an intermediate level returns to the step below the start.
    const start = scaleOfPercent(136);
    expect(Math.round(percentOf(stepScale(stepScale(start, 1), -1)))).toBe(125);
    // + then − from a documented level returns exactly to it.
    for (const p of [50, 75, 100, 125, 150, 200]) {
      expect(percentOf(stepScale(stepScale(scaleOfPercent(p), 1), -1))).toBeCloseTo(p, 6);
    }
  });

  it("zooms in on wheel up and out on wheel down, never beyond the limits", () => {
    const base = scaleOfPercent(100);
    expect(wheelScale(base, -100, 0)).toBeGreaterThan(base);
    expect(wheelScale(base, 100, 0)).toBeLessThan(base);
    expect(percentOf(wheelScale(base, -100, 0))).toBeCloseTo(116.2, 0);
    // Line mode (Firefox): a 3-line notch is about the same as a 100 px notch.
    expect(percentOf(wheelScale(base, -3, 1))).toBeCloseTo(116, 0);
    // Symmetric: up then down returns to the start.
    expect(wheelScale(wheelScale(base, -100, 0), 100, 0)).toBeCloseTo(base, 9);
    let s = base;
    for (let i = 0; i < 100; i += 1) s = wheelScale(s, -100, 0);
    expect(percentOf(s)).toBeCloseTo(ZOOM_MAX_PERCENT, 6);
    for (let i = 0; i < 200; i += 1) s = wheelScale(s, 100, 0);
    expect(percentOf(s)).toBeCloseTo(ZOOM_MIN_PERCENT, 6);
    // A huge delta (trackpad fling) is capped to a reasonable factor.
    expect(wheelScale(base, -5000, 0) / base).toBeLessThan(1.6);
  });

  it("distinguishes fit width from fit page", () => {
    const a4 = { width: 595, height: 842 };
    const container = { width: 1000, height: 700 };
    const width = fitScaleFor("width", a4, container);
    const page = fitScaleFor("page", a4, container);
    expect(width).toBeCloseTo(Math.min(1000 / 595, (700 * 1.3) / 842), 6);
    expect(page).toBeCloseTo(700 / 842, 6);
    expect(width).toBeGreaterThan(page);
    // Landscape page in a narrow container: width-bound in both modes.
    const landscape = { width: 842, height: 595 };
    expect(fitScaleFor("width", landscape, { width: 600, height: 700 })).toBeCloseTo(600 / 842, 6);
    expect(fitScaleFor("page", landscape, { width: 600, height: 700 })).toBeCloseTo(600 / 842, 6);
    // Fit never exceeds 400 % on a tiny page or goes under 25 % on a huge one.
    expect(percentOf(fitScaleFor("page", { width: 50, height: 50 }, container))).toBe(
      ZOOM_MAX_PERCENT,
    );
    expect(percentOf(fitScaleFor("page", { width: 20000, height: 20000 }, container))).toBe(
      ZOOM_MIN_PERCENT,
    );
  });

  it("keeps the point under the pointer when zooming", () => {
    // Page at (20, 20) in the scrolled content, pointer at (300, 200) in the container,
    // scrolled by (100, 50): the document point is at page px (380, 230).
    const before = { scrollLeft: 100, scrollTop: 50 };
    const next = anchoredScroll(
      before,
      { x: 300, y: 200 },
      1,
      2,
      { x: 20, y: 20 },
      { x: 20, y: 20 },
    );
    // At 2× that point is at (760, 460) in page px; to keep it under the pointer at (300, 200):
    expect(next).toEqual({ scrollLeft: 20 + 760 - 300, scrollTop: 20 + 460 - 200 });
    // Zooming out beyond the start clamps at zero.
    expect(
      anchoredScroll(before, { x: 300, y: 200 }, 1, 0.1, { x: 20, y: 20 }, { x: 200, y: 200 }),
    ).toEqual({ scrollLeft: 0, scrollTop: 23 });
  });

  it("labels the actual size as 100 %", () => {
    expect(zoomLabel(ACTUAL_SIZE_SCALE)).toBe("100 %");
    expect(zoomLabel(scaleOfPercent(150))).toBe("150 %");
  });
});
