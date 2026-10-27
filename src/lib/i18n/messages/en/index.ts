import { sharedEn } from "./shared";
import { pdfToolsEn } from "./pdf-tools";
import { pdfEditorEn } from "./pdf-editor";
import { scanOcrEn } from "./scan-ocr";
import { imagesEn } from "./images";
import { conversionEn } from "./conversion";
import { textDevEn } from "./text-dev";
import { calcCodesDocsEn } from "./calc-codes-docs";

/** French source string → English text. Keys are the exact French strings passed to `tr()`. */
export const messagesEn: Record<string, string> = {
  ...sharedEn,
  ...pdfToolsEn,
  ...pdfEditorEn,
  ...scanOcrEn,
  ...imagesEn,
  ...conversionEn,
  ...textDevEn,
  ...calcCodesDocsEn,
};
