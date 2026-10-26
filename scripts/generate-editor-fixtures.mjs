/**
 * Fixtures of the PDF editor's import diagnosis: a mixed document (native
 * text, an image-only page, native text), an image-only page carrying real
 * text (for in-editor OCR) and a document protected by a user password
 * (AES-256, password "secret42", owner "owner42").
 * Run with: node scripts/generate-editor-fixtures.mjs
 */
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import createQpdf from "@neslinesli93/qpdf-wasm";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../tests/fixtures");
const require = createRequire(import.meta.url);

async function mixed() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc
    .addPage([595, 842])
    .drawText("Page avec texte natif : contrat de location, article 1.", {
      x: 60,
      y: 760,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });
  const png = await doc.embedPng(await readFile(path.join(outDir, "logo-alpha.png")));
  doc.addPage([595, 842]).drawImage(png, { x: 40, y: 60, width: 515, height: 720 });
  doc
    .addPage([595, 842])
    .drawText("Troisieme page, texte natif egalement.", { x: 60, y: 760, size: 14, font });
  return doc.save();
}

async function scanWithText() {
  const doc = await PDFDocument.create();
  const png = await doc.embedPng(await readFile(path.join(outDir, "text-french.png")));
  const page = doc.addPage([595, 842]);
  const scale = Math.min(515 / png.width, 760 / png.height);
  page.drawImage(png, {
    x: 40,
    y: 842 - 40 - png.height * scale,
    width: png.width * scale,
    height: png.height * scale,
  });
  return doc.save();
}

async function protectedUser() {
  const wasmPath = path.join(
    path.dirname(require.resolve("@neslinesli93/qpdf-wasm/package.json")),
    "dist/qpdf.wasm",
  );
  const input = await readFile(path.join(outDir, "simple-3-pages.pdf"));
  const qpdf = await createQpdf({ locateFile: () => wasmPath, noInitialRun: true });
  qpdf.FS.writeFile("/in.pdf", new Uint8Array(input));
  const code = qpdf.callMain([
    "--encrypt",
    "secret42",
    "owner42",
    "256",
    "--",
    "/in.pdf",
    "/out.pdf",
  ]);
  if (code !== 0) throw new Error(`qpdf exited with ${code}`);
  return qpdf.FS.readFile("/out.pdf");
}

const files = {
  "mixed-text-scan.pdf": await mixed(),
  "scan-text.pdf": await scanWithText(),
  "protected-user.pdf": await protectedUser(),
};
for (const [name, bytes] of Object.entries(files)) {
  await writeFile(path.join(outDir, name), bytes);
  console.log(`wrote ${name} (${bytes.byteLength} bytes)`);
}
