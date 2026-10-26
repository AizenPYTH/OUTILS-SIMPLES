import type { FontFamily } from "@/lib/pdf/fonts";
import type { RgbColor } from "@/lib/pdf/annotations/types";

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
  | "arrow"
  | "image"
  | "signature";

export const modeTools: Record<WorkspaceMode, WorkspaceTool[]> = {
  editor: [
    "select",
    "editText",
    "text",
    "pen",
    "highlight",
    "rect",
    "ellipse",
    "arrow",
    "image",
    "signature",
  ],
  annotate: ["select", "highlight", "underline", "pen", "comment", "rect", "ellipse", "arrow"],
  text: ["select", "text"],
  sign: ["select", "signature", "text"],
};

export interface ToolSettings {
  color: RgbColor;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
  fontFamily: FontFamily;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
  fill: boolean;
}

export const defaultSettings: ToolSettings = {
  color: { r: 0.08, g: 0.09, b: 0.17 },
  strokeWidth: 2,
  opacity: 1,
  fontSize: 14,
  fontFamily: "helvetica",
  bold: false,
  italic: false,
  align: "left",
  fill: false,
};

export const HIGHLIGHT_COLOR: RgbColor = { r: 1, g: 0.92, b: 0.23 };
export const COMMENT_BACKGROUND: RgbColor = { r: 1, g: 0.97, b: 0.75 };

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
  arrow: "Flèche",
  image: "Image",
  signature: "Signature",
};

export const toolHints: Record<WorkspaceTool, string> = {
  select: "Cliquez sur un élément pour le déplacer, le redimensionner ou le supprimer.",
  editText:
    "Cliquez sur un passage du document pour remplacer son texte (même police quand c'est possible).",
  text: "Cliquez sur la page à l'endroit où placer le texte, puis saisissez-le.",
  comment: "Cliquez sur la page pour ajouter une note sur fond jaune.",
  pen: "Dessinez à main levée sur la page.",
  highlight: "Tracez un rectangle sur la zone à surligner.",
  underline: "Tracez un trait sous le passage à souligner.",
  rect: "Tracez un rectangle.",
  ellipse: "Tracez une ellipse.",
  arrow: "Tracez une flèche du point de départ vers la cible.",
  image: "Choisissez une image PNG ou JPEG : elle sera placée au centre de la page.",
  signature: "Dessinez, tapez ou importez votre signature, puis placez-la sur la page.",
};

/** Panels of the editor: at most one open at a time (besides the pages panel). */
export type EditorPanel = "ocr" | "document" | "history" | "shortcuts";

/** Tool groups by intent (docs/DESIGN_PRINCIPES.md § C). */
export const TOOL_GROUPS: { id: string; label: string; tools: WorkspaceTool[] }[] = [
  { id: "select", label: "Sélection", tools: ["select"] },
  { id: "text", label: "Texte", tools: ["editText", "text", "comment"] },
  {
    id: "annotate",
    label: "Annoter",
    tools: ["pen", "highlight", "underline", "rect", "ellipse", "arrow"],
  },
  { id: "insert", label: "Insérer", tools: ["image", "signature"] },
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
  arrow: "A",
  image: "I",
  signature: "S",
};

export const SHORTCUTS: { keys: string; action: string }[] = [
  {
    keys: "Ctrl + Z / Ctrl + Maj + Z",
    action: "Annuler / rétablir (ajouts, textes modifiés, pages)",
  },
  { keys: "Ctrl + S", action: "Télécharger le PDF modifié" },
  { keys: "Suppr", action: "Supprimer l'élément sélectionné" },
  { keys: "Flèches (+ Maj)", action: "Déplacer l'élément sélectionné de 1 pt (10 pt)" },
  { keys: "Échap", action: "Désélectionner, revenir à l'outil Sélection, fermer un panneau" },
  { keys: "Page suiv. / Page préc.", action: "Page suivante / précédente" },
  { keys: "+ / − / 0", action: "Zoom avant / arrière / ajuster" },
  { keys: "Ctrl + molette", action: "Zoom progressif" },
  {
    keys: "V, E, T, N, P, H, U, R, O, A, I, S",
    action: "Choisir un outil (voir l'info-bulle de chaque outil)",
  },
  { keys: "?", action: "Afficher cette aide" },
];
