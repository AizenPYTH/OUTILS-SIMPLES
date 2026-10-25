import type { ToolDefinition } from "../types";

const SCAN_PRIVACY =
  "Les photos et le texte reconnu restent dans votre navigateur. Le moteur OCR (Tesseract, WebAssembly) et ses modèles de langue sont téléchargés depuis ce site, jamais vos documents.";

function scanTool(partial: Omit<ToolDefinition, "category" | "status" | "indexable" | "processing" | "featureFlags" | "premium"> & Partial<ToolDefinition>): ToolDefinition {
  return {
    category: "numerisation",
    status: "published",
    indexable: true,
    processing: "client",
    featureFlags: [],
    premium: false,
    ...partial,
    content: { privacyNote: SCAN_PRIVACY, ...partial.content },
  };
}

export const scanTools: readonly ToolDefinition[] = [
  scanTool({
    id: "scan-document",
    slug: "scanner-un-document",
    name: "Scanner un document",
    shortDescription: "Photographiez vos feuilles avec le téléphone, recadrez, améliorez le contraste et obtenez un PDF multipage.",
    description:
      "Transformez votre smartphone en scanner : prenez une photo de chaque page (ou importez des photos existantes), recadrez, redressez l'orientation, appliquez un filtre document, niveaux de gris ou noir et blanc, ajustez luminosité et contraste, réordonnez les pages puis exportez un PDF multipage ou chaque page en image. Tout se passe dans le navigateur, sans application à installer.",
    icon: "camera",
    keywords: ["scanner un document", "scanner une feuille", "scanner avec téléphone", "numériser un document", "scan pdf", "scanner en pdf", "photo en pdf", "scanner gratuit", "application scanner", "numériser une feuille", "scan document mobile", "camscanner gratuit"],
    seo: { title: "Scanner un document avec son téléphone en ligne (PDF gratuit)", description: "Scannez une feuille avec l'appareil photo du téléphone : recadrage, filtres document et noir et blanc, plusieurs pages, export PDF ou images. Sans envoi de fichier." },
    inputFormats: ["image/jpeg", "image/png", "image/webp"],
    outputFormats: ["application/pdf", "image/jpeg", "image/png"],
    limits: { maxFileSizeBytes: 50 * 1024 * 1024, maxFileCount: 100 },
    related: ["scan-perspective", "scan-ocr", "pdf-from-images"],
    featured: true,
    content: {
      steps: ["Prenez une photo de la page (bouton caméra) ou importez une image.", "Recadrez, pivotez et choisissez un filtre ; ajustez luminosité et contraste si besoin.", "Ajoutez d'autres pages, réordonnez-les, puis exportez en PDF ou en images."],
      limitations: ["La capture caméra nécessite un navigateur récent et une page servie en HTTPS ; sinon, l'import de photos reste disponible.", "Le recadrage est rectangulaire : pour redresser une feuille photographiée de biais, utilisez « Corriger un document photographié ».", "La qualité dépend de la photo : éclairage uniforme et feuille bien à plat donnent les meilleurs résultats."],
      faq: [{ question: "Les photos sont-elles envoyées quelque part ?", answer: "Non. Les photos sont traitées par votre navigateur (canvas) et le PDF est assemblé localement avec pdf-lib. Rien ne transite par un serveur." }],
    },
  }),
  scanTool({
    id: "scan-perspective",
    slug: "corriger-un-document-photographie",
    name: "Corriger un document photographié",
    shortDescription: "Redressez une feuille prise de biais : détection des coins, ajustement manuel, correction de perspective et du contraste.",
    description:
      "Une photo de document prise de travers devient une page droite : l'outil propose automatiquement les quatre coins de la feuille (quand le contraste avec le fond le permet), vous les ajustez au doigt ou à la souris, puis la perspective est corrigée, l'orientation redressée et le contraste amélioré. Exportez en JPG, PNG ou PDF.",
    icon: "scan",
    keywords: ["corriger perspective document", "redresser une photo de document", "redresser feuille photographiée", "correction de perspective", "déformer image", "photo de travers", "redresser scan", "aplatir document photo"],
    seo: { title: "Redresser une feuille photographiée en ligne (correction de perspective)", description: "Corrigez la perspective d'un document pris en photo de biais : détection des coins, ajustement manuel, redressement et contraste, export JPG, PNG ou PDF. Traitement local." },
    inputFormats: ["image/jpeg", "image/png", "image/webp"],
    outputFormats: ["image/jpeg", "image/png", "application/pdf"],
    limits: { maxFileSizeBytes: 50 * 1024 * 1024, maxFileCount: 1 },
    related: ["scan-document", "scan-ocr", "image-crop"],
    status: "planned",
    indexable: false,
    content: { steps: [], limitations: [], faq: [] },
  }),
  scanTool({
    id: "scan-ocr",
    slug: "ocr",
    name: "OCR : reconnaître le texte d'un PDF ou d'une image",
    shortDescription: "Extrayez le texte d'un scan ou d'une photo (français, anglais) et créez un PDF recherchable.",
    description:
      "Reconnaissez le texte de vos documents scannés, photos et PDF image grâce à Tesseract (open source), exécuté dans votre navigateur : choisissez la langue (français, anglais ou les deux), traitez page par page avec la prévisualisation en regard du texte, corrigez le résultat, puis copiez-le, téléchargez-le en TXT ou Markdown, ou créez un PDF recherchable qui conserve l'image d'origine avec une couche de texte invisible.",
    icon: "scan-text",
    keywords: ["ocr", "ocr en ligne", "ocr gratuit", "reconnaissance de texte", "extraire texte image", "image en texte", "pdf scanné en texte", "rendre un pdf recherchable", "pdf recherchable", "ocr pdf", "ocr français", "convertir scan en texte", "texte d'une photo"],
    seo: { title: "OCR en ligne gratuit : texte d'un PDF scanné ou d'une image (français)", description: "Reconnaissance de texte dans le navigateur (Tesseract) : PDF scannés, JPG, PNG, français et anglais, export TXT, Markdown et PDF recherchable. Sans envoi de fichier." },
    inputFormats: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    outputFormats: ["text/plain", "text/markdown", "application/pdf"],
    limits: { maxFileSizeBytes: 100 * 1024 * 1024, maxFileCount: 1, maxPageCount: 200 },
    related: ["pdf-extract-text", "scan-document", "pdf-search"],
    featured: true,
    content: {
      steps: ["Déposez un PDF scanné ou une image (JPG, PNG, WebP) et choisissez la langue.", "Lancez la reconnaissance : le moteur se télécharge une première fois puis chaque page est traitée (quelques secondes par page).", "Relisez et corrigez le texte page par page, puis copiez-le, téléchargez-le en TXT/Markdown ou créez un PDF recherchable."],
      limitations: ["Moteur Tesseract 5 (LSTM) exécuté dans le navigateur : plus lent qu'un service en ligne, mais totalement privé. Comptez 2 à 15 secondes par page selon l'appareil.", "Qualité dépendante du document : texte imprimé net, bien contrasté, à 200-300 dpi donne les meilleurs résultats. L'écriture manuscrite, les polices fantaisie et les photos floues sont mal reconnues.", "Les tableaux et mises en page en colonnes peuvent être mélangés ; les tampons et signatures produisent parfois des caractères parasites.", "Le PDF recherchable conserve l'image et ajoute une couche de texte invisible : la mise en forme n'est pas reconstruite. Les mots dont la confiance est faible sont ignorés.", "Jusqu'à 200 pages par document ; la mémoire du navigateur limite les très gros fichiers."],
      faq: [
        { question: "Mes documents sont-ils envoyés sur un serveur ?", answer: "Non. Tesseract fonctionne en WebAssembly dans votre navigateur. Seuls le moteur et le modèle de langue (fichiers publics, hébergés sur OUTILIA) sont téléchargés, jamais vos pages." },
        { question: "Qu'est-ce qu'un PDF recherchable ?", answer: "Un PDF dont les pages restent des images (fidèles à l'original) mais contiennent une couche de texte invisible positionnée sur les mots. Vous pouvez y sélectionner, copier et rechercher du texte, et il est indexable par les moteurs de recherche de fichiers." },
      ],
    },
  }),
];
