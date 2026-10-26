import type { ToolDefinition } from "../types";
import { CLIENT_PRIVACY_NOTE, PDF_IN, PDF_OUT, singlePdfLimits } from "./pdf-core";

const QPDF_NOTE =
  "Le chiffrement est réalisé par qpdf (WebAssembly) directement dans votre navigateur : ni le fichier ni le mot de passe ne sont transmis.";

function pdfTool(
  partial: Omit<
    ToolDefinition,
    | "category"
    | "status"
    | "indexable"
    | "inputFormats"
    | "outputFormats"
    | "processing"
    | "limits"
    | "featureFlags"
    | "premium"
  > &
    Partial<ToolDefinition>,
): ToolDefinition {
  return {
    category: "pdf",
    status: "published",
    indexable: true,
    inputFormats: PDF_IN,
    outputFormats: PDF_OUT,
    processing: "client",
    limits: singlePdfLimits,
    featureFlags: [],
    premium: false,
    ...partial,
    content: { privacyNote: CLIENT_PRIVACY_NOTE, ...partial.content },
  };
}

export const pdfExtraTools: readonly ToolDefinition[] = [
  pdfTool({
    id: "pdf-extract-text",
    slug: "extraire-le-texte",
    name: "Extraire le texte d'un PDF",
    shortDescription: "Récupérez tout le texte d'un PDF en TXT ou Markdown, page par page.",
    description:
      "Extrayez le texte sélectionnable d'un PDF pour le copier, le retravailler ou l'archiver : le texte est reconstruit page par page en respectant les lignes et les paragraphes, puis proposé en texte brut ou en Markdown (un titre par page). Les pages sans texte (scans) sont signalées pour vous orienter vers l'OCR.",
    icon: "file-search",
    keywords: [
      "extraire texte pdf",
      "pdf vers txt",
      "copier texte pdf",
      "pdf en texte",
      "convertir pdf en texte",
      "pdf to text",
      "récupérer le texte d'un pdf",
      "pdf vers markdown",
    ],
    seo: {
      title: "Extraire le texte d'un PDF en ligne (PDF vers TXT ou Markdown)",
      description:
        "Récupérez le texte d'un PDF page par page et téléchargez-le en TXT ou Markdown. Détection des pages scannées, recherche dans le document, traitement local.",
    },
    outputFormats: ["text/plain", "text/markdown"],
    related: ["scan-ocr", "pdf-search", "text-clean"],
    featured: true,
    content: {
      steps: [
        "Déposez votre PDF : le texte de chaque page est lu par pdf.js.",
        "Recherchez un mot si besoin, puis choisissez texte brut ou Markdown.",
        "Copiez le résultat ou téléchargez le fichier.",
      ],
      limitations: [
        "Seul le texte réellement présent dans le PDF est extrait : un document scanné (image) ne contient pas de texte, utilisez l'outil OCR.",
        "L'ordre des mots suit leur position sur la page ; les tableaux et mises en page en colonnes peuvent être mélangés.",
        "Les caractères des polices mal encodées peuvent apparaître sous forme de symboles : c'est une limite du fichier d'origine.",
      ],
      faq: [
        {
          question: "Pourquoi certaines pages sont-elles vides ?",
          answer:
            "Elles ne contiennent que des images (document scanné ou texte converti en courbes). L'outil « OCR PDF et image » reconnaît alors le texte à partir de l'image.",
        },
      ],
    },
  }),
  pdfTool({
    id: "pdf-search",
    slug: "rechercher-dans-un-pdf",
    name: "Rechercher dans un PDF",
    shortDescription:
      "Trouvez un mot ou une expression dans un PDF, avec la page et le contexte de chaque occurrence.",
    description:
      "Recherchez un mot, un nom ou une expression dans un document PDF sans l'ouvrir dans un lecteur : chaque occurrence est listée avec son numéro de page et un extrait de contexte. La recherche ignore la casse et les accents, ce qui permet de retrouver « élève » en tapant « eleve ».",
    icon: "search",
    keywords: [
      "rechercher dans un pdf",
      "chercher un mot dans un pdf",
      "trouver un mot pdf",
      "recherche pdf",
      "search pdf",
      "occurrences pdf",
    ],
    seo: {
      title: "Rechercher un mot dans un PDF en ligne (occurrences par page)",
      description:
        "Trouvez toutes les occurrences d'un mot ou d'une expression dans un PDF, avec le numéro de page et le contexte. Recherche insensible aux accents, traitement local.",
    },
    outputFormats: ["text/plain"],
    related: ["pdf-extract-text", "scan-ocr"],
    content: {
      steps: [
        "Déposez votre PDF.",
        "Saisissez le mot ou l'expression recherchée.",
        "Parcourez les occurrences avec leur page et leur contexte.",
      ],
      limitations: [
        "La recherche porte sur le texte sélectionnable : les documents scannés doivent d'abord passer par l'OCR.",
        "Les mots coupés par un retour à la ligne ou une césure peuvent ne pas être trouvés.",
      ],
      faq: [],
    },
  }),
  pdfTool({
    id: "pdf-to-images",
    slug: "convertir-en-images",
    name: "Convertir un PDF en images",
    shortDescription:
      "Transformez chaque page d'un PDF en image JPG, PNG ou WebP, à la résolution de votre choix.",
    description:
      "Convertissez les pages d'un PDF en images pour les partager, les insérer dans une présentation ou un site : choisissez le format (JPG, PNG, WebP), la résolution (72, 150 ou 300 dpi) et les pages à convertir. Les images sont téléchargeables une par une ou dans une archive ZIP.",
    icon: "images",
    keywords: [
      "pdf en jpg",
      "pdf vers jpg",
      "pdf en png",
      "convertir pdf en image",
      "pdf to jpg",
      "pdf to png",
      "pdf en image",
      "page pdf en image",
      "pdf vers webp",
    ],
    seo: {
      title: "Convertir un PDF en JPG, PNG ou WebP en ligne (pages en images)",
      description:
        "Transformez les pages d'un PDF en images JPG, PNG ou WebP à 72, 150 ou 300 dpi. Téléchargement individuel ou ZIP, rendu local dans le navigateur.",
    },
    outputFormats: ["image/jpeg", "image/png", "image/webp", "application/zip"],
    related: ["pdf-from-images", "image-compress", "pdf-split"],
    featured: true,
    content: {
      steps: [
        "Déposez votre PDF.",
        "Choisissez le format, la résolution et les pages.",
        "Téléchargez les images (ZIP si plusieurs pages).",
      ],
      limitations: [
        "Le rendu est effectué par pdf.js : les très grandes pages à 300 dpi sont limitées à environ 25 mégapixels pour préserver la mémoire du navigateur.",
        "Le texte devient une image : il n'est plus sélectionnable. Pour conserver le texte, utilisez « Extraire le texte ».",
      ],
      faq: [
        {
          question: "Quelle résolution choisir ?",
          answer:
            "72 dpi suffit pour un aperçu à l'écran, 150 dpi pour une lecture confortable, 300 dpi pour l'impression ou l'OCR.",
        },
      ],
    },
  }),
  pdfTool({
    id: "pdf-from-images",
    slug: "images-en-pdf",
    name: "Convertir des images en PDF",
    shortDescription:
      "Assemblez des photos ou images JPG, PNG, WebP en un PDF, une page par image, dans l'ordre choisi.",
    description:
      "Créez un PDF à partir d'une ou plusieurs images : photos de documents, captures d'écran, scans. Réordonnez les images par glisser-déposer, choisissez la taille de page (A4, Lettre ou dimensions de l'image) et les marges, puis téléchargez un PDF multipage prêt à envoyer.",
    icon: "file-text",
    keywords: [
      "jpg en pdf",
      "image en pdf",
      "png en pdf",
      "convertir image en pdf",
      "photos en pdf",
      "jpg to pdf",
      "webp en pdf",
      "plusieurs images en un pdf",
      "créer pdf à partir d'images",
    ],
    seo: {
      title: "Convertir des images JPG, PNG ou WebP en PDF en ligne",
      description:
        "Transformez une ou plusieurs images en un PDF multipage : ordre par glisser-déposer, pages A4 ou à la taille de l'image, marges réglables. Gratuit, traitement local.",
    },
    inputFormats: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"],
    limits: { maxFileSizeBytes: 50 * 1024 * 1024, maxFileCount: 100 },
    related: ["pdf-to-images", "scan-document", "pdf-merge", "image-compress"],
    featured: true,
    content: {
      steps: [
        "Déposez vos images (ou prenez une photo sur mobile).",
        "Réordonnez-les, choisissez la taille de page et les marges.",
        "Créez le PDF et téléchargez-le.",
      ],
      limitations: [
        "Les JPG et PNG sont intégrés sans recompression ; les autres formats (WebP, GIF, BMP, AVIF, SVG) sont convertis en PNG ou JPG au passage.",
        "Jusqu'à 100 images par PDF.",
      ],
      faq: [
        {
          question: "Comment numériser une feuille proprement ?",
          answer:
            "Pour recadrer, redresser et améliorer le contraste d'une photo de document, utilisez l'outil « Scanner un document », qui produit directement un PDF.",
        },
      ],
    },
  }),
  pdfTool({
    id: "pdf-crop",
    slug: "recadrer",
    name: "Recadrer un PDF",
    shortDescription:
      "Retirez les marges d'un PDF en définissant la zone à conserver, avec aperçu.",
    description:
      "Rognez les marges de vos pages PDF (en millimètres, par côté) pour supprimer des bords inutiles, des en-têtes ou des zones blanches avant impression ou lecture sur liseuse. L'aperçu montre la zone conservée ; le recadrage s'applique à toutes les pages ou à une sélection.",
    icon: "crop",
    keywords: [
      "recadrer pdf",
      "rogner pdf",
      "couper les marges pdf",
      "supprimer marges pdf",
      "crop pdf",
      "réduire marges pdf",
    ],
    seo: {
      title: "Recadrer un PDF en ligne : rogner les marges des pages",
      description:
        "Supprimez les marges d'un PDF en indiquant les bords à retirer, avec aperçu de la zone conservée. Recadrage non destructif, réversible, traité localement.",
    },
    related: ["pdf-organize", "pdf-rotate", "pdf-stamp"],
    content: {
      steps: [
        "Déposez votre PDF.",
        "Indiquez les marges à retirer (haut, bas, gauche, droite) et vérifiez l'aperçu.",
        "Recadrez puis téléchargez.",
      ],
      limitations: [
        "Le recadrage modifie la zone d'affichage (CropBox) : le contenu masqué reste dans le fichier et peut être rétabli avec « Rétablir la page entière ». Ce n'est pas un caviardage.",
        "Les marges sont identiques pour toutes les pages sélectionnées.",
      ],
      faq: [],
    },
  }),
  pdfTool({
    id: "pdf-stamp",
    slug: "numeroter-les-pages",
    name: "Numéroter les pages d'un PDF",
    shortDescription:
      "Ajoutez des numéros de page, une date, un nom de fichier ou un texte en en-tête et pied de page.",
    description:
      "Ajoutez une pagination (« 1 / 12 », « Page 1 sur 12 »…), la date du jour, le nom du fichier ou n'importe quel texte en en-tête ou en pied de page, à gauche, au centre ou à droite. Choisissez la police, la taille, la couleur, la marge, le premier numéro et la page de départ.",
    icon: "list-ordered",
    keywords: [
      "numéroter pages pdf",
      "numéros de page pdf",
      "pagination pdf",
      "ajouter en-tête pdf",
      "pied de page pdf",
      "ajouter date pdf",
      "page number pdf",
      "numérotation pdf",
    ],
    seo: {
      title: "Numéroter les pages d'un PDF en ligne (en-tête, pied de page, date)",
      description:
        "Ajoutez numéros de page, date, nom de fichier ou texte en en-tête et pied de page d'un PDF. Police, taille, position et premier numéro réglables. Traitement local.",
    },
    related: ["pdf-watermark", "pdf-crop", "pdf-merge"],
    content: {
      steps: [
        "Déposez votre PDF.",
        "Choisissez le modèle de pied de page et/ou d'en-tête, la position et le style.",
        "Appliquez puis téléchargez.",
      ],
      limitations: [
        "Le texte est ajouté par-dessus le contenu : s'il existe déjà une numérotation, elle n'est pas remplacée.",
        "Polices standard PDF (Helvetica, Times, Courier) : caractères latins uniquement.",
      ],
      faq: [],
    },
  }),
  pdfTool({
    id: "pdf-protect",
    slug: "proteger-par-mot-de-passe",
    name: "Protéger un PDF par mot de passe",
    shortDescription:
      "Chiffrez un PDF (AES-256) avec un mot de passe d'ouverture et des restrictions d'impression ou de copie.",
    description:
      "Protégez un document confidentiel avec un mot de passe d'ouverture et, si besoin, un mot de passe propriétaire qui contrôle l'impression, la copie, la modification et les annotations. Le chiffrement AES-256 (ou AES-128 pour les anciens lecteurs) est effectué par qpdf, compilé en WebAssembly, sans jamais quitter votre navigateur.",
    icon: "lock",
    keywords: [
      "protéger pdf mot de passe",
      "pdf mot de passe",
      "chiffrer pdf",
      "verrouiller pdf",
      "sécuriser pdf",
      "password protect pdf",
      "crypter pdf",
      "empêcher copie pdf",
      "empêcher impression pdf",
    ],
    seo: {
      title: "Protéger un PDF par mot de passe en ligne (chiffrement AES-256)",
      description:
        "Ajoutez un mot de passe d'ouverture et des restrictions (impression, copie, modification) à un PDF. Chiffrement AES-256 local par qpdf, sans envoi du fichier.",
    },
    related: ["pdf-unlock", "pdf-metadata", "pdf-watermark"],
    featured: true,
    content: {
      steps: [
        "Déposez votre PDF.",
        "Saisissez un mot de passe d'ouverture et, si besoin, un mot de passe propriétaire ; choisissez les autorisations.",
        "Protégez puis téléchargez le PDF chiffré.",
      ],
      limitations: [
        "Les restrictions (impression, copie…) dépendent du bon vouloir du lecteur PDF : seul le mot de passe d'ouverture garantit la confidentialité.",
        "Un mot de passe oublié ne peut pas être récupéré par OUTILIA ni par personne : conservez-le en lieu sûr.",
        "AES-256 nécessite un lecteur compatible PDF 1.7 (tous les lecteurs récents).",
      ],
      faq: [
        {
          question:
            "Quelle différence entre le mot de passe d'ouverture et le mot de passe propriétaire ?",
          answer:
            "Le mot de passe d'ouverture est demandé pour lire le document. Le mot de passe propriétaire permet de lever les restrictions (impression, copie…) ; s'il est vide, il prend la valeur du mot de passe d'ouverture.",
        },
      ],
      privacyNote: QPDF_NOTE,
    },
  }),
  pdfTool({
    id: "pdf-unlock",
    slug: "deverrouiller",
    name: "Déverrouiller un PDF",
    shortDescription:
      "Retirez le mot de passe et les restrictions d'un PDF dont vous connaissez le mot de passe.",
    description:
      "Supprimez la protection d'un PDF que vous êtes autorisé à modifier : saisissez son mot de passe (d'ouverture ou propriétaire) et obtenez une copie non chiffrée, sans restrictions d'impression ni de copie. Le déchiffrement est réalisé par qpdf dans votre navigateur ; le mot de passe n'est jamais transmis.",
    icon: "unlock",
    keywords: [
      "déverrouiller pdf",
      "enlever mot de passe pdf",
      "supprimer mot de passe pdf",
      "retirer protection pdf",
      "pdf protégé",
      "unlock pdf",
      "décrypter pdf",
      "déprotéger pdf",
    ],
    seo: {
      title: "Déverrouiller un PDF protégé par mot de passe (avec le mot de passe)",
      description:
        "Retirez le mot de passe et les restrictions d'un PDF dont vous connaissez le mot de passe. Déchiffrement local par qpdf, aucun envoi de fichier ni de mot de passe.",
    },
    related: ["pdf-protect", "pdf-check", "pdf-metadata"],
    content: {
      steps: [
        "Déposez le PDF protégé.",
        "Saisissez son mot de passe et confirmez que vous êtes autorisé à retirer la protection.",
        "Déverrouillez puis téléchargez la copie non chiffrée.",
      ],
      limitations: [
        "Cet outil ne casse pas les mots de passe : sans le bon mot de passe, le document reste verrouillé.",
        "Il est réservé aux documents dont vous êtes l'auteur ou que vous avez le droit de modifier.",
      ],
      faq: [
        {
          question: "J'ai oublié le mot de passe, pouvez-vous l'ouvrir ?",
          answer:
            "Non. Un PDF chiffré en AES ne peut pas être ouvert sans son mot de passe, et OUTILIA ne propose aucune attaque par force brute. Contactez l'auteur du document.",
        },
      ],
      privacyNote: QPDF_NOTE,
    },
  }),
  pdfTool({
    id: "pdf-check",
    slug: "verifier-reparer",
    name: "Vérifier et réparer un PDF",
    shortDescription:
      "Diagnostiquez la structure d'un PDF (erreurs de syntaxe, chiffrement, version) et obtenez une copie réécrite quand c'est possible.",
    description:
      "Un PDF qui ne s'ouvre pas ou s'affiche mal ? Cet outil vérifie sa structure avec qpdf : version, chiffrement, erreurs de syntaxe et de flux. Lorsque le fichier reste lisible malgré des avertissements, une copie réécrite avec des tables propres est proposée. L'outil dit clairement ce qu'il détecte et ce qu'il ne peut pas réparer.",
    icon: "file-check",
    keywords: [
      "réparer pdf",
      "pdf corrompu",
      "pdf endommagé",
      "vérifier pdf",
      "pdf ne s'ouvre pas",
      "repair pdf",
      "analyser pdf",
      "pdf illisible",
    ],
    seo: {
      title: "Vérifier et réparer un PDF endommagé en ligne (diagnostic honnête)",
      description:
        "Analysez la structure d'un PDF avec qpdf : erreurs de syntaxe, chiffrement, version. Copie réécrite proposée quand la réparation est possible. Traitement local.",
    },
    related: ["pdf-unlock", "pdf-metadata", "pdf-compress"],
    content: {
      steps: [
        "Déposez le PDF à analyser.",
        "Lisez le diagnostic : version, chiffrement, avertissements et erreurs.",
        "Si une copie réparée est proposée, téléchargez-la et vérifiez-la.",
      ],
      limitations: [
        "La réparation reconstruit les tables de références et les objets mal formés ; elle ne recrée pas un contenu absent ou tronqué.",
        "Un fichier dont l'en-tête ou la fin est manquante peut être irrécupérable.",
        "Un document chiffré doit être déverrouillé pour une analyse complète.",
      ],
      faq: [],
      privacyNote: QPDF_NOTE,
    },
  }),
  pdfTool({
    id: "pdf-metadata",
    slug: "metadonnees",
    name: "Métadonnées d'un PDF",
    shortDescription:
      "Affichez, modifiez ou supprimez les métadonnées d'un PDF (titre, auteur, logiciel, dates).",
    description:
      "Consultez les informations cachées d'un PDF : titre, auteur, sujet, mots-clés, logiciel de création, producteur, dates et métadonnées XMP. Modifiez les champs utiles ou supprimez tout d'un clic avant de partager un document, pour ne laisser aucune trace de l'auteur ou du logiciel utilisé.",
    icon: "info",
    keywords: [
      "métadonnées pdf",
      "supprimer métadonnées pdf",
      "auteur pdf",
      "modifier titre pdf",
      "propriétés pdf",
      "pdf metadata",
      "anonymiser pdf",
      "informations cachées pdf",
      "exif pdf",
    ],
    seo: {
      title: "Voir, modifier et supprimer les métadonnées d'un PDF en ligne",
      description:
        "Affichez les métadonnées d'un PDF (auteur, titre, logiciel, dates, XMP), modifiez-les ou supprimez-les avant partage. Traitement local, aucun envoi de fichier.",
    },
    related: ["pdf-protect", "pdf-check", "image-exif"],
    content: {
      steps: [
        "Déposez votre PDF : les métadonnées s'affichent.",
        "Modifiez les champs ou choisissez « Supprimer toutes les métadonnées ».",
        "Téléchargez le PDF mis à jour.",
      ],
      limitations: [
        "La suppression concerne le dictionnaire d'informations et les flux XMP du document et des pages. Les informations contenues dans les images (EXIF), le texte ou les annotations ne sont pas modifiées.",
        "Les dates affichées sont celles déclarées par le fichier, pas celles du système.",
      ],
      faq: [],
    },
  }),
  pdfTool({
    id: "pdf-links",
    slug: "extraire-les-liens",
    name: "Extraire les liens d'un PDF",
    shortDescription:
      "Listez tous les liens cliquables, adresses web et e-mails d'un PDF, page par page, en TXT ou CSV.",
    description:
      "Récupérez en une fois toutes les adresses contenues dans un document : liens cliquables (annotations), URL et adresses e-mail écrites dans le texte, avec le numéro de page de chacune. Pratique pour vérifier les références d'un rapport, auditer les liens d'une brochure ou récupérer les contacts d'une liste. Export en texte ou CSV.",
    icon: "link",
    keywords: [
      "extraire liens pdf",
      "liens d'un pdf",
      "urls pdf",
      "extraire emails pdf",
      "adresses mail pdf",
      "lister les liens",
      "pdf links",
      "hyperliens pdf",
    ],
    seo: {
      title: "Extraire les liens et e-mails d'un PDF en ligne (TXT, CSV)",
      description:
        "Listez les liens cliquables, URL et adresses e-mail d'un PDF avec leur page, puis exportez en TXT ou CSV. Traitement local, sans envoi de fichier.",
    },
    outputFormats: ["text/plain", "text/csv"],
    related: ["pdf-extract-text", "pdf-search", "pdf-metadata"],
    content: {
      steps: [
        "Déposez votre PDF : liens et texte sont analysés.",
        "Filtrez (liens cliquables seulement, une seule fois par adresse).",
        "Copiez ou téléchargez la liste en TXT ou CSV.",
      ],
      limitations: [
        "Les liens internes (vers une autre page du même document) sont comptés mais pas listés.",
        "Les adresses d'un document scanné ne sont pas détectables sans OCR.",
        "Une URL coupée sur deux lignes dans le texte peut être tronquée.",
      ],
      faq: [],
    },
  }),
  pdfTool({
    id: "pdf-extract-images",
    slug: "extraire-les-images",
    name: "Extraire les images d'un PDF",
    shortDescription:
      "Récupérez les photos et illustrations intégrées dans un PDF dans leur qualité d'origine (JPG, PNG).",
    description:
      "Extrayez les images incorporées dans un PDF sans les recompresser : les JPEG sont copiés tels quels, les autres formats sont convertis en PNG sans perte, transparence comprise. Filtrez les icônes et séparateurs minuscules, prévisualisez chaque image et téléchargez-les une par une ou en ZIP.",
    icon: "images",
    keywords: [
      "extraire images pdf",
      "récupérer images d'un pdf",
      "pdf vers jpg images",
      "images intégrées pdf",
      "sauvegarder image pdf",
      "extract images pdf",
      "photos d'un pdf",
    ],
    seo: {
      title: "Extraire les images d'un PDF en ligne (qualité d'origine, ZIP)",
      description:
        "Récupérez les photos et illustrations incorporées dans un PDF sans recompression, en JPG ou PNG, avec prévisualisation et téléchargement ZIP. Traitement local.",
    },
    outputFormats: ["image/jpeg", "image/png"],
    related: ["pdf-to-images", "pdf-from-images", "image-compress"],
    content: {
      steps: [
        "Déposez votre PDF.",
        "Choisissez la taille minimale des images à conserver.",
        "Prévisualisez puis téléchargez les images (ZIP si plusieurs).",
      ],
      limitations: [
        "Les images en fax CCITT ou JBIG2 (certains scanners) et les dessins vectoriels ne sont pas extraits : utilisez « PDF vers images » pour obtenir le rendu des pages.",
        "Les images JPEG 2000 sont fournies au format .jp2, peu lu par les navigateurs.",
        "Un masque de transparence JPEG n'est pas conservé (image fournie sans sa transparence).",
      ],
      faq: [
        {
          question: "Quelle différence avec « PDF vers images » ?",
          answer:
            "« PDF vers images » photographie chaque page entière à une résolution choisie. Cet outil récupère les fichiers image d'origine incorporés dans le PDF, à leur résolution native, sans le texte ni la mise en page.",
        },
      ],
    },
  }),
  pdfTool({
    id: "pdf-compare",
    slug: "comparer-deux-pdf",
    name: "Comparer deux PDF",
    shortDescription:
      "Repérez les différences de texte entre deux versions d'un PDF, page par page, ajouts en vert et suppressions en rouge.",
    description:
      "Comparez deux versions d'un contrat, d'un devis, d'un rapport ou d'un article : le texte de chaque page est extrait puis confronté, mot par mot ou ligne par ligne, avec les ajouts surlignés en vert et les suppressions en rouge. Un résumé indique les pages modifiées, ajoutées ou supprimées, et le rapport se télécharge en texte.",
    icon: "diff",
    keywords: [
      "comparer deux pdf",
      "différence entre deux pdf",
      "comparer versions pdf",
      "diff pdf",
      "pdf compare",
      "comparer contrats",
      "comparaison de documents",
      "trouver les modifications pdf",
    ],
    seo: {
      title: "Comparer deux PDF en ligne et voir les différences (texte)",
      description:
        "Comparez le texte de deux PDF page par page : ajouts en vert, suppressions en rouge, pages modifiées, rapport téléchargeable. Traitement local, sans envoi.",
    },
    limits: { maxFileSizeBytes: 100 * 1024 * 1024, maxFileCount: 2, maxPageCount: 500 },
    related: ["text-diff", "pdf-extract-text", "pdf-metadata"],
    featured: true,
    content: {
      steps: [
        "Déposez le document original, puis le document modifié.",
        "Choisissez la granularité (mots, lignes, caractères).",
        "Parcourez les pages modifiées ou téléchargez le rapport.",
      ],
      limitations: [
        "Comparaison du texte uniquement : images, mise en page, polices et couleurs ne sont pas comparées.",
        "Les pages sont comparées par numéro : une page insérée décale les suivantes, qui apparaissent alors comme modifiées.",
        "Les documents scannés n'ont pas de texte : passez-les d'abord par l'OCR.",
      ],
      faq: [],
    },
  }),
  pdfTool({
    id: "pdf-redact",
    slug: "caviarder",
    name: "Caviarder un PDF (supprimer des informations)",
    shortDescription:
      "Masquez définitivement des noms, numéros ou zones d'un PDF : le texte caché est réellement supprimé, pas seulement recouvert.",
    description:
      "Supprimez pour de bon des informations sensibles d'un PDF avant de le partager : recherchez un mot, un nom ou un numéro pour marquer toutes ses occurrences, dessinez des rectangles sur les zones à masquer, puis générez le document caviardé. Les pages concernées sont converties en image avec les zones noircies : le texte d'origine n'existe plus dans le fichier, contrairement à un simple rectangle noir posé par-dessus. Les métadonnées sont également supprimées.",
    icon: "eraser",
    keywords: [
      "caviarder pdf",
      "caviardage pdf",
      "masquer texte pdf",
      "supprimer informations pdf",
      "anonymiser pdf",
      "noircir pdf",
      "redact pdf",
      "rgpd pdf",
      "cacher nom pdf",
      "expurger pdf",
    ],
    seo: {
      title: "Caviarder un PDF en ligne : supprimer définitivement du texte",
      description:
        "Masquez des noms, numéros et zones d'un PDF de façon irréversible (texte réellement supprimé, pas recouvert), métadonnées effacées. Traitement local, sans envoi.",
    },
    related: ["pdf-metadata", "pdf-protect", "pdf-search"],
    featured: true,
    content: {
      steps: [
        "Déposez le PDF ; recherchez un mot pour marquer automatiquement ses occurrences ou dessinez des rectangles sur les pages.",
        "Vérifiez les zones (un clic sur une zone la retire) et choisissez la résolution de sortie.",
        "Générez le PDF caviardé, puis relisez-le avant de le partager.",
      ],
      limitations: [
        "Les pages caviardées deviennent des images : leur texte n'est plus sélectionnable ni recherchable (c'est le but). Les autres pages restent intactes.",
        "La recherche automatique ne couvre que le texte réel du PDF : sur un scan, dessinez les zones à la main.",
        "Le poids du fichier peut augmenter (images à 150-300 dpi).",
        "Vérifiez toujours le résultat : l'outil ne peut pas deviner ce qui est sensible.",
      ],
      faq: [
        {
          question: "Pourquoi convertir les pages en image ?",
          answer:
            "Un rectangle noir dessiné par-dessus laisse le texte dans le fichier : il reste copiable et recherchable. En remplaçant la page par son rendu avec les zones noircies, le contenu masqué disparaît réellement du PDF. C'est l'approche la plus sûre réalisable dans un navigateur.",
        },
      ],
    },
  }),
];
