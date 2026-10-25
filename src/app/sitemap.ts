import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import { getActiveCategories, getCategoryPath, getIndexableTools, getToolPath } from "@/lib/tools";
import { guides } from "@/lib/content/guides";

export const staticPublicPaths = [
  "/",
  "/outils/",
  "/guides/",
  "/a-propos/",
  "/contact/",
  "/confidentialite/",
  "/conditions-utilisation/",
  "/gestion-cookies/",
  "/mentions-legales/",
  "/affiliation/",
] as const;

/** Only canonical, indexable pages. Unfinished tools never appear here. */
export function buildSitemapEntries(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = staticPublicPaths.map((path) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: path === "/" || path === "/outils/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/outils/" ? 0.9 : 0.4,
  }));
  for (const category of getActiveCategories()) {
    entries.push({
      url: absoluteUrl(getCategoryPath(category)),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }
  for (const tool of getIndexableTools()) {
    entries.push({
      url: absoluteUrl(getToolPath(tool)),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    });
  }
  for (const guide of guides) {
    entries.push({
      url: absoluteUrl(`/guides/${guide.slug}/`),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }
  return entries;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries();
}
