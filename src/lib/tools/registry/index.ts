import type { ToolDefinition } from "../types";
import { pdfCoreTools } from "./pdf-core";
import { pdfExtraTools } from "./pdf-extra";
import { scanTools } from "./scan";
import { imageTools } from "./images";
import { conversionTools } from "./conversion";
import { textTools } from "./text";
import { developerTools } from "./developer";
import { calculatorTools } from "./calculators";
import { codeTools } from "./codes";
import { documentTools } from "./documents";

/**
 * Registry of every tool known to the platform, assembled per category.
 *
 * A tool only becomes public (navigation, directory, sitemap) when
 * `status === "published"`. "planned" entries exist so that search can
 * suggest honest alternatives and so the roadmap is explicit, but they are
 * never rendered as pages.
 */
export const toolRegistry: readonly ToolDefinition[] = [
  ...pdfCoreTools,
  ...pdfExtraTools,
  ...scanTools,
  ...imageTools,
  ...conversionTools,
  ...textTools,
  ...developerTools,
  ...calculatorTools,
  ...codeTools,
  ...documentTools,
];
