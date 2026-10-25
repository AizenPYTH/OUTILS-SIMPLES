import type { ToolDefinition } from "../types";

const DEV_PRIVACY = "Les données sont traitées dans votre navigateur et ne sont jamais envoyées sur un serveur.";

function devTool(partial: Omit<ToolDefinition, "category" | "status" | "indexable" | "inputFormats" | "outputFormats" | "processing" | "limits" | "featureFlags" | "premium"> & Partial<ToolDefinition>): ToolDefinition {
  return {
    category: "developpeur",
    status: "published",
    indexable: true,
    inputFormats: ["text/plain"],
    outputFormats: ["text/plain"],
    processing: "client",
    limits: { maxFileSizeBytes: 2 * 1024 * 1024, maxFileCount: 1 },
    featureFlags: [],
    premium: false,
    ...partial,
    content: { privacyNote: DEV_PRIVACY, ...partial.content },
  };
}

export const developerTools: readonly ToolDefinition[] = [
  devTool({
    id: "dev-json",
    slug: "formater-valider-json",
    name: "Formater et valider du JSON",
    shortDescription: "Indentez, validez (avec la ligne et la colonne de l'erreur), minifiez ou convertissez du JSON en CSV.",
    description:
      "Collez un JSON pour le valider, le formater avec l'indentation de votre choix, trier ses clés, le minifier ou le convertir en CSV. En cas d'erreur, l'outil indique précisément la ligne, la colonne et la cause (virgule en trop, guillemets simples, chaîne non terminée…), ce que les messages des navigateurs ne font pas toujours.",
    icon: "braces",
    keywords: ["formater json", "json formatter", "valider json", "json validator", "indenter json", "minifier json", "json en csv", "json pretty print", "json lint", "beautify json", "vérifier json"],
    seo: { title: "Formater, valider et minifier du JSON en ligne (erreur ligne/colonne)", description: "Formateur et validateur JSON gratuit : indentation, tri des clés, minification, conversion en CSV, erreurs localisées à la ligne et à la colonne. Traitement local." },
    inputFormats: ["application/json", "text/plain"],
    outputFormats: ["application/json", "text/csv"],
    related: ["dev-csv-json", "text-diff", "text-clean"],
    featured: true,
    content: {
      steps: ["Collez ou importez votre JSON.", "Choisissez formater, minifier ou convertir en CSV ; corrigez les erreurs signalées.", "Copiez ou téléchargez le résultat."],
      limitations: ["Conformément à la norme JSON, les commentaires, les virgules finales et les guillemets simples sont signalés comme des erreurs.", "La conversion CSV attend un tableau d'objets ; les valeurs imbriquées sont encodées en JSON dans la cellule.", "Fichiers jusqu'à 2 Mo pour rester réactif."],
      faq: [],
    },
  }),
  devTool({
    id: "dev-csv-json",
    slug: "csv-vers-json",
    name: "Convertir CSV en JSON",
    shortDescription: "Transformez un fichier CSV (séparateur détecté automatiquement) en tableau JSON d'objets.",
    description:
      "Convertissez un export CSV (Excel, Google Sheets, base de données) en JSON prêt à l'emploi : le séparateur (point-virgule, virgule, tabulation, barre verticale) est détecté automatiquement, les champs entre guillemets et les retours à la ligne sont gérés, et les nombres et booléens peuvent être convertis.",
    icon: "table",
    keywords: ["csv en json", "convertir csv json", "csv to json", "csv vers json", "excel en json", "convertisseur csv"],
    seo: { title: "Convertir un CSV en JSON en ligne (séparateur automatique)", description: "Transformez un CSV en JSON : détection du séparateur, en-têtes, conversion des nombres et booléens, champs entre guillemets. Gratuit et local." },
    inputFormats: ["text/csv", "text/plain"],
    outputFormats: ["application/json"],
    related: ["dev-json", "text-clean"],
    content: {
      steps: ["Collez ou importez votre CSV.", "Indiquez si la première ligne contient les en-têtes.", "Copiez ou téléchargez le JSON."],
      limitations: ["Les lignes avec un nombre de colonnes différent de l'en-tête reçoivent des valeurs vides pour les colonnes manquantes.", "Les dates restent des chaînes de caractères."],
      faq: [],
    },
  }),
];
