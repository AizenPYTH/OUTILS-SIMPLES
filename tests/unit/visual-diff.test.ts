import { describe, expect, it } from "vitest";
import { diffRasters, formatChangedRatio } from "@/lib/pdf/operations/visual-diff";

function raster(width: number, height: number, fill: [number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = 255;
  }
  return { width, height, data };
}

describe("visual diff of rendered pages", () => {
  it("reports no change for identical rasters and ignores small colour noise", () => {
    const a = raster(10, 10, [255, 255, 255]);
    const b = raster(10, 10, [250, 252, 255]);
    const diff = diffRasters(a, b);
    expect(diff.changedPixels).toBe(0);
    expect(diff.bbox).toBeNull();
    expect(diff.sizeDiffers).toBe(false);
    expect(formatChangedRatio(diff.changedRatio)).toBe("identique");
  });

  it("locates changed pixels, paints them red and reports the ratio", () => {
    const a = raster(10, 10, [255, 255, 255]);
    const b = raster(10, 10, [255, 255, 255]);
    const changed: [number, number][] = [
      [2, 3],
      [3, 3],
      [2, 4],
    ];
    for (const [x, y] of changed) {
      const i = (y * 10 + x) * 4;
      b.data[i] = 0;
      b.data[i + 1] = 0;
      b.data[i + 2] = 0;
    }
    const diff = diffRasters(a, b);
    expect(diff.changedPixels).toBe(3);
    expect(diff.changedRatio).toBeCloseTo(0.03);
    expect(diff.bbox).toEqual({ x: 2, y: 3, width: 2, height: 2 });
    const i = (3 * 10 + 2) * 4;
    expect([diff.overlay[i], diff.overlay[i + 1], diff.overlay[i + 2]]).toEqual([220, 38, 38]);
    expect(diff.overlay[0]).toBe(255); // unchanged white stays light
    expect(formatChangedRatio(diff.changedRatio)).toBe("3,0 %");
    expect(formatChangedRatio(0.25)).toBe("25 %");
    expect(formatChangedRatio(0.0002)).toBe("< 0,1 %");
  });

  it("resamples a page of another size and flags the size difference", () => {
    const a = raster(10, 10, [0, 0, 0]);
    const b = raster(20, 20, [0, 0, 0]);
    const diff = diffRasters(a, b);
    expect(diff.sizeDiffers).toBe(true);
    expect(diff.changedPixels).toBe(0);
  });
});
