import type { MetadataRoute } from "next";
import "@/lib/i18n/register-en";
import "@/lib/i18n/register-en-messages";
import "@/lib/i18n/register-en-registry";
import { absoluteUrl } from "@/config/site";
import { publicEnv } from "@/config/env";
import { alternateGuideSlug, getGuides } from "@/lib/content/guides";
import { locales, type Locale } from "@/lib/i18n/locale";
import { localizedPath, staticRoutes } from "@/lib/i18n/routes";
import { languageAlternates, toolAlternates } from "@/lib/seo";
import { getActiveCategories, getCategoryPath, getIndexableTools, getToolPath } from "@/lib/tools";

/** French (canonical) paths of the static pages listed in the sitemap; /hors-ligne/ is noindex. */
export const staticPublicPaths = Object.keys(staticRoutes).filter((p) => p !== "/hors-ligne/");

type Entry = MetadataRoute.Sitemap[number];

function entry(
  path: string,
  alternates: Partial<Record<Locale, string>>,
  changeFrequency: Entry["changeFrequency"],
  priority: number,
  lastModified: Date,
): Entry {
  return {
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages: languageAlternates(alternates) },
  };
}

/** Only canonical, indexable pages, in every locale where they exist; untranslated tools stay French-only. */
export function buildSitemapEntries(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];
  for (const fr of staticPublicPaths) {
    const alternates: Partial<Record<Locale, string>> = {};
    for (const locale of locales) alternates[locale] = localizedPath(fr, locale);
    for (const locale of locales) {
      const path = alternates[locale]!;
      entries.push(
        entry(
          path,
          alternates,
          fr === "/" || fr === "/outils/" ? "weekly" : "monthly",
          fr === "/" ? 1 : fr === "/outils/" ? 0.9 : 0.4,
          lastModified,
        ),
      );
    }
  }
  for (const locale of locales) {
    for (const category of getActiveCategories(locale)) {
      const alternates: Partial<Record<Locale, string>> = {};
      for (const l of locales) alternates[l] = getCategoryPath(category, l);
      entries.push(
        entry(getCategoryPath(category, locale), alternates, "weekly", 0.8, lastModified),
      );
    }
    for (const tool of getIndexableTools(locale)) {
      entries.push(
        entry(getToolPath(tool, locale), toolAlternates(tool), "monthly", 0.9, lastModified),
      );
    }
    for (const guide of getGuides(locale)) {
      const path = `${localizedPath("/guides/", locale)}${guide.slug}/`;
      const alternates: Partial<Record<Locale, string>> = { [locale]: path };
      for (const other of locales) {
        if (other === locale) continue;
        const slug = alternateGuideSlug(guide, other);
        if (slug) alternates[other] = `${localizedPath("/guides/", other)}${slug}/`;
      }
      entries.push(entry(path, alternates, "monthly", 0.6, lastModified));
    }
  }
  return entries;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return publicEnv.NEXT_PUBLIC_NOINDEX ? [] : buildSitemapEntries();
}
