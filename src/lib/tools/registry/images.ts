import type { ToolDefinition } from "../types";

const IMAGE_IN = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/avif", "image/svg+xml"];
const IMAGE_OUT = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_PRIVACY = "Les images sont décodées et traitées par votre navigateur (canvas). Elles ne sont jamais envoyées sur un serveur ; les métadonnées EXIF ne sont pas conservées dans les fichiers produits.";
const batchLimits = { maxFileSizeBytes: 50 * 1024 * 1024, maxFileCount: 50 };

function imageTool(partial: Omit<ToolDefinition, "category" | "status" | "indexable" | "inputFormats" | "outputFormats" | "processing" | "limits" | "featureFlags" | "premium"> & Partial<ToolDefinition>): ToolDefinition {
  return {
    category: "images",
    status: "published",
    indexable: true,
    inputFormats: IMAGE_IN,
    outputFormats: IMAGE_OUT,
    processing: "client",
    limits: batchLimits,
    featureFlags: [],
    premium: false,
    ...partial,
    content: { privacyNote: IMAGE_PRIVACY, ...partial.content },
  };
}

const FORMAT_LIMIT = "Formats lus : JPG, PNG, WebP, GIF (première image), BMP, AVIF, SVG. HEIC et TIFF ne sont pas pris en charge par les navigateurs.";
const EXIF_LIMIT = "Les fichiers produits ne contiennent plus les métadonnées EXIF (orientation, appareil, GPS) : l'orientation est appliquée avant le traitement.";

export const imageTools: readonly ToolDefinition[] = [
  imageTool({
    id: "image-compress",
    slug: "compresser",
    name: "Compresser une image",
    shortDescription: "Réduisez le poids de vos photos JPG, PNG ou WebP, seules ou par lot, en contrôlant la qualité.",
    description:
      "Allégez vos images avant de les envoyer par e-mail, de les publier ou de les stocker : réglez la qualité JPG/WebP, limitez la taille en pixels et traitez jusqu'à 50 images d'un coup. Le gain réel est affiché pour chaque fichier et l'original est conservé si la compression n'apporte rien.",
    icon: "minimize",
    keywords: ["compresser image", "réduire taille photo", "alléger image", "compresser jpg", "compresser png", "réduire poids image", "compress image", "optimiser image", "image trop lourde", "compresser photo en lot"],
    seo: { title: "Compresser une image en ligne (JPG, PNG, WebP) sans envoi de fichier", description: "Réduisez le poids de vos photos JPG, PNG ou WebP en réglant la qualité et la taille, seules ou par lot de 50. Gain affiché par fichier, traitement 100 % local." },
    related: ["image-resize", "image-convert", "pdf-compress"],
    featured: true,
    content: {
      steps: ["Déposez une ou plusieurs images.", "Choisissez le format de sortie, la qualité et une taille maximale en pixels.", "Compressez, vérifiez le gain, puis téléchargez (ZIP si plusieurs fichiers)."],
      limitations: ["La compression JPG/WebP est avec perte : plus la qualité est basse, plus les artefacts sont visibles. Le PNG reste sans perte, le gain y est limité.", FORMAT_LIMIT, EXIF_LIMIT],
      faq: [{ question: "Pourquoi ma PNG n'est-elle pas plus légère ?", answer: "Le PNG est sans perte : le navigateur ne peut pas réduire ses couleurs. Pour une photo, convertissez-la en JPG ou WebP ; pour un logo avec transparence, choisissez WebP." }],
    },
  }),
  imageTool({
    id: "image-resize",
    slug: "redimensionner",
    name: "Redimensionner une image",
    shortDescription: "Changez les dimensions d'une image par largeur, hauteur, pourcentage ou taille maximale, en conservant les proportions.",
    description:
      "Redimensionnez vos images à la taille exacte dont vous avez besoin : largeur ou hauteur cible avec proportions conservées, boîte maximale, pourcentage, ou dimensions exactes. Le rétrécissement est réalisé par étapes pour un rendu net, et le traitement par lot applique le même réglage à toutes les images.",
    icon: "ruler",
    keywords: ["redimensionner image", "changer taille image", "réduire dimensions image", "agrandir image", "resize image", "redimensionner photo", "taille en pixels", "redimensionner en lot"],
    seo: { title: "Redimensionner une image en ligne (pixels, pourcentage, lot)", description: "Changez la taille d'une image par largeur, hauteur, pourcentage ou boîte maximale, proportions conservées, jusqu'à 50 images d'un coup. Gratuit et local." },
    related: ["image-crop", "image-compress", "image-convert"],
    featured: true,
    content: {
      steps: ["Déposez vos images.", "Choisissez la méthode (largeur, hauteur, tenir dans, pourcentage, exact) et le format de sortie.", "Redimensionnez puis téléchargez."],
      limitations: ["L'agrandissement n'ajoute pas de détails : il est désactivé par défaut pour éviter le flou.", "Le mode « Exact » peut déformer l'image si les proportions diffèrent.", FORMAT_LIMIT],
      faq: [],
    },
  }),
  imageTool({
    id: "image-crop",
    slug: "recadrer",
    name: "Recadrer une image",
    shortDescription: "Découpez une zone de votre image, librement ou selon un ratio (carré, 16:9, 4:3, A4…).",
    description:
      "Recadrez une image avec précision : déplacez et redimensionnez la zone directement sur l'aperçu (souris ou doigt), choisissez un ratio prédéfini ou saisissez les coordonnées en pixels, puis exportez en JPG, PNG ou WebP.",
    icon: "crop",
    keywords: ["recadrer image", "rogner image", "couper image", "crop image", "recadrer photo", "découper image", "recadrer en carré", "recadrer 16:9"],
    seo: { title: "Recadrer une image en ligne (libre, carré, 16:9, 4:3)", description: "Recadrez une photo avec une zone ajustable à la souris ou au doigt, ratios prédéfinis et coordonnées en pixels. Export JPG, PNG ou WebP, traitement local." },
    limits: { maxFileSizeBytes: 50 * 1024 * 1024, maxFileCount: 1 },
    related: ["image-resize", "image-rotate", "scan-document"],
    content: {
      steps: ["Déposez une image.", "Ajustez la zone de recadrage sur l'aperçu ou saisissez les valeurs.", "Recadrez puis téléchargez."],
      limitations: ["Une image à la fois.", FORMAT_LIMIT],
      faq: [],
    },
  }),
  imageTool({
    id: "image-convert",
    slug: "convertir",
    name: "Convertir une image (JPG, PNG, WebP)",
    shortDescription: "Convertissez vos images en JPG, PNG ou WebP, à l'unité ou par lot, transparence comprise.",
    description:
      "Changez le format de vos images : PNG vers JPG pour alléger une capture, JPG vers PNG, n'importe quel format vers WebP pour le web, WebP vers PNG ou JPG pour la compatibilité. La transparence est conservée en PNG et WebP, et aplatie sur une couleur de votre choix en JPG.",
    icon: "arrow-right-left",
    keywords: ["convertir image", "png en jpg", "jpg en png", "webp en jpg", "webp en png", "jpg en webp", "png en webp", "convertir en webp", "convert image", "changer format image", "convertisseur image"],
    seo: { title: "Convertir une image en JPG, PNG ou WebP en ligne (PNG en JPG, WebP…)", description: "Convertissez vos images entre JPG, PNG et WebP, à l'unité ou par lot, transparence conservée ou aplatie. Traitement local, sans envoi de fichier." },
    related: ["image-compress", "image-resize", "pdf-from-images"],
    featured: true,
    content: {
      steps: ["Déposez vos images.", "Choisissez le format cible et la qualité ; définissez la couleur de fond pour le JPG.", "Convertissez puis téléchargez."],
      limitations: ["Le JPG ne gère pas la transparence : les zones transparentes sont remplies avec la couleur choisie.", "Les GIF animés ne conservent que leur première image.", FORMAT_LIMIT],
      faq: [{ question: "WebP ou JPG ?", answer: "WebP est 25 à 35 % plus léger à qualité égale et gère la transparence ; tous les navigateurs récents le lisent. Le JPG reste le plus universel (anciens logiciels, imprimeurs)." }],
    },
  }),
  imageTool({
    id: "image-rotate",
    slug: "pivoter-retourner",
    name: "Pivoter ou retourner une image",
    shortDescription: "Faites pivoter vos images de 90°, 180° ou 270° et appliquez un miroir horizontal ou vertical, par lot.",
    description:
      "Corrigez l'orientation de vos photos ou créez un effet miroir : rotation de 90° à droite ou à gauche, demi-tour, retournement horizontal ou vertical, appliqués à une ou plusieurs images en une fois. L'orientation EXIF des photos de smartphone est prise en compte avant la rotation.",
    icon: "flip",
    keywords: ["pivoter image", "tourner image", "retourner image", "rotation image", "miroir image", "flip image", "rotate image", "photo à l'envers", "inverser image"],
    seo: { title: "Pivoter ou retourner une image en ligne (rotation 90°, miroir)", description: "Faites pivoter vos images de 90°, 180° ou 270° et appliquez un miroir horizontal ou vertical, seules ou par lot. Export JPG, PNG, WebP, traitement local." },
    related: ["image-crop", "image-resize", "pdf-rotate"],
    content: {
      steps: ["Déposez vos images.", "Choisissez la rotation et/ou le retournement.", "Appliquez puis téléchargez."],
      limitations: [FORMAT_LIMIT, EXIF_LIMIT],
      faq: [],
    },
  }),
  imageTool({
    id: "image-exif",
    slug: "metadonnees-exif",
    name: "Métadonnées EXIF d'une image",
    shortDescription: "Lisez les métadonnées EXIF d'une photo (appareil, date, GPS) et supprimez-les.",
    description: "",
    icon: "info",
    keywords: ["exif", "métadonnées photo", "supprimer exif", "données gps photo", "exif viewer"],
    seo: { title: "Lire et supprimer les métadonnées EXIF d'une photo", description: "" },
    related: ["image-compress"],
    status: "planned",
    indexable: false,
    content: { steps: [], limitations: [], faq: [] },
  }),
];
