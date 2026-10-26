import type { ToolCategoryId, ToolDefinition, ToolIconName } from "./types";
import { normalizeSearchText } from "./search";

/**
 * Slim, serialisable view of a tool for the header search and the mobile
 * menu. Built on the server and passed as props: the client bundle of every
 * page no longer embeds the full registry (descriptions, FAQ, limits…).
 */
export interface SlimTool {
  id: string;
  name: string;
  path: string;
  category: ToolCategoryId;
  icon: ToolIconName;
  shortDescription: string;
  keywords: string[];
}

export function toSlimTool(tool: ToolDefinition, path: string): SlimTool {
  return {
    id: tool.id,
    name: tool.name,
    path,
    category: tool.category,
    icon: tool.icon,
    shortDescription: tool.shortDescription,
    keywords: tool.keywords,
  };
}

function tokenize(text: string): string[] {
  return normalizeSearchText(text).split(" ").filter(Boolean);
}

/** Same ranking as `searchTools`, on the slim fields (name, keywords, short description). */
export function searchSlim(index: readonly SlimTool[], query: string, limit = 8): SlimTool[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];
  const normalizedQuery = queryTokens.join(" ");
  const scored: { tool: SlimTool; score: number }[] = [];
  for (const tool of index) {
    const nameTokens = tokenize(tool.name);
    const keywordTokens = tool.keywords.flatMap(tokenize);
    const descTokens = tokenize(tool.shortDescription);
    let score = 0;
    let allMatched = true;
    for (const q of queryTokens) {
      let tokenScore = 0;
      if (nameTokens.some((t) => t === q)) tokenScore = 10;
      else if (nameTokens.some((t) => t.startsWith(q))) tokenScore = 7;
      if (keywordTokens.some((t) => t === q)) tokenScore = Math.max(tokenScore, 6);
      else if (keywordTokens.some((t) => t.startsWith(q))) tokenScore = Math.max(tokenScore, 4);
      if (descTokens.some((t) => t.startsWith(q))) tokenScore = Math.max(tokenScore, 2);
      if (tokenScore === 0) {
        allMatched = false;
        break;
      }
      score += tokenScore;
    }
    if (!allMatched) continue;
    if (normalizeSearchText(tool.name).includes(normalizedQuery)) score += 5;
    scored.push({ tool, score });
  }
  scored.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name, "fr"));
  return scored.slice(0, limit).map((s) => s.tool);
}
