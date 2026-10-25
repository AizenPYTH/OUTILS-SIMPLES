import { getCategoryById, getCategoryBySlug, toolCategories } from "./categories";
import { toolRegistry } from "./registry";
import type { ToolCategory, ToolCategoryId, ToolDefinition } from "./types";

/** Tools that are implemented and reachable (published or beta). */
export function getOperationalTools(): ToolDefinition[] {
  return toolRegistry.filter((t) => t.status === "published" || t.status === "beta");
}

/** Tools shown in navigation, directory and search results. */
export function getPublishedTools(): ToolDefinition[] {
  return toolRegistry.filter((t) => t.status === "published");
}

/** Tools eligible for the sitemap and `index,follow` robots directives. */
export function getIndexableTools(): ToolDefinition[] {
  return toolRegistry.filter((t) => t.status === "published" && t.indexable);
}

export function isToolIndexable(tool: ToolDefinition): boolean {
  return tool.status === "published" && tool.indexable;
}

export function getFeaturedTools(): ToolDefinition[] {
  return getPublishedTools().filter((t) => t.featured);
}

export function getToolById(id: string): ToolDefinition | undefined {
  return toolRegistry.find((t) => t.id === id);
}

export function getToolByPath(categorySlug: string, toolSlug: string): ToolDefinition | undefined {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return undefined;
  return toolRegistry.find((t) => t.category === category.id && t.slug === toolSlug);
}

export function getToolPath(tool: ToolDefinition): string {
  const category = getCategoryById(tool.category);
  if (!category) throw new Error(`Unknown category "${tool.category}" for tool "${tool.id}"`);
  return `/${category.slug}/${tool.slug}/`;
}

export function getCategoryPath(category: ToolCategory): string {
  return `/${category.slug}/`;
}

export function getToolsByCategory(
  categoryId: ToolCategoryId,
  publishedOnly = true,
): ToolDefinition[] {
  const list = publishedOnly ? getPublishedTools() : [...toolRegistry];
  return list.filter((t) => t.category === categoryId);
}

/** Categories that have at least one published tool (the only ones that get a page). */
export function getActiveCategories(): ToolCategory[] {
  return toolCategories.filter((c) => getToolsByCategory(c.id).length > 0);
}

export function getPlannedCategories(): ToolCategory[] {
  return toolCategories.filter((c) => getToolsByCategory(c.id).length === 0);
}

export function getRelatedTools(tool: ToolDefinition, max = 4): ToolDefinition[] {
  const explicit = tool.related
    .map((id) => getToolById(id))
    .filter((t): t is ToolDefinition => !!t && t.status === "published");
  if (explicit.length >= max) return explicit.slice(0, max);
  const sameCategory = getToolsByCategory(tool.category).filter(
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
