/**
 * Generates synthetic Office fixtures (no personal data) into tests/fixtures:
 *   office-sample.docx (headings, bold/italic, list, table, PNG image, second page)
 *   office-sample.xlsx (two sheets: numbers, dates, a formula with its result, rich text)
 *   office-sample.csv  (semicolon separated, quoted field)
 * Run with: node scripts/generate-office-fixtures.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../tests/fixtures");

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  PageBreak,
  ExternalHyperlink,
} = require("docx");
const ExcelJS = require("exceljs");

async function docxFixture() {
  const png = await readFile(path.join(outDir, "logo-alpha.png"));
  const cell = (text) => new TableCell({ children: [new Paragraph(text)] });
  const doc = new Document({
    creator: "AVEROPDF fixtures",
    sections: [
      {
        children: [
          new Paragraph({ text: "Rapport de test AVEROPDF", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            children: [
              new TextRun("Ce document synthétique contient du "),
              new TextRun({ text: "texte en gras", bold: true }),
              new TextRun(", du "),
              new TextRun({ text: "texte en italique", italics: true }),
              new TextRun(" et un lien : "),
              new ExternalHyperlink({
                children: [new TextRun({ text: "averopdf.fr", style: "Hyperlink" })],
                link: "https://averopdf.fr/",
              }),
              new TextRun("."),
            ],
          }),
          new Paragraph({ text: "Liste des étapes", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "Déposer le fichier", bullet: { level: 0 } }),
          new Paragraph({ text: "Vérifier les options", bullet: { level: 0 } }),
          new Paragraph({ text: "Télécharger le PDF", bullet: { level: 0 } }),
          new Paragraph({ text: "Tableau récapitulatif", heading: HeadingLevel.HEADING_2 }),
          new Table({
            rows: [
              new TableRow({
                children: [cell("Élément"), cell("Quantité"), cell("Prix unitaire")],
              }),
              new TableRow({ children: [cell("Stylo"), cell("3"), cell("1,50 €")] }),
              new TableRow({ children: [cell("Carnet | A5"), cell("2"), cell("4,90 €")] }),
            ],
          }),
          new Paragraph({
            children: [
              new ImageRun({ type: "png", data: png, transformation: { width: 160, height: 80 } }),
            ],
          }),
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({ text: "Seconde page", heading: HeadingLevel.HEADING_1 }),
          new Paragraph("Le texte de la seconde page se trouve après un saut de page explicite."),
        ],
      },
    ],
  });
  await writeFile(path.join(outDir, "office-sample.docx"), await Packer.toBuffer(doc));
}

async function xlsxFixture() {
  const workbook = new ExcelJS.Workbook();
  const ventes = workbook.addWorksheet("Ventes");
  ventes.addRow(["Produit", "Quantité", "Prix", "Date", "Total"]);
  ventes.addRow([
    "Stylo",
    3,
    1.5,
    new Date(Date.UTC(2026, 2, 12)),
    { formula: "B2*C2", result: 4.5 },
  ]);
  ventes.addRow([
    "Carnet",
    2,
    4.9,
    new Date(Date.UTC(2026, 2, 13)),
    { formula: "B3*C3", result: 9.8 },
  ]);
  ventes.addRow(["Remise", 1, 0.1, null, { formula: "C4", result: 0.1 }]);
  ventes.getCell("C2").numFmt = "0.00 €";
  ventes.getCell("C3").numFmt = "0.00 €";
  ventes.getCell("C4").numFmt = "0%";
  ventes.getCell("D2").numFmt = "dd/mm/yyyy";
  ventes.getCell("D3").numFmt = "dd/mm/yyyy";
  const notes = workbook.addWorksheet("Notes");
  notes.addRow(["Auteur", "Commentaire"]);
  notes.addRow([
    "Claire",
    { richText: [{ text: "Relire " }, { text: "avant envoi", font: { bold: true } }] },
  ]);
  workbook.addWorksheet("Vide");
  await writeFile(
    path.join(outDir, "office-sample.xlsx"),
    Buffer.from(await workbook.xlsx.writeBuffer()),
  );
}

async function csvFixture() {
  const csv =
    'Nom;Ville;Montant\nDupont;Lyon;12,50\n"Martin; Léa";Paris;8,00\nDurand;"Saint-Étienne";3,25\n';
  await writeFile(path.join(outDir, "office-sample.csv"), csv, "utf8");
}

await docxFixture();
await xlsxFixture();
await csvFixture();
console.log("office fixtures → tests/fixtures/office-sample.{docx,xlsx,csv}");
