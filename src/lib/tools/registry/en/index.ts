import type { ToolLocalization } from "../../types";
import { pdfCoreEn } from "./pdf-core";
import { pdfExtraEn } from "./pdf-extra";
import { scanEn } from "./scan";
import { imagesEn } from "./images";
import { conversionEn } from "./conversion";
import { textEn } from "./text";
import { developerEn } from "./developer";
import { calculatorsEn } from "./calculators";
import { codesEn } from "./codes";
import { documentsEn } from "./documents";

/** English text of every tool, keyed by tool id. Missing ids fall back to French (marked `translated: false`). */
export const toolsEn: Record<string, ToolLocalization> = {
  ...pdfCoreEn,
  ...pdfExtraEn,
  ...scanEn,
  ...imagesEn,
  ...conversionEn,
  ...textEn,
  ...developerEn,
  ...calculatorsEn,
  ...codesEn,
  ...documentsEn,
};
