import { getLocale, localePrefix, type Locale } from "@/lib/i18n/locale";
import { getCategories, getCategoryById } from "./categories";
import { toolRegistry } from "./registry";
import type { ToolCategory, ToolCategoryId, ToolDefinition, ToolLocalization } from "./types";

const localized = new Map<Locale, ToolDefinition[]>();
const localizations = new Map<Locale, Record<string, ToolLocalization>>();

/**
 * Registers the translated text of the tools for a locale. The English map lives in
 * `src/lib/tools/registry/en` and is registered by `src/lib/i18n/register-en.ts`
 * (imported by the root layouts, the sitemap and the English client bundle) so that
 * French pages never download it. Tools without a registered text fall back to
 * French and are marked `translated: false`.
 */
export function registerToolLocalizations(
  locale: Locale,
  map: Record<string, ToolLocalization>,
): void {
  localizations.set(locale, map);
  localized.delete(locale);
}

/** The registry in a locale: French is the source, English merges per-tool overrides. */
export function getRegistry(locale: Locale = getLocale()): readonly ToolDefinition[] {
  if (locale === "fr") return toolRegistry;
  let list = localized.get(locale);
  if (!list) {
    const map = localizations.get(locale) ?? {};
    list = toolRegistry.map((tool) => {
      const en = map[tool.id];
      if (!en) return { ...tool, translated: false };
      return {
        ...tool,
        ...en,
        content: {
          ...tool.content,
          ...en.content,
          privacyNote: en.content.privacyNote ?? tool.content.privacyNote,
        },
        translated: true,
      };
    });
    localized.set(locale, list);
  }
  return list;
}

/** Tools that are implemented and reachable (published or beta). */
export function getOperationalTools(locale: Locale = getLocale()): ToolDefinition[] {
  return getRegistry(locale).filter((t) => t.status === "published" || t.status === "beta");
}

/** Tools shown in navigation, directory and search results. */
export function getPublishedTools(locale: Locale = getLocale()): ToolDefinition[] {
  return getRegistry(locale).filter((t) => t.status === "published");
}

/** Tools eligible for the sitemap and `index,follow` robots directives. */
export function getIndexableTools(locale: Locale = getLocale()): ToolDefinition[] {
  return getRegistry(locale).filter((t) => isToolIndexable(t));
}

/** A tool page is indexable when published, flagged indexable and, outside French, really translated. */
export function isToolIndexable(tool: ToolDefinition): boolean {
  return tool.status === "published" && tool.indexable && tool.translated !== false;
}

export function getFeaturedTools(locale: Locale = getLocale()): ToolDefinition[] {
  return getPublishedTools(locale).filter((t) => t.featured);
}

export function getToolById(id: string, locale: Locale = getLocale()): ToolDefinition | undefined {
  return getRegistry(locale).find((t) => t.id === id);
}

export function getToolByPath(
  categorySlug: string,
  toolSlug: string,
  locale: Locale = getLocale(),
): ToolDefinition | undefined {
  const category = getCategories(locale).find((c) => c.slug === categorySlug);
  if (!category) return undefined;
  return getRegistry(locale).find((t) => t.category === category.id && t.slug === toolSlug);
}

export function getToolPath(tool: ToolDefinition, locale: Locale = getLocale()): string {
  const category = getCategoryById(tool.category, locale);
  if (!category) throw new Error(`Unknown category "${tool.category}" for tool "${tool.id}"`);
  const localizedTool = getToolById(tool.id, locale) ?? tool;
  return `${localePrefix(locale)}/${category.slug}/${localizedTool.slug}/`;
}

export function getCategoryPath(category: ToolCategory, locale: Locale = getLocale()): string {
  const localizedCategory = getCategoryById(category.id, locale) ?? category;
  return `${localePrefix(locale)}/${localizedCategory.slug}/`;
}

export function getToolsByCategory(
  categoryId: ToolCategoryId,
  publishedOnly = true,
  locale: Locale = getLocale(),
): ToolDefinition[] {
  const list = publishedOnly ? getPublishedTools(locale) : [...getRegistry(locale)];
  return list.filter((t) => t.category === categoryId);
}

/** Categories that have at least one published tool (the only ones that get a page). */
export function getActiveCategories(locale: Locale = getLocale()): ToolCategory[] {
  return getCategories(locale).filter((c) => getToolsByCategory(c.id, true, locale).length > 0);
}

export function getPlannedCategories(locale: Locale = getLocale()): ToolCategory[] {
  return getCategories(locale).filter((c) => getToolsByCategory(c.id, true, locale).length === 0);
}

export function getRelatedTools(
  tool: ToolDefinition,
  max = 4,
  locale: Locale = getLocale(),
): ToolDefinition[] {
  const explicit = tool.related
    .map((id) => getToolById(id, locale))
    .filter((t): t is ToolDefinition => !!t && t.status === "published");
  if (explicit.length >= max) return explicit.slice(0, max);
  const sameCategory = getToolsByCategory(tool.category, true, locale).filter(
    (t) => t.id !== tool.id && !explicit.some((e) => e.id === t.id),
  );
  return [...explicit, ...sameCategory].slice(0, max);
}

export interface RegistryIssue {
  toolId: string;
  message: string;
}

/**
 * Consistency rules enforced by unit tests (and callable at build time):
 * unique ids/slugs, valid categories, valid related ids, complete SEO for
 * published tools, no indexable tool that is not published.
 */
export function validateRegistry(tools: readonly ToolDefinition[] = toolRegistry): RegistryIssue[] {
  const issues: RegistryIssue[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  const seoTitles = new Map<string, string>();
  const seoDescriptions = new Map<string, string>();

  for (const tool of tools) {
    if (ids.has(tool.id)) issues.push({ toolId: tool.id, message: "duplicate id" });
    ids.add(tool.id);

    if (!getCategoryById(tool.category)) {
      issues.push({ toolId: tool.id, message: `unknown category "${tool.category}"` });
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.slug)) {
      issues.push({ toolId: tool.id, message: `slug "${tool.slug}" is not url-safe` });
    }
    const path = `${tool.category}/${tool.slug}`;
    if (paths.has(path)) issues.push({ toolId: tool.id, message: `duplicate path ${path}` });
    paths.add(path);

    for (const rel of tool.related) {
      if (!tools.some((t) => t.id === rel)) {
        issues.push({ toolId: tool.id, message: `related tool "${rel}" does not exist` });
      }
      if (rel === tool.id) issues.push({ toolId: tool.id, message: "tool relates to itself" });
    }

    if (tool.status === "published") {
      if (tool.seo.title.trim().length < 20) {
        issues.push({ toolId: tool.id, message: "seo.title too short" });
      }
      if (tool.seo.title.length > 70) {
        issues.push({ toolId: tool.id, message: `seo.title too long (${tool.seo.title.length})` });
      }
      if (tool.seo.description.trim().length < 70) {
        issues.push({ toolId: tool.id, message: "seo.description too short" });
      }
      if (tool.seo.description.length > 165) {
        issues.push({
          toolId: tool.id,
          message: `seo.description too long (${tool.seo.description.length})`,
        });
      }
      if (tool.description.trim().length < 80) {
        issues.push({ toolId: tool.id, message: "description too short for a published tool" });
      }
      if (tool.content.steps.length < 2) {
        issues.push({ toolId: tool.id, message: "published tool needs usage steps" });
      }
      if (tool.content.limitations.length < 1) {
        issues.push({ toolId: tool.id, message: "published tool must document limitations" });
      }
      if (seoTitles.has(tool.seo.title)) {
        issues.push({
          toolId: tool.id,
          message: `seo.title duplicates ${seoTitles.get(tool.seo.title)}`,
        });
      }
      seoTitles.set(tool.seo.title, tool.id);
      if (seoDescriptions.has(tool.seo.description)) {
        issues.push({
          toolId: tool.id,
          message: `seo.description duplicates ${seoDescriptions.get(tool.seo.description)}`,
        });
      }
      seoDescriptions.set(tool.seo.description, tool.id);
    } else if (tool.indexable) {
      issues.push({ toolId: tool.id, message: "only published tools may be indexable" });
    }
  }
  return issues;
}
