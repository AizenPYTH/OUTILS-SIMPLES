/**
 * OCR orientation suite: real Tesseract.js (Node build, local core and
 * language files) on synthetic, reproducible images rendered with a Node
 * canvas. Expected texts are known, so the character error rate is measured.
 * These images are clean renderings: the thresholds say nothing about photos.
 */
import path from "node:path";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import QRCode from "qrcode";
import type { RgbaImage } from "@/lib/images/pixels";
import { encodePng } from "@/lib/images/png-encode";
import { createOcrEngine, linesFromTesseract, type OcrEngine } from "@/lib/ocr/engine";
import {
  angleFromBaseline,
  assembleText,
  estimateSkew,
  mapBoxFromPass,
  mergePassLines,
  rotateRgba,
  rotateRgbaByDegrees,
} from "@/lib/ocr/orientation";
import { stretchContrast } from "@/lib/ocr/preprocess";
import { buildSearchablePdf } from "@/lib/ocr/searchable-pdf";
import type { OcrAngle, OcrLine } from "@/lib/ocr/types";
import { extractTextItems } from "../helpers";

const root = path.resolve(__dirname, "../..");
const encode = async (img: RgbaImage) =>
  encodePng(
    img.width,
    img.height,
    4,
    new Uint8Array(img.data.buffer, img.data.byteOffset, img.data.byteLength),
  );

/** Levenshtein distance / reference length, on normalised text. */
export function characterErrorRate(expected: string, actual: string): number {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const a = norm(expected);
  const b = norm(actual);
  const dp = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) dp[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return a.length ? dp[b.length]! / a.length : 0;
}

interface TextBlock {
  lines: string[];
  x: number;
  y: number;
  size?: number;
  /** Counter-clockwise rotation of the block, PDF convention. */
  angle?: OcrAngle;
  bold?: boolean;
  color?: string;
}

interface Scene {
  width: number;
  height: number;
  background?: string;
  blocks: TextBlock[];
  draw?: (ctx: SKRSContext2D) => void;
}

function renderScene(scene: Scene): RgbaImage {
  const canvas = createCanvas(scene.width, scene.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = scene.background ?? "#ffffff";
  ctx.fillRect(0, 0, scene.width, scene.height);
  for (const block of scene.blocks) {
    const size = block.size ?? 28;
    ctx.save();
    ctx.translate(block.x, block.y);
    ctx.rotate((-(block.angle ?? 0) * Math.PI) / 180);
    ctx.fillStyle = block.color ?? "#000000";
    ctx.font = `${block.bold ? "bold " : ""}${size}px "DejaVu Sans", sans-serif`;
    ctx.textBaseline = "alphabetic";
    block.lines.forEach((line, i) => ctx.fillText(line, 0, i * size * 1.5));
    ctx.restore();
  }
  scene.draw?.(ctx);
  const image = ctx.getImageData(0, 0, scene.width, scene.height);
  return {
    width: scene.width,
    height: scene.height,
    data: new Uint8ClampedArray(image.data.buffer, image.data.byteOffset, image.data.byteLength),
  };
}

const PARAGRAPH = [
  "Le rapide renard brun saute",
  "par-dessus le chien paresseux",
  "pres de la riviere, a midi.",
];
const PARAGRAPH_TEXT = PARAGRAPH.join(" ");

let engine: OcrEngine;
beforeAll(async () => {
  engine = await createOcrEngine("fra", {
    encode,
    langPath: path.join(root, "public/ocr/lang"),
    cachePath: "/tmp/averopdf-tess-cache",
  });
}, 120_000);
afterAll(async () => {
  await engine?.terminate();
});

describe("orientation maths (pure)", () => {
  it("rotates pixels and maps boxes back exactly", () => {
    const img: RgbaImage = { width: 4, height: 3, data: new Uint8ClampedArray(4 * 3 * 4) };
    for (let i = 0; i < 12; i += 1) img.data[i * 4] = i; // red channel = index
    for (const angle of [90, 180, 270] as OcrAngle[]) {
      const rotated = rotateRgba(img, angle);
      expect([rotated.width, rotated.height]).toEqual(angle === 180 ? [4, 3] : [3, 4]);
      // Every source pixel lands where mapBoxFromPass says it comes from.
      for (let y = 0; y < rotated.height; y += 1)
        for (let x = 0; x < rotated.width; x += 1) {
          const index = rotated.data[(y * rotated.width + x) * 4]!;
          const back = mapBoxFromPass({ x0: x, y0: y, x1: x + 1, y1: y + 1 }, angle, 4, 3);
          expect(back.y0 * 4 + back.x0).toBe(index);
        }
    }
  });

  it("reads the direction of a line from its baseline", () => {
    expect(angleFromBaseline({ x0: 0, y0: 10, x1: 100, y1: 10 })).toEqual({ angle: 0, skew: 0 });
    expect(angleFromBaseline({ x0: 50, y0: 200, x1: 50, y1: 20 })).toEqual({ angle: 90, skew: 0 });
    expect(angleFromBaseline({ x0: 100, y0: 10, x1: 0, y1: 10 })).toEqual({ angle: 180, skew: 0 });
    expect(angleFromBaseline({ x0: 50, y0: 20, x1: 50, y1: 200 })).toEqual({ angle: 270, skew: 0 });
    expect(angleFromBaseline({ x0: 0, y0: 10, x1: 100, y1: 5 }).skew).toBeCloseTo(2.86, 1);
  });

  it("estimates the skew of tilted text lines", () => {
    const upright = renderScene({
      width: 700,
      height: 400,
      blocks: [
        { lines: PARAGRAPH, x: 40, y: 80, size: 26 },
        { lines: PARAGRAPH, x: 40, y: 230, size: 26 },
      ],
    });
    expect(estimateSkew(upright)).toBe(0);
    const tilted = rotateRgbaByDegrees(upright, 3);
    expect(estimateSkew(tilted)).toBeCloseTo(-3, 0);
    const blank: RgbaImage = {
      width: 50,
      height: 50,
      data: new Uint8ClampedArray(50 * 50 * 4).fill(255),
    };
    expect(estimateSkew(blank)).toBe(0);
  });

  it("merges passes keeping the most confident reading of a region", () => {
    const line = (
      text: string,
      confidence: number,
      pass: OcrAngle,
      box: [number, number, number, number],
    ): OcrLine => ({
      text,
      words: [],
      x0: box[0],
      y0: box[1],
      x1: box[2],
      y1: box[3],
      confidence,
      angle: pass,
      skew: 0,
      baseline: { x0: 0, y0: 0, x1: 1, y1: 0 },
      pass,
      paragraphEnd: false,
    });
    const merged = mergePassLines([
      line("garbage", 30, 0, [0, 0, 100, 20]),
      line("other", 90, 0, [0, 50, 100, 70]),
      line("Bonjour", 95, 180, [2, 1, 98, 19]),
    ]);
    expect(merged.map((l) => l.text)).toEqual(["other", "Bonjour"]);
    const text = assembleText(merged);
    expect(text.dominantAngle).toBe(180);
    expect(text.text).toContain("Bonjour");
    expect(text.text).toContain("other");
  });

  it("stretches contrast without altering the input", () => {
    const img = renderScene({
      width: 120,
      height: 60,
      background: "#aaaaaa",
      blocks: [{ lines: ["Ab"], x: 10, y: 40, color: "#555555" }],
    });
    const copy = new Uint8ClampedArray(img.data);
    const out = stretchContrast(img);
    expect(img.data).toEqual(copy);
    let min = 255;
    let max = 0;
    for (let i = 0; i < out.data.length; i += 4) {
      min = Math.min(min, out.data[i]!);
      max = Math.max(max, out.data[i]!);
    }
    expect(max - min).toBeGreaterThan(200);
  });
});

describe("OCR on synthetic pages (real Tesseract, measured error rate)", () => {
  const page = (angle: OcrAngle) => {
    const upright = renderScene({
      width: 800,
      height: 500,
      blocks: [{ lines: PARAGRAPH, x: 50, y: 100, size: 30 }],
    });
    // Rotating the upright rendering counter-clockwise by `angle` = rotating clockwise by 360 - angle.
    return angle === 0 ? upright : rotateRgba(upright, ((360 - angle) % 360) as OcrAngle);
  };

  for (const angle of [0, 90, 180, 270] as OcrAngle[]) {
    it(`reads a page rotated by ${angle}° with the explicit mode and with "auto"`, async () => {
      const img = page(angle);
      const fixed = await engine.recognize(img, 0, {
        orientation: String(angle) as "0",
        preprocess: "none",
      });
      expect(characterErrorRate(PARAGRAPH_TEXT, fixed.text)).toBeLessThan(0.05);
      expect(fixed.lines.every((l) => l.angle === angle)).toBe(true);
      const auto = await engine.recognize(img, 0, { orientation: "auto", preprocess: "auto" });
      expect(characterErrorRate(PARAGRAPH_TEXT, auto.text)).toBeLessThan(0.05);
      expect(auto.dominantAngle).toBe(angle);
      expect(auto.mixedOrientation).toBe(false);
      // Boxes are in original-image pixels: the text sits where it was drawn.
      const union = auto.lines.reduce(
        (b, l) => ({
          x0: Math.min(b.x0, l.x0),
          y0: Math.min(b.y0, l.y0),
          x1: Math.max(b.x1, l.x1),
          y1: Math.max(b.y1, l.y1),
        }),
        { x0: 1e9, y0: 1e9, x1: 0, y1: 0 },
      );
      expect(union.x0).toBeGreaterThanOrEqual(0);
      expect(union.x1).toBeLessThanOrEqual(img.width);
      expect(union.y1).toBeLessThanOrEqual(img.height);
    }, 120_000);
  }

  it("reads a page whose two regions have different orientations, each in its own direction", async () => {
    const scene = renderScene({
      width: 900,
      height: 700,
      blocks: [
        {
          lines: ["DESTINATAIRE", "MADAME CLAIRE DUPONT", "12 RUE DES LILAS"],
          x: 60,
          y: 90,
          size: 30,
          bold: true,
        },
        // Reads bottom to top on the right side.
        {
          lines: ["EXPEDITEUR BOUTIQUE DES ARTS", "8 AVENUE DU PORT NANTES"],
          x: 760,
          y: 640,
          size: 26,
          angle: 90,
        },
        // Upside down at the bottom.
        { lines: ["RETOUR SI ABSENT AGENCE DE RELAIS"], x: 650, y: 660, size: 24, angle: 180 },
      ],
    });
    const result = await engine.recognize(scene, 0, { orientation: "auto", preprocess: "auto" });
    expect(result.mixedOrientation).toBe(true);
    const byAngle = (a: OcrAngle) =>
      result.lines
        .filter((l) => l.angle === a)
        .map((l) => l.text)
        .join(" ");
    expect(
      characterErrorRate("DESTINATAIRE MADAME CLAIRE DUPONT 12 RUE DES LILAS", byAngle(0)),
    ).toBeLessThan(0.06);
    expect(
      characterErrorRate("EXPEDITEUR BOUTIQUE DES ARTS 8 AVENUE DU PORT NANTES", byAngle(90)),
    ).toBeLessThan(0.06);
    expect(characterErrorRate("RETOUR SI ABSENT AGENCE DE RELAIS", byAngle(180))).toBeLessThan(
      0.06,
    );
    // No garbage reading survives next to the correct one.
    expect(result.text).not.toMatch(/SIVTIF|YNOLIU/);
    // The rotated region's boxes stay on the right-hand side of the original image.
    for (const line of result.lines.filter((l) => l.angle === 90))
      expect(line.x0).toBeGreaterThan(650);
    for (const line of result.lines.filter((l) => l.angle === 180))
      expect(line.y0).toBeGreaterThan(600);
    expect(result.passes).toContain(180);
  }, 180_000);

  it("keeps two columns apart instead of interleaving their lines", async () => {
    const left = [
      "Colonne gauche ligne une",
      "Colonne gauche ligne deux",
      "Colonne gauche ligne trois",
    ];
    const right = [
      "Colonne droite ligne une",
      "Colonne droite ligne deux",
      "Colonne droite ligne trois",
    ];
    const scene = renderScene({
      width: 1100,
      height: 400,
      blocks: [
        { lines: left, x: 40, y: 80, size: 24 },
        { lines: right, x: 580, y: 80, size: 24 },
      ],
    });
    const result = await engine.recognize(scene, 0, { orientation: "0", preprocess: "none" });
    expect(characterErrorRate(left.join(" ") + " " + right.join(" "), result.text)).toBeLessThan(
      0.06,
    );
    const order = result.lines.map((l) => (l.x0 < 500 ? "L" : "R")).join("");
    expect(order).toMatch(/^L+R+$|^R+L+$/);
  }, 120_000);

  it("reads small print and a slightly skewed photo-like page", async () => {
    const small = renderScene({
      width: 900,
      height: 300,
      blocks: [{ lines: PARAGRAPH, x: 30, y: 50, size: 14 }],
    });
    const smallResult = await engine.recognize(small, 0, { orientation: "0", preprocess: "auto" });
    expect(characterErrorRate(PARAGRAPH_TEXT, smallResult.text)).toBeLessThan(0.08);

    const upright = renderScene({
      width: 900,
      height: 500,
      background: "#d9d2c3",
      blocks: [
        { lines: PARAGRAPH, x: 60, y: 120, size: 30, color: "#2b2b2b" },
        { lines: PARAGRAPH, x: 60, y: 300, size: 30, color: "#2b2b2b" },
      ],
    });
    const skewed = rotateRgbaByDegrees(upright, 2.5);
    const skewedResult = await engine.recognize(skewed, 0, {
      orientation: "0",
      preprocess: "auto",
      deskew: true,
    });
    expect(Math.abs(skewedResult.skewCorrected + 2.5)).toBeLessThan(0.8);
    expect(
      characterErrorRate(PARAGRAPH_TEXT + " " + PARAGRAPH_TEXT, skewedResult.text),
    ).toBeLessThan(0.08);
    // Boxes mapped back onto the skewed original: the first line starts near the drawn position.
    expect(skewedResult.lines[0]!.y0).toBeGreaterThan(60);
    expect(skewedResult.lines[0]!.y0).toBeLessThan(170);
  }, 180_000);

  it("reads colour and grayscale pages, and text next to a barcode and a QR code", async () => {
    const colour = renderScene({
      width: 800,
      height: 300,
      background: "#fff4d6",
      blocks: [
        { lines: ["Facture bleue 2026-0042"], x: 40, y: 80, size: 30, color: "#1f3a93" },
        { lines: ["Montant rouge 128,40 EUR"], x: 40, y: 160, size: 30, color: "#b42318" },
      ],
    });
    const colourResult = await engine.recognize(colour, 0, {
      orientation: "0",
      preprocess: "auto",
    });
    expect(
      characterErrorRate("Facture bleue 2026-0042 Montant rouge 128,40 EUR", colourResult.text),
    ).toBeLessThan(0.06);

    const gray = renderScene({
      width: 800,
      height: 300,
      background: "#cfcfcf",
      blocks: [
        { lines: ["Document en niveaux de gris"], x: 40, y: 100, size: 30, color: "#333333" },
      ],
    });
    const grayResult = await engine.recognize(gray, 0, { orientation: "0", preprocess: "auto" });
    expect(characterErrorRate("Document en niveaux de gris", grayResult.text)).toBeLessThan(0.06);

    const qr = QRCode.create("https://averopdf.example/colis/48213", { errorCorrectionLevel: "M" });
    const withCodes = renderScene({
      width: 900,
      height: 500,
      blocks: [
        { lines: ["Colis XY 123 456 789 FR"], x: 40, y: 60, size: 28, bold: true },
        { lines: ["Poids 2,4 kg - Colis 1/1"], x: 40, y: 440, size: 24 },
      ],
      draw: (ctx) => {
        ctx.fillStyle = "#000";
        let x = 40;
        const widths = [3, 1, 2, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1];
        for (let i = 0; i < 40; i += 1) {
          const w = widths[i % widths.length]! * 2;
          if (i % 2 === 0) ctx.fillRect(x, 110, w, 160);
          x += w + 2;
        }
        const n = qr.modules.size;
        const cell = 6;
        for (let r = 0; r < n; r += 1)
          for (let c = 0; c < n; c += 1)
            if (qr.modules.get(r, c)) ctx.fillRect(620 + c * cell, 120 + r * cell, cell, cell);
      },
    });
    const codesResult = await engine.recognize(withCodes, 0, {
      orientation: "auto",
      preprocess: "auto",
    });
    const text = codesResult.lines
      .filter((l) => l.confidence >= 60)
      .map((l) => l.text)
      .join(" ");
    expect(text).toContain("XY 123 456 789 FR");
    expect(text).toContain("Poids 2,4 kg");
  }, 240_000);

  it("builds a searchable PDF whose invisible words sit on their boxes with the right direction", async () => {
    const scene = renderScene({
      width: 900,
      height: 700,
      blocks: [
        { lines: ["MADAME CLAIRE DUPONT", "12 RUE DES LILAS"], x: 60, y: 90, size: 30, bold: true },
        { lines: ["EXPEDITEUR BOUTIQUE DES ARTS"], x: 760, y: 640, size: 26, angle: 90 },
        { lines: ["RETOUR SI ABSENT"], x: 500, y: 660, size: 24, angle: 180 },
      ],
    });
    const ocr = await engine.recognize(scene, 0, { orientation: "mixed", preprocess: "auto" });
    const png = await encode(scene);
    const { bytes, wordsPlaced } = await buildSearchablePdf(
      [
        {
          image: png as Uint8Array,
          mimeType: "image/png",
          width: 900,
          height: 700,
          ocr,
          pageWidthPt: 450,
          pageHeightPt: 350,
        },
      ],
      { minConfidence: 30 },
    );
    expect(wordsPlaced).toBeGreaterThan(8);
    const items = await extractTextItems(bytes, 0);
    const find = (s: string) => items.find((i) => i.str === s);
    const dupont = find("DUPONT")!;
    expect(dupont).toBeTruthy();
    // Upright word: no rotation, placed within the recipient block (scale 0.5 pt per px).
    expect(
      Math.round((Math.atan2(dupont.transform[1]!, dupont.transform[0]!) * 180) / Math.PI),
    ).toBe(0);
    expect(dupont.transform[4]).toBeGreaterThan(100);
    expect(dupont.transform[4]).toBeLessThan(260);
    expect(dupont.transform[5]).toBeGreaterThan(350 - 70); // near the top of the page
    const boutique = find("BOUTIQUE")!;
    expect(boutique).toBeTruthy();
    expect(
      Math.round((Math.atan2(boutique.transform[1]!, boutique.transform[0]!) * 180) / Math.PI),
    ).toBe(90);
    expect(boutique.transform[4]).toBeGreaterThan(360); // right-hand panel
    expect(Math.hypot(boutique.transform[0]!, boutique.transform[1]!)).toBeLessThan(20); // size from the box width, not a 300pt glyph
    const retour = find("RETOUR")!;
    expect(retour).toBeTruthy();
    expect(
      Math.abs(
        Math.round((Math.atan2(retour.transform[1]!, retour.transform[0]!) * 180) / Math.PI),
      ),
    ).toBe(180);
    expect(retour.transform[5]).toBeLessThan(60); // bottom strip
  }, 180_000);
});

describe("linesFromTesseract", () => {
  it("maps a vertical baseline from a 0° pass to a 90° line without transformation", () => {
    const lines = linesFromTesseract({
      text: "",
      confidence: 90,
      imageWidth: 1000,
      imageHeight: 800,
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                {
                  text: "ARTS\n",
                  bbox: { x0: 900, y0: 100, x1: 930, y1: 400 },
                  baseline: { x0: 925, y0: 400, x1: 925, y1: 100 },
                  words: [
                    { text: "ARTS", confidence: 95, bbox: { x0: 900, y0: 100, x1: 930, y1: 400 } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(lines[0]!.angle).toBe(90);
    expect(lines[0]!.x0).toBe(900);
  });

  it("maps boxes of a 180° pass back to the original image", () => {
    const lines = linesFromTesseract(
      {
        text: "",
        confidence: 90,
        blocks: [
          {
            paragraphs: [
              {
                lines: [
                  {
                    text: "RETOUR\n",
                    bbox: { x0: 10, y0: 10, x1: 110, y1: 40 },
                    baseline: { x0: 10, y0: 35, x1: 110, y1: 35 },
                    words: [
                      { text: "RETOUR", confidence: 95, bbox: { x0: 10, y0: 10, x1: 110, y1: 40 } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        pass: 180,
        skew: 0,
        passWidth: 1000,
        passHeight: 800,
        originalWidth: 1000,
        originalHeight: 800,
      },
    );
    expect(lines[0]).toMatchObject({ angle: 180, x0: 890, y0: 760, x1: 990, y1: 790, pass: 180 });
  });
});
