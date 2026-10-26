/**
 * Builds public/sw.js from src/sw/service-worker.js (version + engine asset key
 * injected) and public/offline-manifest.json (files and bytes per offline group).
 * Runs before every build (see package.json). Both outputs are git-ignored.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const publicDir = path.join(root, "public");

async function readVersion(file, fallback) {
  try {
    return (await readFile(path.join(publicDir, file), "utf8")).trim();
  } catch {
    return fallback;
  }
}

async function listFiles(dir, filter = () => true) {
  const abs = path.join(publicDir, dir);
  let names = [];
  try {
    names = await readdir(abs);
  } catch {
    return [];
  }
  const files = [];
  for (const name of names.sort()) {
    const full = path.join(abs, name);
    const info = await stat(full);
    // Licence texts (no extension) are not runtime files.
    if (info.isFile() && !name.startsWith("LICENSE") && filter(name)) {
      files.push({ url: `/${dir}/${name}`, bytes: info.size });
    }
  }
  return files;
}

export async function buildOfflineManifest() {
  const pdf = [
    ...(await listFiles("pdfjs", (n) => n === "pdf.worker.min.mjs")),
    ...(await listFiles("pdfjs/standard_fonts")),
    ...(await listFiles("pdfjs/wasm")),
    ...(await listFiles("pdfjs/iccs")),
    ...(await listFiles("qpdf", (n) => n.endsWith(".wasm"))),
  ];
  const ocr = [
    ...(await listFiles("ocr", (n) => n === "worker.min.js")),
    ...(await listFiles("ocr/core")),
    ...(await listFiles("ocr/lang", (n) => n.startsWith("fra."))),
  ];
  const fonts = await listFiles("fonts", (n) => n.startsWith("Liberation") && n.endsWith(".ttf"));
  const group = (label, files) => ({
    label,
    files: files.map((f) => f.url),
    bytes: files.reduce((s, f) => s + f.bytes, 0),
  });
  return {
    groups: {
      pdf: group("Moteur PDF (rendu des pages, polices standard, mots de passe)", pdf),
      ocr: group("Reconnaissance de texte (français)", ocr),
      fonts: group("Polices de l'éditeur (Liberation)", fonts),
    },
  };
}

export async function buildServiceWorker() {
  const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const pdfjs = await readVersion("pdfjs/VERSION", "unknown");
  const ocr = await readVersion("ocr/VERSION", "unknown");
  const qpdf = await readVersion("qpdf/VERSION", "unknown");
  const heif = await readVersion("heif/VERSION", "unknown");
  const assetKey = createHash("sha1")
    .update(`${pdfjs}|${ocr}|${qpdf}|${heif}|fonts-1`)
    .digest("hex")
    .slice(0, 10);
  let commit = "dev";
  try {
    commit = execSync("git rev-parse --short HEAD", {
      cwd: root,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    /* no git: fall back to the timestamp */
  }
  const version = `${pkg.version}-${commit}-${Date.now().toString(36)}`;
  const template = await readFile(path.join(root, "src/sw/service-worker.js"), "utf8");
  const out = template.replace("__SW_VERSION__", version).replace("__ASSET_KEY__", assetKey);
  await writeFile(path.join(publicDir, "sw.js"), out);
  const manifest = { version, assetKey, ...(await buildOfflineManifest()) };
  await writeFile(path.join(publicDir, "offline-manifest.json"), JSON.stringify(manifest));
  return { version, assetKey, manifest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { version, manifest } = await buildServiceWorker();
  const mb = (b) => (b / 1024 / 1024).toFixed(1);
  console.log(
    `service worker ${version} → public/sw.js; offline groups: ` +
      Object.entries(manifest.groups)
        .map(([k, g]) => `${k} ${g.files.length} fichiers ${mb(g.bytes)} Mo`)
        .join(", "),
  );
}
