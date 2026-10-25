/**
 * Copies the pdf.js runtime assets (worker, CMaps, standard fonts, WASM
 * decoders, ICC profiles) into public/pdfjs so they are served same-origin.
 * Runs automatically after install and before build (see package.json).
 */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = require.resolve("pdfjs-dist/package.json");
const pkgDir = path.dirname(pkgPath);
const { version } = require(pkgPath);
const target = path.resolve(here, "../public/pdfjs");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(path.join(pkgDir, "build/pdf.worker.min.mjs"), path.join(target, "pdf.worker.min.mjs"));
for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  await cp(path.join(pkgDir, dir), path.join(target, dir), { recursive: true });
}
await writeFile(path.join(target, "VERSION"), `${version}\n`);
console.log(`pdf.js ${version} assets copied to public/pdfjs`);
