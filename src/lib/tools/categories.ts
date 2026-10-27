import { getLocale, type Locale } from "@/lib/i18n/locale";
import { categoriesEn } from "./categories-en";
import type { ToolCategory } from "./types";

export const toolCategories: readonly ToolCategory[] = [
  {
    id: "pdf",
    slug: "pdf",
    name: "Outils PDF",
    shortName: "PDF",
    description:
      "Fusionner, diviser, compresser, organiser, annoter, signer, protéger et convertir vos documents PDF directement dans le navigateur.",
    icon: "file-text",
    seo: {
      title: "Outils PDF en ligne gratuits : fusionner, diviser, compresser, signer",
      description:
        "Tous les outils PDF d'OUTILIA : fusion, division, compression, organisation, rotation, texte, annotation, signature, filigrane, protection, conversion. Traitement local, sans envoi de fichiers.",
    },
  },
  {
    id: "numerisation",
    slug: "numerisation",
    name: "Numérisation et OCR",
    shortName: "Numérisation",
    description:
      "Scanner un document avec votre téléphone, redresser une photo de feuille et reconnaître le texte (OCR) de vos PDF et images, sans rien envoyer sur un serveur.",
    icon: "scan",
    seo: {
      title: "Scanner un document et reconnaître le texte (OCR) en ligne",
      description:
        "Scanner de documents pour smartphone, correction de perspective et OCR français/anglais dans le navigateur. PDF recherchables, extraction de texte, confidentialité totale.",
    },
  },
  {
    id: "images",
    slug: "images",
    name: "Outils images",
    shortName: "Images",
    description:
      "Compresser, redimensionner, recadrer, convertir, pivoter et retoucher vos images, seules ou par lot, sans les envoyer sur un serveur.",
    icon: "image",
    seo: {
      title: "Outils images en ligne : compresser, redimensionner, convertir",
      description:
        "Compression, redimensionnement, recadrage, conversion JPG/PNG/WebP, rotation, filigrane et métadonnées EXIF, traités localement dans votre navigateur.",
    },
  },
  {
    id: "conversion",
    slug: "conversion",
    name: "Conversion de fichiers",
    shortName: "Conversion",
    description:
      "Convertir des documents et des données d'un format à un autre : PDF, images, texte, Markdown, CSV, JSON.",
    icon: "arrow-right-left",
    seo: {
      title: "Conversion de fichiers en ligne : PDF, images, texte, CSV, JSON",
      description:
        "Convertisseurs de fichiers traités dans le navigateur : PDF vers images, images vers PDF, texte et Markdown vers PDF, CSV vers JSON et inversement.",
    },
  },
  {
    id: "texte",
    slug: "texte",
    name: "Texte et productivité",
    shortName: "Texte",
    description:
      "Compter, nettoyer, transformer, comparer et extraire du texte, instantanément et sans inscription.",
    icon: "type",
    seo: {
      title: "Outils texte en ligne : compter, nettoyer, comparer, transformer",
      description:
        "Compteur de mots, nettoyage de texte, majuscules/minuscules, comparateur de textes, tri et dédoublonnage de lignes, extraction d'e-mails et d'URL. Gratuit et local.",
    },
  },
  {
    id: "developpeur",
    slug: "developpeur",
    name: "Outils développeur",
    shortName: "Développeur",
    description:
      "JSON, Base64, URL, UUID, hash, mots de passe, regex, timestamps et couleurs : les utilitaires du quotidien, sans envoi de données.",
    icon: "braces",
    seo: {
      title: "Outils développeur en ligne : JSON, Base64, UUID, hash, regex",
      description:
        "Formateur et validateur JSON, encodeurs Base64 et URL, générateur UUID et mots de passe, hash SHA-256, testeur de regex, timestamps Unix. Tout fonctionne dans votre navigateur.",
    },
  },
  {
    id: "calculatrices",
    slug: "calculatrices",
    name: "Calculatrices et conversions",
    shortName: "Calculs",
    description:
      "Pourcentages, TVA, remises, marges, durées entre dates, jours ouvrés et convertisseurs d'unités.",
    icon: "calculator",
    seo: {
      title: "Calculatrices en ligne : pourcentages, TVA, dates, unités",
      description:
        "Calculateurs de pourcentage, remise, TVA, marge, durée entre deux dates, jours ouvrés et convertisseurs d'unités (longueur, poids, température, données…).",
    },
  },
  {
    id: "codes",
    slug: "codes",
    name: "QR codes, codes-barres et couleurs",
    shortName: "QR & couleurs",
    description:
      "Générer et lire des QR codes, créer des codes-barres, convertir des couleurs et vérifier leurs contrastes.",
    icon: "qr-code",
    seo: {
      title: "Générateur de QR code, codes-barres et outils couleurs",
      description:
        "Créez des QR codes (URL, texte, Wi-Fi, contact) en PNG ou SVG, lisez un QR code depuis une image, générez des codes-barres et convertissez vos couleurs HEX, RGB, HSL.",
    },
  },
  {
    id: "documents",
    slug: "documents",
    name: "Documents à imprimer",
    shortName: "Documents",
    description:
      "Créer des PDF prêts à imprimer : feuilles quadrillées ou lignées, calendriers, pages de garde et fiches.",
    icon: "printer",
    seo: {
      title: "Documents PDF à imprimer : feuilles, calendriers, pages de garde",
      description:
        "Générez des PDF imprimables au format A4 : papier quadrillé, ligné, calendrier mensuel, page de garde, fiche de notes. Gratuit, créé dans votre navigateur.",
    },
  },
];

/** Category text in a locale (French definitions are the source; English overrides are merged). */
export function localizeCategory(category: ToolCategory, locale: Locale): ToolCategory {
  if (locale === "fr") return category;
  const en = categoriesEn[category.id];
  return en ? { ...category, ...en } : category;
}

export function getCategories(locale: Locale = getLocale()): ToolCategory[] {
  return toolCategories.map((c) => localizeCategory(c, locale));
}

export function getCategoryById(
  id: string,
  locale: Locale = getLocale(),
): ToolCategory | undefined {
  const category = toolCategories.find((c) => c.id === id);
  return category ? localizeCategory(category, locale) : undefined;
}

export function getCategoryBySlug(
  slug: string,
  locale: Locale = getLocale(),
): ToolCategory | undefined {
  return getCategories(locale).find((c) => c.slug === slug);
}
