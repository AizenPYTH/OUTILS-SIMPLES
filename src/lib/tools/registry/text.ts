import type { ToolDefinition } from "../types";

const TEXT_PRIVACY = "Le texte est traité instantanément dans votre navigateur : rien n'est envoyé sur un serveur, rien n'est conservé.";
const TEXT_IN = ["text/plain"];
const noFileLimits = { maxFileSizeBytes: 2 * 1024 * 1024, maxFileCount: 1 };

function textTool(partial: Omit<ToolDefinition, "category" | "status" | "indexable" | "inputFormats" | "outputFormats" | "processing" | "limits" | "featureFlags" | "premium"> & Partial<ToolDefinition>): ToolDefinition {
  return {
    category: "texte",
    status: "published",
    indexable: true,
    inputFormats: TEXT_IN,
    outputFormats: TEXT_IN,
    processing: "client",
    limits: noFileLimits,
    featureFlags: [],
    premium: false,
    ...partial,
    content: { privacyNote: TEXT_PRIVACY, ...partial.content },
  };
}

export const textTools: readonly ToolDefinition[] = [
  textTool({
    id: "text-word-counter",
    slug: "compteur-de-mots",
    name: "Compteur de mots",
    shortDescription: "Comptez mots, caractères, phrases et paragraphes, avec le temps de lecture estimé.",
    description:
      "Collez un texte pour obtenir instantanément son nombre de mots, de caractères (avec et sans espaces), de phrases, de paragraphes et de lignes, ainsi qu'une estimation du temps de lecture et de lecture à voix haute. Les mots les plus fréquents sont listés pour repérer les répétitions.",
    icon: "pilcrow",
    keywords: ["compteur de mots", "nombre de mots", "nombre de caractères", "compter les mots", "temps de lecture", "word count", "longueur texte", "compteur caractères"],
    seo: { title: "Compteur de mots et de caractères en ligne (temps de lecture)", description: "Comptez les mots, caractères, phrases et paragraphes d'un texte et estimez son temps de lecture. Gratuit, instantané, sans envoi de données." },
    related: ["text-clean", "text-case", "text-diff"],
    featured: true,
    content: {
      steps: ["Collez ou saisissez votre texte (ou importez un fichier .txt).", "Les statistiques se mettent à jour à chaque frappe.", "Consultez les mots les plus fréquents pour repérer les répétitions."],
      limitations: ["Un mot est une suite de caractères séparée par des espaces et contenant au moins une lettre ou un chiffre ; la ponctuation isolée n'est pas comptée.", "Le temps de lecture est une estimation (200 mots/min en lecture silencieuse, 130 mots/min à l'oral)."],
      faq: [{ question: "Les espaces comptent-ils comme des caractères ?", answer: "Les deux valeurs sont affichées : le nombre total de caractères (espaces et sauts de ligne compris) et le nombre sans espaces, souvent utilisé pour les limites de formulaires." }],
    },
  }),
  textTool({
    id: "text-case",
    slug: "majuscules-minuscules",
    name: "Majuscules et minuscules",
    shortDescription: "Convertissez un texte en MAJUSCULES, minuscules, Phrase, Titre, snake_case, kebab-case ou camelCase.",
    description:
      "Changez la casse d'un texte en un clic : tout en majuscules, tout en minuscules, première lettre de chaque phrase, chaque mot capitalisé, format titre respectant les petits mots français, inversion, et formats techniques snake_case, kebab-case et camelCase. Les accents sont correctement pris en charge (É, À, Ç…).",
    icon: "case",
    keywords: ["majuscules", "minuscules", "convertir en majuscules", "mettre en minuscule", "casse", "capitaliser", "camelcase", "snake case", "kebab case", "uppercase", "lowercase"],
    seo: { title: "Convertir en majuscules ou minuscules en ligne (casse d'un texte)", description: "Transformez un texte en majuscules, minuscules, phrase, titre, snake_case, kebab-case ou camelCase, accents compris. Instantané et gratuit." },
    related: ["text-clean", "text-word-counter", "text-slug"],
    content: {
      steps: ["Collez votre texte.", "Choisissez le format de casse souhaité.", "Copiez ou téléchargez le résultat."],
      limitations: ["Le format « Titre » conserve en minuscules les mots-outils français courants (de, la, le, et…) sauf en début de texte.", "Les formats techniques (snake_case, kebab-case, camelCase) retirent les accents et la ponctuation."],
      faq: [],
    },
  }),
  textTool({
    id: "text-clean",
    slug: "nettoyer-un-texte",
    name: "Nettoyer un texte",
    shortDescription: "Supprimez espaces en trop, lignes vides et doublons, recollez les lignes coupées d'un PDF, triez les lignes.",
    description:
      "Nettoyez un texte collé depuis un PDF, un e-mail ou une page web : suppression des espaces en début et fin de ligne, réduction des espaces multiples, suppression des lignes vides ou en double, réparation des mots coupés par un tiret, recollage des lignes coupées, tri alphabétique naturel et normalisation des guillemets. Chaque option est activable séparément et le résultat se met à jour en direct.",
    icon: "broom",
    keywords: ["nettoyer texte", "supprimer les espaces", "supprimer lignes vides", "supprimer doublons", "trier les lignes", "texte copié pdf", "retours à la ligne", "dédoublonner", "trier alphabétiquement", "espaces en trop"],
    seo: { title: "Nettoyer un texte en ligne : espaces, lignes vides, doublons, tri", description: "Supprimez les espaces en trop, les lignes vides et les doublons, recollez les lignes coupées d'un PDF et triez les lignes. Résultat immédiat, sans envoi de données." },
    related: ["text-word-counter", "text-case", "text-diff", "pdf-extract-text"],
    featured: true,
    content: {
      steps: ["Collez le texte à nettoyer.", "Cochez les opérations souhaitées ; le résultat se met à jour en direct.", "Copiez ou téléchargez le texte nettoyé."],
      limitations: ["Le recollage des lignes conserve les paragraphes séparés par une ligne vide ; un texte sans lignes vides sera recollé en un seul paragraphe.", "Le tri utilise l'ordre naturel français (item2 avant item10, accents ignorés)."],
      faq: [{ question: "Pourquoi le texte copié d'un PDF a-t-il des retours à la ligne partout ?", answer: "Un PDF stocke des lignes positionnées, pas des paragraphes. En copiant, chaque ligne visuelle devient un retour à la ligne. L'option « Recoller les lignes coupées » reconstruit les paragraphes, et « Réparer les mots coupés » supprime les tirets de césure." }],
    },
  }),
  textTool({
    id: "text-diff",
    slug: "comparer-deux-textes",
    name: "Comparer deux textes",
    shortDescription: "Mettez en évidence les différences entre deux textes, par lignes, mots ou caractères.",
    description:
      "Comparez deux versions d'un texte, d'un contrat, d'une liste ou d'un fichier de code : les ajouts apparaissent en vert, les suppressions en rouge, avec un résumé des changements. Choisissez la granularité (lignes, mots ou caractères), ignorez la casse ou les espaces, puis copiez le diff au format unifié.",
    icon: "diff",
    keywords: ["comparer deux textes", "différence entre deux textes", "diff texte", "comparateur de texte", "comparer fichiers", "trouver les différences", "diff en ligne", "comparer versions"],
    seo: { title: "Comparer deux textes en ligne et voir les différences (diff)", description: "Comparateur de textes gratuit : différences par lignes, mots ou caractères, ajouts en vert, suppressions en rouge, export du diff. Traitement local." },
    related: ["text-clean", "text-word-counter", "dev-json"],
    featured: true,
    content: {
      steps: ["Collez le texte original à gauche et le texte modifié à droite.", "Choisissez la granularité (lignes, mots, caractères).", "Lisez les différences surlignées ou copiez le diff."],
      limitations: ["L'algorithme (Myers, via la bibliothèque open source « diff ») trouve la plus petite série de changements ; sur des textes très différents, le résultat peut paraître moins lisible qu'une comparaison manuelle.", "Textes jusqu'à environ 2 Mo pour rester fluide."],
      faq: [],
    },
  }),
  textTool({
    id: "text-slug",
    slug: "generateur-de-slug",
    name: "Générateur de slug URL",
    shortDescription: "Transformez un titre en slug d'URL propre : minuscules, sans accents, mots séparés par des tirets.",
    description:
      "Créez des adresses web lisibles à partir de vos titres d'articles, de produits ou de pages : les accents sont retirés, la ponctuation et les espaces remplacés par un séparateur, le tout en minuscules. Traitez plusieurs titres à la fois (un par ligne) et limitez la longueur pour des URL courtes.",
    icon: "link",
    keywords: ["slug", "générateur de slug", "url propre", "slugify", "titre en url", "nom de fichier propre", "permalien", "url seo"],
    seo: { title: "Générateur de slug URL en ligne (titre vers URL propre)", description: "Transformez un titre en slug : minuscules, sans accents, tirets, longueur limitée, plusieurs titres à la fois. Gratuit, instantané, sans envoi de données." },
    related: ["text-case", "text-clean", "dev-url-encode"],
    content: {
      steps: ["Collez un ou plusieurs titres (un par ligne).", "Choisissez le séparateur et une longueur maximale si besoin.", "Copiez les slugs."],
      limitations: ["Seuls les caractères latins sont translittérés (accents) ; les alphabets non latins sont retirés.", "Le slug ne garantit pas l'unicité d'une URL : à vérifier côté site."],
      faq: [],
    },
  }),
];
