import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  appendDocument,
  applyPagePlan,
  identityPlan,
  insertPlanned,
} from "@/lib/pdf/operations/page-plan";

const fixtures = path.resolve(__dirname, "../fixtures");
const fixture = async (name: string) => new Uint8Array(await readFile(path.join(fixtures, name)));

describe("editor: inserting the pages of another PDF", () => {
  it("appends the other document at the end so existing page indices stay valid", async () => {
    const base = await fixture("simple-3-pages.pdf");
    const other = await fixture("simple-5-pages.pdf");
    const appended = await appendDocument(base, other);
    expect(appended).toMatchObject({ firstIndex: 3, count: 5 });
    const doc = await PDFDocument.load(appended.bytes);
    expect(doc.getPageCount()).toBe(8);
  });

  it("places the new pages in the plan after the chosen position, then the export follows the plan", async () => {
    const base = await fixture("simple-3-pages.pdf");
    const other = await fixture("simple-5-pages.pdf");
    const appended = await appendDocument(base, other);
    const sources = Array.from({ length: appended.count }, (_, i) => appended.firstIndex + i);
    const plan = insertPlanned(identityPlan(3), 0, sources);
    expect(plan.map((p) => p.source)).toEqual([0, 3, 4, 5, 6, 7, 1, 2]);
    expect(insertPlanned(identityPlan(3), -1, [3]).map((p) => p.source)).toEqual([3, 0, 1, 2]);
    expect(insertPlanned(identityPlan(3), 2, [3]).map((p) => p.source)).toEqual([0, 1, 2, 3]);
    const out = await PDFDocument.load(await applyPagePlan(appended.bytes, plan));
    expect(out.getPageCount()).toBe(8);
  });
});
