import { describe, expect, it } from "vitest";
import path from "node:path";
import { fr, getDictionary } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { getLocale, localeFromPathname, localePrefix, setRequestLocale } from "@/lib/i18n/locale";
import {
  localizedPath,
  staticPathToFrench,
  staticRoutes,
  stripLocalePrefix,
} from "@/lib/i18n/routes";
import "@/lib/i18n/register-en";
import "@/lib/i18n/register-en-messages";
import "@/lib/i18n/register-en-registry";
import { tr } from "@/lib/i18n/messages";
import { isToolUiTranslated } from "@/lib/i18n/ui-coverage";
import { buildSitemapEntries } from "@/app/sitemap";
// Plain Node script shared with the CLI; typed loosely because the .mjs has no declarations.
import { scanPaths as scanUntyped } from "../../scripts/i18n-scan.mjs";

const scanPaths = scanUntyped as (roots: string[]) => Map<string, { line: number; text: string }[]>;
import { alternateGuideSlug, getGuides } from "@/lib/content/guides";
import { buildPageMetadata, buildToolMetadata } from "@/lib/seo";
import {
  getActiveCategories,
  getPublishedTools,
  getRegistry,
  getToolById,
  getToolByPath,
  getToolPath,
  validateRegistry,
} from "@/lib/tools";

/** Every leaf key path of a dictionary, with the kind of value (string/function/array). */
function shape(value: unknown, prefix = ""): string[] {
  if (typeof value === "function") return [`${prefix}:fn`];
  if (Array.isArray(value)) return [`${prefix}:array`];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => shape(v, prefix ? `${prefix}.${k}` : k));
  }
  return [`${prefix}:${typeof value}`];
}

describe("dictionaries", () => {
  it("English has exactly the keys of French", () => {
    expect(shape(en).sort()).toEqual(shape(fr).sort());
  });

  it("English leaf strings are not left in French", () => {
    const frLeaves = new Map(shape(fr).map((k) => [k, k.split(":")[0]!]));
    const sameValue: string[] = [];
    const read = (dict: object, path: string): unknown =>
      path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], dict);
    for (const [leaf, path] of frLeaves) {
      if (!leaf.endsWith(":string")) continue;
      const a = read(fr, path) as string;
      const b = read(en, path) as string;
      // Identical values are allowed only for symbols, numbers, proper nouns and locale tags.
      if (
        a === b &&
        /[a-zàâçéèêëîïôûù]{4,}\s[a-zàâçéèêëîïôûù]{3,}/i.test(a) &&
        !/OUTILIA/.test(a)
      ) {
        sameValue.push(`${path}: ${a}`);
      }
    }
    expect(sameValue).toEqual([]);
  });

  it("getDictionary returns the asked locale", () => {
    expect(getDictionary("en").nav.home).not.toBe(getDictionary("fr").nav.home);
  });
});

describe("locale helpers", () => {
  it("maps prefixes and pathnames", () => {
    expect(localePrefix("fr")).toBe("");
    expect(localePrefix("en")).toBe("/en");
    expect(localeFromPathname("/en/pdf/merge/")).toBe("en");
    expect(localeFromPathname("/pdf/fusionner/")).toBe("fr");
    expect(localeFromPathname("/english/")).toBe("fr");
    expect(stripLocalePrefix("/en/tools/", "en")).toBe("/tools/");
    expect(stripLocalePrefix("/en/", "en")).toBe("/");
    expect(stripLocalePrefix("/outils/", "fr")).toBe("/outils/");
  });

  it("static routes are a bijection between French and English paths", () => {
    const frPaths = Object.keys(staticRoutes);
    const enPaths = Object.values(staticRoutes).map((r) => r.en);
    expect(new Set(enPaths).size).toBe(enPaths.length);
    for (const fr of frPaths) {
      expect(localizedPath(fr, "fr")).toBe(fr);
      expect(localizedPath(fr, "en").startsWith("/en/")).toBe(true);
      expect(staticPathToFrench(localizedPath(fr, "en"))).toBe(fr);
    }
    expect(localizedPath("/outils/", "en")).toBe("/en/tools/");
    expect(localizedPath("/confidentialite/", "en")).toBe("/en/privacy/");
  });

  it("tr() keeps French, translates English and matches placeholder patterns", () => {
    setRequestLocale("fr");
    expect(getLocale()).toBe("fr");
    expect(tr("Mot de passe")).toBe("Mot de passe");
    expect(tr("Fichier trop volumineux (maximum {max} Mo).", { max: 50 })).toBe(
      "Fichier trop volumineux (maximum 50 Mo).",
    );
    setRequestLocale("en");
    expect(tr("Mot de passe")).toBe("Password");
    expect(tr("Fichier trop volumineux (maximum {max} Mo).", { max: 50 })).toBe(
      "File too large (maximum 50 MB).",
    );
    // A message built elsewhere (e.g. inside a worker) is matched as a pattern.
    expect(tr("Fichier trop volumineux (maximum 50 Mo).")).toBe("File too large (maximum 50 MB).");
    expect(tr("Texte inconnu de la carte")).toBe("Texte inconnu de la carte");
    setRequestLocale("fr");
  });
});

describe("English registry", () => {
  it("translates every published tool with unique English paths", () => {
    const tools = getPublishedTools("en");
    expect(tools.length).toBe(getPublishedTools("fr").length);
    expect(tools.filter((t) => t.translated === false).map((t) => t.id)).toEqual([]);
    const paths = tools.map((t) => getToolPath(t, "en"));
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) expect(p).toMatch(/^\/en\/[a-z-]+\/[a-z0-9-]+\/$/);
    expect(validateRegistry(getRegistry("en"))).toEqual([]);
  });

  it("resolves tools by English and French paths to the same tool", () => {
    expect(getToolByPath("pdf", "merge", "en")?.id).toBe("pdf-merge");
    expect(getToolByPath("pdf", "fusionner", "fr")?.id).toBe("pdf-merge");
    expect(getToolByPath("pdf", "fusionner", "en")).toBeUndefined();
    expect(getToolByPath("scanning", "ocr", "en")?.id).toBe("scan-ocr");
    expect(getToolById("pdf-merge", "en")?.name).toBe("Merge PDFs");
    expect(getToolById("pdf-merge", "fr")?.name).toBe("Fusionner des PDF");
    expect(getActiveCategories("en").map((c) => c.slug)).toContain("scanning");
  });

  it("keeps the English content distinct from the French one", () => {
    for (const tool of getPublishedTools("en")) {
      const frTool = getToolById(tool.id, "fr")!;
      expect(tool.description).not.toBe(frTool.description);
      expect(tool.content.steps.length).toBe(frTool.content.steps.length);
      expect(tool.content.faq.length).toBe(frTool.content.faq.length);
      expect(tool.seo.title.length).toBeLessThanOrEqual(70);
    }
  });

  it("leaves no French string outside tr()/t in the tool components and libraries", () => {
    // Known false positives of the heuristic scanner: CSS identifiers, font stacks,
    // data lists, French proper names, and template literals it cannot parse.
    const allowed: Record<string, RegExp> = {
      "src/components/codes/color-tool.tsx": /--couleur-/,
      "src/components/pdf/tools/compare-tool.tsx": /modifié le \{date\}/,
      "src/components/pdf/tools/compress-batch-tool.tsx": /\{n\} fichiers?|Compresser \{n\}/,
      "src/components/pdf/tools/fill-form-tool.tsx": /Formulaire aplati/,
      "src/components/pdf/tools/metadata-tool.tsx": /const rows/,
      "src/components/pdf/tools/rotate-tool.tsx": /\{n\} pages? modifiée?s?/,
      "src/components/pdf/tools/visual-compare.tsx": /Pixels différents/,
      "src/lib/pdf/fonts.ts": /Sans|Helvetica|Carlito/,
      "src/lib/pdf/text-edit/apply.ts": /Tr /,
      "src/lib/images/watermark.ts": /sans-serif/,
      "src/lib/dev/json.ts": /Document vide/,
      "src/lib/dev/random.ts": /excludeAmbiguous/,
      "src/lib/calc/dates.ts": /Jour de l'an|Pâques|Travail|Pentecôte|nationale|Noël|Étienne/,
      "src/lib/text/stats.ts": /le la les/,
      "src/lib/text/transform.ts": /lorem ipsum/,
    };
    const roots = [
      "src/components",
      "src/lib/pdf",
      "src/lib/images",
      "src/lib/ocr",
      "src/lib/scan",
      "src/lib/conversion",
      "src/lib/dev",
      "src/lib/calc",
      "src/lib/codes",
      "src/lib/text",
      "src/lib/files",
      "src/lib/offline",
    ].map((r) => path.resolve(__dirname, "../..", r));
    const unexpected: string[] = [];
    for (const [file, hits] of scanPaths(roots)) {
      const rel = path.relative(path.resolve(__dirname, "../.."), file);
      const ok = allowed[rel];
      for (const hit of hits) {
        if (!ok || !ok.test(hit.text))
          unexpected.push(`${rel}:${hit.line}: ${hit.text.slice(0, 80)}`);
      }
    }
    expect(unexpected, unexpected.join("\n")).toEqual([]);
  });

  it("declares every published tool's interface as translated", () => {
    const missing = getPublishedTools()
      .filter((t) => !isToolUiTranslated(t.id))
      .map((t) => t.id);
    expect(missing).toEqual([]);
  });
});

describe("international SEO", () => {
  it("tool metadata carries reciprocal hreflang and the right canonical", () => {
    const tool = getToolById("pdf-merge", "en")!;
    const meta = buildToolMetadata(tool, "en");
    expect(meta.alternates?.canonical).toBe("http://localhost:3000/en/pdf/merge/");
    expect(meta.alternates?.languages).toMatchObject({
      fr: "http://localhost:3000/pdf/fusionner/",
      en: "http://localhost:3000/en/pdf/merge/",
      "x-default": "http://localhost:3000/pdf/fusionner/",
    });
    expect(meta.openGraph).toMatchObject({ locale: "en_US" });
    const frMeta = buildToolMetadata(getToolById("pdf-merge", "fr")!, "fr");
    expect(frMeta.alternates?.languages).toMatchObject({
      en: "http://localhost:3000/en/pdf/merge/",
    });
  });

  it("static page metadata derives alternates from the route table", () => {
    const meta = buildPageMetadata({
      title: "Privacy",
      description: "x".repeat(80),
      path: "/en/privacy/",
      locale: "en",
    });
    expect(meta.alternates?.languages).toMatchObject({
      fr: "http://localhost:3000/confidentialite/",
      en: "http://localhost:3000/en/privacy/",
    });
  });

  it("sitemap lists both locales, reciprocal alternates and no French slug under /en/", () => {
    const entries = buildSitemapEntries();
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain("http://localhost:3000/en/");
    expect(urls).toContain("http://localhost:3000/en/tools/");
    expect(urls).toContain("http://localhost:3000/en/pdf/merge/");
    expect(urls).toContain("http://localhost:3000/en/scanning/ocr/");
    expect(urls).toContain("http://localhost:3000/en/guides/how-to-merge-pdf-files/");
    expect(urls).not.toContain("http://localhost:3000/en/pdf/fusionner/");
    expect(urls).not.toContain("http://localhost:3000/en/offline/");
    expect(urls).not.toContain("http://localhost:3000/hors-ligne/");
    for (const tool of getPublishedTools("fr")) {
      expect(urls).toContain(`http://localhost:3000${getToolPath(tool, "fr")}`);
    }
    for (const entry of entries) {
      const languages = entry.alternates?.languages as Record<string, string>;
      expect(languages).toBeDefined();
      expect(Object.values(languages)).toContain(entry.url);
      if (entry.url.includes("/en/")) expect(languages.en).toBe(entry.url);
      else expect(languages.fr).toBe(entry.url);
    }
  });

  it("guides map to their translation when one exists", () => {
    const frGuide = getGuides("fr").find((g) => g.slug === "comment-fusionner-des-pdf")!;
    expect(alternateGuideSlug(frGuide, "en")).toBe("how-to-merge-pdf-files");
    const enGuide = getGuides("en").find((g) => g.slug === "how-to-merge-pdf-files")!;
    expect(alternateGuideSlug(enGuide, "fr")).toBe("comment-fusionner-des-pdf");
  });
});
