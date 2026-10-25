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
  devTool({
    id: "dev-base64",
    slug: "encoder-decoder-base64",
    name: "Encoder et décoder en Base64",
    shortDescription: "Convertissez du texte (UTF-8) ou un fichier en Base64, et décodez une chaîne Base64, variante URL-safe comprise.",
    description:
      "Encodez un texte en Base64 (accents et emoji compris grâce à l'UTF-8) ou décodez une chaîne Base64 reçue dans une API, un e-mail ou un fichier de configuration. Convertissez aussi un fichier (image, police, PDF) en Data URI prêt à coller dans du HTML ou du CSS. La variante URL-safe et le découpage en lignes de 76 caractères sont pris en charge.",
    icon: "binary",
    keywords: ["base64", "encoder base64", "décoder base64", "base64 en ligne", "base64 decode", "base64 encode", "image en base64", "data uri", "base64 url safe"],
    seo: { title: "Encoder et décoder en Base64 en ligne (texte, fichier, Data URI)", description: "Encodez ou décodez du Base64 (UTF-8, URL-safe, lignes MIME) et convertissez un fichier en Data URI. Gratuit, instantané, traitement local." },
    related: ["dev-url-encode", "dev-html-entities", "dev-json"],
    featured: true,
    content: {
      steps: ["Choisissez encoder ou décoder.", "Collez le texte (ou déposez un fichier pour obtenir une Data URI).", "Copiez le résultat."],
      limitations: ["Le Base64 n'est pas un chiffrement : il ne protège rien, il transporte des octets sous forme de texte.", "Fichiers jusqu'à 5 Mo pour la conversion en Data URI (le résultat est 33 % plus volumineux que l'original)."],
      faq: [],
    },
  }),
  devTool({
    id: "dev-url-encode",
    slug: "encoder-decoder-url",
    name: "Encoder et décoder une URL",
    shortDescription: "Convertissez les caractères spéciaux d'un texte en %XX (percent-encoding) et décodez une URL encodée.",
    description:
      "Encodez un paramètre de requête ou une URL complète selon la RFC 3986 (espaces, accents, &, =, ? …) et décodez une adresse encodée pour la lire en clair. Le mode « composant » encode tout sauf les caractères non réservés ; le mode « URL complète » conserve la structure (/, ?, &, =, #).",
    icon: "link",
    keywords: ["url encode", "url decode", "encoder url", "décoder url", "percent encoding", "encodeURIComponent", "caractères spéciaux url", "%20"],
    seo: { title: "Encoder et décoder une URL en ligne (percent-encoding %XX)", description: "Encodez les caractères spéciaux d'un paramètre ou d'une URL complète et décodez une adresse encodée. UTF-8, RFC 3986, traitement local." },
    related: ["dev-base64", "text-slug", "dev-html-entities"],
    content: {
      steps: ["Choisissez encoder ou décoder.", "Collez le texte ou l'URL ; pour une adresse complète, cochez « URL complète ».", "Copiez le résultat."],
      limitations: ["Le décodage d'une séquence %XX invalide est signalé comme une erreur.", "Les « + » sont interprétés comme des espaces au décodage (convention des formulaires)."],
      faq: [],
    },
  }),
  devTool({
    id: "dev-html-entities",
    slug: "caracteres-html",
    name: "Échapper et déséchapper du HTML",
    shortDescription: "Convertissez <, >, &, guillemets en entités HTML (&lt;, &amp;…) et inversement.",
    description:
      "Préparez un extrait de code ou un texte à afficher dans une page HTML en remplaçant les caractères spéciaux par leurs entités, ou retrouvez le texte lisible d'un contenu rempli d'entités (&eacute;, &#233;, &nbsp;…). Utile pour les blogs, les CMS, les e-mails HTML et le débogage.",
    icon: "file-code",
    keywords: ["entités html", "échapper html", "html escape", "html unescape", "&amp;", "&lt;", "caractères spéciaux html", "convertir html en texte", "html entities"],
    seo: { title: "Échapper et déséchapper des caractères HTML en ligne (entités)", description: "Convertissez <, >, &, guillemets et accents en entités HTML et inversement, instantanément et sans envoi de données." },
    related: ["dev-base64", "dev-url-encode", "text-clean"],
    inputFormats: ["text/html", "text/plain"],
    outputFormats: ["text/html", "text/plain"],
    content: {
      steps: ["Choisissez échapper ou déséchapper.", "Collez le texte.", "Copiez le résultat."],
      limitations: ["Le déséchappement convertit les entités numériques (&#233;, &#xE9;) et les entités nommées courantes ; les balises HTML ne sont pas supprimées.", "L'échappement couvre & < > \" ' ; les accents sont conservés tels quels (UTF-8 étant la norme)."],
      faq: [],
    },
  }),
];
