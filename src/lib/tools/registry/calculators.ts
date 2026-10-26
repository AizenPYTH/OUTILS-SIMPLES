import type { ToolDefinition } from "../types";

const CALC_PRIVACY =
  "Les calculs sont effectués instantanément dans votre navigateur ; aucune valeur saisie n'est transmise ni conservée.";

function calcTool(
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
    category: "calculatrices",
    status: "published",
    indexable: true,
    inputFormats: [],
    outputFormats: [],
    processing: "client",
    limits: { maxFileSizeBytes: 0, maxFileCount: 0 },
    featureFlags: [],
    premium: false,
    ...partial,
    content: { privacyNote: CALC_PRIVACY, ...partial.content },
  };
}

export const calculatorTools: readonly ToolDefinition[] = [
  calcTool({
    id: "calc-percent",
    slug: "pourcentage",
    name: "Calculatrice de pourcentage",
    shortDescription:
      "Calculez X % d'un nombre, la part d'un total, une variation, une remise ou le prix avant hausse.",
    description:
      "Toutes les questions de pourcentage courantes, chacune dans sa propre case : combien font 20 % de 150, quel pourcentage représente 30 sur 150, quelle est l'évolution entre deux valeurs, quel prix après une remise de 30 % et quel était le prix avant une hausse de 20 %. Les résultats se mettent à jour à chaque frappe, virgule ou point acceptés.",
    icon: "percent",
    keywords: [
      "calcul pourcentage",
      "calculer un pourcentage",
      "pourcentage d'un nombre",
      "pourcentage de variation",
      "calcul remise",
      "augmentation en pourcentage",
      "règle de trois",
      "évolution en %",
      "calculatrice pourcentage",
    ],
    seo: {
      title: "Calculatrice de pourcentage en ligne : part, variation, remise",
      description:
        "Calculez X % d'un nombre, la part d'un total, l'évolution entre deux valeurs, une remise ou le prix avant hausse. Résultats instantanés, sans envoi de données.",
    },
    related: ["calc-vat", "calc-units", "calc-dates"],
    featured: true,
    content: {
      steps: [
        "Choisissez la case correspondant à votre question.",
        "Saisissez les valeurs (virgule ou point).",
        "Lisez le résultat, mis à jour instantanément.",
      ],
      limitations: [
        "Les résultats sont arrondis à deux décimales (quatre pour les petites valeurs).",
        "La variation est indéfinie lorsque la valeur de départ est 0.",
      ],
      faq: [
        {
          question: "Comment retrouver un prix HT depuis un prix TTC ?",
          answer:
            "Utilisez la dernière case « Retrouver la valeur avant une variation » avec la variation +20 (ou l'outil TVA, qui gère tous les taux français).",
        },
      ],
    },
  }),
  calcTool({
    id: "calc-vat",
    slug: "tva",
    name: "Calculatrice de TVA",
    shortDescription:
      "Passez du HT au TTC et inversement avec les taux français (20, 10, 5,5, 2,1 %) ou un taux personnalisé.",
    description:
      "Calculez la TVA à partir d'un montant hors taxes, toutes taxes comprises ou du montant de TVA lui-même, avec les taux en vigueur en France (normal, intermédiaire, réduit, super-réduit, DOM) ou un taux libre. Un tableau compare instantanément tous les taux pour le même montant, arrondi au centime.",
    icon: "calculator",
    keywords: [
      "calcul tva",
      "calculatrice tva",
      "ht en ttc",
      "ttc en ht",
      "tva 20",
      "tva 5.5",
      "tva 10",
      "montant tva",
      "prix hors taxe",
      "calculer la tva",
    ],
    seo: {
      title: "Calculatrice de TVA : HT, TTC et montant de TVA (taux français)",
      description:
        "Convertissez HT en TTC et TTC en HT avec les taux de TVA français ou un taux personnalisé, arrondi au centime, comparaison de tous les taux. Gratuit et local.",
    },
    related: ["calc-percent", "calc-units", "doc-text-pdf"],
    featured: true,
    content: {
      steps: [
        "Indiquez le montant connu (HT, TTC ou TVA).",
        "Choisissez le taux.",
        "Lisez HT, TVA et TTC, et comparez les autres taux.",
      ],
      limitations: [
        "Arrondi au centime à chaque étape, comme sur une facture ; la somme de plusieurs lignes peut différer d'un centime d'un calcul global.",
        "Les taux affichés sont ceux de la France métropolitaine et des DOM ; les règles d'application (quel produit, quel taux) ne sont pas traitées.",
      ],
      faq: [],
    },
  }),
  calcTool({
    id: "calc-dates",
    slug: "jours-entre-deux-dates",
    name: "Jours entre deux dates et jours ouvrés",
    shortDescription:
      "Comptez les jours calendaires et ouvrés entre deux dates, ajoutez des jours ouvrés, listez les jours fériés français.",
    description:
      "Calculez la durée entre deux dates en années, mois, jours, semaines et jours ouvrés (lundi à vendredi, jours fériés français déduits, option Alsace-Moselle), trouvez la date obtenue en ajoutant ou retirant un nombre de jours calendaires ou ouvrés (délais légaux, livraison, préavis) et consultez les jours fériés d'une année.",
    icon: "calendar",
    keywords: [
      "jours entre deux dates",
      "calcul jours ouvrés",
      "nombre de jours",
      "compter les jours",
      "date plus jours ouvrés",
      "jours fériés 2026",
      "délai en jours ouvrés",
      "calculatrice de dates",
      "durée entre deux dates",
      "jours ouvrables",
    ],
    seo: {
      title: "Jours entre deux dates et jours ouvrés (fériés français inclus)",
      description:
        "Calculez la durée entre deux dates, les jours ouvrés hors fériés français, ajoutez des jours ouvrés à une date et listez les jours fériés d'une année. Local.",
    },
    related: ["calc-percent", "doc-calendar", "dev-timestamp"],
    featured: true,
    content: {
      steps: [
        "Saisissez les deux dates (la fin est incluse dans le décompte des jours ouvrés).",
        "Choisissez si les jours fériés sont déduits.",
        "Lisez la durée, les jours ouvrés et les fériés comptés.",
      ],
      limitations: [
        "Jours ouvrés = lundi à vendredi. Les « jours ouvrables » (lundi à samedi) ne sont pas proposés.",
        "Jours fériés légaux nationaux uniquement (plus Alsace-Moselle en option) ; ponts, fêtes locales et conventions collectives ne sont pas pris en compte.",
        "Les durées en mois suivent le calendrier (31 janvier + 1 mois = 28 ou 29 février).",
      ],
      faq: [
        {
          question: "La date de fin est-elle comptée ?",
          answer:
            "Dans le nombre de jours calendaires, non (du 1er au 2 = 1 jour). Dans les jours ouvrés, oui : du lundi au vendredi = 5 jours ouvrés, comme on compte habituellement une période de travail.",
        },
      ],
    },
  }),
  calcTool({
    id: "calc-units",
    slug: "convertisseur-unites",
    name: "Convertisseur d'unités",
    shortDescription:
      "Convertissez longueurs, masses, températures, volumes, surfaces, vitesses, données, durées et énergies.",
    description:
      "Un convertisseur pour les unités du quotidien et du travail : mètres et miles, kilos et livres, Celsius et Fahrenheit, litres et gallons, hectares et acres, km/h et nœuds, mégaoctets et gibioctets, heures et semaines, kilowattheures et kilocalories. Le résultat s'affiche dans toutes les unités de la grandeur en même temps.",
    icon: "ruler",
    keywords: [
      "convertisseur d'unités",
      "convertir unités",
      "pouces en cm",
      "miles en km",
      "celsius fahrenheit",
      "livres en kg",
      "gallon en litre",
      "mo en go",
      "nœuds en km/h",
      "kcal en kj",
      "conversion unités",
    ],
    seo: {
      title: "Convertisseur d'unités : longueur, masse, température, données",
      description:
        "Convertissez longueurs, masses, températures, volumes, surfaces, vitesses, données, durées et énergies, avec toutes les unités affichées d'un coup. Gratuit, local.",
    },
    related: ["calc-percent", "calc-vat", "dev-timestamp"],
    content: {
      steps: [
        "Choisissez la grandeur (longueur, masse…).",
        "Saisissez la valeur et les unités de départ et d'arrivée.",
        "Lisez le résultat et le tableau de toutes les unités.",
      ],
      limitations: [
        "Unités de mesure usuelles ; les unités historiques ou régionales (lieue, boisseau…) ne figurent pas.",
        "Volumes US (gallon, tasse) : les unités impériales britanniques diffèrent légèrement.",
        "Précision limitée à 10 chiffres significatifs.",
      ],
      faq: [
        {
          question: "Pourquoi 1 Go n'est-il pas égal à 1 Gio ?",
          answer:
            "Le gigaoctet (Go) vaut 10⁹ octets, le gibioctet (Gio) 2³⁰ = 1 073 741 824 octets. Les fabricants de disques comptent en Go, les systèmes d'exploitation souvent en Gio : d'où les 931 « Go » affichés pour un disque d'1 To.",
        },
      ],
    },
  }),
];
