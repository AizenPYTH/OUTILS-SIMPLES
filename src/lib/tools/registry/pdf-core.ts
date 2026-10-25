import { pdfLimits } from "@/config/limits";
import type { ToolDefinition } from "../types";

const PDF_IN = ["application/pdf"];
const PDF_OUT = ["application/pdf"];

const singlePdfLimits = {
  maxFileSizeBytes: pdfLimits.maxFileSizeBytes,
  maxFileCount: 1,
  maxPageCount: pdfLimits.maxPageCount,
};

const CLIENT_PRIVACY_NOTE =
  "Votre fichier est lu et transformé directement dans votre navigateur grâce à des bibliothèques open source (pdf.js et pdf-lib). Il n'est jamais envoyé sur nos serveurs, ni stocké, ni analysé.";

/** Core PDF suite (first release). Shared constants are exported for the other PDF registries. */
export { PDF_IN, PDF_OUT, singlePdfLimits, CLIENT_PRIVACY_NOTE };
export const pdfCoreTools: readonly ToolDefinition[] = [
  // ---------------------------------------------------------------- PDF
  {
    id: "pdf-edit",
    slug: "modifier",
    category: "pdf",
    name: "Modifier un PDF",
    shortDescription:
      "Ajoutez du texte, des annotations, des formes, des images et une signature sur vos pages PDF.",
    description:
      "L'éditeur PDF d'OUTILIA vous permet d'ajouter du texte, de dessiner à main levée, de surligner, de tracer des formes, d'insérer des images et d'apposer une signature sur n'importe quelle page de votre document. Chaque élément peut être déplacé, redimensionné ou supprimé avant l'export, et le PDF obtenu s'ouvre dans n'importe quel lecteur.",
    icon: "square-pen",
    keywords: [
      "éditer pdf",
      "modifier pdf",
      "editeur pdf",
      "écrire sur un pdf",
      "remplir pdf",
      "annoter",
      "ajouter image pdf",
      "pdf editor",
    ],
    seo: {
      title: "Modifier un PDF en ligne gratuitement : texte, annotations, signature",
      description:
        "Éditeur PDF gratuit : ajoutez texte, surlignages, formes, images et signature sur vos pages. Traitement 100 % local dans le navigateur, sans inscription.",
    },
    status: "published",
    indexable: true,
    inputFormats: PDF_IN,
    outputFormats: PDF_OUT,
    processing: "client",
    limits: singlePdfLimits,
    featureFlags: [],
    related: ["pdf-annotate", "pdf-add-text", "pdf-sign", "pdf-fill-form"],
    premium: false,
    featured: true,
    content: {
      steps: [
        "Déposez votre PDF ou cliquez pour le sélectionner.",
        "Choisissez un outil dans la barre (texte, dessin, surlignage, forme, image, signature) et cliquez sur la page.",
        "Déplacez, redimensionnez ou supprimez vos ajouts ; utilisez Annuler / Rétablir si besoin.",
        "Cliquez sur « Télécharger le PDF » : le fichier est généré localement.",
      ],
      limitations: [
        "Les ajouts sont superposés au contenu existant. L'éditeur ne modifie pas le texte d'origine du document (il ne le remplace ni ne le reformate) : pour masquer un passage, vous pouvez le couvrir d'un rectangle, mais le texte sous-jacent reste présent dans le fichier.",
        "Les documents scannés sont traités comme des images : aucune reconnaissance de caractères (OCR) n'est effectuée.",
        "Les polices disponibles sont les polices standard PDF (Helvetica, Times, Courier). Les caractères latins accentués sont pris en charge ; les alphabets non latins et les emojis ne le sont pas.",
        "Les fichiers protégés par mot de passe doivent être déverrouillés avant utilisation.",
      ],
      faq: [
        {
          question: "Puis-je modifier le texte existant d'un PDF ?",
          answer:
            "Non. Un PDF ne stocke pas le texte comme un traitement de texte : modifier fidèlement le texte d'origine en conservant la mise en page nécessite un moteur spécialisé. OUTILIA ajoute de nouveaux éléments par-dessus le document et vous indique clairement cette limite plutôt que de prétendre remplacer le texte.",
        },
        {
          question: "Le PDF modifié est-il compatible avec tous les lecteurs ?",
          answer:
            "Oui. Les éléments ajoutés sont intégrés au contenu des pages de manière standard, et le fichier s'ouvre dans Adobe Reader, Aperçu, Chrome, Firefox ou tout autre lecteur PDF.",
        },
      ],
      privacyNote: CLIENT_PRIVACY_NOTE,
    },
  },
  {
    id: "pdf-merge",
    slug: "fusionner",
    category: "pdf",
    name: "Fusionner des PDF",
    shortDescription:
      "Combinez plusieurs fichiers PDF en un seul document, dans l'ordre de votre choix.",
    description:
      "Rassemblez plusieurs PDF en un seul fichier. Ajoutez vos documents, réorganisez-les par glisser-déposer, retirez ceux dont vous n'avez plus besoin, puis téléchargez le PDF fusionné. Toutes les pages, leurs dimensions et leurs rotations sont conservées.",
    icon: "merge",
    keywords: [
      "fusionner pdf",
      "assembler pdf",
      "combiner pdf",
      "regrouper pdf",
      "joindre pdf",
      "concaténer",
      "merge pdf",
      "réunir plusieurs pdf",
    ],
    seo: {
      title: "Fusionner des PDF en ligne gratuitement et sans envoi de fichiers",
      description:
        "Fusionnez plusieurs PDF en un seul document en quelques secondes, dans l'ordre de votre choix. Traitement local dans le navigateur, gratuit et sans inscription.",
    },
    status: "published",
    indexable: true,
    inputFormats: PDF_IN,
    outputFormats: PDF_OUT,
    processing: "client",
    limits: {
      maxFileSizeBytes: pdfLimits.maxFileSizeBytes,
      maxFileCount: pdfLimits.maxFileCount,
    },
    featureFlags: [],
    related: ["pdf-split", "pdf-organize", "pdf-compress"],
    premium: false,
    featured: true,
    content: {
      steps: [
        "Ajoutez deux fichiers PDF ou plus (glisser-déposer ou sélection).",
        "Réorganisez-les en les faisant glisser ; retirez ceux que vous ne voulez pas inclure.",
        "Cliquez sur « Fusionner » puis téléchargez le document obtenu.",
      ],
      limitations: [
        "Les fichiers protégés par mot de passe ne peuvent pas être fusionnés tant qu'ils ne sont pas déverrouillés.",
        "Les formulaires interactifs sont conservés page par page, mais des champs portant le même nom dans plusieurs fichiers peuvent entrer en conflit.",
        `Jusqu'à ${pdfLimits.maxFileCount} fichiers par fusion.`,
      ],
      faq: [
        {
          question: "L'ordre des fichiers est-il respecté ?",
          answer:
            "Oui. Le document final suit exactement l'ordre affiché dans la liste. Vous pouvez le modifier à tout moment par glisser-déposer ou avec les flèches avant de lancer la fusion.",
        },
        {
          question: "La qualité des pages est-elle modifiée ?",
          answer:
            "Non. Les pages sont copiées telles quelles, sans recompression ni redimensionnement.",
        },
      ],
      privacyNote: CLIENT_PRIVACY_NOTE,
    },
  },
  {
    id: "pdf-split",
    slug: "diviser",
    category: "pdf",
    name: "Diviser un PDF",
    shortDescription:
      "Découpez un PDF en plusieurs fichiers selon des plages de pages que vous définissez.",
    description:
      "Divisez un document PDF en plusieurs fichiers : indiquez des plages de pages (par exemple « 1-3, 4-6, 10 »), choisissez d'obtenir un fichier par plage ou un seul fichier regroupant les pages retenues, vérifiez l'aperçu puis téléchargez le résultat, individuellement ou dans une archive ZIP.",
    icon: "scissors",
    keywords: [
      "diviser pdf",
      "séparer pdf",
      "découper pdf",
      "couper pdf",
      "scinder pdf",
      "split pdf",
      "extraire plage de pages",
    ],
    seo: {
      title: "Diviser un PDF en ligne : séparer un PDF en plusieurs fichiers",
      description:
        "Découpez un PDF en plusieurs documents à partir de plages de pages, avec aperçu et validation. Téléchargement individuel ou en ZIP. 100 % local, gratuit.",
    },
    status: "published",
    indexable: true,
    inputFormats: PDF_IN,
    outputFormats: ["application/pdf", "application/zip"],
    processing: "client",
    limits: singlePdfLimits,
    featureFlags: [],
    related: ["pdf-extract-pages", "pdf-merge", "pdf-organize"],
    premium: false,
    featured: true,
    content: {
      steps: [
        "Déposez votre PDF : le nombre de pages et un aperçu s'affichent.",
        "Saisissez vos plages de pages (ex. « 1-3, 5, 8-10 ») ou choisissez un découpage automatique (une page par fichier, toutes les N pages).",
        "Choisissez « un fichier par plage » ou « un seul fichier ».",
        "Vérifiez l'aperçu de chaque fichier à produire, puis téléchargez.",
      ],
      limitations: [
        "Les plages sont validées : un numéro hors document ou une plage inversée est signalé avant tout traitement.",
        "Les signets (bookmarks) du document d'origine ne sont pas reportés dans les fichiers produits.",
      ],
      faq: [
        {
          question: "Que se passe-t-il si deux plages se chevauchent ?",
          answer:
            "En mode « un fichier par plage », chaque plage produit son propre fichier, donc une page peut apparaître dans deux fichiers si vous l'avez demandée deux fois. En mode « un seul fichier », les doublons sont fusionnés et les pages apparaissent une seule fois, dans l'ordre du document.",
        },
      ],
      privacyNote: CLIENT_PRIVACY_NOTE,
    },
  },
  {
    id: "pdf-compress",
    slug: "compresser",
    category: "pdf",
    name: "Compresser un PDF",
    shortDescription:
      "Réduisez le poids d'un PDF en nettoyant sa structure et en recompressant ses images, avec un bilan transparent.",
    description:
      "Allégez vos PDF avant de les envoyer par e-mail ou de les archiver. OUTILIA nettoie la structure du fichier (objets inutilisés, flux d'objets) et, si vous le souhaitez, recompresse les images intégrées à la qualité choisie. Le gain réel est affiché avant le téléchargement : la réduction dépend du contenu du document et n'est jamais garantie.",
    icon: "minimize",
    keywords: [
      "compresser pdf",
      "réduire taille pdf",
      "alléger pdf",
      "diminuer poids pdf",
      "pdf trop lourd",
      "optimiser pdf",
      "compress pdf",
    ],
    seo: {
      title: "Compresser un PDF en ligne : réduire la taille d'un fichier PDF",
      description:
        "Réduisez le poids d'un PDF dans votre navigateur : nettoyage de la structure et recompression des images au choix. Taille avant / après affichée. Gratuit.",
    },
    status: "published",
    indexable: true,
    inputFormats: PDF_IN,
    outputFormats: PDF_OUT,
    processing: "client",
    limits: singlePdfLimits,
    featureFlags: [],
    related: ["pdf-merge", "pdf-split", "pdf-organize"],
    premium: false,
    featured: true,
    content: {
      steps: [
        "Déposez votre PDF.",
        "Choisissez un niveau : « Structure seule » (sans perte), « Équilibré » ou « Maximal » (recompression des images).",
        "Lancez la compression et comparez la taille avant / après.",
        "Téléchargez si le résultat vous convient ; sinon, essayez un autre niveau.",
      ],
      limitations: [
        "Un PDF composé uniquement de texte vectoriel est souvent déjà compact : le gain peut être faible ou nul.",
        "Seules les images JPEG et les images non compressées (Flate) en RVB ou niveaux de gris sont recompressées. Les images avec transparence, masque ou espace colorimétrique spécial sont conservées telles quelles pour éviter toute altération.",
        "Les niveaux « Équilibré » et « Maximal » dégradent la qualité des images (compression JPEG avec perte). Le niveau « Structure seule » ne modifie aucune image.",
        "Les pages ne sont jamais converties en images (pas de pixellisation du texte).",
      ],
      faq: [
        {
          question: "Pourquoi mon PDF n'est-il pas plus petit ?",
          answer:
            "La taille d'un PDF dépend de son contenu. Si le fichier contient surtout du texte et des dessins vectoriels déjà compressés, il reste peu de marge. Si les images sont déjà très compressées, les recompresser peut même augmenter leur poids : dans ce cas OUTILIA conserve l'image d'origine et vous l'indique.",
        },
        {
          question: "Le texte reste-t-il sélectionnable ?",
          answer: "Oui. Le texte et les dessins vectoriels ne sont jamais convertis en images.",
        },
      ],
      privacyNote: CLIENT_PRIVACY_NOTE,
    },
  },
  {
    id: "pdf-organize",
    slug: "organiser",
    category: "pdf",
    name: "Organiser les pages d'un PDF",
    shortDescription: "Réordonnez, faites pivoter ou supprimez des pages à partir de vignettes.",
    description:
      "Réorganisez les pages de votre PDF visuellement : faites glisser les vignettes pour changer l'ordre, supprimez les pages inutiles, faites pivoter celles qui sont dans le mauvais sens, puis exportez un document conforme à l'arrangement affiché.",
    icon: "layout-grid",
    keywords: [
      "organiser pdf",
      "réorganiser pages pdf",
      "déplacer pages pdf",
      "supprimer pages pdf",
      "changer ordre pages pdf",
      "trier pages pdf",
      "reorder pdf",
    ],
    seo: {
      title: "Organiser les pages d'un PDF : réordonner, supprimer, pivoter",
      description:
        "Réorganisez les pages d'un PDF par glisser-déposer, supprimez ou faites pivoter des pages à partir des vignettes, puis exportez. Traitement local, gratuit.",
    },
    status: "published",
    indexable: true,
    inputFormats: PDF_IN,
    outputFormats: PDF_OUT,
    processing: "client",
    limits: singlePdfLimits,
    featureFlags: [],
    related: ["pdf-rotate", "pdf-extract-pages", "pdf-merge"],
    premium: false,
    content: {
      steps: [
        "Déposez votre PDF : les vignettes de toutes les pages apparaissent.",
        "Faites glisser les vignettes pour les réordonner ; utilisez les boutons pour pivoter ou supprimer une page.",
        "Vérifiez l'ordre final puis cliquez sur « Exporter ».",
      ],
      limitations: [
        "Les signets et liens internes qui pointent vers des pages supprimées ne sont pas conservés.",
        `Jusqu'à ${pdfLimits.maxPageCount} pages par document.`,
      ],
      faq: [],
      privacyNote: CLIENT_PRIVACY_NOTE,
    },
  },
  {
    id: "pdf-rotate",
    slug: "rotation",
    category: "pdf",
    name: "Pivoter un PDF",
    shortDescription:
      "Faites pivoter toutes les pages, une sélection ou des pages individuelles de 90°, 180° ou 270°.",
    description:
      "Corrigez l'orientation de vos PDF : faites pivoter l'ensemble du document, une plage de pages ou des pages précises. L'aperçu reflète la rotation appliquée et le fichier exporté s'ouvre correctement orienté dans tous les lecteurs.",
    icon: "rotate-cw",
    keywords: [
      "pivoter pdf",
      "tourner pdf",
      "rotation pdf",
      "retourner pdf",
      "pdf à l'envers",
      "orientation pdf",
      "rotate pdf",
    ],
    seo: {
      title: "Pivoter un PDF en ligne : rotation de pages gratuite",
      description:
        "Faites pivoter les pages d'un PDF (toutes, une plage ou une sélection) de 90°, 180° ou 270° avec aperçu immédiat. Traitement dans le navigateur, gratuit.",
    },
    status: "published",
    indexable: true,
    inputFormats: PDF_IN,
    outputFormats: PDF_OUT,
    processing: "client",
    limits: singlePdfLimits,
    featureFlags: [],
    related: ["pdf-organize", "pdf-merge"],
    premium: false,
    content: {
      steps: [
        "Déposez votre PDF.",
        "Cliquez sur les flèches d'une vignette pour pivoter une page, ou utilisez « Tout pivoter » / une plage de pages.",
        "Exportez le document corrigé.",
      ],
      limitations: [
        "La rotation est appliquée via l'attribut de rotation de la page (méthode standard). Le contenu n'est pas redessiné, ce qui préserve la qualité.",
      ],
      faq: [],
      privacyNote: CLIENT_PRIVACY_NOTE,
    },
  },
  {
    id: "pdf-extract-pages",
    slug: "extraire-pages",
    category: "pdf",
    name: "Extraire des pages d'un PDF",
    shortDescription:
      "Sélectionnez des pages sur les vignettes ou par plage et exportez-les dans un nouveau PDF.",
    description:
      "Extrayez uniquement les pages dont vous avez besoin : cliquez sur les vignettes pour les sélectionner ou saisissez une plage (« 2-4, 7 »), vérifiez la sélection puis téléchargez un nouveau PDF contenant seulement ces pages, dans l'ordre du document.",
    icon: "file-output",
    keywords: [
      "extraire pages pdf",
      "sélectionner pages pdf",
      "récupérer une page pdf",
      "enregistrer une page pdf",
      "extract pdf pages",
      "isoler page pdf",
    ],
    seo: {
      title: "Extraire des pages d'un PDF en ligne gratuitement",
      description:
        "Sélectionnez des pages d'un PDF (vignettes ou plages) et exportez-les dans un nouveau document. Validation des plages, aperçu, traitement local.",
    },
    status: "published",
    indexable: true,
    inputFormats: PDF_IN,
    outputFormats: PDF_OUT,
    processing: "client",
    limits: singlePdfLimits,
    featureFlags: [],
    related: ["pdf-split", "pdf-organize"],
    premium: false,
    content: {
      steps: [
        "Déposez votre PDF.",
        "Cliquez sur les pages à conserver ou saisissez une plage de pages.",
        "Cliquez sur « Extraire » puis téléchargez.",
      ],
      limitations: ["Les pages extraites conservent l'ordre du document d'origine."],
      faq: [],
      privacyNote: CLIENT_PRIVACY_NOTE,
    },
  },
  {
    id: "pdf-add-text",
    slug: "ajouter-texte",
    category: "pdf",
    name: "Ajouter du texte à un PDF",
    shortDescription:
      "Placez du texte où vous voulez sur vos pages : taille, couleur, police et alignement.",
    description:
      "Ajoutez du texte sur un PDF existant : cliquez à l'endroit souhaité, saisissez votre texte, ajustez la police, la taille, la couleur et l'alignement, puis exportez. Idéal pour compléter un document, ajouter une mention ou dater un formulaire non interactif.",
    icon: "type",
    keywords: [
      "ajouter texte pdf",
      "écrire sur pdf",
      "insérer texte pdf",
      "remplir un pdf non modifiable",
      "taper dans un pdf",
      "add text to pdf",
    ],
    seo: {
      title: "Ajouter du texte à un PDF en ligne gratuitement",
      description:
        "Écrivez sur un PDF : placez du texte à la position voulue, choisissez police, taille, couleur et alignement, puis téléchargez. Gratuit et 100 % dans le navigateur.",
    },
    status: "published",
    indexable: true,
    inputFormats: PDF_IN,
    outputFormats: PDF_OUT,
    processing: "client",
    limits: singlePdfLimits,
    featureFlags: [],
    related: ["pdf-edit", "pdf-fill-form", "pdf-annotate"],
    premium: false,
    content: {
      steps: [
        "Déposez votre PDF et ouvrez la page concernée.",
        "Cliquez sur la page à l'endroit où le texte doit apparaître, puis saisissez-le.",
        "Réglez police, taille, couleur et alignement ; déplacez le bloc si nécessaire.",
        "Téléchargez le PDF.",
      ],
      limitations: [
        "Polices disponibles : Helvetica, Times et Courier (polices standard PDF), avec leurs variantes grasse et italique.",
        "Les caractères latins (dont les accents français, €, œ) sont pris en charge. Les alphabets non latins (cyrillique, arabe, chinois…) et les emojis ne peuvent pas être affichés avec ces polices.",
        "Le texte est ajouté par-dessus le document : le texte d'origine n'est pas modifié.",
      ],
      faq: [],
      privacyNote: CLIENT_PRIVACY_NOTE,
    },
  },
  {
    id: "pdf-annotate",
    slug: "annoter",
    category: "pdf",
    name: "Annoter un PDF",
    shortDescription:
      "Surlignez, soulignez, dessinez, commentez et ajoutez des formes sur vos PDF.",
    description:
      "Annotez vos documents PDF : surlignage de zones, soulignement, dessin à main levée, commentaires texte, rectangles, ellipses et flèches. Supprimez une annotation d'un clic, annulez ou rétablissez vos actions, puis exportez un PDF lisible partout.",
    icon: "highlighter",
    keywords: [
      "annoter pdf",
      "surligner pdf",
      "souligner pdf",
      "dessiner sur pdf",
      "commenter pdf",
      "marquer pdf",
      "annotate pdf",
      "highlight pdf",
    ],
    seo: {
      title: "Annoter un PDF en ligne : surligner, dessiner, commenter",
      description:
        "Annotez un PDF gratuitement : surlignage, soulignement, dessin libre, commentaires et formes. Annulation facile, traitement local dans le navigateur.",
    },
    status: "published",
    indexable: true,
    inputFormats: PDF_IN,
    outputFormats: PDF_OUT,
    processing: "client",
    limits: singlePdfLimits,
    featureFlags: [],
    related: ["pdf-edit", "pdf-add-text", "pdf-sign"],
    premium: false,
    content: {
      steps: [
        "Déposez votre PDF.",
        "Choisissez un outil (surligneur, soulignement, crayon, commentaire, forme) et dessinez sur la page.",
        "Sélectionnez une annotation pour la déplacer ou la supprimer.",
        "Téléchargez le PDF annoté.",
      ],
      limitations: [
        "Les annotations sont dessinées dans le contenu des pages (annotations visuelles, « aplaties »). Elles ne sont pas créées comme des annotations PDF natives modifiables dans d'autres logiciels : elles sont visibles partout mais ne peuvent plus être déplacées une fois le fichier exporté.",
        "Le surlignage et le soulignement se font par zone (rectangle ou trait) : il n'y a pas de sélection de texte automatique.",
      ],
      faq: [
        {
          question: "Puis-je modifier mes annotations plus tard ?",
          answer:
            "Pendant la session, oui : tout est modifiable jusqu'à l'export. Une fois le PDF téléchargé, les annotations font partie du contenu des pages et ne sont plus éditables individuellement.",
        },
      ],
      privacyNote: CLIENT_PRIVACY_NOTE,
    },
  },
  {
    id: "pdf-sign",
    slug: "signer",
    category: "pdf",
    name: "Signer un PDF",
    shortDescription:
      "Dessinez ou importez votre signature, placez-la et exportez le document signé.",
    description:
      "Signez un PDF depuis votre navigateur : tracez votre signature à la souris ou au doigt, ou importez une image de signature (PNG, JPEG), positionnez-la et redimensionnez-la sur la page, puis téléchargez. Votre signature ne quitte jamais votre appareil.",
    icon: "pen-line",
    keywords: [
      "signer pdf",
      "signature pdf",
      "apposer signature pdf",
      "signer document en ligne",
      "signature manuscrite pdf",
      "sign pdf",
      "parapher",
    ],
    seo: {
      title: "Signer un PDF en ligne gratuitement : signature manuscrite ou image",
      description:
        "Signez un PDF : dessinez votre signature ou importez une image, placez-la sur la page et téléchargez. Signature visuelle traitée localement, jamais envoyée.",
    },
    status: "published",
    indexable: true,
    inputFormats: PDF_IN,
    outputFormats: PDF_OUT,
    processing: "client",
    limits: singlePdfLimits,
    featureFlags: [],
    related: ["pdf-fill-form", "pdf-edit", "pdf-add-text"],
    premium: false,
    featured: true,
    content: {
      steps: [
        "Déposez le PDF à signer et affichez la page concernée.",
        "Cliquez sur « Signature » : dessinez-la dans la zone prévue ou importez une image.",
        "Placez-la sur la page, ajustez sa taille, ajoutez éventuellement la date en texte.",
        "Téléchargez le document signé.",
      ],
      limitations: [
        "Il s'agit d'une signature visuelle (image apposée sur la page). Ce n'est ni une signature électronique qualifiée au sens du règlement eIDAS, ni une signature numérique cryptographique : elle n'atteste pas de l'identité du signataire et ne protège pas le document contre des modifications ultérieures.",
        "Aucune signature n'est enregistrée : si vous rechargez la page, il faudra la tracer ou l'importer de nouveau.",
      ],
      faq: [
        {
          question: "Cette signature a-t-elle une valeur légale ?",
          answer:
            "Une signature visuelle peut suffire pour de nombreux usages courants lorsque les parties l'acceptent, mais elle n'offre pas les garanties d'une signature électronique avancée ou qualifiée (identification du signataire, intégrité du document). Pour un acte nécessitant ces garanties, utilisez un prestataire de signature électronique qualifié.",
        },
      ],
      privacyNote:
        "Le PDF et votre signature sont traités uniquement dans votre navigateur. Aucune image de signature n'est envoyée ni stockée sur nos serveurs.",
    },
  },
  {
    id: "pdf-watermark",
    slug: "ajouter-filigrane",
    category: "pdf",
    name: "Ajouter un filigrane à un PDF",
    shortDescription:
      "Apposez un texte ou une image en filigrane, avec opacité, rotation, taille et position réglables.",
    description:
      "Protégez ou marquez vos documents avec un filigrane texte (« CONFIDENTIEL », « BROUILLON », votre nom…) ou une image (logo). Réglez l'opacité, la rotation, la taille et la position, choisissez les pages concernées, prévisualisez puis exportez.",
    icon: "droplets",
    keywords: [
      "filigrane pdf",
      "ajouter filigrane",
      "watermark pdf",
      "marquer pdf confidentiel",
      "tampon pdf",
      "logo sur pdf",
      "protéger pdf filigrane",
    ],
    seo: {
      title: "Ajouter un filigrane à un PDF en ligne (texte ou image)",
      description:
        "Ajoutez un filigrane texte ou image à vos PDF : opacité, rotation, taille, position et pages au choix, avec aperçu. Gratuit, traitement local dans le navigateur.",
    },
    status: "published",
    indexable: true,
    inputFormats: PDF_IN,
    outputFormats: PDF_OUT,
    processing: "client",
    limits: singlePdfLimits,
    featureFlags: [],
    related: ["pdf-manage-watermark", "pdf-sign", "pdf-edit"],
    premium: false,
    content: {
      steps: [
        "Déposez votre PDF.",
        "Choisissez « Texte » ou « Image », saisissez le texte ou importez votre logo.",
        "Réglez opacité, rotation, taille, position et pages concernées ; vérifiez l'aperçu.",
        "Exportez le PDF filigrané.",
      ],
      limitations: [
        "Le filigrane est dessiné dans le contenu des pages. OUTILIA y ajoute un marqueur technique qui permet à l'outil « Gérer un filigrane » de le retirer ultérieurement si vous en avez besoin.",
        "Un filigrane visuel n'empêche pas la copie du document : il sert à l'identifier, pas à le verrouiller.",
      ],
      faq: [],
      privacyNote: CLIENT_PRIVACY_NOTE,
    },
  },
  {
    id: "pdf-manage-watermark",
    slug: "gerer-filigrane",
    category: "pdf",
    name: "Gérer un filigrane PDF",
    shortDescription:
      "Retirez un filigrane ajouté avec OUTILIA ou une annotation « filigrane » identifiable, lorsque c'est possible sans altérer le document.",
    description:
      "Cet outil analyse votre PDF et vous indique honnêtement ce qui peut être retiré : les filigranes ajoutés avec OUTILIA (identifiés par leur marqueur technique) et les annotations PDF de type « Watermark » présentes dans le fichier. Lorsqu'un filigrane est fondu dans le contenu ou dans une image de la page, il ne peut pas être supprimé de manière fiable et l'outil vous l'explique au lieu d'abîmer votre document.",
    icon: "eraser",
    keywords: [
      "supprimer filigrane pdf",
      "enlever filigrane",
      "retirer filigrane pdf",
      "gérer filigrane",
      "remove watermark",
    ],
    seo: {
      title: "Gérer ou retirer un filigrane PDF (filigranes OUTILIA et annotations)",
      description:
        "Analysez un PDF et retirez les filigranes ajoutés avec OUTILIA ou les annotations de type filigrane quand c'est possible. Diagnostic honnête, traitement local.",
    },
    status: "published",
    indexable: true,
    inputFormats: PDF_IN,
    outputFormats: PDF_OUT,
    processing: "client",
    limits: singlePdfLimits,
    featureFlags: [],
    related: ["pdf-watermark", "pdf-organize"],
    premium: false,
    content: {
      steps: [
        "Déposez votre PDF : l'outil recherche les filigranes identifiables.",
        "Consultez le diagnostic : filigranes OUTILIA détectés, annotations « Watermark », ou rien de retirable.",
        "Confirmez que vous êtes autorisé à modifier ce document, puis retirez les éléments proposés.",
        "Téléchargez le PDF nettoyé.",
      ],
      limitations: [
        "Seuls deux types d'éléments sont pris en charge : les filigranes ajoutés par OUTILIA (grâce à leur marqueur) et les annotations PDF de sous-type « Watermark ». Un filigrane intégré dans une image, fusionné au contenu ou produit par un autre logiciel sans marqueur ne peut pas être retiré de manière fiable.",
        "Cet outil est destiné à vos propres documents ou à ceux que vous êtes autorisé à modifier. Il ne vise pas à contourner des mentions de droits d'auteur, de propriété ou des protections de documents.",
      ],
      faq: [
        {
          question: "Pourquoi l'outil refuse-t-il de retirer certains filigranes ?",
          answer:
            "Quand un filigrane est dessiné dans le même flux que le texte de la page ou incrusté dans une image, aucune méthode ne permet de le séparer sans risque d'endommager le contenu. Plutôt que de produire un fichier dégradé, OUTILIA vous explique la situation.",
        },
      ],
      privacyNote: CLIENT_PRIVACY_NOTE,
    },
  },
  {
    id: "pdf-fill-form",
    slug: "remplir-formulaire",
    category: "pdf",
    name: "Remplir un formulaire PDF",
    shortDescription:
      "Détectez les champs interactifs d'un formulaire PDF, remplissez-les et exportez.",
    description:
      "Remplissez un formulaire PDF interactif (AcroForm) : OUTILIA détecte les champs texte, cases à cocher, boutons radio et listes déroulantes, vous permet de les compléter dans une interface claire avec aperçu de la page, puis exporte le document rempli, aplati ou non.",
    icon: "clipboard-list",
    keywords: [
      "remplir formulaire pdf",
      "formulaire pdf",
      "compléter pdf",
      "champs pdf",
      "fill pdf form",
      "pdf interactif",
    ],
    seo: {
      title: "Remplir un formulaire PDF en ligne gratuitement",
      description:
        "Remplissez les champs d'un formulaire PDF interactif (texte, cases, listes) dans votre navigateur et téléchargez le résultat, aplati ou non. Sans envoi de fichier.",
    },
    status: "published",
    indexable: true,
    inputFormats: PDF_IN,
    outputFormats: PDF_OUT,
    processing: "client",
    limits: singlePdfLimits,
    featureFlags: [],
    related: ["pdf-add-text", "pdf-sign", "pdf-edit"],
    premium: false,
    content: {
      steps: [
        "Déposez votre formulaire PDF : les champs détectés s'affichent par page.",
        "Complétez les champs ; cliquez sur « Mettre à jour l'aperçu » pour vérifier le rendu.",
        "Choisissez d'aplatir ou non le formulaire, puis téléchargez.",
      ],
      limitations: [
        "Seuls les formulaires interactifs (champs AcroForm) sont pris en charge. Un formulaire scanné ou « aplati » ne contient pas de champs : utilisez alors l'outil « Ajouter du texte ».",
        "Les formulaires XFA (technologie Adobe propriétaire) ne sont pas pris en charge.",
        "Les champs de signature numérique ne peuvent pas être signés ici ; utilisez « Signer un PDF » pour une signature visuelle.",
      ],
      faq: [
        {
          question: "Que signifie « aplatir » le formulaire ?",
          answer:
            "Aplatir convertit les champs en contenu fixe : les valeurs restent visibles mais ne sont plus modifiables. Sans aplatissement, le destinataire peut encore modifier les champs.",
        },
      ],
      privacyNote: CLIENT_PRIVACY_NOTE,
    },
  },
];
