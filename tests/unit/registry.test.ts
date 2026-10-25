import { describe, expect, it } from "vitest";
import {
  getIndexableTools,
  getPublishedTools,
  getRelatedTools,
  getToolByPath,
  getToolPath,
  isToolIndexable,
  searchTools,
  toolRegistry,
  validateRegistry,
  normalizeSearchText,
  getActiveCategories,
} from "@/lib/tools";
import { buildSitemapEntries } from "@/app/sitemap";
import { toolGroups } from "@/lib/tools/groups";
import { buildToolMetadata } from "@/lib/seo";

describe("tool registry", () => {
  it("is internally consistent", () => {
    const issues = validateRegistry();
    expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
  });

  it("publishes the core PDF tools and nothing unfinished", () => {
    const published = getPublishedTools();
    const ids = published.map((t) => t.id);
    expect(ids.length).toBeGreaterThanOrEqual(30);
    expect(ids).toEqual(expect.arrayContaining(
      [
        "pdf-add-text",
        "pdf-annotate",
        "pdf-compress",
        "pdf-edit",
        "pdf-extract-pages",
        "pdf-fill-form",
        "pdf-manage-watermark",
        "pdf-merge",
        "pdf-organize",
        "pdf-rotate",
        "pdf-sign",
        "pdf-split",
        "pdf-watermark",
      ]),
    );
    expect(
      toolRegistry.filter((t) => t.status === "planned").every((t) => !isToolIndexable(t)),
    ).toBe(true);
  });

  it("builds the documented URL structure", () => {
    expect(getToolPath(getToolByPath("pdf", "fusionner")!)).toBe("/pdf/fusionner/");
    expect(getToolPath(getToolByPath("pdf", "modifier")!)).toBe("/pdf/modifier/");
    expect(getToolByPath("images", "compresser")?.status).toBe("published");
    expect(getToolByPath("numerisation", "ocr")?.status).toBe("published");
    expect(getToolByPath("numerisation", "corriger-un-document-photographie")?.status).toBe("published");
    expect(getToolByPath("documents", "markdown-vers-pdf")?.status).toBe("published");
    expect(getActiveCategories().map((c) => c.id)).toEqual(expect.arrayContaining(["pdf", "images", "texte", "developpeur", "codes"]));
  });

  it("resolves related tools to published ones only", () => {
    const merge = getToolByPath("pdf", "fusionner")!;
    const related = getRelatedTools(merge);
    expect(related.length).toBeGreaterThan(0);
    expect(related.every((t) => t.status === "published")).toBe(true);
    expect(related.some((t) => t.id === merge.id)).toBe(false);
  });

  it("produces unique metadata per published tool", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const tool of getPublishedTools()) {
      const metadata = buildToolMetadata(tool);
      expect(typeof metadata.title).toBe("string");
      titles.add(metadata.title as string);
      descriptions.add(metadata.description as string);
      expect(metadata.alternates?.canonical).toBe(`http://localhost:3000${getToolPath(tool)}`);
      expect(metadata.robots).toEqual({ index: true, follow: true });
    }
    expect(titles.size).toBe(getPublishedTools().length);
    expect(descriptions.size).toBe(getPublishedTools().length);
  });
});

describe("sitemap", () => {
  it("contains indexable tools only", () => {
    const urls = buildSitemapEntries().map((e) => e.url);
    for (const tool of getIndexableTools())
      expect(urls).toContain(`http://localhost:3000${getToolPath(tool)}`);
    for (const tool of toolRegistry.filter((t) => t.status !== "published")) {
      expect(
        urls.some((u) => u.endsWith(`/${tool.slug}/`) && u.includes(`/${tool.category}/`)),
      ).toBe(false);
    }
    expect(urls).toContain("http://localhost:3000/");
    expect(urls).toContain("http://localhost:3000/pdf/");
    expect(urls).toContain("http://localhost:3000/images/");
    expect(urls).toContain("http://localhost:3000/numerisation/ocr/");
    expect(urls).toContain("http://localhost:3000/numerisation/corriger-un-document-photographie/");
    expect(urls).toContain("http://localhost:3000/documents/markdown-vers-pdf/");
    // Categories without a published tool are not exposed.
    expect(urls).toContain("http://localhost:3000/calculatrices/tva/");
    expect(urls.some((u) => u.includes("/conversion/"))).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("search", () => {
  const published = getPublishedTools();

  it("normalises accents and case", () => {
    expect(normalizeSearchText("Éditer un PDF !")).toBe("editer un pdf");
  });

  it("finds tools by name, keyword and synonym", () => {
    expect(searchTools(published, "fusionner")[0]?.tool.id).toBe("pdf-merge");
    expect(searchTools(published, "assembler")[0]?.tool.id).toBe("pdf-merge");
    expect(searchTools(published, "merge pdf")[0]?.tool.id).toBe("pdf-merge");
    expect(searchTools(published, "signature")[0]?.tool.id).toBe("pdf-sign");
    expect(searchTools(published, "alléger")[0]?.tool.id).toBe("pdf-compress");
    expect(searchTools(published, "FILIGRANE").map((r) => r.tool.id)).toContain("pdf-watermark");
  });

  it("requires every token to match and returns nothing for nonsense", () => {
    expect(searchTools(published, "xyzzy")).toEqual([]);
    expect(searchTools(published, "fusionner licorne")).toEqual([]);
    expect(searchTools(published, "   ")).toEqual([]);
  });
});

describe("catalogue groups", () => {
  it("reference existing published tools of their own category, each at most once", () => {
    const seen = new Set<string>();
    for (const group of toolGroups) {
      for (const id of group.ids) {
        const tool = toolRegistry.find((t) => t.id === id);
        expect(tool, id).toBeTruthy();
        expect(tool!.category, id).toBe(group.category);
        expect(seen.has(id), `${id} listed twice`).toBe(false);
        seen.add(id);
      }
    }
  });
});
