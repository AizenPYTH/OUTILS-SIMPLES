/**
 * Editorial guides (tutorials). Each guide is written by hand, provides real
 * instructions and links naturally to the relevant tool. Keep this list short
 * and useful: no automated or thin articles.
 */
export interface GuideSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  /** Tool id this guide is about (for the CTA and related links). */
  toolId: string;
  intro: string;
  sections: GuideSection[];
  publishedAt: string;
  updatedAt: string;
}

export const guides: readonly Guide[] = [
  {
    slug: "comment-fusionner-des-pdf",
    title: "Comment fusionner plusieurs fichiers PDF en un seul",
    seoTitle: "Comment fusionner des PDF en un seul fichier (guide pas à pas)",
    description:
      "Rassembler plusieurs PDF en un document unique, dans le bon ordre, sans installer de logiciel et sans envoyer vos fichiers sur un serveur.",
    toolId: "pdf-merge",
    publishedAt: "2026-10-25",
    updatedAt: "2026-10-25",
    intro:
      "Un dossier à envoyer en une seule pièce jointe, des factures à archiver ensemble, des chapitres scannés séparément : fusionner des PDF est l'une des manipulations les plus courantes. Voici comment le faire proprement, et ce qu'il faut vérifier avant d'envoyer le résultat.",
    sections: [
      {
        heading: "Préparer les fichiers",
        paragraphs: [
          "Rassemblez d'abord tous les PDF dans un même dossier et renommez-les si leur ordre compte (par exemple 01-couverture.pdf, 02-sommaire.pdf). Vérifiez qu'aucun n'est protégé par un mot de passe : un PDF verrouillé ne peut pas être fusionné tant qu'il n'est pas déverrouillé par son propriétaire.",
        ],
      },
      {
        heading: "Fusionner dans le navigateur",
        paragraphs: [
          "Avec l'outil Fusionner des PDF d'OUTILIA, la procédure tient en trois étapes :",
        ],
        list: [
          "Déposez vos fichiers dans la zone prévue (ou cliquez pour les sélectionner). Vous pouvez en ajouter d'autres ensuite.",
          "Réorganisez-les par glisser-déposer ou avec les flèches. L'ordre affiché est l'ordre final.",
          "Cliquez sur « Fusionner », puis téléchargez le document obtenu.",
        ],
      },
      {
        heading: "Ce qu'il faut savoir",
        paragraphs: [
          "Les pages sont copiées telles quelles : aucune recompression, aucune perte de qualité. Les formats de page différents (A4, lettre, paysage) sont conservés. En revanche, les signets de chaque fichier ne sont pas reportés dans le document fusionné.",
          "Le traitement a lieu entièrement dans votre navigateur : les fichiers ne transitent par aucun serveur, ce qui est important pour des documents contractuels, médicaux ou comptables.",
        ],
      },
    ],
  },
  {
    slug: "reduire-la-taille-d-un-pdf",
    title: "Comment réduire la taille d'un fichier PDF",
    seoTitle: "Réduire la taille d'un PDF : ce qui marche vraiment",
    description:
      "Comprendre d'où vient le poids d'un PDF et choisir la bonne méthode de compression sans dégrader inutilement le document.",
    toolId: "pdf-compress",
    publishedAt: "2026-10-25",
    updatedAt: "2026-10-25",
    intro:
      "Un PDF « trop lourd » pour une messagerie ou un portail administratif, c'est presque toujours une affaire d'images. Avant de compresser à l'aveugle, il vaut mieux comprendre ce qui pèse et ce que chaque méthode modifie.",
    sections: [
      {
        heading: "D'où vient le poids d'un PDF ?",
        paragraphs: [
          "Le texte et les dessins vectoriels pèsent très peu. Ce qui alourdit un PDF, ce sont les images (photos, scans, captures) et, plus rarement, des polices entières incorporées ou des objets devenus inutiles après plusieurs modifications.",
          "Un document scanné est une suite d'images pleine page : c'est le cas le plus favorable à la compression. Un rapport rédigé dans un traitement de texte, sans photo, est déjà compact et ne gagnera presque rien.",
        ],
      },
      {
        heading: "Les trois niveaux proposés par OUTILIA",
        paragraphs: [
          "L'outil Compresser un PDF propose trois niveaux correspondant à des traitements réellement différents :",
        ],
        list: [
          "Structure seule : réécriture du fichier avec des flux d'objets et suppression des objets non référencés. Aucune image n'est touchée, aucune perte.",
          "Équilibré : en plus du nettoyage, les images JPEG et les images non compressées sont réencodées en JPEG de bonne qualité et limitées à 1 600 px de côté.",
          "Maximal : même principe avec une qualité plus faible et une limite de 1 200 px. Le gain est plus fort, la dégradation des images visible en zoomant.",
        ],
      },
      {
        heading: "Vérifier le résultat",
        paragraphs: [
          "Comparez toujours la taille avant / après affichée par l'outil, puis ouvrez le fichier pour contrôler les pages contenant des images. Si une image recompressée serait plus lourde que l'originale, OUTILIA conserve l'originale : il peut donc arriver qu'un fichier déjà optimisé ne diminue pas, et l'outil vous le dit plutôt que de produire un faux gain.",
        ],
      },
    ],
  },
  {
    slug: "signer-un-pdf-dans-le-navigateur",
    title: "Comment signer un PDF depuis son navigateur",
    seoTitle: "Signer un PDF dans le navigateur : méthode et limites juridiques",
    description:
      "Apposer une signature manuscrite sur un PDF sans l'imprimer, et comprendre la différence avec une signature électronique qualifiée.",
    toolId: "pdf-sign",
    publishedAt: "2026-10-25",
    updatedAt: "2026-10-25",
    intro:
      "Imprimer, signer, scanner : la boucle classique fait perdre du temps et de la qualité. Vous pouvez apposer votre signature directement sur le PDF, à condition de savoir ce que cette signature vaut et ce qu'elle ne vaut pas.",
    sections: [
      {
        heading: "Apposer la signature",
        paragraphs: ["Avec l'outil Signer un PDF :"],
        list: [
          "Déposez le document et affichez la page à signer.",
          "Cliquez sur « Signature » puis dessinez-la à la souris ou au doigt, ou importez une image PNG/JPEG de votre signature (fond transparent de préférence).",
          "Placez-la sur la page, ajustez sa taille, ajoutez la date avec l'outil texte si nécessaire, puis téléchargez.",
        ],
      },
      {
        heading: "Signature visuelle et signature électronique : la différence",
        paragraphs: [
          "Ce que vous apposez ici est une signature visuelle : une image intégrée au contenu de la page. Elle est souvent acceptée pour des documents du quotidien (devis, attestations, formulaires internes) quand les parties sont d'accord.",
          "Elle n'est en revanche ni une signature électronique avancée ni une signature qualifiée au sens du règlement eIDAS : elle n'identifie pas le signataire de manière certaine et ne scelle pas le document contre des modifications. Pour un acte qui exige ces garanties, passez par un prestataire de signature électronique qualifié.",
        ],
      },
      {
        heading: "Confidentialité",
        paragraphs: [
          "Votre signature est une donnée sensible. Sur OUTILIA, le PDF et l'image de signature ne quittent jamais votre navigateur et rien n'est conservé : fermez l'onglet et il ne reste rien.",
        ],
      },
    ],
  },
  {
    slug: "reorganiser-les-pages-d-un-pdf",
    title: "Comment réorganiser, supprimer ou pivoter les pages d'un PDF",
    seoTitle: "Réorganiser les pages d'un PDF : déplacer, supprimer, pivoter",
    description:
      "Remettre les pages d'un PDF dans le bon ordre, supprimer les pages inutiles et corriger l'orientation d'un scan, en quelques clics.",
    toolId: "pdf-organize",
    publishedAt: "2026-10-25",
    updatedAt: "2026-10-25",
    intro:
      "Un scan recto-verso qui a mélangé l'ordre, une page blanche au milieu d'un dossier, une page en paysage au milieu d'un document portrait : ces défauts se corrigent sans logiciel payant.",
    sections: [
      {
        heading: "Réordonner et supprimer",
        paragraphs: [
          "L'outil Organiser les pages d'un PDF affiche une vignette par page. Faites glisser une vignette pour la déplacer ; cliquez sur la corbeille pour retirer une page. Le numéro affiché sur chaque vignette est toujours le numéro d'origine, ce qui évite de perdre ses repères pendant le tri.",
        ],
      },
      {
        heading: "Corriger l'orientation",
        paragraphs: [
          "Les flèches de rotation font pivoter la page par quarts de tour. La rotation est enregistrée dans l'attribut standard de la page : le contenu n'est pas redessiné, donc aucune perte de qualité. Pour ne faire que de la rotation (toutes les pages, une plage), l'outil Pivoter un PDF est plus direct.",
        ],
      },
      {
        heading: "Exporter",
        paragraphs: [
          "Le PDF exporté correspond exactement à l'arrangement affiché. Les liens internes qui pointaient vers une page supprimée disparaissent avec elle ; les signets ne sont pas conservés.",
        ],
      },
    ],
  },
  {
    slug: "proteger-ses-documents-avec-les-outils-en-ligne",
    title: "Comment protéger ses documents quand on utilise des outils en ligne",
    seoTitle: "Outils PDF en ligne : protéger ses documents sensibles",
    description:
      "Les bonnes questions à se poser avant de déposer un document sur un service en ligne, et ce qui distingue un traitement local d'un envoi sur serveur.",
    toolId: "pdf-edit",
    publishedAt: "2026-10-25",
    updatedAt: "2026-10-25",
    intro:
      "Bulletins de salaire, pièces d'identité, contrats : les documents que l'on manipule le plus souvent sont aussi les plus sensibles. Tous les outils en ligne ne les traitent pas de la même façon.",
    sections: [
      {
        heading: "Traitement local ou envoi sur serveur ?",
        paragraphs: [
          "Beaucoup de services envoient votre fichier sur leurs serveurs, le transforment, puis vous renvoient le résultat et promettent de l'effacer après un délai. Vous dépendez alors de leur sécurité, de leur sous-traitant d'hébergement et de leur bonne foi.",
          "Un traitement local, comme celui d'OUTILIA, fait tout le travail dans votre navigateur : le fichier n'est jamais transmis. Vous pouvez le vérifier en coupant votre connexion après le chargement de la page : les outils continuent de fonctionner.",
        ],
      },
      {
        heading: "Les réflexes utiles",
        paragraphs: [],
        list: [
          "Lisez la politique de confidentialité : où vont les fichiers, combien de temps sont-ils conservés, qui y a accès ?",
          "Préférez les outils qui annoncent un traitement local et dont le code s'appuie sur des bibliothèques open source connues (pdf.js, pdf-lib).",
          "Évitez d'utiliser un ordinateur partagé ou public pour des documents sensibles : le fichier téléchargé reste dans le dossier Téléchargements.",
          "Pour un document vraiment confidentiel, un filigrane « CONFIDENTIEL » rappelle au destinataire les règles de diffusion, sans pour autant empêcher la copie.",
        ],
      },
      {
        heading: "Ce qu'OUTILIA fait et ne fait pas",
        paragraphs: [
          "Tous les outils PDF publiés sur OUTILIA fonctionnent localement, sans compte et sans stockage. Nous n'analysons pas le contenu des documents et les éventuelles statistiques de fréquentation, si elles sont activées, ne contiennent jamais de nom de fichier ni de contenu.",
        ],
      },
    ],
  },
  {
    slug: "convertir-un-document-word-en-pdf-sans-logiciel",
    title: "Convertir un document Word en PDF sans logiciel ni envoi",
    seoTitle: "Convertir un Word (DOCX) en PDF sans logiciel : méthode et limites",
    description:
      "Transformer un fichier .docx en PDF directement dans le navigateur, comprendre ce qui est conservé (structure, images) et ce qui ne l'est pas (mise en page exacte).",
    toolId: "conv-docx-pdf",
    publishedAt: "2026-10-26",
    updatedAt: "2026-10-26",
    intro:
      "Vous devez envoyer un document en PDF, mais Word n'est pas installé sur cet ordinateur, ou vous ne voulez pas déposer un contrat sur un convertisseur en ligne inconnu. Voici comment faire la conversion localement, et comment juger si le résultat convient à votre usage.",
    sections: [
      {
        heading: "Quand la conversion locale suffit",
        paragraphs: [
          "Un courrier, un compte rendu, un CV simple, un mémoire : dès que le document est fait de titres, de paragraphes, de listes, de tableaux simples et d'images, la conversion dans le navigateur donne un PDF propre et lisible partout. La structure est conservée ; la mise en page est régularisée (une colonne, polices standard).",
          "Si le document repose sur une mise en page précise (colonnes multiples, zones de texte, en-têtes élaborés, polices de marque), préférez « Enregistrer au format PDF » dans Word ou LibreOffice : ces logiciels reproduisent la page au pixel près, ce que la conversion locale ne promet pas.",
        ],
      },
      {
        heading: "Convertir dans le navigateur",
        paragraphs: ["Avec l'outil Convertir Word en PDF :"],
        list: [
          "Déposez le fichier .docx (les anciens .doc doivent d'abord être enregistrés en .docx).",
          "Choisissez la police, la taille, le format de page, les marges et la numérotation.",
          "Créez le PDF, lisez les avertissements affichés (éléments ignorés, caractères remplacés) et téléchargez.",
        ],
      },
      {
        heading: "Ce qu'il faut vérifier",
        paragraphs: [
          "Ouvrez le PDF obtenu et parcourez-le : les tableaux ont des colonnes de largeur égale, les images EMF/WMF sont absentes, les en-têtes, pieds de page et notes ne sont pas reproduits. Les avertissements de l'outil listent précisément ce qui a été simplifié : rien n'est abandonné en silence.",
          "Le fichier ne quitte jamais votre appareil : la lecture du .docx (mammoth) et la génération du PDF (pdf-lib) se font dans le navigateur. Vous pouvez enregistrer l'outil pour l'utiliser hors connexion.",
        ],
      },
    ],
  },
  {
    slug: "scanner-un-document-avec-son-telephone",
    title: "Scanner un document avec son téléphone, sans application",
    seoTitle: "Scanner un document avec son téléphone sans application (PDF propre)",
    description:
      "Photographier un document, le redresser, améliorer le contraste et obtenir un PDF multipage directement depuis le navigateur du téléphone.",
    toolId: "scan-document",
    publishedAt: "2026-10-26",
    updatedAt: "2026-10-26",
    intro:
      "Un justificatif à envoyer, un formulaire signé à retourner : le téléphone suffit, à condition de produire un fichier propre et lisible plutôt qu'une photo de travers. Le scanner d'OUTILIA fonctionne dans le navigateur, sans installer d'application ni créer de compte.",
    sections: [
      {
        heading: "Prendre une bonne photo",
        paragraphs: [
          "Posez le document sur un fond contrasté (table sombre pour une feuille blanche), éclairez-le de côté pour éviter les reflets et cadrez-le entièrement. La détection des bords fonctionne mieux quand les quatre coins sont visibles.",
        ],
      },
      {
        heading: "Scanner dans le navigateur",
        paragraphs: ["Avec l'outil Scanner un document :"],
        list: [
          "Autorisez la caméra (le site doit être en HTTPS) et prenez la photo, ou importez une photo existante.",
          "Vérifiez les coins détectés, ajustez-les si besoin : la page est redressée automatiquement.",
          "Choisissez un filtre (couleur, niveaux de gris, noir et blanc) ; les filtres ne sont pas destructifs, vous pouvez changer d'avis.",
          "Ajoutez d'autres pages, puis exportez un PDF multipage ou des images.",
        ],
      },
      {
        heading: "Et le texte ?",
        paragraphs: [
          "Un scan est une image : le texte n'est pas sélectionnable. Si vous devez pouvoir chercher ou copier le contenu, passez le PDF obtenu dans l'outil OCR : une couche de texte invisible est ajoutée, et le document devient recherchable. Sur un téléphone, comptez quelques secondes par page.",
          "Les photos ne sont jamais envoyées : la détection des bords, le redressement et l'export se font sur l'appareil.",
        ],
      },
    ],
  },
  {
    slug: "utiliser-les-outils-hors-connexion",
    title: "Utiliser les outils sans connexion internet",
    seoTitle: "Utiliser les outils PDF et images hors connexion (mode hors ligne)",
    description:
      "Enregistrer un outil sur son appareil pour l'utiliser dans le train, en déplacement ou sur un réseau instable, et connaître les limites du mode hors connexion.",
    toolId: "pdf-merge",
    publishedAt: "2026-10-26",
    updatedAt: "2026-10-26",
    intro:
      "Puisque les outils travaillent dans le navigateur, ils n'ont besoin d'internet que pour se charger. Une fois enregistrés sur l'appareil, ils fonctionnent sans réseau. Voici comment s'y prendre et ce qui reste indisponible.",
    sections: [
      {
        heading: "Enregistrer un outil",
        paragraphs: ["Quand vous êtes connecté :"],
        list: [
          "Ouvrez la page de l'outil (par exemple Fusionner des PDF).",
          "Sous la zone de travail, appuyez sur « Utiliser hors ligne » : le poids à télécharger est indiqué (moteur PDF 4,7 Mo, OCR 17 Mo, polices de l'éditeur 4,2 Mo).",
          "Attendez la mention « Disponible hors ligne ». La page hors connexion liste les outils enregistrés et permet de les retirer.",
        ],
      },
      {
        heading: "Utiliser sans réseau",
        paragraphs: [
          "Ouvrez le site comme d'habitude : les pages enregistrées s'affichent, un bandeau signale que vous êtes hors connexion, et les outils traitent vos fichiers normalement. Une page jamais enregistrée renvoie vers la page hors connexion.",
        ],
      },
      {
        heading: "Limites à connaître",
        paragraphs: [
          "La première visite doit se faire en ligne. Le modèle OCR anglais et les polices autres que Liberation ne sont enregistrés qu'après un premier usage connecté. Le navigateur peut supprimer les fichiers s'il manque d'espace, en navigation privée ou après une longue inactivité (Safari est le plus strict). Les mises à jour du site s'appliquent à la visite connectée suivante.",
        ],
      },
    ],
  },
  {
    slug: "recuperer-le-texte-d-un-pdf-scanne",
    title: "Récupérer le texte d'un PDF scanné (OCR)",
    seoTitle: "Récupérer le texte d'un PDF scanné avec l'OCR, dans le navigateur",
    description:
      "Transformer un scan en PDF recherchable ou en texte modifiable, choisir la langue, juger la qualité de la reconnaissance et corriger les erreurs.",
    toolId: "scan-ocr",
    publishedAt: "2026-10-26",
    updatedAt: "2026-10-26",
    intro:
      "Un contrat reçu en photo, une archive numérisée, un relevé scanné : le texte y est visible mais ni cherchable ni copiable. La reconnaissance optique de caractères (OCR) rend ce texte exploitable, et elle fonctionne ici entièrement dans le navigateur grâce à Tesseract.",
    sections: [
      {
        heading: "Préparer le document",
        paragraphs: [
          "La qualité du résultat dépend de l'image : 300 dpi ou plus, page droite, contraste net. Une photo de téléphone gagne à passer d'abord par « Corriger un document photographié » (redressement, filtre noir et blanc).",
        ],
      },
      {
        heading: "Lancer la reconnaissance",
        paragraphs: ["Avec l'outil OCR :"],
        list: [
          "Déposez l'image ou le PDF scanné et choisissez la langue (français, anglais) : le modèle correspondant (6 à 11 Mo) est téléchargé une fois puis conservé.",
          "Lancez la reconnaissance ; l'orientation de chaque page est détectée, même pour des pages pivotées.",
          "Récupérez le résultat : texte brut à copier, ou PDF recherchable où le texte invisible est aligné sur l'image d'origine.",
        ],
      },
      {
        heading: "Relire et corriger",
        paragraphs: [
          "L'OCR se trompe sur les scans pâles, les polices fantaisie, les tableaux et les chiffres : relisez les passages importants. La confiance moyenne affichée donne un ordre d'idée. Dans le modificateur PDF, l'OCR intégré rend chaque passage reconnu corrigeable directement sur la page.",
          "Pour obtenir un document Word modifiable, convertissez ensuite le PDF recherchable avec « Convertir un PDF en Word ».",
        ],
      },
    ],
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export function getGuidesForTool(toolId: string): Guide[] {
  return guides.filter((g) => g.toolId === toolId);
}
