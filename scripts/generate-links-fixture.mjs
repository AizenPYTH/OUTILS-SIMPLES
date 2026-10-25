// Generates tests/fixtures/links-and-images.pdf: text URLs, a clickable link,
// an internal link, an embedded JPEG and an embedded PNG with transparency.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from "pdf-lib";

const fixtures = path.resolve(process.cwd(), "tests/fixtures");
const doc = await PDFDocument.create();
doc.setTitle("Liens et images");
doc.setAuthor("OUTILIA tests");
const font = await doc.embedFont(StandardFonts.Helvetica);
const page1 = doc.addPage([595, 842]);
page1.drawText("Document de test : liens et images", { x: 50, y: 790, size: 18, font });
page1.drawText("Site : https://outilia.fr/aide/ et contact : bonjour@exemple.fr", { x: 50, y: 750, size: 11, font });
page1.drawText("Numero de dossier : DOSSIER-4242 (confidentiel)", { x: 50, y: 720, size: 11, font });
page1.drawText("Lien cliquable vers la documentation", { x: 50, y: 690, size: 11, font, color: rgb(0.1, 0.2, 0.8) });
const link = doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [50, 685, 260, 702], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of("https://outilia.fr/documentation/") } });
page1.node.addAnnot(doc.context.register(link));
const jpg = await doc.embedJpg(await readFile(path.join(fixtures, "photo-800x600.jpg")));
page1.drawImage(jpg, { x: 50, y: 380, width: 320, height: 240 });
const page2 = doc.addPage([595, 842]);
page2.drawText("Page 2 : voir www.exemple.org pour la suite. DOSSIER-4242 figure aussi ici.", { x: 50, y: 790, size: 11, font });
const png = await doc.embedPng(await readFile(path.join(fixtures, "logo-alpha.png")));
page2.drawImage(png, { x: 50, y: 500, width: 160, height: 160 });
const internal = doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [50, 100, 150, 120], Dest: [page1.ref, PDFName.of("Fit")] });
page2.node.addAnnot(doc.context.register(internal));
await writeFile(path.join(fixtures, "links-and-images.pdf"), await doc.save());
console.log("written links-and-images.pdf");
