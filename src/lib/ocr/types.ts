/** OCR result model shared by the engine wrapper, the UI and the searchable-PDF builder. */
import { tr } from "@/lib/i18n/messages";

export type OcrLanguage = "fra" | "eng" | "fra+eng";

export const ocrLanguages: { id: OcrLanguage; label: string }[] = [
  { id: "fra", label: tr("Français") },
  { id: "eng", label: tr("Anglais") },
  { id: "fra+eng", label: tr("Français + anglais") },
];

/**
 * Reading direction of a line as a counter-clockwise rotation of upright
 * text: 0 = left to right, 90 = bottom to top, 180 = upside down, 270 = top
 * to bottom (same convention as a PDF `rotate`).
 */
export type OcrAngle = 0 | 90 | 180 | 270;

/**
 * Which orientations the engine looks for. "auto" runs the upright pass and
 * adds the other passes only when parts of the page stay unreadable;
 * "mixed" always runs 0° and 180°; "mixed-all" runs the four passes.
 */
export type OcrOrientationMode = "auto" | "0" | "90" | "180" | "270" | "mixed" | "mixed-all";

/** Working-copy preprocessing; the original image is never altered. */
export type OcrPreprocessMode = "auto" | "none" | "contrast" | "bw";

export const ocrOrientationModes: { id: OcrOrientationMode; label: string; description: string }[] =
  [
    {
      id: "auto",
      label: tr("Automatique"),
      description: tr(
        "Passe à l'endroit, puis les autres orientations si une partie reste illisible",
      ),
    },
    {
      id: "mixed",
      label: tr("Mixte (0° et 180°)"),
      description: tr("Pour une page avec des zones à l'envers"),
    },
    {
      id: "mixed-all",
      label: tr("Toutes les orientations"),
      description: tr("Quatre passes : plus lent, pour les étiquettes et formulaires"),
    },
    { id: "0", label: tr("À l'endroit (0°)"), description: tr("Une seule passe") },
    { id: "90", label: tr("Tourné à 90°"), description: tr("Texte qui se lit de bas en haut") },
    { id: "180", label: tr("À l'envers (180°)"), description: "" },
    { id: "270", label: tr("Tourné à 270°"), description: tr("Texte qui se lit de haut en bas") },
  ];

export const ocrPreprocessModes: { id: OcrPreprocessMode; label: string; description: string }[] = [
  {
    id: "auto",
    label: tr("Automatique"),
    description: tr("Niveaux de gris, contraste étiré, redressement des lignes"),
  },
  { id: "none", label: tr("Aucun"), description: tr("Image telle quelle") },
  {
    id: "contrast",
    label: tr("Contraste"),
    description: tr("Fond blanchi, texte renforcé (photos, ombres)"),
  },
  {
    id: "bw",
    label: tr("Noir et blanc"),
    description: tr("Seuil automatique (texte imprimé net)"),
  },
];

export interface OcrWord {
  text: string;
  confidence: number;
  /** Axis-aligned bounding box in pixels of the ORIGINAL image (origin top-left). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrLine {
  text: string;
  words: OcrWord[];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Mean word confidence (0–100). */
  confidence: number;
  /** Reading direction in the original image. */
  angle: OcrAngle;
  /** Residual tilt in degrees (counter-clockwise positive) on top of `angle`. */
  skew: number;
  /** Baseline in original-image pixels, from the first to the last glyph. */
  baseline: { x0: number; y0: number; x1: number; y1: number };
  /** The pass (page rotation) that produced this line. */
  pass: OcrAngle;
  /** Tesseract paragraph boundary after this line. */
  paragraphEnd: boolean;
}

export interface OcrPageResult {
  pageIndex: number;
  /** Text in reading order; rotated groups come after the dominant orientation, with a heading. */
  text: string;
  /** Character-weighted mean confidence (0–100). */
  confidence: number;
  lines: OcrLine[];
  /** Pixel size of the original image (the coordinate space of every box). */
  width: number;
  height: number;
  /** Passes actually run. */
  passes: OcrAngle[];
  /** Orientation carrying the most characters. */
  dominantAngle: OcrAngle;
  /** More than one orientation holds a significant share of the text. */
  mixedOrientation: boolean;
  /** Skew (degrees) corrected on the working copy for the upright pass, 0 when none. */
  skewCorrected: number;
}
