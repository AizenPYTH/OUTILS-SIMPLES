import type { FontFamily } from "@/lib/pdf/fonts";
import type { DashStyle, RgbColor } from "@/lib/pdf/annotations/types";

export type WorkspaceMode = "editor" | "annotate" | "text" | "sign";

export type WorkspaceTool =
  | "select"
  | "editText"
  | "text"
  | "comment"
  | "pen"
  | "highlight"
  | "underline"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "mask"
  | "image"
  | "signature";

export const modeTools: Record<WorkspaceMode, WorkspaceTool[]> = {
  editor: [
    "select",
    "editText",
    "text",
    "rect",
    "ellipse",
    "line",
    "arrow",
    "pen",
    "highlight",
    "underline",
    "comment",
    "image",
    "signature",
    "mask",
  ],
  annotate: [
    "select",
    "highlight",
    "underline",
    "pen",
    "comment",
    "rect",
    "ellipse",
    "line",
    "arrow",
  ],
  text: ["select", "text"],
  sign: ["select", "signature", "text"],
};

/** Tools that draw one object per drag and hand back to the selection afterwards. */
export const ONE_SHOT_TOOLS: WorkspaceTool[] = [
  "rect",
  "ellipse",
  "line",
  "arrow",
  "highlight",
  "underline",
  "mask",
];

export interface ToolSettings {
  color: RgbColor;
  strokeWidth: number;
  opacity: number;
  dash: DashStyle;
  fontSize: number;
  fontFamily: FontFamily;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  fill: boolean;
  /** Fill colour of shapes (independent from the stroke colour). */
  fillColor: RgbColor;
  /** Background of new text blocks (null = transparent). */
  background: RgbColor | null;
}

export const INK: RgbColor = { r: 0.08, g: 0.09, b: 0.17 };
export const ACCENT_RED: RgbColor = { r: 0.85, g: 0.15, b: 0.16 };
export const SHAPE_BLUE: RgbColor = { r: 0.16, g: 0.2, b: 0.6 };
export const HIGHLIGHT_COLOR: RgbColor = { r: 1, g: 0.92, b: 0.23 };
export const COMMENT_BACKGROUND: RgbColor = { r: 1, g: 0.97, b: 0.75 };
export const MASK_BLACK: RgbColor = { r: 0, g: 0, b: 0 };

export const defaultSettings: ToolSettings = {
  color: INK,
  strokeWidth: 2,
  opacity: 1,
  dash: "solid",
  fontSize: 14,
  fontFamily: "helvetica",
  bold: false,
  italic: false,
  underline: false,
  align: "left",
  fill: false,
  fillColor: { r: 0.93, g: 0.94, b: 1 },
  background: null,
};

/**
 * Default style by intent: a frame, an arrow, a highlight or a mask do not
 * share one look. Applied when the tool is chosen; everything stays editable
 * on the object afterwards.
 */
export const toolDefaults: Partial<Record<WorkspaceTool, Partial<ToolSettings>>> = {
  rect: { color: SHAPE_BLUE, strokeWidth: 2, dash: "solid", fill: false, opacity: 1 },
  ellipse: { color: SHAPE_BLUE, strokeWidth: 2, dash: "solid", fill: false, opacity: 1 },
  line: { color: INK, strokeWidth: 2, dash: "solid", opacity: 1 },
  arrow: { color: ACCENT_RED, strokeWidth: 2.5, dash: "solid", opacity: 1 },
  pen: { color: INK, strokeWidth: 2, dash: "solid", opacity: 1 },
  highlight: { color: HIGHLIGHT_COLOR, opacity: 0.45 },
  underline: { color: ACCENT_RED, strokeWidth: 1.5, dash: "solid", opacity: 1 },
  mask: { color: MASK_BLACK, fill: true, opacity: 1 },
  text: { color: INK, background: null },
  comment: { color: INK, background: COMMENT_BACKGROUND },
};

export const toolLabels: Record<WorkspaceTool, string> = {
  select: "Sélection",
  editText: "Modifier le texte",
  text: "Ajouter du texte",
  comment: "Commentaire",
  pen: "Dessin",
  highlight: "Surligner",
  underline: "Souligner",
  rect: "Rectangle",
  ellipse: "Ellipse",
  line: "Ligne",
  arrow: "Flèche",
  mask: "Masque",
  image: "Image",
  signature: "Signature",
};

export const toolHints: Record<WorkspaceTool, string> = {
  select:
    "Cliquez sur un élément pour le sélectionner ; glissez pour le déplacer ; double-cliquez sur un texte pour le modifier.",
  editText:
    "Cliquez sur un passage du document pour remplacer son texte (même police quand c'est possible).",
  text: "Cliquez sur la page pour placer un texte ; cliquez sur un texte ajouté pour le modifier.",
  comment: "Cliquez sur la page pour ajouter une note sur fond jaune.",
  pen: "Dessinez à main levée sur la page.",
  highlight: "Tracez un rectangle sur la zone à surligner.",
  underline: "Tracez un trait sous le passage à souligner.",
  rect: "Tracez un rectangle, puis réglez contour, remplissage et trait sur l'objet.",
  ellipse: "Tracez une ellipse, puis réglez contour, remplissage et trait sur l'objet.",
  line: "Tracez une ligne ; ses extrémités restent réglables.",
  arrow: "Tracez une flèche du point de départ vers la cible.",
  mask: "Tracez une zone opaque pour masquer visuellement un contenu (les données restent dans le fichier : pour les supprimer, utilisez l'outil Caviarder).",
  image: "Choisissez une image PNG ou JPEG : elle sera placée au centre de la page.",
  signature: "Dessinez, tapez ou importez votre signature, puis placez-la sur la page.",
};

/** Panels of the editor: at most one open at a time (besides the pages panel). */
export type EditorPanel = "ocr" | "document" | "history" | "shortcuts" | "search";

/** Tool groups by intent (docs/DESIGN_PRINCIPES.md § C). */
export const TOOL_GROUPS: { id: string; label: string; tools: WorkspaceTool[] }[] = [
  { id: "select", label: "Sélection", tools: ["select"] },
  { id: "text", label: "Texte", tools: ["editText", "text"] },
  { id: "shapes", label: "Formes", tools: ["rect", "ellipse", "line", "arrow"] },
  { id: "annotate", label: "Annoter", tools: ["pen", "highlight", "underline", "comment"] },
  { id: "insert", label: "Insérer", tools: ["image", "signature"] },
  { id: "mask", label: "Masquer", tools: ["mask"] },
];

/** Single-key shortcuts of the tools (outside text fields). */
export const toolShortcuts: Partial<Record<WorkspaceTool, string>> = {
  select: "V",
  editText: "E",
  text: "T",
  comment: "N",
  pen: "P",
  highlight: "H",
  underline: "U",
  rect: "R",
  ellipse: "O",
  line: "L",
  arrow: "A",
  mask: "M",
  image: "I",
  signature: "S",
};

export const SHORTCUTS: { keys: string; action: string }[] = [
  {
    keys: "Ctrl + Z / Ctrl + Maj + Z",
    action: "Annuler / rétablir (ajouts, textes modifiés, pages)",
  },
  { keys: "Ctrl + D", action: "Dupliquer l'élément sélectionné" },
  { keys: "Ctrl + S", action: "Télécharger le PDF modifié" },
  { keys: "Ctrl + F", action: "Rechercher dans le document" },
  { keys: "Suppr", action: "Supprimer l'élément sélectionné" },
  { keys: "Flèches (+ Maj)", action: "Déplacer l'élément sélectionné de 1 pt (10 pt)" },
  {
    keys: "Entrée / double-clic",
    action: "Modifier le texte sélectionné (sélection d'un mot au double-clic dans le champ)",
  },
  {
    keys: "Échap",
    action: "Terminer la saisie, désélectionner, revenir à Sélection, fermer un panneau",
  },
  { keys: "Page suiv. / Page préc.", action: "Page suivante / précédente" },
  { keys: "Ctrl + molette", action: "Zoom progressif autour du curseur" },
  {
    keys: "Ctrl + / Ctrl − / Ctrl 0",
    action: "Zoom avant / arrière / ajuster à la largeur (aussi sans Ctrl hors d'un champ)",
  },
  {
    keys: "V, E, T, R, O, L, A, P, H, U, N, I, S, M",
    action: "Choisir un outil (voir l'info-bulle de chaque outil)",
  },
  { keys: "?", action: "Afficher cette aide" },
];
