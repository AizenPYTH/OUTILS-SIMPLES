import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "@/lib/conversion/html-to-markdown";
import { docxToMarkdown, docxToPdf } from "@/lib/conversion/docx";
import {
  cellText,
  csvToTable,
  sheetToPdf,
  tablesToMarkdown,
  workbookToTables,
} from "@/lib/conversion/sheet";
import { itemsToParagraphs, pdfToDocx } from "@/lib/conversion/pdf-to-docx";
import { textToPdf, defaultTextToPdfOptions } from "@/lib/pdf/operations/text-to-pdf";
import { getToolById, getToolsByCategory } from "@/lib/tools";

const fixtures = path.resolve(__dirname, "../fixtures");
const fixture = async (name: string) => new Uint8Array(await readFile(path.join(fixtures, name)));
const require = createRequire(__filename);

async function pageText(bytes: Uint8Array, pageIndex: number): Promise<string> {
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

describe("html → markdown (mammoth output)", () => {
  it("converts headings, inline styles, links, nested lists, tables and data-URI images", () => {
    const html =
      '<h1>Titre</h1><p>Texte <strong>gras</strong> et <em>italique</em>, lien <a href="https://averopdf.fr/">site</a>.</p>' +
      "<ul><li>Un</li><li>Deux<ol><li>Deux a</li></ol></li></ul>" +
      "<table><tr><th>A</th><th>B | C</th></tr><tr><td><p>1</p></td><td>2</td></tr></table>" +
      '<p><img src="data:image/png;base64,iVBORw0KGgo=" alt="logo" /></p><p>5 * 3 = 15 &amp; fin</p>';
    const { markdown, warnings } = htmlToMarkdown(html);
    expect(markdown).toContain("# Titre");
    expect(markdown).toContain("**gras**");
    expect(markdown).toContain("*italique*");
    expect(markdown).toContain("[site](https://averopdf.fr/)");
    expect(markdown).toContain("- Un\n- Deux\n    1. Deux a");
    expect(markdown).toContain("| A | B \\| C |\n| --- | --- |\n| 1 | 2 |");
    expect(markdown).toContain("![logo](data:image/png;base64,iVBORw0KGgo=)");
    expect(markdown).toContain("5 \\* 3 = 15 & fin");
    expect(warnings).toEqual([]);
  });

  it("reports unsupported images instead of dropping them silently", () => {
    const { markdown, warnings } = htmlToMarkdown(
      '<p><img src="data:image/x-emf;base64,AAAA" alt="schéma" /></p>',
    );
    expect(markdown).toContain("*[schéma]*");
    expect(warnings[0]).toMatch(/non pris en charge/);
  });
});

describe("markdown renderer: embedded images and landscape", () => {
  it("draws PNG data URIs and counts them; landscape swaps the page size", async () => {
    const png = Buffer.from(await fixture("logo-alpha.png")).toString("base64");
    const md = `# Image\n\nAvant\n\n![logo](data:image/png;base64,${png})\n\nAprès`;
    const result = await textToPdf(md, { ...defaultTextToPdfOptions, orientation: "landscape" });
    expect(result.imageCount).toBe(1);
    expect(result.skipped).toEqual([]);
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(result.bytes);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeGreaterThan(height);
    expect(await pageText(result.bytes, 0)).toContain("Après");
  });
});

describe("word → pdf", () => {
  it("keeps headings, styles, list, table cells, the image and the second page", async () => {
    const bytes = await fixture("office-sample.docx");
    const { markdown, warnings } = await docxToMarkdown(bytes);
    expect(markdown).toContain("# Rapport de test AVEROPDF");
    expect(markdown).toContain("**texte en gras**");
    expect(markdown).toContain("- Déposer le fichier");
    expect(markdown).toContain("| Carnet \\| A5 | 2 | 4,90 € |");
    expect(markdown).toContain("![](data:image/png;base64,");
    expect(warnings).toEqual([]);
    const result = await docxToPdf(bytes);
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
    expect(result.imageCount).toBe(1);
    const text = await pageText(result.bytes, 0);
    expect(text).toContain("Rapport de test AVEROPDF");
    expect(text).toContain("Prix unitaire");
    expect(text).toContain("Seconde page");
  });

  it("rejects non-docx input with a clear message", async () => {
    await expect(docxToPdf(new Uint8Array([1, 2, 3, 4, 5]))).rejects.toThrow(/\.docx/);
    await expect(docxToPdf(await fixture("simple-3-pages.pdf"))).rejects.toThrow(/Word/);
  });
});

describe("excel / csv → pdf", () => {
  it("formats cells: numbers per format, dates, formulas by their result, rich text, booleans", () => {
    expect(cellText(1.5, "0.00 €")).toBe("1,50");
    expect(cellText(0.1, "0%")).toBe("10 %");
    expect(cellText(1234.5)).toBe("1 234,5");
    expect(cellText(new Date(Date.UTC(2026, 2, 12)), "dd/mm/yyyy")).toBe("12/03/2026");
    expect(cellText({ formula: "A1*2", result: 9.8 }, "0.00")).toBe("9,80");
    expect(cellText({ richText: [{ text: "Relire " }, { text: "avant" }] })).toBe("Relire avant");
    expect(cellText(true)).toBe("VRAI");
    expect(cellText({ error: "#DIV/0!" })).toBe("#DIV/0!");
  });

  it("reads every non-empty sheet of the workbook and reports the empty one", async () => {
    const { tables, warnings } = await workbookToTables(await fixture("office-sample.xlsx"));
    expect(tables.map((t) => t.name)).toEqual(["Ventes", "Notes"]);
    expect(tables[0]!.rows[0]).toEqual(["Produit", "Quantité", "Prix", "Date", "Total"]);
    expect(tables[0]!.rows[1]).toEqual(["Stylo", "3", "1,50", "12/03/2026", "4,5"]);
    expect(tables[0]!.rows[3]![2]).toBe("10 %");
    expect(tables[1]!.rows[1]).toEqual(["Claire", "Relire avant envoi"]);
    expect(warnings).toEqual(["Feuille « Vide » vide : ignorée."]);
    const md = tablesToMarkdown(tables);
    expect(md).toContain("## Ventes");
    expect(md).toContain("| Produit | Quantité | Prix | Date | Total |");
  });

  it("parses CSV with detected delimiter and quotes, then renders a PDF", async () => {
    const text = new TextDecoder().decode(await fixture("office-sample.csv"));
    const table = csvToTable(text, "office-sample");
    expect(table.rows).toEqual([
      ["Nom", "Ville", "Montant"],
      ["Dupont", "Lyon", "12,50"],
      ["Martin; Léa", "Paris", "8,00"],
      ["Durand", "Saint-Étienne", "3,25"],
    ]);
    const result = await sheetToPdf({ kind: "csv", text, name: "office-sample" });
    expect(result.pageCount).toBe(1);
    const pdfText = await pageText(result.bytes, 0);
    expect(pdfText).toContain("Saint-Étienne");
    expect(pdfText).toContain("Martin; Léa");
  });

  it("renders the workbook in landscape with one section per sheet", async () => {
    const result = await sheetToPdf({ kind: "xlsx", bytes: await fixture("office-sample.xlsx") });
    expect(result.tables).toHaveLength(2);
    expect(result.warnings).toContain("Feuille « Vide » vide : ignorée.");
    const text = await pageText(result.bytes, 0);
    expect(text).toContain("Ventes");
    expect(text).toContain("Notes");
    expect(text).toContain("12/03/2026");
  });
});

describe("pdf → word", () => {
  it("groups text items into lines and paragraphs with headings and styles", () => {
    const item = (
      str: string,
      x: number,
      y: number,
      size: number,
      font = "g_d0_f1",
      width = str.length * size * 0.5,
    ) => ({
      str,
      transform: [size, 0, 0, size, x, y],
      width,
      height: size,
      fontName: font,
    });
    const paragraphs = itemsToParagraphs(
      [
        item("Titre", 255, 700, 24, "Helvetica-Bold"),
        item("Première", 60, 650, 11),
        item("ligne", 120, 650, 11),
        item("suite de la ligne", 60, 636, 11),
        item("Nouveau paragraphe", 60, 580, 11, "Times-Italic"),
      ],
      { g_d0_f1: { fontFamily: "sans-serif" } },
      595,
    );
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]).toMatchObject({ heading: 1, align: "center" });
    expect(paragraphs[0]!.runs[0]).toMatchObject({ text: "Titre", bold: true });
    expect(paragraphs[1]!.runs.map((r) => r.text).join("")).toBe(
      "Première ligne suite de la ligne",
    );
    expect(paragraphs[2]!.runs[0]).toMatchObject({ text: "Nouveau paragraphe", italic: true });
  });

  it("writes a .docx with one page per PDF page, text and images", async () => {
    const result = await pdfToDocx(await fixture("links-and-images.pdf"));
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
    expect(result.paragraphCount).toBeGreaterThan(0);
    expect(result.imageCount).toBeGreaterThan(0);
    const files = unzipSync(result.bytes);
    const xml = strFromU8(files["word/document.xml"]!);
    expect(xml).toContain(
      '<w:br w:type="page"/>'.replace('w:type="page"', 'w:type="page"') || "w:br",
    );
    expect((xml.match(/w:type="page"/g) ?? []).length).toBe(result.pageCount - 1);
    expect(Object.keys(files).some((f) => f.startsWith("word/media/"))).toBe(true);
    const three = await pdfToDocx(await fixture("simple-3-pages.pdf"), {
      pageBreaks: true,
      images: false,
    });
    const xml3 = strFromU8(unzipSync(three.bytes)["word/document.xml"]!);
    expect(xml3).toContain("Page 1 / 3");
    expect(xml3).toContain("Page 3 / 3");
    expect((xml3.match(/w:type="page"/g) ?? []).length).toBe(2);
    expect(three.imageCount).toBe(0);
  });

  it("keeps the image of a scanned page and says the text is missing", async () => {
    const result = await pdfToDocx(await fixture("scan-image-only.pdf"));
    expect(result.emptyPages).toEqual([0]);
    expect(result.imageCount).toBe(1);
    expect(result.warnings[0]).toMatch(/OCR/);
  });
});

describe("conversion registry", () => {
  it("publishes three tools in the conversion category with honest limits", () => {
    const tools = getToolsByCategory("conversion");
    expect(tools.map((t) => t.id).sort()).toEqual([
      "conv-docx-pdf",
      "conv-pdf-docx",
      "conv-sheet-pdf",
    ]);
    for (const tool of tools) {
      expect(tool.content.limitations.length).toBeGreaterThanOrEqual(4);
      expect(tool.content.faq.length).toBeGreaterThanOrEqual(2);
      expect(tool.content.limitations.join(" ")).toMatch(
        /simplifi|pas reproduit|pas reconstruit|approxim/i,
      );
    }
    expect(getToolById("conv-docx-pdf")?.inputFormats[0]).toContain("wordprocessingml");
  });
});
