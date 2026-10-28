import { describe, expect, it } from "vitest";
import exifr from "exifr";
import { PDFDocument, PDFName, PDFString, StandardFonts } from "pdf-lib";
import {
  describeExif,
  detectMetadataFormat,
  stripImageMetadata,
  stripJpegMetadata,
  stripPngMetadata,
} from "@/lib/images/metadata";
import { crc32, encodePng } from "@/lib/images/png-encode";
import {
  extractLinkAnnotations,
  findTextLinks,
  linksToCsv,
  mergeLinks,
} from "@/lib/pdf/operations/links";
import { extractImages } from "@/lib/pdf/operations/extract-images";
import { compareReport, comparePageTexts } from "@/lib/pdf/operations/compare";
import { normalizeRect, padRect, replacePagesWithImages } from "@/lib/pdf/operations/redact";
import { textToPdf, defaultTextToPdfOptions } from "@/lib/pdf/operations/text-to-pdf";
import { readMetadata } from "@/lib/pdf/operations/metadata";
import { extractPageText, fixture, openPdf } from "../helpers";

/** Minimal EXIF APP1 segment (little-endian TIFF, one IFD0 entry: Make = value). */
function exifApp1(make: string): Uint8Array {
  const value = new TextEncoder().encode(make + "\0");
  const tiff = new Uint8Array(8 + 2 + 12 + 4 + value.length);
  tiff.set([0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0], 0); // "II*\0", IFD offset 8
  tiff.set([1, 0], 8); // 1 entry
  tiff.set([0x0f, 0x01, 2, 0], 10); // tag 0x010F (Make), type ASCII
  tiff.set([value.length & 0xff, (value.length >> 8) & 0xff, 0, 0], 14);
  const valueOffset = 8 + 2 + 12 + 4;
  tiff.set([valueOffset & 0xff, (valueOffset >> 8) & 0xff, 0, 0], 18);
  tiff.set([0, 0, 0, 0], 22); // next IFD
  tiff.set(value, valueOffset);
  const header = new TextEncoder().encode("Exif\0\0");
  const length = 2 + header.length + tiff.length;
  const seg = new Uint8Array(2 + length);
  seg.set([0xff, 0xe1, (length >> 8) & 0xff, length & 0xff], 0);
  seg.set(header, 4);
  seg.set(tiff, 4 + header.length);
  return seg;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

describe("image metadata", () => {
  it("strips an EXIF segment from a JPEG without touching the pixels", async () => {
    const photo = await fixture("photo-800x600.jpg");
    const withExif = concat(photo.subarray(0, 2), exifApp1("AVEROPDF"), photo.subarray(2));
    const before = (await exifr.parse(withExif, { tiff: true, exif: true })) as
      Record<string, unknown> | undefined;
    expect(before?.Make).toBe("AVEROPDF");
    const baseline = stripJpegMetadata(photo);
    const stripped = stripJpegMetadata(withExif);
    expect(stripped.removed).toBe(baseline.removed + 1);
    expect(stripped.bytes.length).toBe(baseline.bytes.length);
    const after = await exifr.parse(stripped.bytes, { tiff: true, exif: true });
    expect(after?.Make).toBeUndefined();
    const doc = await PDFDocument.create();
    const image = await doc.embedJpg(stripped.bytes);
    expect(image.width).toBe(800);
    expect(detectMetadataFormat(photo)).toBe("jpeg");
    expect(stripImageMetadata(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))).toBeNull();
  });

  it("strips text chunks from a PNG and keeps it decodable", async () => {
    const png = await fixture("logo-alpha.png");
    // Insert a tEXt chunk right after IHDR (8 signature + 25 IHDR bytes).
    const text = new TextEncoder().encode("Author\0Jean");
    const chunk = new Uint8Array(12 + text.length);
    chunk.set([0, 0, 0, text.length], 0);
    chunk.set([0x74, 0x45, 0x58, 0x74], 4);
    chunk.set(text, 8);
    const crc = crc32(chunk.subarray(4, 8 + text.length));
    chunk.set(
      [(crc >>> 24) & 255, (crc >>> 16) & 255, (crc >>> 8) & 255, crc & 255],
      8 + text.length,
    );
    const withText = concat(png.subarray(0, 33), chunk, png.subarray(33));
    const stripped = stripPngMetadata(withText);
    expect(stripped.removed).toBe(1);
    expect(stripped.bytes.length).toBe(png.length);
    const doc = await PDFDocument.create();
    const image = await doc.embedPng(stripped.bytes);
    expect(image.width).toBeGreaterThan(0);
  });

  it("describes EXIF tags in French and flags sensitive ones", () => {
    const summary = describeExif({
      Make: "Pixel",
      Model: "7",
      ExposureTime: 0.004,
      FNumber: 1.85,
      latitude: 48.8584,
      longitude: 2.2945,
      Foo: 1,
    });
    expect(summary.gps).toEqual({ latitude: 48.8584, longitude: 2.2945 });
    expect(summary.rows[0]!.label).toBe("Position GPS");
    expect(summary.rows.find((r) => r.key === "ExposureTime")!.value).toBe("1/250 s");
    expect(summary.rows.find((r) => r.key === "Make")!.sensitive).toBe(true);
    expect(summary.total).toBe(5);
    expect(describeExif(null).rows).toHaveLength(0);
  });
});

describe("png encoder", () => {
  it("computes CRC32 and produces a PNG pdf-lib can embed", async () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    const rgb = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]);
    const png = encodePng(2, 2, 3, rgb);
    const doc = await PDFDocument.create();
    const image = await doc.embedPng(png);
    expect([image.width, image.height]).toEqual([2, 2]);
    const gray = encodePng(3, 1, 1, new Uint8Array([0, 128, 255]));
    expect((await doc.embedPng(gray)).width).toBe(3);
    expect(() => encodePng(2, 2, 3, new Uint8Array(3))).toThrow();
  });
});

async function pdfWithLinks(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([400, 300]);
  page.drawText("Voir https://averopdf.fr/aide. Contact : contact@exemple.fr", {
    x: 20,
    y: 200,
    size: 10,
    font,
  });
  const annot = doc.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [20, 190, 200, 210],
    Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of("https://averopdf.fr/") },
  });
  page.node.addAnnot(doc.context.register(annot));
  const internal = doc.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [20, 100, 60, 120],
    Dest: [page.ref, PDFName.of("Fit")],
  });
  page.node.addAnnot(doc.context.register(internal));
  return doc.save();
}

describe("pdf links", () => {
  it("reads link annotations and finds addresses in the text", async () => {
    const bytes = await pdfWithLinks();
    const annots = await extractLinkAnnotations(bytes);
    expect(annots.links).toEqual([{ pageIndex: 0, url: "https://averopdf.fr/", kind: "lien" }]);
    expect(annots.internalLinks).toBe(1);
    const text = (await extractPageText(bytes, 0)).join(" ");
    const found = findTextLinks([{ pageIndex: 0, text }]);
    expect(found.map((l) => l.url)).toEqual([
      "https://averopdf.fr/aide",
      "mailto:contact@exemple.fr",
    ]);
    const merged = mergeLinks(annots.links, found, found);
    expect(merged).toHaveLength(3);
    expect(linksToCsv(merged).split("\n")).toHaveLength(4);
    expect(findTextLinks([{ pageIndex: 2, text: "site www.exemple.org, fin." }])[0]).toEqual({
      pageIndex: 2,
      url: "https://www.exemple.org",
      kind: "texte",
    });
  });
});

describe("pdf image extraction", () => {
  it("converts a raw RGB image to PNG", async () => {
    const result = await extractImages(await fixture("image-raw-rgb.pdf"));
    expect(result.skipped).toHaveLength(0);
    expect(result.images).toHaveLength(1);
    const image = result.images[0]!;
    expect(image.mimeType).toBe("image/png");
    const doc = await PDFDocument.create();
    const embedded = await doc.embedPng(image.bytes);
    expect([embedded.width, embedded.height]).toEqual([image.width, image.height]);
  });

  it("copies JPEG streams verbatim and rebuilds PNG with transparency", async () => {
    const photo = await fixture("photo-800x600.jpg");
    const logo = await fixture("logo-alpha.png");
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const jpg = await doc.embedJpg(photo);
    const png = await doc.embedPng(logo);
    page.drawImage(jpg, { x: 0, y: 0, width: 300, height: 225 });
    page.drawImage(png, { x: 0, y: 400, width: 100, height: 100 });
    const bytes = await doc.save();
    const result = await extractImages(bytes);
    expect(result.images).toHaveLength(2);
    const jpeg = result.images.find((i) => i.mimeType === "image/jpeg")!;
    expect(jpeg.bytes.length).toBe(photo.length);
    expect([jpeg.width, jpeg.height]).toEqual([800, 600]);
    const rebuilt = result.images.find((i) => i.mimeType === "image/png")!;
    expect(rebuilt.note).toBeUndefined();
    const check = await (await PDFDocument.create()).embedPng(rebuilt.bytes);
    expect(check.width).toBe(png.width);
    expect(result.skipped).toHaveLength(0);
  });
});

describe("pdf comparison", () => {
  it("reports changed, added and identical pages", () => {
    const result = comparePageTexts(
      ["Bonjour le monde", "Page deux"],
      ["Bonjour tout le monde", "Page deux", "Page trois"],
    );
    expect(result.pages.map((p) => p.status)).toEqual(["changed", "identical", "added"]);
    expect(result.changedPages).toBe(2);
    expect(result.identical).toBe(false);
    expect(result.totalAdded).toBeGreaterThan(0);
    expect(comparePageTexts(["a  b"], ["a b"]).identical).toBe(true);
    expect(comparePageTexts(["", ""], [""]).noText).toBe(true);
    const report = compareReport(result, "a.pdf", "b.pdf");
    expect(report).toContain("Pages modifiées : 2 / 3");
    expect(report).toContain("Page 3 (ajoutée)");
  });
});

describe("redaction by rasterisation", () => {
  it("replaces redacted pages by images and strips metadata", async () => {
    const source = await fixture("simple-3-pages.pdf");
    const raster = await fixture("logo-alpha.png");
    const out = await replacePagesWithImages(source, [
      { pageIndex: 1, bytes: raster, mimeType: "image/png" },
    ]);
    const doc = await openPdf(out);
    expect(doc.getPageCount()).toBe(3);
    expect((await extractPageText(out, 0)).join(" ")).toContain("Page 1");
    expect(await extractPageText(out, 1)).toHaveLength(0);
    expect((await extractPageText(out, 2)).join(" ")).toContain("Page 3");
    const meta = await readMetadata(out);
    expect(meta.title).toBe("");
    expect(meta.hasXmp).toBe(false);
    expect(normalizeRect(10, 10, 12, 12)).toBeNull();
    expect(normalizeRect(50, 60, 10, 20)).toEqual({ x: 10, y: 20, width: 40, height: 40 });
    expect(padRect({ x: 2, y: 2, width: 10, height: 10 }, 4, { width: 14, height: 100 })).toEqual({
      x: 0,
      y: 0,
      width: 14,
      height: 18,
    });
  });
});

describe("markdown and text to PDF", () => {
  const markdown = `# Titre principal

Un paragraphe avec du **gras**, de l'*italique*, du \`code\` et un [lien](https://averopdf.fr/).

- Premier point
- Deuxième point
  1. Sous-point numéroté
  2. Autre & encore

> Une citation.

\`\`\`js
const x = 1;
\`\`\`

| Colonne A | Colonne B |
| --- | --- |
| 1 | deux |

---

Fin du document.`;

  it("renders headings, lists, tables, code and links", async () => {
    const result = await textToPdf(markdown, { ...defaultTextToPdfOptions, pageNumbers: true });
    expect(result.pageCount).toBe(1);
    expect(result.replacedCharacters).toBe(false);
    expect(result.skipped).toHaveLength(0);
    const text = (await extractPageText(result.bytes, 0)).join(" ");
    expect(text).toContain("Titre principal");
    expect(text).toContain("Premier point");
    expect(text).toContain("Sous-point");
    expect(text).toContain("Autre & encore");
    expect(text).toContain("const x = 1;");
    expect(text).toContain("Colonne B");
    expect(text).toContain("1 / 1");
    const links = await extractLinkAnnotations(result.bytes);
    expect(links.links).toEqual([{ pageIndex: 0, url: "https://averopdf.fr/", kind: "lien" }]);
  });

  it("paginates long plain text, numbers pages and flags unsupported characters", async () => {
    const long = Array.from(
      { length: 120 },
      (_, i) => `Ligne ${i + 1} : du texte pour remplir la page, encore et encore.`,
    ).join("\n");
    const result = await textToPdf(`${long}\n\nEmoji 🙂 ici`, {
      ...defaultTextToPdfOptions,
      markdown: false,
      fontFamily: "courier",
      fontSize: 12,
    });
    expect(result.pageCount).toBeGreaterThan(1);
    expect(result.replacedCharacters).toBe(true);
    const last = (await extractPageText(result.bytes, result.pageCount - 1)).join(" ");
    expect(last).toContain(`${result.pageCount} / ${result.pageCount}`);
    expect(last).toContain("Emoji ? ici");
    await expect(textToPdf("   ", defaultTextToPdfOptions)).rejects.toThrow(/vide/);
  });

  it("notes skipped images and keeps their alternative text", async () => {
    const result = await textToPdf("Photo : ![Un chat](chat.png) voilà.", defaultTextToPdfOptions);
    expect(result.skipped).toEqual(["Image ignorée : Un chat"]);
    expect((await extractPageText(result.bytes, 0)).join(" ")).toContain("[Un chat]");
  });
});
