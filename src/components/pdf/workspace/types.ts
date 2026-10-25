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
