/**
 * Copies browser runtime assets served same-origin from /public:
 *  - pdf.js worker, CMaps, standard fonts, WASM decoders, ICC profiles → public/pdfjs
 *  - Tesseract.js worker + core (WASM) + French/English models → public/ocr
 *  - qpdf WASM (password protection / unlock / check) → public/qpdf
 * Runs automatically after install and before build (see package.json).
 */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, "../public");

function pkgDir(name) {
  return path.dirname(require.resolve(`${name}/package.json`));
}

async function fresh(dir) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

// --- pdf.js
{
  const dir = pkgDir("pdfjs-dist");
  const { version } = require("pdfjs-dist/package.json");
  const target = path.join(publicDir, "pdfjs");
  await fresh(target);
  await cp(path.join(dir, "build/pdf.worker.min.mjs"), path.join(target, "pdf.worker.min.mjs"));
  for (const sub of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
    await cp(path.join(dir, sub), path.join(target, sub), { recursive: true });
  }
  await writeFile(path.join(target, "VERSION"), `${version}\n`);
  console.log(`pdf.js ${version} → public/pdfjs`);
}

// --- Tesseract.js (OCR)
{
  const target = path.join(publicDir, "ocr");
  await fresh(target);
  const tess = pkgDir("tesseract.js");
  const core = pkgDir("tesseract.js-core");
  await cp(path.join(tess, "dist/worker.min.js"), path.join(target, "worker.min.js"));
  await mkdir(path.join(target, "core"), { recursive: true });
  // tesseract.js (legacyCore: false) loads an LSTM-only core variant chosen at runtime from the
  // CPU features (relaxed SIMD → SIMD → plain). Each variant is a .wasm.js loader plus its .wasm.
  const { readdir } = await import("node:fs/promises");
  // Only the single-file "*.wasm.js" builds are ever requested by the worker (the wasm is embedded);
  // the separate .js/.wasm pairs would be dead weight in public/.
  const coreFiles = (await readdir(core)).filter((f) =>
    /^tesseract-core-.*lstm.*\.wasm\.js$/.test(f),
  );
  for (const file of coreFiles) await cp(path.join(core, file), path.join(target, "core", file));
  await mkdir(path.join(target, "lang"), { recursive: true });
  for (const lang of ["fra", "eng"]) {
    const dir = pkgDir(`@tesseract.js-data/${lang}`);
    await cp(
      path.join(dir, "4.0.0", `${lang}.traineddata.gz`),
      path.join(target, "lang", `${lang}.traineddata.gz`),
    );
  }
  const { version } = require("tesseract.js/package.json");
  await writeFile(path.join(target, "VERSION"), `${version}\n`);
  console.log(`tesseract.js ${version} + fra/eng models → public/ocr`);
}

// --- qpdf (WASM)
{
  const target = path.join(publicDir, "qpdf");
  await fresh(target);
  await cp(
    path.join(pkgDir("@neslinesli93/qpdf-wasm"), "dist/qpdf.wasm"),
    path.join(target, "qpdf.wasm"),
  );
  const { version } = require("@neslinesli93/qpdf-wasm/package.json");
  await writeFile(path.join(target, "VERSION"), `${version}\n`);
  console.log(`qpdf-wasm ${version} → public/qpdf`);
}
