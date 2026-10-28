import { describe, expect, it } from "vitest";
import "@/lib/i18n/register-en";
import "@/lib/i18n/register-en-registry";
import { getCategories, getPublishedTools, toolCategories } from "@/lib/tools";
import {
  getToolGroups,
  otherToolsGroupName,
  toolGroupNamesEn,
  toolGroups,
} from "@/lib/tools/groups";
import { formatInputFormat, getToolInputLimits } from "@/lib/tools/input-limits";

const FRENCH_MARKERS =
  /[éèêàçùôî]|\b(Outils|outils|Numérisation|Développeur|Calculs|couleurs|Organiser|Modifier|Convertir|Optimiser|Analyser|Retoucher|Données|Générateurs|Utilitaires|Autres|imprimer|Texte)\b/;

describe("catalogue labels (design audit N1)", () => {
  it("every sub-group has an English name without French words", () => {
    for (const group of toolGroups) {
      const en = toolGroupNamesEn[group.name];
      expect(en, group.name).toBeTruthy();
      expect(en, group.name).not.toMatch(FRENCH_MARKERS);
    }
    expect(otherToolsGroupName("en")).toBe("Other");
    expect(otherToolsGroupName("fr")).toBe("Autres");
  });

  it("sub-groups keep their French names on French pages", () => {
    expect(getToolGroups("pdf", "fr").map((g) => g.name)).toEqual(
      toolGroups.filter((g) => g.category === "pdf").map((g) => g.name),
    );
    expect(getToolGroups("pdf", "en").map((g) => g.name)).toContain("Organise pages");
  });

  it("all nine families have English names and short names", () => {
    const en = getCategories("en");
    expect(en).toHaveLength(9);
    for (const c of en) {
      expect(c.name, c.id).not.toMatch(FRENCH_MARKERS);
      expect(c.shortName, c.id).not.toMatch(FRENCH_MARKERS);
    }
    // French definitions are untouched.
    expect(getCategories("fr").map((c) => c.name)).toEqual(toolCategories.map((c) => c.name));
  });
});

describe("tool input limits (design audit T1)", () => {
  const published = getPublishedTools("fr");
  const byId = (id: string) => published.find((x) => x.id === id)!;
  const noFileIds = [
    "calc-percent",
    "calc-vat",
    "calc-dates",
    "calc-units",
    "qr-generate",
    "barcode-generate",
    "color-convert",
    "doc-paper",
    "doc-calendar",
    "doc-cover",
  ];

  it("tools without file input show no size and no format list", () => {
    for (const id of noFileIds) {
      const limits = getToolInputLimits(byId(id), "fr");
      expect(limits, id).toEqual({
        acceptsFiles: false,
        formats: [],
        maxFileSizeBytes: null,
        maxFileCount: null,
      });
    }
  });

  it("only these ten published tools take no file", () => {
    const none = published
      .filter((x) => !getToolInputLimits(x, "fr").acceptsFiles)
      .map((x) => x.id);
    expect(none.sort()).toEqual([...noFileIds].sort());
  });

  it("file tools keep their real limits, with readable format names", () => {
    const merge = getToolInputLimits(byId("pdf-merge"), "fr");
    expect(merge.acceptsFiles).toBe(true);
    expect(merge.formats).toEqual(["PDF"]);
    expect(merge.maxFileSizeBytes).toBe(byId("pdf-merge").limits.maxFileSizeBytes);
    expect(merge.maxFileCount).toBe(byId("pdf-merge").limits.maxFileCount);

    const image = getToolInputLimits(byId("image-compress"), "fr");
    expect(image.formats).toEqual(expect.arrayContaining(["JPEG", "PNG", "GIF", "SVG"]));
    expect(image.formats.some((f) => f.includes("/"))).toBe(false);

    const word = getToolInputLimits(byId("conv-docx-pdf"), "fr");
    expect(word.formats).toEqual(["Word (.docx)"]);
  });

  it("every format of every published tool has a readable label in both languages", () => {
    for (const tool of published) {
      for (const mime of tool.inputFormats) {
        for (const locale of ["fr", "en"] as const) {
          expect(formatInputFormat(mime, locale), `${tool.id} ${mime}`).not.toContain("/");
        }
      }
    }
    expect(formatInputFormat("text/plain", "en")).toBe("Text");
    expect(formatInputFormat("text/plain", "fr")).toBe("Texte");
  });
});

describe("reserved tool heights (layout stability)", () => {
  it("only reference published form-based tools, with plausible heights", async () => {
    const { workspaceHeights } = await import("@/lib/tools/workspace-heights");
    const published = getPublishedTools("fr");
    const ids = Object.keys(workspaceHeights);
    expect(ids.length).toBeGreaterThan(20);
    for (const id of ids) {
      const tool = published.find((x) => x.id === id);
      expect(tool, id).toBeTruthy();
      // Drop-zone families are deliberately not reserved (LCP, see the script).
      expect(["pdf", "numerisation", "images", "conversion"], id).not.toContain(tool!.category);
      for (const h of workspaceHeights[id]!) {
        expect(h, id).toBeGreaterThan(150);
        expect(h, id).toBeLessThan(2000);
      }
    }
  });
});

describe("server-rendered tools", () => {
  it("are published tools with a client implementation too", async () => {
    const { SERVER_RENDERED_TOOL_IDS } = await import("@/components/tools/ssr-tool-ids");
    const published = getPublishedTools("fr").map((x) => x.id);
    for (const id of SERVER_RENDERED_TOOL_IDS) expect(published, id).toContain(id);
  });
});
