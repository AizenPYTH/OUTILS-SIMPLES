import type { ToolDefinition } from "../types";

export const codeTools: readonly ToolDefinition[] = [
  {
    id: "qr-generate",
    slug: "generateur-qr-code",
    category: "codes",
    name: "Générateur de QR code",
    shortDescription: "Créez un QR code pour un lien, un texte, un réseau Wi-Fi ou une fiche contact, en PNG ou SVG.",
    description:
      "Générez un QR code personnalisé en quelques secondes : lien web, texte libre, accès Wi-Fi (nom, mot de passe, sécurité) ou carte de visite vCard. Ajustez la taille, la marge, les couleurs et le niveau de correction d'erreur, prévisualisez le résultat et téléchargez-le en PNG (impression) ou SVG (vectoriel, redimensionnable sans perte).",
    icon: "qr-code",
    keywords: ["qr code", "générateur qr code", "créer qr code", "qr code gratuit", "qr code wifi", "qr code vcard", "qr code lien", "qr code svg", "qr code png", "code qr"],
    seo: { title: "Générateur de QR code gratuit : lien, texte, Wi-Fi, contact (PNG, SVG)", description: "Créez un QR code pour une URL, un texte, un réseau Wi-Fi ou une vCard. Taille, marge, couleurs et correction d'erreur réglables, export PNG ou SVG. Local." },
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
      steps: ["Choisissez le type de contenu (lien, texte, Wi-Fi, contact) et remplissez les champs.", "Réglez la taille, la marge, les couleurs et la correction d'erreur.", "Téléchargez en PNG ou SVG, puis testez-le avec votre téléphone."],
      limitations: ["Le QR code est statique : son contenu est inscrit dans l'image et ne peut pas être modifié après impression (pas de redirection ni de statistiques).", "Les contenus très longs donnent des codes denses, à imprimer en grand format.", "Le format Wi-Fi est reconnu par Android et iOS 11+ ; la vCard par la plupart des lecteurs de QR code."],
      faq: [{ question: "Le QR code est-il enregistré sur vos serveurs ?", answer: "Non. Il est calculé par la bibliothèque open source « qrcode » directement dans votre navigateur ; le contenu (mot de passe Wi-Fi, coordonnées) ne quitte jamais votre appareil." }],
      privacyNote: "Le QR code est généré dans votre navigateur. Le contenu encodé (lien, mot de passe Wi-Fi, coordonnées) n'est ni transmis ni conservé.",
    },
  },
];
