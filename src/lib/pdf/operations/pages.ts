import { degrees } from "pdf-lib";
import { PdfError, toPdfError } from "../errors";
import { createPdfDocument, loadPdfDocument, savePdfDocument } from "../load";
import { rangeToIndices, type PageRange } from "../page-ranges";
import type { ProgressReporter } from "./merge";
import { t } from "@/lib/i18n";

function assertIndices(indices: number[], pageCount: number): void {
  if (indices.length === 0)
    throw new PdfError("NO_SELECTION", t.errors.noSelection, { recoverable: true });
  for (const index of indices) {
    if (!Number.isInteger(index) || index < 0 || index >= pageCount) {
      throw new PdfError("INVALID_RANGE", t.ranges.errorOutOfBounds(pageCount), {
        recoverable: true,
      });
    }
  }
}

/**
 * Builds a new document containing `indices` (0-based) in the given order.
 * Indices may repeat (a page can be duplicated on purpose).
 */
export async function extractPages(bytes: Uint8Array, indices: number[]): Promise<Uint8Array> {
  const source = await loadPdfDocument(bytes);
  assertIndices(indices, source.getPageCount());
  const output = await createPdfDocument();
  try {
    const copied = await output.copyPages(source, indices);
    for (const page of copied) output.addPage(page);
  } catch (error) {
    throw toPdfError(error);
  }
  return savePdfDocument(output);
}

export type SplitMode = "one-file-per-range" | "single-file";

export interface SplitOutput {
  /** 1-based page numbers included, for display. */
  range: PageRange | null;
  indices: number[];
  bytes: Uint8Array;
}

/**
 * Splits according to validated ranges. In "single-file" mode duplicated pages
 * are kept once, in document order. In "one-file-per-range" each range yields
 * its own document (overlaps allowed: the user asked for them explicitly).
 */
export async function splitPdf(
  bytes: Uint8Array,
  ranges: PageRange[],
  mode: SplitMode,
  onProgress?: ProgressReporter,
): Promise<SplitOutput[]> {
  if (ranges.length === 0)
    throw new PdfError("NO_SELECTION", t.errors.noSelection, { recoverable: true });
  const source = await loadPdfDocument(bytes);
  const pageCount = source.getPageCount();

  if (mode === "single-file") {
    const unique = Array.from(new Set(ranges.flatMap(rangeToIndices))).sort((a, b) => a - b);
    assertIndices(unique, pageCount);
    const output = await createPdfDocument();
    const copied = await output.copyPages(source, unique);
    for (const page of copied) output.addPage(page);
    return [{ range: null, indices: unique, bytes: await savePdfDocument(output) }];
  }

  const outputs: SplitOutput[] = [];
  for (let i = 0; i < ranges.length; i += 1) {
    const range = ranges[i]!;
    const indices = rangeToIndices(range);
    assertIndices(indices, pageCount);
    onProgress?.({
      current: i + 1,
      total: ranges.length,
      label: t.progress.processingFile(i + 1, ranges.length),
    });
    const output = await createPdfDocument();
    const copied = await output.copyPages(source, indices);
    for (const page of copied) output.addPage(page);
    outputs.push({ range, indices, bytes: await savePdfDocument(output) });
  }
  return outputs;
}

export type RotationDelta = 0 | 90 | 180 | 270;

export function normalizeRotation(angle: number): RotationDelta {
  const normalized = (((Math.round(angle / 90) * 90) % 360) + 360) % 360;
  return normalized as RotationDelta;
}

/**
 * Adds `rotations[index]` degrees to the existing /Rotate of each page. Pages
 * absent from the map are left untouched. Rotation is stored as the standard
 * page attribute: content is never re-rendered, so quality is preserved.
 */
export async function rotatePages(
  bytes: Uint8Array,
  rotations: Record<number, number>,
): Promise<Uint8Array> {
  const doc = await loadPdfDocument(bytes);
  const pages = doc.getPages();
  const entries = Object.entries(rotations);
  if (entries.length === 0)
    throw new PdfError("NO_SELECTION", t.errors.noSelection, { recoverable: true });
  for (const [key, delta] of entries) {
    const index = Number(key);
    const page = pages[index];
    if (!page)
      throw new PdfError("INVALID_RANGE", t.ranges.errorOutOfBounds(pages.length), {
        recoverable: true,
      });
    if (normalizeRotation(delta) === 0) continue;
    const current = page.getRotation().angle;
    page.setRotation(degrees(normalizeRotation(current + delta)));
  }
  return savePdfDocument(doc);
}

export interface PageArrangement {
  /** 0-based index in the source document. */
  sourceIndex: number;
  /** Additional rotation to apply, in degrees. */
  rotation: number;
}

/**
 * Produces a document whose pages follow `arrangement` exactly (order,
 * deletions by omission, duplicates by repetition, per-page rotation).
 */
export async function organizePages(
  bytes: Uint8Array,
  arrangement: PageArrangement[],
): Promise<Uint8Array> {
  const source = await loadPdfDocument(bytes);
  const indices = arrangement.map((a) => a.sourceIndex);
  assertIndices(indices, source.getPageCount());
  const output = await createPdfDocument();
  try {
    const copied = await output.copyPages(source, indices);
    copied.forEach((page, i) => {
      const extra = normalizeRotation(arrangement[i]!.rotation);
      if (extra !== 0)
        page.setRotation(degrees(normalizeRotation(page.getRotation().angle + extra)));
      output.addPage(page);
    });
  } catch (error) {
    throw toPdfError(error);
  }
  return savePdfDocument(output);
}
