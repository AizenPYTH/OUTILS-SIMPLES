import type { ToolDefinition } from "../types";

export const codeTools: readonly ToolDefinition[] = [
  {
    id: "qr-generate",
    slug: "generateur-qr-code",
    category: "codes",
    name: "Générateur de QR code",
    shortDescription:
      "Créez un QR code pour un lien, un texte, un réseau Wi-Fi ou une fiche contact, en PNG ou SVG.",
    description:
      "Générez un QR code personnalisé en quelques secondes : lien web, texte libre, accès Wi-Fi (nom, mot de passe, sécurité) ou carte de visite vCard. Ajustez la taille, la marge, les couleurs et le niveau de correction d'erreur, prévisualisez le résultat et téléchargez-le en PNG (impression) ou SVG (vectoriel, redimensionnable sans perte).",
    icon: "qr-code",
    keywords: [
      "qr code",
      "générateur qr code",
      "créer qr code",
      "qr code gratuit",
      "qr code wifi",
      "qr code vcard",
      "qr code lien",
      "qr code svg",
      "qr code png",
      "code qr",
    ],
    seo: {
      title: "Générateur de QR code gratuit : lien, texte, Wi-Fi, contact (PNG, SVG)",
      description:
        "Créez un QR code pour une URL, un texte, un réseau Wi-Fi ou une vCard. Taille, marge, couleurs et correction d'erreur réglables, export PNG ou SVG. Local.",
    },
    status: "published",
    indexable: true,
    inputFormats: ["text/plain"],
    outputFormats: ["image/png", "image/svg+xml"],
    processing: "client",
    limits: { maxFileSizeBytes: 0, maxFileCount: 0 },
    featureFlags: [],
    related: ["pdf-from-images", "text-slug"],
    premium: false,
    featured: true,
    content: {
      steps: [
        "Choisissez le type de contenu (lien, texte, Wi-Fi, contact) et remplissez les champs.",
        "Réglez la taille, la marge, les couleurs et la correction d'erreur.",
        "Téléchargez en PNG ou SVG, puis testez-le avec votre téléphone.",
      ],
      limitations: [
        "Le QR code est statique : son contenu est inscrit dans l'image et ne peut pas être modifié après impression (pas de redirection ni de statistiques).",
        "Les contenus très longs donnent des codes denses, à imprimer en grand format.",
        "Le format Wi-Fi est reconnu par Android et iOS 11+ ; la vCard par la plupart des lecteurs de QR code.",
      ],
      faq: [
        {
          question: "Le QR code est-il enregistré sur vos serveurs ?",
          answer:
            "Non. Il est calculé par la bibliothèque open source « qrcode » directement dans votre navigateur ; le contenu (mot de passe Wi-Fi, coordonnées) ne quitte jamais votre appareil.",
        },
      ],
      privacyNote:
        "Le QR code est généré dans votre navigateur. Le contenu encodé (lien, mot de passe Wi-Fi, coordonnées) n'est ni transmis ni conservé.",
    },
  },
  {
    id: "qr-read",
    slug: "lire-un-qr-code",
    category: "codes",
    name: "Lire un QR code depuis une image",
    shortDescription:
      "Décodez un QR code à partir d'une photo ou d'une capture d'écran, sans application : lien, Wi-Fi, texte, contact.",
    description:
      "Vous avez un QR code dans une image, un PDF imprimé ou une capture d'écran et pas de téléphone sous la main ? Déposez l'image (ou photographiez le code) : son contenu est décodé dans votre navigateur et présenté selon son type (lien, réseau Wi-Fi avec mot de passe, carte de visite, e-mail, texte). Le lien n'est jamais ouvert automatiquement.",
    icon: "search",
    keywords: [
      "lire qr code",
      "lecteur qr code en ligne",
      "décoder qr code",
      "scanner qr code image",
      "qr code depuis une photo",
      "lire un qr code sur pc",
      "qr reader",
      "qr code capture d'écran",
    ],
    seo: {
      title: "Lire un QR code en ligne depuis une image ou une capture d'écran",
      description:
        "Décodez un QR code depuis une photo ou une capture d'écran, dans le navigateur : lien, Wi-Fi, texte, vCard. Rien n'est envoyé ni ouvert sans votre accord.",
    },
    status: "published",
    indexable: true,
    inputFormats: ["image/jpeg", "image/png", "image/webp"],
    outputFormats: ["text/plain"],
    processing: "client",
    limits: { maxFileSizeBytes: 50 * 1024 * 1024, maxFileCount: 1 },
    featureFlags: [],
    related: ["qr-generate", "barcode-generate", "scan-document"],
    premium: false,
    content: {
      steps: [
        "Déposez une image contenant le QR code (ou photographiez-le).",
        "Lisez le contenu décodé et son type.",
        "Copiez-le ou ouvrez le lien après l'avoir vérifié.",
      ],
      limitations: [
        "QR codes uniquement : les codes-barres linéaires (EAN, Code 128) et les Data Matrix ne sont pas lus.",
        "Le code doit être net et occuper une part suffisante de l'image ; un code très incliné ou abîmé peut échouer.",
        "Décodage par la bibliothèque open source jsQR, exécutée localement.",
      ],
      faq: [],
    },
  },
  {
    id: "barcode-generate",
    slug: "generateur-code-barres",
    category: "codes",
    name: "Générateur de codes-barres",
    shortDescription:
      "Créez des codes-barres EAN-13, EAN-8, UPC-A, Code 128 et Code 39 en PNG ou SVG, clé de contrôle calculée.",
    description:
      "Générez un code-barres pour une étiquette produit, un inventaire ou un document : EAN-13 et EAN-8 (produits en Europe, clé de contrôle calculée ou vérifiée), UPC-A (Amérique du Nord), Code 128 (texte et logistique, sous-ensembles B et C automatiques) et Code 39. Réglez la largeur des barres, la hauteur, les couleurs et le texte, puis téléchargez en PNG ou en SVG vectoriel.",
    icon: "barcode",
    keywords: [
      "générateur code barre",
      "code-barres en ligne",
      "ean 13",
      "ean13 generator",
      "code 128",
      "code 39",
      "upc",
      "créer un code barre",
      "code barre gratuit",
      "code barre svg",
    ],
    seo: {
      title: "Générateur de codes-barres : EAN-13, Code 128, Code 39 (PNG, SVG)",
      description:
        "Créez des codes-barres EAN-13, EAN-8, UPC-A, Code 128 et Code 39 avec clé de contrôle, couleurs et dimensions réglables, export PNG ou SVG. Local.",
    },
    status: "published",
    indexable: true,
    inputFormats: ["text/plain"],
    outputFormats: ["image/png", "image/svg+xml"],
    processing: "client",
    limits: { maxFileSizeBytes: 0, maxFileCount: 0 },
    featureFlags: [],
    related: ["qr-generate", "qr-read", "pdf-from-images"],
    premium: false,
    content: {
      steps: [
        "Choisissez le type de code et saisissez le contenu.",
        "Ajustez taille, couleurs et texte.",
        "Téléchargez en PNG (impression) ou SVG (vectoriel).",
      ],
      limitations: [
        "Pour vendre un produit en magasin, le préfixe EAN doit être attribué par GS1 : cet outil dessine le code, il n'attribue pas de numéro.",
        "Code 128 limité aux caractères ASCII imprimables (sous-ensemble B) ; Code 39 aux majuscules, chiffres et - . $ / + % espace.",
        "Testez le rendu imprimé avec une douchette : contraste et zone blanche sont indispensables.",
      ],
      faq: [
        {
          question: "EAN-13 ou Code 128 ?",
          answer:
            "EAN-13 est réservé aux produits de grande consommation avec un numéro GS1. Pour un usage interne (inventaire, colis, documents), Code 128 encode n'importe quel texte ASCII de façon compacte.",
        },
      ],
    },
  },
  {
    id: "color-convert",
    slug: "convertisseur-couleurs",
    category: "codes",
    name: "Convertisseur de couleurs et contraste",
    shortDescription:
      "Convertissez une couleur entre HEX, RGB, HSL et CMYK, obtenez ses nuances et vérifiez le contraste WCAG.",
    description:
      "Collez une couleur dans n'importe quel format (HEX, rgb(), hsl(), nom CSS) ou choisissez-la à la pipette : elle est convertie en HEX, RGB, HSL et CMYK, déclinée en nuances plus claires et plus foncées avec sa complémentaire, et son contraste avec un fond est évalué selon les critères WCAG 2.1 (AA, AAA, grand texte, composants).",
    icon: "palette",
    keywords: [
      "convertisseur couleur",
      "hex en rgb",
      "rgb en hex",
      "hsl",
      "cmyk",
      "code couleur",
      "contraste wcag",
      "vérifier contraste",
      "accessibilité couleurs",
      "color picker en ligne",
    ],
    seo: {
      title: "Convertisseur de couleurs HEX, RGB, HSL, CMYK et contraste WCAG",
      description:
        "Convertissez une couleur entre HEX, RGB, HSL et CMYK, générez ses nuances et vérifiez le contraste WCAG 2.1 avec un fond. Instantané, sans envoi de données.",
    },
    status: "published",
    indexable: true,
    inputFormats: ["text/plain"],
    outputFormats: ["text/plain"],
    processing: "client",
    limits: { maxFileSizeBytes: 0, maxFileCount: 0 },
    featureFlags: [],
    related: ["image-palette", "qr-generate", "image-convert"],
    premium: false,
    content: {
      steps: [
        "Saisissez ou choisissez une couleur.",
        "Copiez le format voulu ou une nuance.",
        "Indiquez une couleur de fond pour vérifier le contraste.",
      ],
      limitations: [
        "La conversion CMYK est une approximation sans profil ICC : les valeurs d'impression réelles dépendent de l'imprimeur.",
        "Les noms CSS reconnus se limitent aux plus courants.",
      ],
      faq: [],
    },
  },
  {
    id: "image-palette",
    slug: "palette-couleurs-image",
    category: "codes",
    name: "Extraire la palette de couleurs d'une image",
    shortDescription:
      "Obtenez les couleurs dominantes d'une photo ou d'un logo en HEX et RGB, avec leur part, et exportez-les en variables CSS.",
    description:
      "Déposez une image pour en extraire les couleurs dominantes (de 2 à 12) : chaque teinte est donnée en HEX et RGB avec sa proportion dans l'image, prête à copier ou à exporter en variables CSS pour une charte graphique, une présentation ou un site. L'analyse (quantification par découpe médiane puis k-moyennes) s'exécute dans votre navigateur.",
    icon: "palette",
    keywords: [
      "palette de couleurs",
      "extraire couleurs image",
      "couleurs dominantes",
      "palette depuis une photo",
      "color palette generator",
      "couleurs d'un logo",
      "générateur de palette",
      "hex d'une image",
    ],
    seo: {
      title: "Extraire la palette de couleurs d'une image en ligne (HEX, CSS)",
      description:
        "Obtenez les couleurs dominantes d'une photo ou d'un logo (2 à 12 teintes) en HEX et RGB avec leur proportion, export en variables CSS. Analyse locale, sans envoi.",
    },
    status: "published",
    indexable: true,
    inputFormats: ["image/jpeg", "image/png", "image/webp"],
    outputFormats: ["text/css"],
    processing: "client",
    limits: { maxFileSizeBytes: 50 * 1024 * 1024, maxFileCount: 1 },
    featureFlags: [],
    related: ["color-convert", "image-compress", "image-convert"],
    premium: false,
    content: {
      steps: [
        "Déposez une image.",
        "Ajustez le nombre de couleurs.",
        "Copiez une teinte ou exportez les variables CSS.",
      ],
      limitations: [
        "Les couleurs sont des moyennes de zones : une teinte peu étendue mais importante (un petit logo) peut être absorbée par les couleurs voisines.",
        "L'image est réduite à 320 px pour l'analyse : les détails fins n'influencent pas la palette.",
      ],
      faq: [],
    },
  },
];
