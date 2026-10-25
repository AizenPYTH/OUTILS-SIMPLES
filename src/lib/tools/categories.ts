import type { ToolCategory } from "./types";

export const toolCategories: readonly ToolCategory[] = [
  {
    id: "pdf",
    slug: "pdf",
    name: "Outils PDF",
    shortName: "PDF",
    description:
      "Fusionner, diviser, compresser, organiser, annoter, signer et protéger vos documents PDF directement dans le navigateur.",
    icon: "file-text",
    seo: {
      title: "Outils PDF en ligne gratuits : fusionner, diviser, compresser, signer",
      description:
        "Tous les outils PDF d'OUTILIA : fusion, division, compression, organisation des pages, rotation, ajout de texte, annotation, signature et filigrane. Traitement local, sans envoi de fichiers.",
    },
  },
  {
    id: "images",
    slug: "images",
    name: "Outils images",
    shortName: "Images",
    description:
      "Compresser, redimensionner, convertir et recadrer vos images sans les envoyer sur un serveur.",
    icon: "image",
    seo: {
      title: "Outils images en ligne",
      description:
        "Outils de compression, redimensionnement et conversion d'images traités localement.",
    },
  },
  {
    id: "texte",
    slug: "texte",
    name: "Outils texte",
    shortName: "Texte",
    description: "Compter, nettoyer, transformer et comparer du texte.",
    icon: "type",
    seo: {
      title: "Outils texte en ligne",
      description: "Outils de manipulation de texte : comptage, nettoyage, transformation.",
    },
  },
  {
    id: "calculatrices",
    slug: "calculatrices",
    name: "Calculatrices",
    shortName: "Calculs",
    description: "Calculatrices pratiques pour le quotidien et les professionnels.",
    icon: "calculator",
    seo: {
      title: "Calculatrices en ligne",
      description: "Calculatrices en ligne gratuites pour le quotidien et les professionnels.",
    },
  },
  {
    id: "conversion",
    slug: "conversion",
    name: "Conversion de fichiers",
    shortName: "Conversion",
    description: "Convertir des fichiers d'un format à un autre.",
    icon: "arrow-right-left",
    seo: {
      title: "Conversion de fichiers en ligne",
      description: "Convertisseurs de fichiers traités dans le navigateur.",
    },
  },
  {
    id: "qr-code",
    slug: "qr-code",
    name: "QR codes",
    shortName: "QR codes",
    description: "Générer et lire des QR codes.",
    icon: "qr-code",
    seo: { title: "Outils QR code", description: "Générateur et lecteur de QR codes en ligne." },
  },
  {
    id: "productivite",
    slug: "productivite",
    name: "Productivité",
    shortName: "Productivité",
    description: "Petits outils pour gagner du temps au quotidien.",
    icon: "list-checks",
    seo: { title: "Outils de productivité", description: "Outils de productivité en ligne." },
  },
  {
    id: "ia",
    slug: "ia",
    name: "Outils IA",
    shortName: "IA",
    description: "Outils assistés par intelligence artificielle, sélectionnés avec soin.",
    icon: "sparkles",
    seo: { title: "Outils IA", description: "Outils assistés par IA." },
  },
  {
    id: "pro",
    slug: "pro",
    name: "Freelances & TPE",
    shortName: "Pro",
    description: "Outils pour les indépendants et les petites entreprises.",
    icon: "briefcase",
    seo: {
      title: "Outils pour freelances et petites entreprises",
      description: "Outils pratiques pour indépendants et TPE.",
    },
  },
];

export function getCategoryById(id: string): ToolCategory | undefined {
  return toolCategories.find((c) => c.id === id);
}

export function getCategoryBySlug(slug: string): ToolCategory | undefined {
  return toolCategories.find((c) => c.slug === slug);
}
