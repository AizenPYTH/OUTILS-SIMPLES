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

export function getToolGroups(category: ToolCategoryId): ToolGroup[] {
  return toolGroups.filter((g) => g.category === category);
}

/** Tailwind classes of the icon tile per category (hue per family, same shape everywhere). */
export const categoryTone: Record<ToolCategoryId, { tile: string; text: string; soft: string }> = {
  pdf: {
    tile: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200",
    text: "text-indigo-700 dark:text-indigo-300",
    soft: "bg-indigo-50 dark:bg-indigo-500/10",
  },
  numerisation: {
    tile: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
    text: "text-violet-700 dark:text-violet-300",
    soft: "bg-violet-50 dark:bg-violet-500/10",
  },
  images: {
    tile: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200",
    text: "text-teal-700 dark:text-teal-300",
    soft: "bg-teal-50 dark:bg-teal-500/10",
  },
  conversion: {
    tile: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200",
    text: "text-cyan-700 dark:text-cyan-300",
    soft: "bg-cyan-50 dark:bg-cyan-500/10",
  },
  texte: {
    tile: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    text: "text-amber-800 dark:text-amber-300",
    soft: "bg-amber-50 dark:bg-amber-500/10",
  },
  developpeur: {
    tile: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
    text: "text-slate-700 dark:text-slate-300",
    soft: "bg-slate-100 dark:bg-slate-500/10",
  },
  calculatrices: {
    tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
    text: "text-emerald-700 dark:text-emerald-300",
    soft: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  codes: {
    tile: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
    text: "text-rose-700 dark:text-rose-300",
    soft: "bg-rose-50 dark:bg-rose-500/10",
  },
  documents: {
    tile: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
    text: "text-sky-700 dark:text-sky-300",
    soft: "bg-sky-50 dark:bg-sky-500/10",
  },
};
