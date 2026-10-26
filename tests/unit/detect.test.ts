import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DETECT_HEAD_BYTES, detectFileKind, KIND_TOOLS } from "@/lib/files/detect";
import { clearHandoff, setHandoff, takeHandoff } from "@/lib/files/handoff";
import { getToolById } from "@/lib/tools";

const fixtures = path.resolve(__dirname, "../fixtures");
const head = async (name: string) =>
  new Uint8Array(await readFile(path.join(fixtures, name))).subarray(0, DETECT_HEAD_BYTES);

describe("file kind detection", () => {
  it("recognises real fixtures by their bytes, whatever the extension says", async () => {
    expect(detectFileKind("x.bin", await head("simple-3-pages.pdf"))).toBe("pdf");
    expect(detectFileKind("photo", await head("photo-800x600.jpg"))).toBe("image");
    expect(detectFileKind("logo.txt", await head("logo-alpha.png"))).toBe("image");
    expect(detectFileKind("doc.zip", await head("office-sample.docx"))).toBe("docx");
    expect(detectFileKind("sheet.bin", await head("office-sample.xlsx"))).toBe("xlsx");
    expect(detectFileKind("office-sample.csv", await head("office-sample.csv"))).toBe("csv");
    expect(detectFileKind("not-a-pdf.txt", await head("not-a-pdf.txt"))).toBe("text");
  });

  it("uses signatures for WebP, GIF, HEIC and ZIP, and text heuristics for CSV / Markdown", () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0, 0, 0,
    ]);
    expect(detectFileKind("a", webp)).toBe("image");
    expect(detectFileKind("a", enc("GIF89a........"))).toBe("image");
    const heic = new Uint8Array([
      0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0, 0, 0, 0,
    ]);
    expect(detectFileKind("IMG_0001", heic)).toBe("heic");
    const zip = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0, 0, 0, 0, 0, 0x61, 0x2e, 0x74, 0x78, 0x74,
    ]);
    expect(detectFileKind("archive.zip", zip)).toBe("zip");
    expect(
      detectFileKind(
        "archive.zip",
        new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...enc("ppt/slides/")]),
      ),
    ).toBe("pptx");
    expect(detectFileKind("export", enc("a;b;c\n1;2;3\n4;5;6\n"))).toBe("csv");
    expect(detectFileKind("notes.md", enc("# Titre\n\ntexte"))).toBe("markdown");
    expect(detectFileKind("README", enc("# Titre\n\n- un\n- deux\n"))).toBe("markdown");
    expect(detectFileKind("binary.dat", new Uint8Array([0, 1, 2, 3, 0, 0, 7, 8]))).toBe("unknown");
    expect(detectFileKind("", new Uint8Array())).toBe("unknown");
  });

  it("suggests only published tools, the editor first for PDFs, nothing for PowerPoint", () => {
    for (const ids of Object.values(KIND_TOOLS)) {
      for (const id of ids) expect(getToolById(id)?.status, id).toBe("published");
    }
    expect(KIND_TOOLS.pdf[0]).toBe("pdf-edit");
    expect(KIND_TOOLS.pptx).toEqual([]);
    expect(KIND_TOOLS.docx).toEqual(["conv-docx-pdf"]);
  });
});

describe("file handoff", () => {
  it("hands a file over once", () => {
    clearHandoff();
    const file = new File([new Uint8Array([1, 2])], "a.pdf", { type: "application/pdf" });
    setHandoff(file);
    expect(takeHandoff()).toBe(file);
    expect(takeHandoff()).toBeNull();
  });
});
