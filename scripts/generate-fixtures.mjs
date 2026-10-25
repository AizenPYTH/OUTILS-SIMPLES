/**
 * Generates synthetic test PDFs (no personal data) into tests/fixtures.
 * Run with: pnpm fixtures
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb, degrees, PDFName } from "pdf-lib";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../tests/fixtures");

async function textPdf(pageCount, { rotateSecond = false, mixedSizes = false } = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pageCount; i += 1) {
    const size = mixedSizes && i % 2 === 1 ? [595.28, 841.89].reverse() : [595.28, 841.89];
    const page = doc.addPage(size);
    page.drawText(`Page ${i + 1} / ${pageCount}`, {
      x: 60,
      y: size[1] - 80,
      size: 24,
      font,
      color: rgb(0.1, 0.1, 0.3),
    });
    page.drawText("Document de test OUTILIA — contenu synthétique.", {
      x: 60,
      y: size[1] - 120,
      size: 12,
      font,
    });
    page.drawRectangle({
      x: 60,
      y: 60,
      width: 120,
      height: 40,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
    if (rotateSecond && i === 1) page.setRotation(degrees(90));
  }
  doc.setTitle(`Fixture ${pageCount} pages`);
  return doc.save();
}

function makeRawRgbImage(width, height) {
  const data = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      data[i] = (x * 255) / width;
      data[i + 1] = (y * 255) / height;
      data[i + 2] = 128;
    }
  }
  return data;
}

async function imagePdf() {
  // A page with a large uncompressed RGB image (good compression candidate).
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const width = 400;
  const height = 300;
  const raw = makeRawRgbImage(width, height);
  const stream = doc.context.flateStream(raw, {
    Type: "XObject",
    Subtype: "Image",
    Width: width,
    Height: height,
    ColorSpace: "DeviceRGB",
    BitsPerComponent: 8,
  });
  const ref = doc.context.register(stream);
  const name = page.node.newXObject("Im1", ref);
  page.drawText("Image de test", { x: 60, y: 780, size: 18 });
  // Draw the image with raw operators (pdf-lib has no helper for a pre-registered XObject).
  const { pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } =
    await import("pdf-lib");
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(400, 0, 0, 300, 60, 400),
    drawObject(name),
    popGraphicsState(),
  );
  doc.setTitle("Fixture image");
  return doc.save({ useObjectStreams: false });
}

async function formPdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("Formulaire de test", { x: 60, y: 780, size: 18, font });

  const nameField = form.createTextField("nom");
  nameField.addToPage(page, { x: 60, y: 700, width: 300, height: 28 });
  const emailField = form.createTextField("email");
  emailField.addToPage(page, { x: 60, y: 650, width: 300, height: 28 });
  const notes = form.createTextField("notes");
  notes.enableMultiline();
  notes.addToPage(page, { x: 60, y: 540, width: 300, height: 90 });
  const check = form.createCheckBox("accepte");
  check.addToPage(page, { x: 60, y: 500, width: 18, height: 18 });
  const radio = form.createRadioGroup("civilite");
  radio.addOptionToPage("Madame", page, { x: 60, y: 460, width: 18, height: 18 });
  radio.addOptionToPage("Monsieur", page, { x: 160, y: 460, width: 18, height: 18 });
  const dropdown = form.createDropdown("pays");
  dropdown.addOptions(["France", "Belgique", "Suisse"]);
  dropdown.addToPage(page, { x: 60, y: 410, width: 200, height: 28 });
  const readOnly = form.createTextField("reference");
  readOnly.setText("REF-0001");
  readOnly.enableReadOnly();
  readOnly.addToPage(page, { x: 60, y: 360, width: 200, height: 28 });
  doc.setTitle("Fixture formulaire");
  return doc.save();
}

async function watermarkAnnotationPdf() {
  // A PDF with a native /Watermark annotation (PDF 1.6 subtype).
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  page.drawText("Page avec annotation Watermark", { x: 60, y: 780, size: 16 });
  const annot = doc.context.obj({
    Type: "Annot",
    Subtype: "Watermark",
    Rect: [100, 300, 500, 400],
    F: 4,
    Contents: (await import("pdf-lib")).PDFString.of("SPECIMEN"),
  });
  const annotRef = doc.context.register(annot);
  page.node.set(PDFName.of("Annots"), doc.context.obj([annotRef]));
  return doc.save();
}

async function encryptedLikePdf() {
  // Minimal PDF with an /Encrypt entry in the trailer so loaders report encryption.
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  const encrypt = doc.context.obj({ Filter: "Standard", V: 1, R: 2, Length: 40, P: -1 });
  doc.context.trailerInfo.Encrypt = doc.context.register(encrypt);
  return doc.save({ useObjectStreams: false });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const files = {
    "simple-3-pages.pdf": await textPdf(3),
    "simple-5-pages.pdf": await textPdf(5),
    "rotated-2nd-page.pdf": await textPdf(3, { rotateSecond: true }),
    "mixed-sizes-4-pages.pdf": await textPdf(4, { mixedSizes: true }),
    "image-raw-rgb.pdf": await imagePdf(),
    "form-acroform.pdf": await formPdf(),
    "watermark-annotation.pdf": await watermarkAnnotationPdf(),
    "encrypted-flag.pdf": await encryptedLikePdf(),
    "not-a-pdf.txt": new TextEncoder().encode("Ceci n'est pas un PDF.\n"),
    "corrupted.pdf": new TextEncoder().encode(
      "%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n",
    ),
  };
  // Tiny valid PNG (2x2, with alpha) and JPEG for image/signature tests.
  files["signature.png"] = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVQImWNgYGD4z8DAwMDAwMDAAAAUAQMBuvr0VwAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  // Image-only page (what a scanner app produces): no text operator at all.
  {
    const doc = await PDFDocument.create();
    const png = await doc.embedPng(await readFile(path.join(outDir, "logo-alpha.png")));
    doc.addPage([595, 842]).drawImage(png, { x: 40, y: 60, width: 515, height: 720 });
    files["scan-image-only.pdf"] = await doc.save();
  }
  for (const [name, bytes] of Object.entries(files)) {
    await writeFile(path.join(outDir, name), bytes);
    console.log(`wrote ${name} (${bytes.byteLength} bytes)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
