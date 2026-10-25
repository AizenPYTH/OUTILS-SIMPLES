/**
 * Strongly typed tool registry model. The registry (registry.ts) is the single
 * source of truth for navigation, directory pages, search, related tools,
 * SEO metadata, sitemap generation and route generation.
 */

export type ToolCategoryId =
  | "pdf"
  | "images"
  | "texte"
  | "calculatrices"
  | "conversion"
  | "qr-code"
  | "productivite"
  | "ia"
  | "pro";

export type ToolStatus =
  /** Fully implemented, tested and indexable. */
  | "published"
  /** Implemented but intentionally not indexed yet (reachable by URL). */
  | "beta"
  /** Not implemented: never rendered as a page, never linked as operational. */
  | "planned";

export type ProcessingLocation = "client" | "server";

/** Icon names map to lucide-react components in the UI layer. */
export type ToolIconName =
  | "merge"
  | "scissors"
  | "minimize"
  | "layout-grid"
  | "rotate-cw"
  | "file-output"
  | "type"
  | "highlighter"
  | "pen-line"
  | "droplets"
  | "eraser"
  | "clipboard-list"
  | "square-pen"
  | "file-text"
  | "image"
  | "calculator"
  | "qr-code"
  | "briefcase"
  | "sparkles"
  | "arrow-right-left"
  | "list-checks";

export interface ToolFaqEntry {
  question: string;
  answer: string;
}

export interface ToolContent {
  /** Short, factual steps shown under the tool. */
  steps: string[];
  /** Honest list of what the tool does NOT do. */
  limitations: string[];
  /** Optional FAQ; only when genuinely useful. */
  faq: ToolFaqEntry[];
  /** Specific privacy note (defaults to the shared client-side note). */
  privacyNote?: string;
}

export interface ToolLimits {
  maxFileSizeBytes: number;
  maxFileCount: number;
  maxPageCount?: number;
}

export interface ToolDefinition {
  /** Stable identifier; never reuse or rename once published. */
  id: string;
  /** URL segment under the category (e.g. `fusionner` → /pdf/fusionner/). */
  slug: string;
  category: ToolCategoryId;
  name: string;
  /** One sentence, used on cards and in search. */
  shortDescription: string;
  /** Paragraph shown at the top of the tool page. */
  description: string;
  icon: ToolIconName;
  /** Synonyms and search terms (lower-case, accents allowed). */
  keywords: string[];
  seo: {
    title: string;
    description: string;
  };
  status: ToolStatus;
  /** Explicit indexability switch; only honoured when status === "published". */
  indexable: boolean;
  inputFormats: string[];
  outputFormats: string[];
  processing: ProcessingLocation;
  limits: ToolLimits;
  featureFlags: string[];
  /** Ids of related tools. */
  related: string[];
  premium: boolean;
  featured?: boolean;
  content: ToolContent;
}

export interface ToolCategory {
  id: ToolCategoryId;
  /** URL segment (e.g. `pdf` → /pdf/). */
  slug: string;
  name: string;
  shortName: string;
  description: string;
  icon: ToolIconName;
  seo: { title: string; description: string };
}
