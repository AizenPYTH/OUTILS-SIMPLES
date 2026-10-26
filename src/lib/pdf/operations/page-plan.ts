/**
 * Page plan of the editor: the order, rotation, deletions and duplications the
 * user applied to the thumbnails, materialised at export with pdf-lib. Page
 * indices in annotations and text edits always refer to the ORIGINAL pages,
 * so the plan is applied last.
 */
import { PDFDocument, degrees } from "pdf-lib";
import { loadPdfDocument, savePdfDocument } from "../load";

export interface PlannedPage {
  /** Index of the page in the original document. */
  source: number;
  /** Rotation added to the page's own /Rotate, in degrees (multiple of 90). */
  rotation: 0 | 90 | 180 | 270;
}

export type PagePlan = PlannedPage[];

export function identityPlan(pageCount: number): PagePlan {
  return Array.from({ length: pageCount }, (_, i) => ({ source: i, rotation: 0 }));
}

export function isIdentityPlan(plan: PagePlan, pageCount: number): boolean {
  return plan.length === pageCount && plan.every((p, i) => p.source === i && p.rotation === 0);
}

export function rotatePlanned(plan: PagePlan, position: number, delta: 90 | -90): PagePlan {
  return plan.map((p, i) =>
    i === position
      ? { ...p, rotation: ((((p.rotation + delta) % 360) + 360) % 360) as PlannedPage["rotation"] }
      : p,
  );
}

export function removePlanned(plan: PagePlan, position: number): PagePlan {
  if (plan.length <= 1) return plan;
  return plan.filter((_, i) => i !== position);
}

export function duplicatePlanned(plan: PagePlan, position: number): PagePlan {
  const page = plan[position];
  if (!page) return plan;
  return [...plan.slice(0, position + 1), { ...page }, ...plan.slice(position + 1)];
}

export function movePlanned(plan: PagePlan, from: number, to: number): PagePlan {
  if (from === to || from < 0 || to < 0 || from >= plan.length || to >= plan.length) return plan;
  const next = [...plan];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/** Builds a new document following the plan; a no-op plan returns the input bytes. */
export async function applyPagePlan(bytes: Uint8Array, plan: PagePlan): Promise<Uint8Array> {
  const source = await loadPdfDocument(bytes);
  if (isIdentityPlan(plan, source.getPageCount())) return bytes;
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    source,
    plan.map((p) => p.source),
  );
  copied.forEach((page, i) => {
    const planned = plan[i]!;
    if (planned.rotation)
      page.setRotation(degrees((page.getRotation().angle + planned.rotation) % 360));
    out.addPage(page);
  });
  const title = source.getTitle();
  if (title) out.setTitle(title);
  return savePdfDocument(out);
}
