import type { ToolDefinition } from "../types";
import { CLIENT_PRIVACY_NOTE, PDF_IN, singlePdfLimits } from "./pdf-core";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MB = 1024 * 1024;

const OFFICE_PRIVACY =
  "Le fichier est lu et mis en page dans votre navigateur (mammoth, exceljs, pdf-lib). Il n'est jamais envoyé sur un serveur : la conversion fonctionne même sans connexion une fois l'outil enregistré.";
const FONT_LIMIT =
  "Polices PDF standard (Helvetica, Times, Courier) : les polices du document d'origine ne sont pas reprises ; emoji, alphabets non latins et symboles rares sont remplacés par « ? » et signalés.";

function conversionTool(
  partial: Omit<
    ToolDefinition,
    "category" | "status" | "indexable" | "processing" | "featureFlags" | "premium"
  > &
    Partial<ToolDefinition>,
): ToolDefinition {
  return {
    category: "conversion",
    status: "published",
    indexable: true,
    processing: "client",
    featureFlags: [],
    premium: false,
    ...partial,
  };
}

/**
 * Office conversions, deliberately described as "simplified layout": the
 * structure (headings, paragraphs, lists, tables, images) is converted, not
 * the exact page layout. PowerPoint and PDF/A are not offered.
 */
export const conversionTools: readonly ToolDefinition[] = [
  conversionTool({
    id: "conv-docx-pdf",
    slug: "word-vers-pdf",
    name: "Convertir Word en PDF",
    shortDescription:
      "Transformez un document Word (.docx) en PDF lisible partout : titres, paragraphes, listes, tableaux et images, sans envoi du fichier.",
    description:
      "Déposez un fichier .docx et obtenez un PDF paginé qui reprend la structure du document : titres hiérarchisés, paragraphes avec gras et italique, listes, tableaux, liens et images incorporées (PNG, JPEG). La mise en page est simplifiée et régulière (une colonne, polices standard) : c'est le bon choix pour partager, archiver ou imprimer un texte, pas pour reproduire au pixel près une maquette Word. Le fichier ne quitte pas votre navigateur.",
    icon: "file-type",
    keywords: [
      "word en pdf",
      "docx en pdf",
      "convertir word pdf",
      "word to pdf",
      "transformer un document word en pdf",
      "doc en pdf",
      "enregistrer word en pdf",
      "convertisseur word pdf gratuit",
    ],
    seo: {
      title: "Convertir un document Word (DOCX) en PDF en ligne, sans envoi",
      description:
        "Transformez un fichier Word .docx en PDF dans votre navigateur : titres, listes, tableaux et images conservés, mise en page simplifiée. Gratuit, rien n'est envoyé.",
    },
    inputFormats: [DOCX],
    outputFormats: ["application/pdf"],
    limits: { maxFileSizeBytes: 25 * MB, maxFileCount: 1 },
    related: ["conv-pdf-docx", "doc-markdown-pdf", "pdf-merge", "pdf-compress"],
    featured: true,
    content: {
      steps: [
        "Déposez votre document .docx (Word 2007 et plus, LibreOffice, Google Docs exporté).",
        "Choisissez la police, la taille, le format de page et les marges ; la numérotation des pages est facultative.",
        "Créez le PDF, vérifiez l'aperçu des avertissements éventuels et téléchargez-le.",
      ],
      limitations: [
        "Mise en page simplifiée : une colonne, polices standard, pas de reproduction exacte des positions, des colonnes multiples, des zones de texte ni des sauts de page d'origine.",
        "Les en-têtes, pieds de page, notes de bas de page, commentaires, suivi des modifications et champs (table des matières, numéros) ne sont pas convertis.",
        "Les images EMF/WMF/TIFF, les graphiques et les objets incorporés sont ignorés et signalés ; les PNG et JPEG sont conservés.",
        "Les tableaux sont rendus avec des colonnes de largeur égale, sans cellules fusionnées ni couleurs.",
        FONT_LIMIT,
        "Format .docx uniquement (pas de .doc, .odt ni .rtf) ; fichiers jusqu'à 25 Mo.",
      ],
      faq: [
        {
          question: "Le PDF sera-t-il identique à mon document Word ?",
          answer:
            "Non, et nous préférons le dire : la conversion reprend le contenu et la structure (titres, listes, tableaux, images) avec une mise en page régulière, mais pas les polices, colonnes, zones de texte ou positions exactes. Pour une copie fidèle, utilisez « Enregistrer au format PDF » dans Word ou LibreOffice ; cet outil sert quand vous n'avez pas Word sous la main ou ne voulez pas envoyer le document à un service en ligne.",
        },
        {
          question: "Mon fichier .doc (ancien Word) n'est pas accepté, pourquoi ?",
          answer:
            "L'ancien format binaire .doc n'est pas pris en charge dans le navigateur. Ouvrez le fichier dans Word, LibreOffice ou Google Docs et enregistrez-le en .docx, puis recommencez.",
        },
        {
          question: "Le document est-il envoyé sur un serveur ?",
          answer:
            "Non. La lecture du .docx (bibliothèque mammoth) et la génération du PDF (pdf-lib) se font entièrement dans votre navigateur. Vous pouvez même couper votre connexion une fois la page chargée.",
        },
      ],
      privacyNote: OFFICE_PRIVACY,
    },
  }),
  conversionTool({
    id: "conv-sheet-pdf",
    slug: "excel-vers-pdf",
    name: "Convertir Excel ou CSV en PDF",
    shortDescription:
      "Transformez un classeur Excel (.xlsx) ou un fichier CSV en tableaux PDF paginés, une feuille après l'autre, sans envoi du fichier.",
    description:
      "Déposez un classeur .xlsx ou un fichier .csv : chaque feuille devient un tableau PDF avec sa ligne d'en-tête, ses nombres, dates et résultats de formules, au format portrait ou paysage. Idéal pour transmettre une liste, un relevé ou un export de données sous une forme figée et imprimable. Les mises en forme avancées (couleurs, largeurs de colonnes, graphiques) ne sont pas reprises.",
    icon: "file-spreadsheet",
    keywords: [
      "excel en pdf",
      "xlsx en pdf",
      "csv en pdf",
      "convertir excel pdf",
      "excel to pdf",
      "tableau en pdf",
      "feuille de calcul en pdf",
      "classeur en pdf",
      "convertisseur excel pdf gratuit",
    ],
    seo: {
      title: "Convertir un fichier Excel (XLSX) ou CSV en PDF en ligne, sans envoi",
      description:
        "Transformez un classeur Excel .xlsx ou un fichier CSV en tableaux PDF paginés dans votre navigateur : feuilles, en-têtes, formules, dates. Gratuit, sans envoi.",
    },
    inputFormats: [XLSX, "text/csv"],
    outputFormats: ["application/pdf"],
    limits: { maxFileSizeBytes: 15 * MB, maxFileCount: 1 },
    related: ["conv-docx-pdf", "dev-csv-json", "pdf-merge", "doc-markdown-pdf"],
    content: {
      steps: [
        "Déposez un classeur .xlsx ou un fichier .csv (séparateur détecté automatiquement).",
        "Choisissez l'orientation (paysage conseillé au-delà de 6 colonnes), la police, la taille et si la première ligne est un en-tête.",
        "Créez le PDF et téléchargez-le ; les feuilles vides ou tronquées sont signalées.",
      ],
      limitations: [
        "Colonnes de largeur égale et texte renvoyé à la ligne : les feuilles très larges deviennent peu lisibles, préférez le paysage ou scindez la feuille.",
        "Les formules sont converties avec leur dernier résultat enregistré ; les formats de nombre personnalisés sont approximés (décimales, pourcentages, dates).",
        "Couleurs, bordures, cellules fusionnées, images, graphiques, filtres et tableaux croisés ne sont pas convertis.",
        "Au plus 5 000 lignes par feuille sont converties (les suivantes sont signalées).",
        FONT_LIMIT,
        "Formats .xlsx et .csv uniquement (pas de .xls ni .ods) ; fichiers jusqu'à 15 Mo.",
      ],
      faq: [
        {
          question: "Les formules sont-elles recalculées ?",
          answer:
            "Non : l'outil reprend le résultat enregistré dans le fichier par Excel ou LibreOffice lors du dernier enregistrement. Si une cellule affiche une valeur vide, enregistrez de nouveau le classeur après recalcul.",
        },
        {
          question: "Puis-je convertir une seule feuille ?",
          answer:
            "Toutes les feuilles non vides sont converties, chacune sous son nom. Pour n'en garder qu'une, supprimez les autres dans le classeur ou exportez la feuille voulue en CSV, puis convertissez ce CSV.",
        },
      ],
      privacyNote: OFFICE_PRIVACY,
    },
  }),
  conversionTool({
    id: "conv-pdf-docx",
    slug: "pdf-vers-word",
    name: "Convertir un PDF en Word",
    shortDescription:
      "Récupérez le texte et les images d'un PDF dans un document Word (.docx) modifiable, sans envoi du fichier.",
    description:
      "Déposez un PDF et obtenez un fichier .docx ouvrable dans Word, LibreOffice ou Google Docs : le texte de chaque page devient des paragraphes modifiables avec gras et italique, les titres sont détectés d'après leur taille, les images incorporées sont reprises et chaque page du PDF reste une page Word. La mise en page exacte (colonnes, positions, polices) n'est pas reproduite : l'objectif est de pouvoir reprendre et modifier le contenu, pas de cloner le PDF.",
    icon: "file-output",
    keywords: [
      "pdf en word",
      "pdf vers docx",
      "convertir pdf word",
      "pdf to word",
      "pdf modifiable",
      "transformer un pdf en document word",
      "pdf en docx gratuit",
      "récupérer le texte d'un pdf dans word",
    ],
    seo: {
      title: "Convertir un PDF en Word (DOCX) modifiable en ligne, sans envoi",
      description:
        "Transformez un PDF en document Word .docx dans votre navigateur : paragraphes modifiables, titres, gras et italique, images reprises. Gratuit, rien n'est envoyé.",
    },
    inputFormats: [...PDF_IN],
    outputFormats: [DOCX],
    limits: singlePdfLimits,
    related: ["conv-docx-pdf", "pdf-extract-text", "scan-ocr", "pdf-edit"],
    featured: true,
    content: {
      steps: [
        "Déposez votre PDF (mot de passe demandé si le document est protégé).",
        "Choisissez si chaque page du PDF doit rester une page Word et si les images doivent être reprises.",
        "Créez le document Word et téléchargez-le ; ouvrez-le dans Word ou LibreOffice pour le retoucher.",
      ],
      limitations: [
        "Le texte est repris en paragraphes successifs : les colonnes, encadrés, tableaux et positions exactes ne sont pas reconstruits (les cellules d'un tableau deviennent du texte).",
        "Les polices d'origine ne sont pas reprises (Word applique les siennes) ; gras, italique, taille et titres sont estimés d'après le PDF.",
        "Les PDF scannés sans couche texte donnent seulement leurs images : passez d'abord par la reconnaissance de texte (OCR) pour obtenir un texte modifiable.",
        "Dessins vectoriels, formulaires, annotations, liens et signatures ne sont pas convertis ; les images JPEG 2000, CCITT et JBIG2 sont ignorées.",
        "Les documents à droite-à-gauche ou verticaux (arabe, hébreu, japonais vertical) peuvent être mal ordonnés.",
      ],
      faq: [
        {
          question: "Pourquoi mon document Word ne ressemble-t-il pas exactement au PDF ?",
          answer:
            "Un PDF décrit des positions de caractères, pas une structure de document. L'outil reconstruit des paragraphes à partir de ces positions, ce qui suffit pour reprendre et modifier le texte, mais pas pour cloner une maquette complexe (journal en colonnes, formulaire). Les convertisseurs qui promettent une copie parfaite envoient généralement votre fichier sur leurs serveurs.",
        },
        {
          question: "Le PDF est un scan : le texte n'apparaît pas dans Word.",
          answer:
            "Un scan ne contient pas de texte, seulement une image. Utilisez d'abord l'outil « OCR » pour créer un PDF avec une couche texte, puis convertissez ce PDF en Word.",
        },
        {
          question: "Le fichier est-il envoyé quelque part ?",
          answer:
            "Non. pdf.js lit le PDF et la bibliothèque docx écrit le document Word, les deux dans votre navigateur. Rien n'est transmis ni conservé.",
        },
      ],
      privacyNote: CLIENT_PRIVACY_NOTE,
    },
  }),
];
