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
  docTool({
    id: "doc-paper",
    slug: "feuilles-a-imprimer",
    name: "Feuilles à imprimer : quadrillé, ligné, pointillé, Seyès",
    shortDescription: "Générez des feuilles PDF quadrillées, lignées, pointillées, Seyès, millimétrées, isométriques ou à portées musicales.",
    description:
      "Créez en quelques secondes du papier à imprimer exactement à vos mesures : petits carreaux à l'espacement de votre choix, lignes, grille de points pour bullet journal, grands carreaux Seyès, papier millimétré, grille isométrique pour le dessin technique ou portées de musique. Choisissez le format (A4, A5, Letter, paysage), les marges, la couleur des traits et le nombre de pages.",
    icon: "grid",
    keywords: ["papier quadrillé à imprimer", "feuille lignée pdf", "papier pointillé", "feuille seyès à imprimer", "papier millimétré pdf", "grille isométrique", "papier musique à imprimer", "papier bullet journal", "feuille quadrillée 5mm", "générateur de papier"],
    seo: { title: "Feuilles à imprimer en PDF : quadrillé, ligné, pointillé, Seyès", description: "Générez du papier quadrillé, ligné, pointillé, Seyès, millimétré, isométrique ou à portées en PDF, à l'espacement et au format de votre choix. Gratuit, local." },
    inputFormats: [],
    limits: { maxFileSizeBytes: 0, maxFileCount: 0 },
    related: ["doc-calendar", "doc-cover", "pdf-merge"],
    featured: true,
    content: {
      steps: ["Choisissez le type de feuille et l'espacement.", "Réglez le format, les marges, la couleur et le nombre de pages.", "Créez le PDF et imprimez-le à 100 %."],
      limitations: ["Imprimez sans mise à l'échelle pour conserver les dimensions exactes (les imprimantes ajoutent sinon un facteur de réduction).", "Le modèle Seyès suit l'écartement standard de 8 mm ; les variantes « gros Seyès » pour l'apprentissage ne sont pas proposées."],
      faq: [],
    },
  }),
  docTool({
    id: "doc-calendar",
    slug: "calendrier-a-imprimer",
    name: "Calendrier à imprimer (mois ou année)",
    shortDescription: "Créez un calendrier PDF mensuel avec zone de notes ou annuel sur une page, jours fériés français marqués.",
    description:
      "Générez un calendrier à imprimer pour n'importe quelle année : vue mensuelle en paysage avec de grandes cases, week-ends grisés, jours fériés français nommés et colonne de notes, ou vue annuelle compacte avec les douze mois sur une page. Semaine du lundi au dimanche, en français, option Alsace-Moselle.",
    icon: "calendar",
    keywords: ["calendrier à imprimer", "calendrier 2026 pdf", "calendrier mensuel vierge", "calendrier annuel une page", "calendrier jours fériés", "imprimer un calendrier", "planning mensuel pdf", "calendrier gratuit à imprimer"],
    seo: { title: "Calendrier à imprimer en PDF : mensuel ou annuel, jours fériés", description: "Créez un calendrier PDF pour n'importe quelle année : vue mensuelle avec notes ou vue annuelle sur une page, jours fériés français marqués. Généré localement." },
    inputFormats: [],
    limits: { maxFileSizeBytes: 0, maxFileCount: 0 },
    related: ["calc-dates", "doc-paper", "doc-cover"],
    featured: true,
    content: {
      steps: ["Choisissez la vue (mois ou année), l'année et le mois.", "Activez les jours fériés et la colonne de notes.", "Créez le PDF et imprimez-le."],
      limitations: ["Jours fériés légaux français uniquement (option Alsace-Moselle) ; pas de vacances scolaires ni d'événements personnels.", "Le calendrier est vierge : il ne se synchronise pas avec un agenda."],
      faq: [],
    },
  }),
  docTool({
    id: "doc-cover",
    slug: "page-de-garde",
    name: "Page de garde PDF",
    shortDescription: "Composez une page de garde sobre (titre, sous-titre, auteur, établissement, date) à fusionner avec votre document.",
    description:
      "Créez une page de garde propre pour un rapport, un mémoire, un dossier ou un devis : titre, sous-titre, auteur, organisation, date, pied de page et couleur d'accent, mise en page automatiquement. Ajoutez-la ensuite en tête de votre document avec l'outil « Fusionner des PDF ».",
    icon: "file-text",
    keywords: ["page de garde", "page de garde pdf", "page de couverture rapport", "créer une page de garde", "page de titre", "couverture mémoire", "page de garde dossier", "modèle page de garde"],
    seo: { title: "Créer une page de garde PDF en ligne (rapport, mémoire, dossier)", description: "Composez une page de garde sobre avec titre, sous-titre, auteur, établissement et date, puis fusionnez-la avec votre document. Gratuit, générée dans le navigateur." },
    inputFormats: [],
    limits: { maxFileSizeBytes: 0, maxFileCount: 0 },
    related: ["pdf-merge", "doc-markdown-pdf", "doc-paper"],
    content: {
      steps: ["Renseignez le titre et les informations souhaitées.", "Choisissez le format et la couleur d'accent.", "Créez le PDF puis fusionnez-le avec votre document."],
      limitations: ["Mise en page unique et sobre (pas de logo ni d'image pour l'instant).", FONT_LIMIT],
      faq: [],
    },
  }),
];
