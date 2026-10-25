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
  devTool({
    id: "dev-uuid",
    slug: "generateur-uuid",
    name: "Générateur d'UUID",
    shortDescription: "Générez un ou cent identifiants UUID v4 aléatoires, en minuscules ou majuscules, avec ou sans tirets.",
    description:
      "Créez des identifiants uniques universels (UUID v4, RFC 4122) pour vos bases de données, API, tests ou fichiers de configuration : de 1 à 100 à la fois, en minuscules ou majuscules, avec accolades ou sans tirets. L'aléa provient de l'API Web Crypto du navigateur.",
    icon: "hash",
    keywords: ["uuid", "générateur uuid", "guid", "uuid v4", "identifiant unique", "generate uuid", "uuid en ligne", "uuid aléatoire"],
    seo: { title: "Générateur d'UUID v4 en ligne (GUID, jusqu'à 100 à la fois)", description: "Générez des UUID v4 aléatoires (RFC 4122) en lot, minuscules ou majuscules, avec ou sans tirets. Aléa cryptographique du navigateur, rien n'est envoyé." },
    related: ["dev-password", "dev-hash", "dev-json"],
    content: {
      steps: ["Choisissez le nombre et le format.", "Cliquez sur « Régénérer » autant de fois que nécessaire.", "Copiez ou téléchargez la liste."],
      limitations: ["UUID version 4 uniquement (aléatoire) ; les versions 1 (horodatée) et 5 (nommée) ne sont pas proposées.", "Les identifiants ne sont pas conservés : rechargez la page et ils disparaissent."],
      faq: [],
    },
  }),
  devTool({
    id: "dev-password",
    slug: "generateur-de-mot-de-passe",
    name: "Générateur de mots de passe",
    shortDescription: "Créez des mots de passe forts et aléatoires (longueur, types de caractères, caractères ambigus exclus) avec leur entropie.",
    description:
      "Générez des mots de passe robustes directement dans votre navigateur : longueur de 8 à 64 caractères, minuscules, majuscules, chiffres et symboles au choix, exclusion des caractères qui se confondent (0/O, 1/l/I), plusieurs propositions à la fois et une estimation honnête de la robustesse en bits d'entropie. L'aléa est cryptographique (Web Crypto) et rien ne quitte votre appareil.",
    icon: "key",
    keywords: ["générateur de mot de passe", "mot de passe fort", "mot de passe aléatoire", "créer un mot de passe", "password generator", "mot de passe sécurisé", "générateur mdp", "entropie mot de passe"],
    seo: { title: "Générateur de mots de passe forts et aléatoires (local, sans envoi)", description: "Créez des mots de passe robustes : longueur, types de caractères, exclusion des caractères ambigus, entropie affichée. Aléa cryptographique dans le navigateur." },
    related: ["dev-uuid", "dev-hash", "pdf-protect"],
    featured: true,
    content: {
      steps: ["Réglez la longueur et les types de caractères.", "Cliquez sur « Générer » pour de nouvelles propositions.", "Copiez le mot de passe dans votre gestionnaire."],
      limitations: ["L'entropie affichée suppose un attaquant qui connaît les règles de génération ; elle ne dit rien d'un mot de passe choisi à la main.", "Certains sites refusent certains symboles : décochez-les si besoin.", "Les mots de passe ne sont ni enregistrés ni synchronisés : utilisez un gestionnaire de mots de passe."],
      faq: [{ question: "Quelle longueur choisir ?", answer: "Au moins 14 caractères avec les quatre types (≈ 90 bits) pour un compte important ; 20 ou plus pour une clé de chiffrement. La longueur compte davantage que les symboles." }],
    },
  }),
  devTool({
    id: "dev-hash",
    slug: "calculer-hash-sha256",
    name: "Calculer un hash SHA-256 / SHA-1 / SHA-512",
    shortDescription: "Calculez l'empreinte d'un texte ou d'un fichier (SHA-256, SHA-1, SHA-384, SHA-512) et comparez-la à une somme attendue.",
    description:
      "Vérifiez l'intégrité d'un téléchargement ou calculez l'empreinte d'un texte : SHA-256, SHA-1, SHA-384 et SHA-512 sont calculés par l'API Web Crypto du navigateur, pour un texte saisi ou un fichier jusqu'à 500 Mo lu localement. Collez l'empreinte publiée par l'éditeur pour voir immédiatement si elle correspond.",
    icon: "shield",
    keywords: ["sha256", "calculer sha256", "hash fichier", "checksum", "somme de contrôle", "vérifier intégrité fichier", "sha1", "sha512", "empreinte fichier", "hash en ligne"],
    seo: { title: "Calculer le SHA-256 d'un fichier ou d'un texte en ligne (checksum)", description: "Empreintes SHA-256, SHA-1, SHA-384 et SHA-512 d'un texte ou d'un fichier (jusqu'à 500 Mo), comparaison avec une somme attendue. Calcul local, sans envoi." },
    inputFormats: ["text/plain", "application/octet-stream"],
    limits: { maxFileSizeBytes: 500 * 1024 * 1024, maxFileCount: 1 },
    related: ["dev-base64", "dev-uuid", "pdf-check"],
    content: {
      steps: ["Saisissez un texte ou déposez un fichier.", "Lisez les empreintes calculées.", "Collez l'empreinte attendue pour la comparer."],
      limitations: ["MD5 n'est pas proposé (non sûr et absent de l'API Web Crypto).", "Les fichiers sont lus entièrement en mémoire : au-delà de quelques centaines de Mo, le navigateur peut manquer de mémoire.", "Le texte est haché en UTF-8 sans retour à la ligne final ajouté : un fichier texte peut donner une empreinte différente de la même chaîne collée."],
      faq: [],
    },
  }),
  devTool({
    id: "dev-regex",
    slug: "testeur-regex",
    name: "Testeur d'expressions régulières",
    shortDescription: "Testez une regex JavaScript en direct : correspondances surlignées, groupes capturés, drapeaux, remplacement.",
    description:
      "Écrivez ou collez une expression régulière et voyez immédiatement ce qu'elle capture dans votre texte : occurrences surlignées, tableau des groupes (numérotés et nommés), drapeaux g, i, m, s, u, messages d'erreur clairs et champ de remplacement avec $1, $2 ou $<nom>. Des modèles prêts à l'emploi (e-mail, URL, téléphone, date, IBAN) servent de point de départ.",
    icon: "regex",
    keywords: ["regex", "testeur regex", "expression régulière", "regex en ligne", "tester une regex", "regex javascript", "regex101", "groupes de capture", "regex tester"],
    seo: { title: "Testeur de regex en ligne (JavaScript) : correspondances et groupes", description: "Testez vos expressions régulières en direct : surlignage des correspondances, groupes capturés, drapeaux, remplacement et modèles prêts à l'emploi. Local." },
    related: ["text-diff", "text-clean", "dev-json"],
    content: {
      steps: ["Saisissez l'expression et cochez les drapeaux.", "Collez le texte de test : les correspondances sont surlignées.", "Ajoutez un remplacement pour voir le texte transformé."],
      limitations: ["Syntaxe JavaScript (ECMAScript) : quelques différences avec PCRE/Python (pas de lookbehind variable dans les anciens navigateurs, pas de \\A).", "Une expression très coûteuse (retours arrière catastrophiques) peut figer l'onglet un instant.", "Affichage limité à 2 000 correspondances."],
      faq: [],
    },
  }),
  devTool({
    id: "dev-timestamp",
    slug: "convertisseur-timestamp",
    name: "Convertisseur de timestamp Unix",
    shortDescription: "Convertissez un timestamp Unix (secondes ou millisecondes) en date lisible et inversement, avec fuseau et ISO 8601.",
    description:
      "Transformez un timestamp Unix (secondes ou millisecondes, détection automatique) en date complète : ISO 8601, UTC, heure locale avec fuseau, temps relatif, jour de l'année et semaine ISO. Dans l'autre sens, choisissez une date ou saisissez-la en français pour obtenir son timestamp. L'heure actuelle est affichée en continu.",
    icon: "clock",
    keywords: ["timestamp", "convertir timestamp", "timestamp unix", "epoch converter", "timestamp en date", "date en timestamp", "unix time", "epoch", "convertisseur timestamp"],
    seo: { title: "Convertisseur de timestamp Unix en date (secondes, millisecondes, ISO)", description: "Convertissez un timestamp Unix en date lisible (ISO 8601, UTC, heure locale, relatif) et une date en timestamp. Détection secondes/millisecondes, traitement local." },
    related: ["calc-dates", "dev-json", "dev-uuid"],
    content: {
      steps: ["Collez un timestamp ou une date (ISO, JJ/MM/AAAA).", "Lisez les conversions dans tous les formats.", "Copiez la valeur voulue."],
      limitations: ["Les valeurs inférieures à 10¹¹ sont interprétées en secondes, au-dessus en millisecondes.", "Le fuseau local est celui de votre appareil ; les dates saisies sans fuseau sont interprétées dans ce fuseau."],
      faq: [],
    },
  }),
];
