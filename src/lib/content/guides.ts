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
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export function getGuidesForTool(toolId: string): Guide[] {
  return guides.filter((g) => g.toolId === toolId);
}
