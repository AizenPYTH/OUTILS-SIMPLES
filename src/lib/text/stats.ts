/** Text statistics used by the word counter. Pure, locale-aware for French. */
export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  /** Minutes at 200 words per minute, rounded up to a half minute. */
  readingMinutes: number;
  /** Minutes at 130 words per minute (speaking). */
  speakingMinutes: number;
  topWords: { word: string; count: number }[];
}

const STOP_WORDS = new Set(
  "le la les de des du un une et en à a au aux ce cet cette ces il elle ils elles on nous vous je tu ne pas que qui quoi dont où est sont été être avoir ont par pour sur dans avec sans plus moins ou mais donc or ni car se sa son ses leur leurs mon ma mes ton ta tes votre vos notre nos y the of and to in is it that for on with as are was be this".split(
    " ",
  ),
);

export function computeTextStats(text: string): TextStats {
  const trimmed = text.trim();
  const words = trimmed.length ? trimmed.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)) : [];
  const sentences = trimmed.length
    ? trimmed.split(/[.!?…]+(?:\s|$)/).filter((s) => s.trim().length > 0).length
    : 0;
  const paragraphs = trimmed.length
    ? trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length
    : 0;
  const lines = text.length ? text.split(/\r?\n/).length : 0;
  const counts = new Map<string, number>();
  for (const raw of words) {
    const word = raw
      .toLowerCase()
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
      .replace(/^[ldjmnstc]'/u, "");
    if (word.length < 3 || STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const topWords = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
  return {
    characters: Array.from(text).length,
    charactersNoSpaces: Array.from(text.replace(/\s/g, "")).length,
    words: words.length,
    sentences,
    paragraphs,
    lines,
    readingMinutes: Math.ceil((words.length / 200) * 2) / 2,
    speakingMinutes: Math.ceil((words.length / 130) * 2) / 2,
    topWords,
  };
}
