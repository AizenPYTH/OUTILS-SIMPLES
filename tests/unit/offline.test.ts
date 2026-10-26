import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatMegabytes, offlineGroupsFor } from "@/lib/offline/needs";
import { getOperationalTools } from "@/lib/tools";
// Plain Node script shared with the build; typed here because the .mjs has no declarations.
import { buildOfflineManifest as buildUntyped } from "../../scripts/build-sw.mjs";

interface Manifest {
  groups: Record<string, { label: string; files: string[]; bytes: number }>;
}
const buildOfflineManifest = buildUntyped as () => Promise<Manifest>;

describe("offline needs", () => {
  it("gives PDF, scan and document tools the PDF engine, OCR only to the OCR tool, fonts to the editor family", () => {
    const byId = new Map(getOperationalTools().map((t) => [t.id, offlineGroupsFor(t)]));
    expect(byId.get("pdf-merge")).toEqual(["pdf"]);
    expect(byId.get("scan-ocr")).toEqual(["pdf", "ocr"]);
    expect(byId.get("pdf-edit")).toEqual(["pdf", "fonts"]);
    expect(byId.get("image-compress")).toEqual([]);
    expect(byId.get("calc-vat")).toEqual([]);
    for (const [id, groups] of byId) {
      if (id.startsWith("pdf-") || id.startsWith("scan-") || id.startsWith("doc-")) {
        expect(groups, id).toContain("pdf");
      }
    }
  });

  it("formats sizes in French", () => {
    expect(formatMegabytes(4.7 * 1024 * 1024)).toBe("4,7 Mo");
    expect(formatMegabytes(17.3 * 1024 * 1024)).toBe("17 Mo");
  });
});

describe("offline manifest (scripts/build-sw.mjs)", () => {
  it("lists only files that exist in public/, with their total size", async () => {
    const manifest = await buildOfflineManifest();
    const publicDir = path.resolve(__dirname, "../../public");
    for (const group of Object.values(manifest.groups)) {
      expect(group.files.length).toBeGreaterThan(0);
      expect(group.bytes).toBeGreaterThan(0);
      for (const file of group.files) {
        expect(file.startsWith("/")).toBe(true);
        await expect(access(path.join(publicDir, file))).resolves.toBeUndefined();
      }
    }
    const { pdf, ocr, fonts } = manifest.groups;
    expect(pdf?.files).toContain("/pdfjs/pdf.worker.min.mjs");
    expect(pdf?.files).toContain("/qpdf/qpdf.wasm");
    expect(ocr?.files).toContain("/ocr/lang/fra.traineddata.gz");
    expect(ocr?.files.some((f) => f.includes("eng."))).toBe(false);
    expect(fonts?.files.every((f) => f.includes("Liberation"))).toBe(true);
  });

  it("keeps the service worker source free of placeholders once built", async () => {
    const source = await readFile(
      path.resolve(__dirname, "../../src/sw/service-worker.js"),
      "utf8",
    );
    expect(source).toContain("__SW_VERSION__");
    expect(source).toContain("__ASSET_KEY__");
    // The built worker exists after `node scripts/build-sw.mjs` (prebuild/postinstall).
    const built = await readFile(path.resolve(__dirname, "../../public/sw.js"), "utf8");
    expect(built).not.toContain("__SW_VERSION__");
    expect(built).not.toContain("__ASSET_KEY__");
  });
});
