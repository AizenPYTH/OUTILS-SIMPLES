import type { Metadata, Viewport } from "next";
import { absoluteUrl, siteConfig } from "@/config/site";
import { publicEnv } from "@/config/env";
import { getDictionary } from "@/lib/i18n";
import { defaultLocale, getLocale, locales, type Locale } from "@/lib/i18n/locale";
import { localizedPath, staticPathToFrench } from "@/lib/i18n/routes";
import {
  getCategoryById,
  getCategoryPath,
  getToolById,
  getToolPath,
  isToolIndexable,
} from "@/lib/tools";
import type { ToolCategory, ToolDefinition } from "@/lib/tools";

export const noIndexRobots: Metadata["robots"] = { index: false, follow: false };

interface PageMetadataInput {
  title: string;
  description: string;
  /** Path of the page in the current locale, starting with "/" (trailing slash kept as given). */
  path: string;
  indexable?: boolean;
  type?: "website" | "article";
  /**
   * Paths of the same page in each locale. Omitted: derived from the static route table when
   * the path is a known static page, else the page is declared in its own language only.
   */
  alternates?: Partial<Record<Locale, string>>;
  locale?: Locale;
  /** False for pages that have their own `opengraph-image` file (tools, categories, guides). */
  genericShareImage?: boolean;
}

/** hreflang map (absolute URLs) for the locales where the page really exists; x-default = French. */
export function languageAlternates(paths: Partial<Record<Locale, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of locales) {
    const path = paths[locale];
    if (path) out[locale] = absoluteUrl(path);
  }
  if (paths[defaultLocale]) out["x-default"] = absoluteUrl(paths[defaultLocale]!);
  return out;
}

function staticAlternates(path: string): Partial<Record<Locale, string>> | null {
  const fr = staticPathToFrench(path);
  if (!fr) return null;
  const out: Partial<Record<Locale, string>> = {};
  for (const locale of locales) out[locale] = localizedPath(fr, locale);
  return out;
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const locale = input.locale ?? getLocale();
  const canonical = absoluteUrl(input.path);
  const indexable = (input.indexable ?? true) && !publicEnv.NEXT_PUBLIC_NOINDEX;
  const alternates = input.alternates ?? staticAlternates(input.path) ?? { [locale]: input.path };
  const dictionary = getDictionary(locale);
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical, languages: languageAlternates(alternates) },
    robots: indexable ? { index: true, follow: true } : noIndexRobots,
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      siteName: siteConfig.name,
      locale: dictionary.site.ogLocale,
      type: input.type ?? "website",
      ...(input.genericShareImage === false ? {} : { images: [shareImage(locale)] }),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      ...(input.genericShareImage === false ? {} : { images: [shareImage(locale).url] }),
    },
  };
}

/**
 * Generic share image of a locale (route handlers at a stable URL). Pages with
 * their own `opengraph-image` file (home, categories, tools, guides) override it.
 */
function shareImage(locale: Locale) {
  return {
    url: absoluteUrl(locale === "en" ? "/en/share-image/" : "/image-de-partage/"),
    width: 1200,
    height: 630,
    alt: `${siteConfig.name} – ${getDictionary(locale).site.tagline}`,
  };
}

/** Root metadata of a locale tree (title template, site description, verification). */
export function buildRootMetadata(locale: Locale): Metadata {
  const d = getDictionary(locale);
  const home = localizedPath("/", locale);
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.name} – ${d.site.tagline}`,
      template: `%s | ${siteConfig.name}`,
    },
    description: d.site.description,
    applicationName: siteConfig.name,
    // Inherited by pages that set no robots of their own (the two home pages):
    // a preview deployment must not be indexable there either.
    robots: publicEnv.NEXT_PUBLIC_NOINDEX ? noIndexRobots : { index: true, follow: true },
    alternates: { canonical: home, languages: languageAlternates({ fr: "/", en: "/en/" }) },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: d.site.ogLocale,
      url: absoluteUrl(home),
      title: `${siteConfig.name} – ${d.site.tagline}`,
      description: d.site.description,
    },
    twitter: { card: "summary_large_image" },
    verification: publicEnv.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: publicEnv.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

export const rootViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5faf2" },
    { media: "(prefers-color-scheme: dark)", color: "#0a140e" },
  ],
};

/** Paths of a tool in every locale where its page is indexable (translated). */
export function toolAlternates(tool: ToolDefinition): Partial<Record<Locale, string>> {
  const out: Partial<Record<Locale, string>> = {};
  for (const locale of locales) {
    const localized = getToolById(tool.id, locale);
    if (localized && isToolIndexable(localized)) out[locale] = getToolPath(localized, locale);
  }
  return out;
}

export function categoryAlternates(category: ToolCategory): Partial<Record<Locale, string>> {
  const out: Partial<Record<Locale, string>> = {};
  for (const locale of locales) out[locale] = getCategoryPath(category, locale);
  return out;
}

export function buildToolMetadata(tool: ToolDefinition, locale: Locale = getLocale()): Metadata {
  return buildPageMetadata({
    genericShareImage: false,
    title: tool.seo.title,
    description: tool.seo.description,
    path: getToolPath(tool, locale),
    indexable: isToolIndexable(tool),
    alternates: toolAlternates(tool),
    locale,
  });
}

export function buildCategoryMetadata(
  category: ToolCategory,
  locale: Locale = getLocale(),
): Metadata {
  return buildPageMetadata({
    genericShareImage: false,
    title: category.seo.title,
    description: category.seo.description,
    path: getCategoryPath(category, locale),
    alternates: categoryAlternates(category),
    locale,
  });
}

/** JSON-LD for the organisation/website; no ratings, no invented facts. */
export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: getLocale(),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}${localizedPath("/outils/")}?q={search_term_string}`,
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
    inLanguage: getLocale(),
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
