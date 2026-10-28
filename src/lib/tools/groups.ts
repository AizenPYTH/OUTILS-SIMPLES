import { getLocale, type Locale } from "@/lib/i18n/locale";
import type { ToolCategoryId } from "./types";

/**
 * Sub-groups shown inside a category on the catalogue page. Ids must exist in
 * the registry (checked by tests); tools of a grouped category that belong to
 * no group fall into the "Autres" group.
 */
export interface ToolGroup {
  category: ToolCategoryId;
  name: string;
  ids: string[];
}

export const toolGroups: ToolGroup[] = [
  {
    category: "pdf",
    name: "Organiser les pages",
    ids: ["pdf-merge", "pdf-split", "pdf-organize", "pdf-rotate", "pdf-extract-pages", "pdf-crop"],
  },
  {
    category: "pdf",
    name: "Modifier et signer",
    ids: [
      "pdf-edit",
      "pdf-add-text",
      "pdf-annotate",
      "pdf-sign",
      "pdf-fill-form",
      "pdf-stamp",
      "pdf-watermark",
      "pdf-manage-watermark",
      "pdf-redact",
    ],
  },
  {
    category: "pdf",
    name: "Convertir et extraire",
    ids: ["pdf-to-images", "pdf-from-images", "pdf-extract-text", "pdf-extract-images"],
  },
  {
    category: "pdf",
    name: "Optimiser et sécuriser",
    ids: ["pdf-compress", "pdf-protect", "pdf-unlock", "pdf-check", "pdf-metadata"],
  },
  { category: "pdf", name: "Analyser", ids: ["pdf-search", "pdf-links", "pdf-compare"] },
  {
    category: "images",
    name: "Retoucher",
    ids: ["image-resize", "image-crop", "image-rotate", "image-watermark"],
  },
  {
    category: "images",
    name: "Optimiser et convertir",
    ids: ["image-compress", "image-convert", "image-exif"],
  },
  { category: "developpeur", name: "Données", ids: ["dev-json", "dev-csv-json"] },
  {
    category: "developpeur",
    name: "Encodages",
    ids: ["dev-base64", "dev-url-encode", "dev-html-entities"],
  },
  { category: "developpeur", name: "Générateurs", ids: ["dev-uuid", "dev-password", "dev-hash"] },
  { category: "developpeur", name: "Utilitaires", ids: ["dev-regex", "dev-timestamp"] },
];

/**
 * English names of the sub-groups, keyed by the French name (the source).
 * Kept next to the groups so that a new group cannot ship without its
 * translation (checked by tests).
 */
export const toolGroupNamesEn: Record<string, string> = {
  "Organiser les pages": "Organise pages",
  "Modifier et signer": "Edit and sign",
  "Convertir et extraire": "Convert and extract",
  "Optimiser et sécuriser": "Optimise and secure",
  Analyser: "Analyse",
  Retoucher: "Edit",
  "Optimiser et convertir": "Optimise and convert",
  Données: "Data",
  Encodages: "Encodings",
  Générateurs: "Generators",
  Utilitaires: "Utilities",
};

/** Name of the fallback group holding tools that belong to no sub-group. */
export function otherToolsGroupName(locale: Locale = getLocale()): string {
  return locale === "en" ? "Other" : "Autres";
}

/** Sub-groups of a category, with names in the requested locale. */
export function getToolGroups(category: ToolCategoryId, locale: Locale = getLocale()): ToolGroup[] {
  return toolGroups
    .filter((g) => g.category === category)
    .map((g) => (locale === "fr" ? g : { ...g, name: toolGroupNamesEn[g.name] ?? g.name }));
}

/**
 * Classes of the icon tile, label and soft background per category. Every
 * family uses the brand green (AVEROPDF identity): the icon, not the hue,
 * tells families apart. Kept per category so that a family can be given its
 * own tone again without touching the components.
 */
const brandTone = {
  tile: "tile-brand",
  text: "text-link",
  soft: "bg-primary-soft",
} as const;

export const categoryTone: Record<ToolCategoryId, { tile: string; text: string; soft: string }> = {
  pdf: brandTone,
  numerisation: brandTone,
  images: brandTone,
  conversion: brandTone,
  texte: brandTone,
  developpeur: brandTone,
  calculatrices: brandTone,
  codes: brandTone,
  documents: brandTone,
};
