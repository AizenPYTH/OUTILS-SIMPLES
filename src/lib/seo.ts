import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/config/site";
import { getCategoryById, getCategoryPath, getToolPath, isToolIndexable } from "@/lib/tools";
import type { ToolCategory, ToolDefinition } from "@/lib/tools";

export const noIndexRobots: Metadata["robots"] = { index: false, follow: false };

interface PageMetadataInput {
  title: string;
  description: string;
  /** Path starting with "/" (trailing slash kept as given). */
  path: string;
  indexable?: boolean;
  type?: "website" | "article";
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(input.path);
  const indexable = input.indexable ?? true;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical, languages: { fr: canonical } },
    robots: indexable ? { index: true, follow: true } : noIndexRobots,
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: input.type ?? "website",
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
  };
}

export function buildToolMetadata(tool: ToolDefinition): Metadata {
  return buildPageMetadata({
    title: tool.seo.title,
    description: tool.seo.description,
    path: getToolPath(tool),
    indexable: isToolIndexable(tool),
  });
}

export function buildCategoryMetadata(category: ToolCategory): Metadata {
  return buildPageMetadata({
    title: category.seo.title,
    description: category.seo.description,
    path: getCategoryPath(category),
  });
}

/** JSON-LD for the organisation/website; no ratings, no invented facts. */
export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: siteConfig.language,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/outils/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** JSON-LD describing a tool page as a free browser-based web application. */
export function buildToolJsonLd(tool: ToolDefinition) {
  const category = getCategoryById(tool.category);
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.name,
    url: absoluteUrl(getToolPath(tool)),
    description: tool.seo.description,
    applicationCategory: "UtilitiesApplication",
    applicationSubCategory: category?.name,
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript",
    inLanguage: siteConfig.language,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
  };
}

export function buildFaqJsonLd(tool: ToolDefinition) {
  if (tool.content.faq.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: tool.content.faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
