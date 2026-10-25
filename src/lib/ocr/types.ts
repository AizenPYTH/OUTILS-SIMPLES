/** OCR result model shared by the engine wrapper, the UI and the searchable-PDF builder. */
export type OcrLanguage = "fra" | "eng" | "fra+eng";

export const ocrLanguages: { id: OcrLanguage; label: string }[] = [
  { id: "fra", label: "Français" },
  { id: "eng", label: "Anglais" },
  { id: "fra+eng", label: "Français + anglais" },
];

export interface OcrWord {
  text: string;
  confidence: number;
  /** Bounding box in image pixels (origin top-left). */
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
}

export interface OcrPageResult {
  pageIndex: number;
  text: string;
  confidence: number;
  lines: OcrLine[];
  /** Pixel size of the image that was recognised. */
  width: number;
  height: number;
}
