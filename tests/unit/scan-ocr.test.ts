import { describe, expect, it } from "vitest";
import { applyHomography, computeHomography, orderQuad, quadOutputSize, warpPerspective, type Quad } from "@/lib/scan/geometry";
import { detectDocumentQuad, polygonArea } from "@/lib/scan/detect";
import { adjustBrightnessContrast, documentFilter, extractPalette, otsuThreshold, toBlackAndWhite, toGrayscale } from "@/lib/images/pixels";
import { clampCrop, fitDimensions } from "@/lib/images/types";
import { buildSearchablePdf } from "@/lib/ocr/searchable-pdf";
import { cleanOcrText, toPageResult } from "@/lib/ocr/engine";
import { buildQrPayload } from "@/lib/codes/qr";
import { extractPageText, fixture, openPdf } from "../helpers";

describe("perspective geometry", () => {
  it("computes a homography that maps the source corners to the destination", () => {
    const src: Quad = [
      { x: 10, y: 20 },
      { x: 200, y: 5 },
      { x: 220, y: 300 },
      { x: 0, y: 280 },
    ];
    const dst: Quad = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 150 },
      { x: 0, y: 150 },
    ];
    const h = computeHomography(src, dst);
    for (let i = 0; i < 4; i += 1) {
      const p = applyHomography(h, src[i]!);
      expect(p.x).toBeCloseTo(dst[i]!.x, 6);
      expect(p.y).toBeCloseTo(dst[i]!.y, 6);
    }
    expect(() => computeHomography([src[0]!, src[0]!, src[0]!, src[0]!], dst)).toThrow();
  });

  it("orders corners and sizes the output", () => {
    const quad = orderQuad([
      { x: 100, y: 100 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
    ]);
    expect(quad).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ]);
    expect(quadOutputSize(quad)).toEqual({ width: 100, height: 100 });
    expect(quadOutputSize(quad, 50)).toEqual({ width: 50, height: 50 });
    expect(polygonArea(quad)).toBe(10000);
  });

  it("warps a tilted bright rectangle into an upright one", () => {
    // 60×60 dark image with a bright parallelogram inside.
    const w = 60;
    const h = 60;
    const data = new Uint8ClampedArray(w * h * 4);
    const inside = (x: number, y: number) => x >= 10 + (y - 10) * 0.3 && x <= 40 + (y - 10) * 0.3 && y >= 10 && y <= 50;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const v = inside(x, y) ? 240 : 20;
        const o = (y * w + x) * 4;
        data[o] = data[o + 1] = data[o + 2] = v;
        data[o + 3] = 255;
      }
    }
    const quad: Quad = [
      { x: 10, y: 10 },
      { x: 40, y: 10 },
      { x: 52, y: 50 },
      { x: 22, y: 50 },
    ];
    const out = warpPerspective({ data, width: w, height: h }, quad, { width: 30, height: 40 });
    // Centre of the output must be bright, and the corners too (inside the quad).
    const px = (x: number, y: number) => out.data[(y * 30 + x) * 4]!;
    expect(px(15, 20)).toBeGreaterThan(200);
    expect(px(2, 2)).toBeGreaterThan(150);
    expect(px(27, 37)).toBeGreaterThan(150);
  });

  it("detects a bright sheet on a dark background", () => {
    const w = 120;
    const h = 90;
    const gray = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) gray[y * w + x] = x >= 20 && x <= 100 && y >= 15 && y <= 75 ? 230 : 30;
    const result = detectDocumentQuad(gray, w, h);
    expect(result).not.toBeNull();
    expect(result!.quad[0]).toEqual({ x: 20, y: 15 });
    expect(result!.quad[2]).toEqual({ x: 100, y: 75 });
    expect(result!.confidence).toBeGreaterThan(0.9);
    // Uniform image → nothing to detect.
    expect(detectDocumentQuad(new Uint8ClampedArray(w * h).fill(200), w, h)).toBeNull();
  });
});

describe("pixel filters", () => {
  const img = { width: 2, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 128]) };
  it("grayscale, brightness/contrast, black & white and Otsu", () => {
    const gray = toGrayscale(img);
    expect(gray.data[0]).toBe(76);
    expect(gray.data[7]).toBe(128);
    const bright = adjustBrightnessContrast(img, 50, 0);
    expect(bright.data[1]).toBeGreaterThan(100);
    const bw = toBlackAndWhite(img, 50);
    expect(Array.from(bw.data.slice(0, 3))).toEqual([255, 255, 255]);
    expect(Array.from(bw.data.slice(4, 7))).toEqual([0, 0, 0]);
    const hist = new Uint8ClampedArray([0, 0, 0, 10, 250, 255, 255, 245]);
    const t = otsuThreshold(hist);
    expect(t).toBeGreaterThanOrEqual(10);
    expect(t).toBeLessThan(245);
  });
  it("document filter whitens the background", () => {
    const w = 20;
    const data = new Uint8ClampedArray(w * w * 4);
    for (let i = 0; i < w * w; i += 1) {
      const v = i === 210 ? 40 : 170; // one dark pixel on a grey background
      data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }
    const out = documentFilter({ width: w, height: w, data }, 4, 1);
    expect(out.data[0]).toBeGreaterThan(240);
    expect(out.data[210 * 4]).toBeLessThan(100);
  });
  it("extracts a palette", () => {
    const data = new Uint8ClampedArray(16 * 4);
    for (let i = 0; i < 16; i += 1) {
      const red = i < 12;
      data[i * 4] = red ? 250 : 10;
      data[i * 4 + 1] = red ? 10 : 10;
      data[i * 4 + 2] = red ? 10 : 250;
      data[i * 4 + 3] = 255;
    }
    const palette = extractPalette({ width: 4, height: 4, data }, 2, 1);
    expect(palette[0]!.hex).toBe("#fa0a0a");
    expect(palette[0]!.share).toBeCloseTo(0.75);
  });
  it("fits dimensions and clamps crops", () => {
    expect(fitDimensions({ width: 4000, height: 3000 }, { width: 1200 })).toEqual({ width: 1200, height: 900 });
    expect(fitDimensions({ width: 400, height: 300 }, { width: 1200 })).toEqual({ width: 400, height: 300 });
    expect(fitDimensions({ width: 400, height: 300 }, { width: 1200, allowUpscale: true })).toEqual({ width: 1200, height: 900 });
    expect(fitDimensions({ width: 4000, height: 3000 }, { maxWidth: 1000, maxHeight: 500 })).toEqual({ width: 667, height: 500 });
    expect(fitDimensions({ width: 4000, height: 3000 }, { percent: 25 })).toEqual({ width: 1000, height: 750 });
    expect(clampCrop({ x: -10, y: 50, width: 500, height: 500 }, { width: 100, height: 100 })).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });
});

describe("OCR helpers", () => {
  it("builds a searchable PDF with an invisible text layer", async () => {
    const png = await fixture("text-french.png");
    const ocr = toPageResult(
      {
        text: "Facture numéro 2026-0042\nMontant total",
        confidence: 91,
        lines: [
          { text: "Facture numéro 2026-0042", bbox: { x0: 80, y0: 90, x1: 520, y1: 130 }, words: [{ text: "Facture", confidence: 95, bbox: { x0: 80, y0: 90, x1: 200, y1: 130 } }, { text: "numéro", confidence: 92, bbox: { x0: 210, y0: 90, x1: 330, y1: 130 } }, { text: "2026-0042", confidence: 88, bbox: { x0: 340, y0: 90, x1: 520, y1: 130 } }] },
          { text: "Montant total", bbox: { x0: 80, y0: 270, x1: 320, y1: 310 }, words: [{ text: "Montant", confidence: 20, bbox: { x0: 80, y0: 270, x1: 200, y1: 310 } }, { text: "total", confidence: 90, bbox: { x0: 210, y0: 270, x1: 320, y1: 310 } }] },
        ],
        imageWidth: 1200,
        imageHeight: 700,
      },
      0,
    );
    expect(ocr.lines).toHaveLength(2);
    const { bytes, wordsPlaced, wordsSkipped } = await buildSearchablePdf([{ image: png, mimeType: "image/png", width: 1200, height: 700, ocr }], { minConfidence: 30, title: "Test OCR" });
    expect(wordsPlaced).toBe(4);
    expect(wordsSkipped).toBe(1);
    const doc = await openPdf(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe("Test OCR");
    const text = (await extractPageText(bytes, 0)).join(" ");
    expect(text).toContain("Facture");
    expect(text).toContain("2026-0042");
    expect(text).not.toContain("Montant");
    // The invisible rendering mode must be present in the content stream.
    expect(Buffer.from(bytes).toString("latin1")).toContain("/Image");
  });
  it("cleans OCR text", () => {
    expect(cleanOcrText("Bonjour  \n\n\n\nmonde \f")).toBe("Bonjour\n\nmonde");
  });
});

describe("QR payloads", () => {
  const base = { url: "", text: "", wifi: { ssid: "", password: "", security: "WPA" as const, hidden: false }, card: { firstName: "", lastName: "", phone: "", email: "", organization: "", url: "" } };
  it("builds url, wifi and vcard strings", () => {
    expect(buildQrPayload("url", { ...base, url: "outilia.fr/pdf" }).value).toBe("https://outilia.fr/pdf");
    expect(buildQrPayload("url", { ...base, url: "https://" }).value).toBe("");
    expect(buildQrPayload("wifi", { ...base, wifi: { ssid: "Ma;Box", password: "p:w", security: "WPA", hidden: true } }).value).toBe("WIFI:T:WPA;S:Ma\\;Box;P:p\\:w;H:true;;");
    expect(buildQrPayload("wifi", { ...base, wifi: { ssid: "Box", password: "", security: "WPA", hidden: false } }).error).toMatch(/mot de passe/);
    const vcard = buildQrPayload("vcard", { ...base, card: { ...base.card, firstName: "Jeanne", lastName: "Martin", phone: "06 12 34 56 78", email: "j@example.fr" } }).value;
    expect(vcard).toContain("BEGIN:VCARD");
    expect(vcard).toContain("N:Martin;Jeanne;;;");
    expect(vcard).toContain("TEL;TYPE=CELL:0612345678");
  });
});
