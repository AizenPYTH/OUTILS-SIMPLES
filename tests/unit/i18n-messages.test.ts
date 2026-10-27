import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { messagesEn } from "@/lib/i18n/messages/en";
import { sharedEn } from "@/lib/i18n/messages/en/shared";

const root = path.resolve(__dirname, "../../src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) out.push(p);
  }
  return out;
}

/** Every literal passed to tr("…") in the source tree. */
function collectKeys(): Map<string, string[]> {
  const keys = new Map<string, string[]>();
  const re = /\btr\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
  for (const file of walk(root)) {
    if (file.endsWith(path.join("i18n", "messages.ts"))) continue; // documentation examples
    const src = fs.readFileSync(file, "utf8");
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const raw = m[1] ?? m[2] ?? "";
      const key = raw.replace(/\\(["'\\])/g, "$1");
      const list = keys.get(key) ?? [];
      list.push(path.relative(root, file));
      keys.set(key, list);
    }
  }
  return keys;
}

const FRENCH =
  /[àâçéèêëîïôûùÿœ]|\b(le|la|les|des|une|du|et|ou|vous|votre|dans|pour|avec|sur|sans|fichier|fichiers|télécharger|ajouter|supprimer|choisir|cliquez|aucun|aucune|réessayer|nouveau|nouvelle|texte|outil|mot de passe)\b/i;

describe("inline message translations", () => {
  it("every tr() key used in the source has an English text", () => {
    const missing: string[] = [];
    for (const [key, files] of collectKeys()) {
      if (!(key in messagesEn)) missing.push(`${key}  ←  ${files[0]}`);
    }
    expect(missing, `missing English texts:\n${missing.join("\n")}`).toEqual([]);
  });

  it("English texts contain no French and keep the placeholders of their key", () => {
    const problems: string[] = [];
    for (const [key, value] of Object.entries(messagesEn)) {
      if (FRENCH.test(value.replace(/OUTILIA|café|cafe|résumé/g, "")))
        problems.push(`french? ${key} → ${value}`);
      const wanted = (key.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
      const got = (value.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
      if (wanted.join() !== got.join()) problems.push(`placeholders ${key} → ${value}`);
      if (!value.trim()) problems.push(`empty ${key}`);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("components hydrated on English pages only use keys of the shared map", () => {
    // Tool components are loaded client-side with their own messages; everything
    // else (chrome, pages, catalogue, monetization, offline, home) is server-rendered
    // and hydrated before the tool maps arrive, so its keys must be in sharedEn.
    const toolDirs =
      /^components\/(pdf|scan|ocr|images|text|dev|calc|codes|documents|conversion)\//;
    const missing: string[] = [];
    for (const [key, files] of collectKeys()) {
      const hydrated = files.filter((f) => !toolDirs.test(f) && !f.startsWith("lib/"));
      if (hydrated.length && !(key in sharedEn)) missing.push(`${key}  ←  ${hydrated[0]}`);
    }
    expect(missing, `keys to move into messages/en/shared.ts:\n${missing.join("\n")}`).toEqual([]);
  });
});
