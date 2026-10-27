#!/usr/bin/env node
/**
 * Finds string literals and JSX text that look French and are not wrapped in
 * `tr(...)` (src/lib/i18n/messages.ts) nor read from the `t` dictionary.
 * Heuristic by design: it reports accented characters and common French
 * words; a hit is a candidate to check, not a certainty.
 *
 *   node scripts/i18n-scan.mjs src/components            # counts per file
 *   VERBOSE=1 node scripts/i18n-scan.mjs src/components  # every hit
 */
import fs from "node:fs";
import path from "node:path";

const WORDS =
  /\b(le|la|les|des|une?|du|au|aux|et|ou|vous|votre|vos|dans|pour|avec|sur|sans|est|sont|ce|cette|ces|fichiers?|télécharger|ajouter|supprimer|choisir|sélectionner|déposez|cliquez|glissez|aucune?|résultat|erreur|chargement|traitement|en cours|réussi|terminé|impossible|veuillez|nouveau|nouvelle|taille|largeur|hauteur|texte|outil|appliquer|annuler|fermer|ouvrir|enregistrer|exporter|importer|copier|copié|coller|effacer|précédent|suivant|tous|toutes|lignes?|colonnes?|mots?|caractères?|couleur|police|gras|italique|souligné|sélection|signer|fusionner|diviser|compresser|pivoter|recadrer|convertir|protéger|déverrouiller|comparer|extraire|rechercher|remplacer|générer|calculer|nombre|valeur|heure|jours?|mois|année|afficher|masquer|réinitialiser|recommencer|réessayer|prête?|optionnel|obligatoire|requis|invalide|valide|modifier|modifié|ajouté|ouverte?|fermée?|premier|première|dernier|dernière|aperçu|vignettes?|navigateur|mot de passe|téléchargement)\b/i;
const ACCENTS = /[àâçéèêëîïôûùÿœÀÂÇÉÈÊËÎÏÔÛÙ]/;

export function looksFrench(text) {
  const s = text.trim();
  if (s.length < 3) return false;
  if (/^[\w./@:#%+-]+$/.test(s)) return false; // identifiers, paths, mime types
  return ACCENTS.test(s) || WORDS.test(s);
}

const SKIP_CONTEXT =
  /(tr\(\s*|className=|data-testid=|data-[a-z-]+=|key=|id=|href=|import |from |type=|name=|accept=|mimeType|family:|fontFamily|url\(|\bcase |===|!==)\s*$/;

export function scanSource(source) {
  const hits = [];
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));
  const literal = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let m;
  while ((m = literal.exec(code))) {
    const text = m[1] ?? m[2] ?? m[3];
    if (!looksFrench(text)) continue;
    const before = code.slice(Math.max(0, m.index - 60), m.index);
    if (SKIP_CONTEXT.test(before)) continue;
    hits.push({ line: code.slice(0, m.index).split("\n").length, text });
  }
  const jsxText = />([^<>{}]+)</g;
  while ((m = jsxText.exec(code))) {
    if (!looksFrench(m[1])) continue;
    hits.push({ line: code.slice(0, m.index).split("\n").length, text: m[1].trim() });
  }
  return hits;
}

export function scanPaths(roots) {
  const perFile = new Map();
  const visit = (p) => {
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(p)) visit(path.join(p, entry));
      return;
    }
    if (!/\.(tsx?|mjs)$/.test(p) || /\.test\./.test(p)) return;
    const hits = scanSource(fs.readFileSync(p, "utf8"));
    if (hits.length) perFile.set(p, hits);
  };
  for (const root of roots) visit(root);
  return perFile;
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const roots = process.argv.slice(2);
  const perFile = scanPaths(roots.length ? roots : ["src/components"]);
  let total = 0;
  for (const [file, hits] of perFile) {
    total += hits.length;
    if (process.env.VERBOSE) {
      console.log(`## ${file}`);
      for (const hit of hits) console.log(`  ${hit.line}: ${hit.text.slice(0, 110)}`);
    } else {
      console.log(`${hits.length}\t${file}`);
    }
  }
  console.log(`TOTAL ${total}`);
}
