/**
 * Font palette of the editor: every listed face exists, parses, covers French
 * text, embeds (subset) and comes back as real text when the exported file is
 * reopened with pdf.js. Dash styles and underlines reach the content stream.
 */
import path from "node:path";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { fontFamilies, hasStyle, styleFor, type FontStyle } from "@/lib/pdf/fonts";
import {
  embedFamilyFont,
  fontFileFor,
  glyphSupport,
  sanitizeForFamily,
  setFontLoader,
} from "@/lib/pdf/fonts-embed";
import { drawAnnotations } from "@/lib/pdf/annotations/draw";
import {
  dashArrayFor,
  duplicateAnnotation,
  type Annotation,
  type TextAnnotation,
} from "@/lib/pdf/annotations/types";
import { decodeLatin1, extractPageText } from "../helpers";
import { pageContentBytes } from "@/lib/pdf/text-edit/apply";

const fontsDir = path.resolve(__dirname, "../../public/fonts");
setFontLoader(async (file) => new Uint8Array(await readFile(path.join(fontsDir, file))));

const FRENCH = "Éàçœ€ — « Résumé » 1 250,00 € ÀÂÎÔÛ ñ ß";
const styles: FontStyle[] = [
  { bold: false, italic: false },
  { bold: true, italic: false },
  { bold: false, italic: true },
  { bold: true, italic: true },
];

describe("font palette", () => {
  it("lists only faces whose files exist and parse", async () => {
    for (const family of fontFamilies) {
      for (const style of styles) {
        const file = fontFileFor(family.id, style);
        if (family.kind === "standard") {
          expect(file).toBeNull();
          continue;
        }
        expect(file, `${family.id} ${JSON.stringify(style)}`).toBeTruthy();
        const bytes = await readFile(path.join(fontsDir, file!));
        expect(bytes.byteLength).toBeGreaterThan(10_000);
        const supports = await glyphSupport(family.id, style);
        for (const ch of Array.from("Éàçœ€ÀÂÎÔÛñß«»—"))
          expect(supports(ch.codePointAt(0)!), `${family.id} ${file} lacks ${ch}`).toBe(true);
      }
    }
  });

  it("falls back honestly when a style is missing (DejaVu Sans has no italic)", () => {
    expect(hasStyle("dejavu-sans", { bold: false, italic: true })).toBe(false);
    expect(styleFor("dejavu-sans", { bold: true, italic: true })).toEqual({
      bold: true,
      italic: false,
    });
    expect(fontFileFor("dejavu-sans", { bold: false, italic: true })).toBe("DejaVuSans.ttf");
    expect(hasStyle("liberation-sans", { bold: true, italic: true })).toBe(true);
    expect(hasStyle("helvetica", { bold: true, italic: true })).toBe(true);
  });

  it("replaces only what a face cannot draw", async () => {
    const standard = await sanitizeForFamily("Été 中 ✓", "helvetica", {
      bold: false,
      italic: false,
    });
    expect(standard).toEqual({ text: "Été ? ?", replaced: true });
    const embedded = await sanitizeForFamily("Été 中", "liberation-sans", {
      bold: false,
      italic: false,
    });
    expect(embedded).toEqual({ text: "Été ?", replaced: true });
    const fine = await sanitizeForFamily(FRENCH, "carlito", { bold: true, italic: true });
    expect(fine.replaced).toBe(false);
  });

  it("embeds every family as a subset and the text is extractable after export", async () => {
    for (const family of fontFamilies) {
      const doc = await PDFDocument.create();
      doc.addPage([400, 300]);
      const annotation: TextAnnotation = {
        id: `t-${family.id}`,
        type: "text",
        pageIndex: 0,
        x: 20,
        y: 200,
        width: 360,
        height: 30,
        text: `Test ${family.label} : ${FRENCH}`,
        fontFamily: family.id,
        fontSize: 14,
        bold: family.id === "carlito",
        italic: family.id === "gelasio",
        underline: family.id === "open-sans",
        color: { r: 0, g: 0, b: 0 },
        align: "left",
      };
      const report = await drawAnnotations(doc, [annotation]);
      expect(report.replacedCharacters, family.id).toBe(0);
      const bytes = await doc.save({ useObjectStreams: false });
      const text = (await extractPageText(bytes, 0)).join(" ");
      expect(text, family.id).toContain("Résumé");
      expect(text, family.id).toContain("€");
      // Subset: an embedded family stays far below its full file size.
      if (family.kind === "embedded") {
        expect(bytes.byteLength, family.id).toBeLessThan(120_000);
        expect(decodeLatin1(bytes)).toMatch(/FontFile2|FontFile3/);
      } else {
        expect(decodeLatin1(bytes)).not.toMatch(/FontFile/);
      }
    }
    // The embed cache serves one face per document.
    const doc = await PDFDocument.create();
    const a = await embedFamilyFont(doc, "liberation-sans", { bold: false, italic: false });
    expect(a.name).toContain("LiberationSans");
  }, 60_000);

  it("writes dash arrays and underlines to the page content", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([300, 300]);
    const annotations: Annotation[] = [
      {
        id: "r",
        type: "rect",
        pageIndex: 0,
        x: 10,
        y: 10,
        width: 100,
        height: 50,
        strokeWidth: 2,
        strokeColor: { r: 1, g: 0, b: 0 },
        fillColor: null,
        opacity: 1,
        dash: "dashed",
      },
      {
        id: "l",
        type: "line",
        pageIndex: 0,
        start: { x: 10, y: 100 },
        end: { x: 200, y: 100 },
        strokeWidth: 3,
        color: { r: 0, g: 0, b: 1 },
        opacity: 1,
        arrow: true,
        dash: "dotted",
      },
      {
        id: "t",
        type: "text",
        pageIndex: 0,
        x: 10,
        y: 200,
        width: 200,
        height: 20,
        text: "Souligné",
        fontFamily: "helvetica",
        fontSize: 12,
        bold: false,
        italic: false,
        underline: true,
        color: { r: 0, g: 0, b: 0 },
        align: "left",
      },
    ];
    await drawAnnotations(doc, annotations);
    const reloaded = await PDFDocument.load(await doc.save({ useObjectStreams: false }));
    const content = decodeLatin1(pageContentBytes(reloaded, reloaded.getPage(0)));
    expect(content).toMatch(/\[8 5\] 0 d/);
    expect(content).toMatch(/\[0\.3 6\] 0 d/);
    expect(dashArrayFor("solid", 2)).toBeUndefined();
    // The underline is a stroked line just under the baseline (y = 200 + 20 − 12·0.95 − 12·0.12 ≈ 207.2).
    expect(content).toMatch(/10 207\.16 m\n[\d.]+ 207\.16 l\nS/);
  });

  it("duplicates an annotation with a new id and an offset", () => {
    const rect: Annotation = {
      id: "a",
      type: "rect",
      pageIndex: 0,
      x: 5,
      y: 50,
      width: 10,
      height: 10,
      strokeWidth: 1,
      strokeColor: null,
      fillColor: null,
      opacity: 1,
    };
    const copy = duplicateAnnotation(rect, "b");
    expect(copy).toMatchObject({ id: "b", x: 17, y: 38, width: 10 });
    const line: Annotation = {
      id: "l",
      type: "line",
      pageIndex: 0,
      start: { x: 0, y: 0 },
      end: { x: 10, y: 10 },
      strokeWidth: 1,
      color: { r: 0, g: 0, b: 0 },
      opacity: 1,
      arrow: false,
    };
    expect(duplicateAnnotation(line, "m", 5)).toMatchObject({
      id: "m",
      start: { x: 5, y: -5 },
      end: { x: 15, y: 5 },
    });
  });
});
