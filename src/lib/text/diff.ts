import { diffLines, diffWordsWithSpace, diffChars, type Change } from "diff";

export type DiffMode = "lines" | "words" | "chars";

export interface DiffSummary {
  added: number;
  removed: number;
  unchanged: number;
}

export interface DiffResult {
  changes: Change[];
  summary: DiffSummary;
}

/** Wraps the `diff` library (Myers algorithm) with a summary; pure and testable. */
export function computeDiff(a: string, b: string, mode: DiffMode, options: { ignoreCase?: boolean; ignoreWhitespace?: boolean } = {}): DiffResult {
  const normalize = (s: string) => {
    let out = s.replace(/\r\n?/g, "\n");
    if (options.ignoreCase) out = out.toLocaleLowerCase("fr-FR");
    return out;
  };
  const left = normalize(a);
  const right = normalize(b);
  let changes: Change[];
  if (mode === "lines") changes = diffLines(left, right, { ignoreWhitespace: options.ignoreWhitespace, newlineIsToken: false });
  else if (mode === "words") changes = diffWordsWithSpace(left, right);
  else changes = diffChars(left, right);
  const summary: DiffSummary = { added: 0, removed: 0, unchanged: 0 };
  for (const change of changes) {
    const units = mode === "lines" ? change.value.split("\n").filter((l, i, arr) => !(i === arr.length - 1 && l === "")).length : change.value.length;
    if (change.added) summary.added += units;
    else if (change.removed) summary.removed += units;
    else summary.unchanged += units;
  }
  return { changes, summary };
}

/** Unified-diff style text, handy for copying into a message or a ticket. */
export function formatUnified(changes: Change[]): string {
  const out: string[] = [];
  for (const change of changes) {
    const prefix = change.added ? "+ " : change.removed ? "- " : "  ";
    for (const line of change.value.replace(/\n$/, "").split("\n")) out.push(prefix + line);
  }
  return out.join("\n");
}
