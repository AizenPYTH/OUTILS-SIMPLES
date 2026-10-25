import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { fromLatin1, latin1, spliceBytes, tokenizeContent } from "@/lib/pdf/content/tokenizer";
import {
  applyTextEdits,
  collectTextOps,
  encodeWithOriginal,
  pageContentBytes,
} from "@/lib/pdf/text-edit/apply";
import type { OriginalEncoding, TextEdit } from "@/lib/pdf/text-edit/types";

const require = createRequire(import.meta.url);

async function extractText(bytes: Uint8Array, pageIndex: number): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useWorkerFetch: false,
    disableFontFace: true,
    verbosity: 0,
    standardFontDataUrl: path.join(
      path.dirname(require.resolve("pdfjs-dist/package.json")),
      "standard_fonts/",
    ),
  });
  const doc = await task.promise;
  const page = await doc.getPage(pageIndex + 1);
  const content = await page.getTextContent();
  const text = content.items.map((i) => ("str" in i ? i.str : "")).join(" ");
  await task.destroy();
  return text;
}

/** WinAnsi codes for printable ASCII, as a simple font would expose them. */
const asciiEncoding: OriginalEncoding = {
  bytesPerCode: 1,
  codes: Object.fromEntries(
    Array.from({ length: 95 }, (_, i) => [String.fromCharCode(32 + i), 32 + i]),
  ),
};

async function sampleDoc(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  page.drawText("Bonjour le monde", { x: 72, y: 700, size: 14, font, color: rgb(0, 0, 0) });
  page.drawText("Deuxieme ligne", {
    x: 72,
    y: 670,
    size: 12,
    font: bold,
    color: rgb(0.2, 0.2, 0.6),
  });
  page.drawRectangle({ x: 72, y: 600, width: 100, height: 20, color: rgb(1, 0, 0) });
  return doc.save({ useObjectStreams: false });
}

describe("content-stream tokenizer", () => {
  it("parses operators with byte ranges, nested strings, arrays and inline images", () => {
    const src =
      "BT /F1 12 Tf 72 700 Td (Hello \\(world\\)\\n) Tj [(A) -250 <42>] TJ ET q BI /W 1 /H 1 ID \u0000\u0001 EI Q %c\n1 0 0 1 0 0 cm";
    const bytes = fromLatin1(src);
    const ops = tokenizeContent(bytes);
    expect(ops.map((o) => o.op)).toEqual([
      "BT",
      "Tf",
      "Td",
      "Tj",
      "TJ",
      "ET",
      "q",
      "BI",
      "Q",
      "cm",
    ]);
    const tj = ops[3]!;
    expect(latin1(bytes, tj.start, tj.end)).toBe("(Hello \\(world\\)\\n) Tj");
    const str = tj.operands[0]!;
    expect(str.type).toBe("string");
    if (str.type === "string") expect(latin1(str.bytes)).toBe("Hello (world)\n");
    const tjArray = ops[4]!;
    expect(tjArray.operands[0]!.type).toBe("array");
    if (tjArray.operands[0]!.type === "array") {
      const items = tjArray.operands[0]!.items;
      expect(items.map((i) => i.type)).toEqual(["string", "number", "string"]);
      if (items[2]!.type === "string") expect(items[2]!.bytes[0]).toBe(0x42);
    }
    expect(latin1(bytes, ops[7]!.start, ops[7]!.end)).toBe("BI /W 1 /H 1 ID \u0000\u0001 EI");
    expect(ops[1]!.operands[0]).toMatchObject({ type: "name", value: "F1" });
    expect(ops[9]!.operands.map((o) => (o.type === "number" ? o.value : NaN))).toEqual([
      1, 0, 0, 1, 0, 0,
    ]);
  });

  it("splices replacements without touching the rest of the stream", () => {
    const bytes = fromLatin1("aaa BBB ccc");
    const out = spliceBytes(bytes, [{ start: 4, end: 7, bytes: fromLatin1("xy") }]);
    expect(latin1(out)).toBe("aaa xy ccc");
    expect(() =>
      spliceBytes(bytes, [
        { start: 0, end: 5, bytes: new Uint8Array() },
        { start: 4, end: 7, bytes: new Uint8Array() },
      ]),
    ).toThrow();
  });

  it("collects page-level text operators with their font state", () => {
    const bytes = fromLatin1(
      "q /F2 9 Tf Q BT /F1 12 Tf (ab) Tj [(c) -20 (d)] TJ /F3 1 Tf (e) ' 1 2 (f) \" ET",
    );
    const ops = collectTextOps(bytes);
    expect(ops.map((o) => o.op.op)).toEqual(["Tj", "TJ", "'", '"']);
    expect(ops[0]).toMatchObject({
      index: 0,
      fontName: "F1",
      fontSize: 12,
      stringBytes: 2,
      stringCount: 1,
    });
    expect(ops[1]).toMatchObject({ fontName: "F1", stringBytes: 2, stringCount: 2 });
    expect(ops[2]).toMatchObject({ fontName: "F3", fontSize: 1 });
  });

  it("encodes with the original font, falling back to a TJ gap for a missing space", () => {
    expect(encodeWithOriginal("AB", { bytesPerCode: 1, codes: { A: 65, B: 66 } })).toEqual({
      operand: "<4142>",
      array: false,
    });
    expect(encodeWithOriginal("A B", { bytesPerCode: 1, codes: { A: 65, B: 66 } })).toEqual({
      operand: "[<41> -250 <42>]",
      array: true,
    });
    expect(encodeWithOriginal("AB", { bytesPerCode: 2, codes: { A: 0x0124, B: 2 } })).toEqual({
      operand: "<01240002>",
      array: false,
    });
    expect(encodeWithOriginal("AC", { bytesPerCode: 1, codes: { A: 65 } })).toBeNull();
    expect(encodeWithOriginal("A", { bytesPerCode: 0, codes: { A: 65 } })).toBeNull();
  });
});

describe("applyTextEdits", () => {
  it("replaces the operator in place with the original font: the old text is gone, the new one is real text", async () => {
    const bytes = await sampleDoc();
    const edit: TextEdit = {
      pageIndex: 0,
      opIndex: 0,
      text: "Salut tout le monde",
      original: asciiEncoding,
      fallback: { family: "helvetica", bold: false, italic: false },
    };
    const { bytes: out, report } = await applyTextEdits(bytes, [edit]);
    expect(report).toMatchObject({
      applied: 1,
      fontReplaced: 0,
      replacedCharacters: 0,
      skipped: [],
    });
    const doc = await PDFDocument.load(out);
    const content = latin1(pageContentBytes(doc, doc.getPage(0)));
    // The new string is a plain hex operand of the same operator; no rectangle was painted.
    expect(content).toContain("<53616c757420746f7574206c65206d6f6e6465> Tj");
    expect(content).not.toMatch(/426f6e6a6f7572/i); // "Bonjour"
    expect(content).not.toContain("1 1 1 rg"); // no white rectangle painted over anything
    expect((content.match(/\nf\n/g) ?? []).length).toBe(1); // only the original red rectangle is filled
    const text = await extractText(out, 0);
    expect(text).toContain("Salut tout le monde");
    expect(text).not.toContain("Bonjour");
    expect(text).toContain("Deuxieme ligne");
  });

  it("switches to a standard font for that operator only when the original font lacks a glyph", async () => {
    const bytes = await sampleDoc();
    const edit: TextEdit = {
      pageIndex: 0,
      opIndex: 1,
      text: "Café ☕",
      original: asciiEncoding,
      fallback: { family: "times", bold: true, italic: false },
    };
    const { bytes: out, report } = await applyTextEdits(bytes, [edit]);
    expect(report.applied).toBe(1);
    expect(report.fontReplaced).toBe(1);
    expect(report.replacedCharacters).toBe(1); // ☕ → ?
    const doc = await PDFDocument.load(out);
    const page = doc.getPage(0);
    const content = latin1(pageContentBytes(doc, page));
    expect(content).toMatch(/\/OutiliaTexte\S* 12 Tf <[0-9a-f]+> Tj \/\S+ 12 Tf/i);
    expect(await extractText(out, 0)).toContain("Café ?");
    // The first line is untouched.
    expect(await extractText(out, 0)).toContain("Bonjour le monde");
  });

  it("reports edits it cannot apply instead of guessing", async () => {
    const bytes = await sampleDoc();
    const base = {
      pageIndex: 0,
      text: "x",
      original: asciiEncoding,
      fallback: { family: "helvetica" as const, bold: false, italic: false },
    };
    const { report } = await applyTextEdits(bytes, [
      { ...base, opIndex: 7 },
      { ...base, opIndex: 0 },
      { ...base, opIndex: 0 },
    ]);
    expect(report.applied).toBe(1);
    expect(report.skipped).toEqual([
      { pageIndex: 0, opIndex: 7, reason: "opérateur de texte introuvable" },
      { pageIndex: 0, opIndex: 0, reason: "modification en double" },
    ]);
  });
});
