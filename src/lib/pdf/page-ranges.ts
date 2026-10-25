import { PdfError } from "./errors";
import { t } from "@/lib/i18n";

export interface PageRange {
  /** 1-based inclusive start. */
  from: number;
  /** 1-based inclusive end. */
  to: number;
}

export interface ParsedRanges {
  ranges: PageRange[];
  /** Unique, ascending 0-based page indices covered by the ranges. */
  indices: number[];
}

const TOKEN_PATTERN = /^(\d+)(?:\s*-\s*(\d+))?$/;

/**
 * Parses user input such as "1-3, 5, 8-10" into validated ranges.
 * Rules: 1-based numbers; a range must be ascending; every number must be
 * within [1, pageCount]; duplicates across ranges are allowed in `ranges`
 * (useful for "one file per range") but de-duplicated in `indices`.
 */
export function parsePageRanges(input: string, pageCount: number): ParsedRanges {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new PdfError("INVALID_RANGE", t.ranges.errorEmpty);
  }
  const normalized = input.replace(/[;–—]/g, (m) => (m === ";" ? "," : "-")).trim();
  if (normalized.length === 0)
    throw new PdfError("INVALID_RANGE", t.ranges.errorEmpty, { recoverable: true });

  const ranges: PageRange[] = [];
  for (const rawToken of normalized.split(",")) {
    const token = rawToken.trim();
    if (!token) continue;
    const match = TOKEN_PATTERN.exec(token);
    if (!match) throw new PdfError("INVALID_RANGE", t.ranges.errorFormat, { recoverable: true });
    const from = Number.parseInt(match[1]!, 10);
    const to = match[2] !== undefined ? Number.parseInt(match[2], 10) : from;
    if (from < 1 || to < 1 || from > pageCount || to > pageCount) {
      throw new PdfError("INVALID_RANGE", t.ranges.errorOutOfBounds(pageCount), {
        recoverable: true,
      });
    }
    if (to < from)
      throw new PdfError("INVALID_RANGE", t.ranges.errorReversed(from, to), { recoverable: true });
    ranges.push({ from, to });
  }
  if (ranges.length === 0)
    throw new PdfError("INVALID_RANGE", t.ranges.errorEmpty, { recoverable: true });

  const set = new Set<number>();
  for (const r of ranges) for (let p = r.from; p <= r.to; p += 1) set.add(p - 1);
  return { ranges, indices: Array.from(set).sort((a, b) => a - b) };
}

/** Expands one range to 0-based indices. */
export function rangeToIndices(range: PageRange): number[] {
  const out: number[] = [];
  for (let p = range.from; p <= range.to; p += 1) out.push(p - 1);
  return out;
}

/** Formats a sorted list of 0-based indices back into "1-3, 5" for display. */
export function formatPageIndices(indices: number[]): string {
  const sorted = Array.from(new Set(indices)).sort((a, b) => a - b);
  const parts: string[] = [];
  let start: number | null = null;
  let prev: number | null = null;
  const flush = () => {
    if (start === null || prev === null) return;
    parts.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
  };
  for (const index of sorted) {
    if (prev !== null && index === prev + 1) {
      prev = index;
      continue;
    }
    flush();
    start = index;
    prev = index;
  }
  flush();
  return parts.join(", ");
}

/** "Every N pages" split: [1-N], [N+1-2N], … */
export function chunkRanges(pageCount: number, chunkSize: number): PageRange[] {
  if (chunkSize < 1)
    throw new PdfError("INVALID_RANGE", t.ranges.errorFormat, { recoverable: true });
  const ranges: PageRange[] = [];
  for (let from = 1; from <= pageCount; from += chunkSize) {
    ranges.push({ from, to: Math.min(pageCount, from + chunkSize - 1) });
  }
  return ranges;
}
