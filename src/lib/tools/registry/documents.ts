import type { ToolDefinition } from "../types";

const DOC_PRIVACY = "Le texte est mis en page et le PDF est généré par pdf-lib dans votre navigateur ; rien n'est envoyé sur un serveur.";

function docTool(partial: Omit<ToolDefinition, "category" | "status" | "indexable" | "processing" | "limits" | "featureFlags" | "premium" | "outputFormats"> & Partial<ToolDefinition>): ToolDefinition {
  return {
    category: "documents",
    status: "published",
    indexable: true,
    processing: "client",
    outputFormats: ["application/pdf"],
    limits: { maxFileSizeBytes: 2 * 1024 * 1024, maxFileCount: 1 },
    featureFlags: [],
    premium: false,
    ...partial,
    content: { privacyNote: DOC_PRIVACY, ...partial.content },
  };
}

const FONT_LIMIT = "Polices PDF standard (Helvetica, Times, Courier) : les emoji, alphabets non latins et symboles rares sont remplacés par « ? » et signalés.";

export const documentTools: readonly ToolDefinition[] = [
  docTool({
    id: "doc-markdown-pdf",
    slug: "markdown-vers-pdf",
    name: "Convertir du Markdown en PDF",
    shortDescription: "Transformez un texte Markdown (titres, listes, tableaux, code, liens) en PDF propre et paginé.",
    description:
      "Rédigez ou collez du Markdown et obtenez un PDF mis en page : titres hiérarchisés, paragraphes, gras et italique, listes imbriquées et cases à cocher, citations, blocs de code, tableaux, filets et liens cliquables, avec numérotation des pages. Choisissez la police, la taille, les marges et le format (A4 ou Letter). Un aperçu HTML permet de vérifier le rendu avant export.",
    icon: "file-code",
    keywords: ["markdown en pdf", "convertir markdown pdf", "md vers pdf", "markdown to pdf", "readme en pdf", "exporter markdown", "notes en pdf", "markdown pdf en ligne"],
    seo: { title: "Convertir du Markdown en PDF en ligne (titres, listes, tableaux)", description: "Transformez un texte Markdown en PDF paginé : titres, listes, tableaux, code, citations et liens cliquables, police et marges au choix. Gratuit, traitement local." },
    inputFormats: ["text/markdown", "text/plain"],
    related: ["doc-text-pdf", "pdf-extract-text", "text-word-counter"],
    featured: true,
    content: {
      steps: ["Collez ou importez votre Markdown (.md) ; vérifiez l'aperçu.", "Choisissez le titre, la police, la taille, les marges et le format de page.", "Créez le PDF et téléchargez-le."],
      limitations: ["Les images ne sont pas insérées (leur texte alternatif est conservé entre crochets).", "Le HTML brut et les notes de bas de page ne sont pas interprétés.", FONT_LIMIT, "Les tableaux sont répartis en colonnes de largeur égale."],
      faq: [{ question: "Puis-je choisir une autre police ?", answer: "Pour rester 100 % local et léger, l'outil utilise les polices standard du format PDF (Helvetica, Times, Courier), lisibles partout sans intégration. L'ajout de polices personnalisées est envisagé." }],
    },
  }),
  docTool({
    id: "doc-text-pdf",
    slug: "texte-vers-pdf",
    name: "Convertir un texte en PDF",
    shortDescription: "Transformez un texte brut (.txt, notes, e-mail copié) en PDF paginé, avec la police et les marges de votre choix.",
    description:
      "Collez un texte ou importez un fichier .txt pour obtenir un PDF propre : sauts de ligne conservés, paragraphes séparés par les lignes vides, numérotation des pages, police proportionnelle ou à chasse fixe pour les listings et journaux. Idéal pour archiver des notes, imprimer un e-mail ou livrer un texte dans un format universel.",
    icon: "file-text",
    keywords: ["texte en pdf", "txt en pdf", "convertir texte pdf", "text to pdf", "notes en pdf", "imprimer texte en pdf", "fichier txt vers pdf", "créer un pdf à partir d'un texte"],
    seo: { title: "Convertir un texte ou un fichier TXT en PDF en ligne", description: "Transformez un texte brut en PDF paginé : sauts de ligne conservés, police et marges au choix, numéros de page. Gratuit et traité dans votre navigateur." },
    inputFormats: ["text/plain"],
    related: ["doc-markdown-pdf", "pdf-merge", "text-clean"],
    content: {
      steps: ["Collez votre texte ou importez un fichier .txt.", "Choisissez la police (Courier pour conserver les alignements), la taille et les marges.", "Créez le PDF et téléchargez-le."],
      limitations: ["Pas de mise en forme (gras, titres) : utilisez « Markdown vers PDF » pour cela.", FONT_LIMIT, "Textes jusqu'à 2 Mo."],
      faq: [],
    },
  }),
];
