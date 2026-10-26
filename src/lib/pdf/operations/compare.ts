import type { Change } from "diff";
import { computeDiff, type DiffMode } from "@/lib/text/diff";

export type PageStatus = "identical" | "changed" | "added" | "removed";

export interface PageComparison {
  pageIndex: number;
  status: PageStatus;
  changes: Change[];
  added: number;
  removed: number;
}

export interface CompareResult {
  pages: PageComparison[];
  changedPages: number;
  totalAdded: number;
  totalRemoved: number;
  identical: boolean;
  /** True when neither document contains selectable text (scans). */
  noText: boolean;
}

export interface CompareOptions {
  mode?: DiffMode;
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
}

function normalize(text: string, ignoreWhitespace: boolean): string {
  const base = text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
  return ignoreWhitespace ? base.replace(/\s+/g, " ") : base;
}

/**
 * Compares two documents page by page from their extracted text. Pages beyond
 * the shorter document are reported as added/removed. Pure and testable.
 */
export function comparePageTexts(
  a: string[],
  b: string[],
  options: CompareOptions = {},
): CompareResult {
  const mode = options.mode ?? "words";
  const count = Math.max(a.length, b.length);
  const pages: PageComparison[] = [];
  let changedPages = 0;
  let totalAdded = 0;
  let totalRemoved = 0;
  for (let i = 0; i < count; i += 1) {
    const left = i < a.length ? normalize(a[i]!, options.ignoreWhitespace ?? true) : null;
    const right = i < b.length ? normalize(b[i]!, options.ignoreWhitespace ?? true) : null;
    if (left === null || right === null) {
      const text = left ?? right ?? "";
      const units = mode === "lines" ? text.split("\n").length : text.length;
      pages.push({
        pageIndex: i,
        status: left === null ? "added" : "removed",
        changes: [
          { value: text, added: left === null, removed: right === null, count: units } as Change,
        ],
        added: left === null ? units : 0,
        removed: right === null ? units : 0,
      });
      changedPages += 1;
      if (left === null) totalAdded += units;
      else totalRemoved += units;
      continue;
    }
    const diff = computeDiff(left, right, mode, { ignoreCase: options.ignoreCase });
    const changed = diff.summary.added > 0 || diff.summary.removed > 0;
    if (changed) changedPages += 1;
    totalAdded += diff.summary.added;
    totalRemoved += diff.summary.removed;
    pages.push({
      pageIndex: i,
      status: changed ? "changed" : "identical",
      changes: diff.changes,
      added: diff.summary.added,
      removed: diff.summary.removed,
    });
  }
  const noText = a.every((t) => t.trim() === "") && b.every((t) => t.trim() === "");
  return { pages, changedPages, totalAdded, totalRemoved, identical: changedPages === 0, noText };
}

/** Human-readable report (for download). */
export function compareReport(result: CompareResult, nameA: string, nameB: string): string {
  const out = [
    `Comparaison : ${nameA} → ${nameB}`,
    `Pages modifiées : ${result.changedPages} / ${result.pages.length}`,
    `Ajouts : ${result.totalAdded} · Suppressions : ${result.totalRemoved}`,
    "",
  ];
  for (const page of result.pages) {
    if (page.status === "identical") continue;
    out.push(
      `--- Page ${page.pageIndex + 1} (${page.status === "changed" ? "modifiée" : page.status === "added" ? "ajoutée" : "supprimée"}) ---`,
    );
    for (const change of page.changes) {
      if (!change.added && !change.removed) continue;
      out.push(`${change.added ? "+" : "-"} ${change.value.trim()}`);
    }
    out.push("");
  }
  return out.join("\n");
}
