import type { ToolDefinition } from "./types";

/** Lower-case, strip accents and punctuation so "Fusionner" matches "fusion". */
export function normalizeSearchText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface SearchResult {
  tool: ToolDefinition;
  score: number;
}

function tokenize(text: string): string[] {
  return normalizeSearchText(text).split(" ").filter(Boolean);
}

/**
 * Lightweight client-side ranking: name matches weigh most, then keywords,
 * then descriptions. Every query token must match somewhere (AND semantics)
 * so results stay relevant; a token matches if a field token starts with it.
 */
export function searchTools(tools: readonly ToolDefinition[], query: string, limit = 20): SearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const results: SearchResult[] = [];
  for (const tool of tools) {
    const nameTokens = tokenize(tool.name);
    const keywordTokens = tool.keywords.flatMap(tokenize);
    const descTokens = tokenize(`${tool.shortDescription} ${tool.description}`);
    const normalizedName = normalizeSearchText(tool.name);
    const normalizedQuery = queryTokens.join(" ");

    let score = 0;
    let allMatched = true;
    for (const q of queryTokens) {
      let tokenScore = 0;
      if (nameTokens.some((t) => t === q)) tokenScore = Math.max(tokenScore, 10);
      else if (nameTokens.some((t) => t.startsWith(q))) tokenScore = Math.max(tokenScore, 7);
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
    if (normalizedName.includes(normalizedQuery)) score += 5;
    if (tool.keywords.some((k) => normalizeSearchText(k) === normalizedQuery)) score += 8;
    results.push({ tool, score });
  }
  return results.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name, "fr")).slice(0, limit);
}
