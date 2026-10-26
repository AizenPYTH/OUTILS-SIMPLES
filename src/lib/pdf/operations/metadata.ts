import { PDFDict, PDFHexString, PDFName, PDFString, PDFDocument } from "pdf-lib";
import { loadPdfDocument, savePdfDocument } from "../load";

export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string;
  modificationDate: string;
  /** Other Info entries (custom keys). */
  custom: Record<string, string>;
  hasXmp: boolean;
  pdfVersion: string;
  pageCount: number;
  encrypted: boolean;
}

function readInfoString(info: PDFDict | undefined, key: string): string {
  const value = info?.get(PDFName.of(key));
  if (value instanceof PDFString || value instanceof PDFHexString) return value.decodeText();
  return "";
}

function readDate(info: PDFDict | undefined, key: string): string {
  const raw = readInfoString(info, key);
  const match = /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/.exec(raw);
  if (!match) return raw;
  const [, y, mo = "01", d = "01", h = "00", mi = "00", s = "00"] = match;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}

export function readMetadataFromDocument(doc: PDFDocument, bytes: Uint8Array): PdfMetadata {
  const info = doc.context.lookup(doc.context.trailerInfo.Info);
  const dict = info instanceof PDFDict ? info : undefined;
  const standard = new Set([
    "Title",
    "Author",
    "Subject",
    "Keywords",
    "Creator",
    "Producer",
    "CreationDate",
    "ModDate",
    "Trapped",
  ]);
  const custom: Record<string, string> = {};
  if (dict) {
    for (const [key, value] of dict.entries()) {
      const name = key.decodeText();
      if (standard.has(name)) continue;
      if (value instanceof PDFString || value instanceof PDFHexString)
        custom[name] = value.decodeText();
      else custom[name] = value.toString();
    }
  }
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, 16));
  const version = /%PDF-(\d\.\d)/.exec(header)?.[1] ?? "?";
  return {
    title: readInfoString(dict, "Title"),
    author: readInfoString(dict, "Author"),
    subject: readInfoString(dict, "Subject"),
    keywords: readInfoString(dict, "Keywords"),
    creator: readInfoString(dict, "Creator"),
    producer: readInfoString(dict, "Producer"),
    creationDate: readDate(dict, "CreationDate"),
    modificationDate: readDate(dict, "ModDate"),
    custom,
    hasXmp: doc.catalog.has(PDFName.of("Metadata")),
    pdfVersion: version,
    pageCount: doc.getPageCount(),
    encrypted: doc.isEncrypted,
  };
}

export async function readMetadata(bytes: Uint8Array): Promise<PdfMetadata> {
  const doc = await loadPdfDocument(bytes, { updateMetadata: false });
  return readMetadataFromDocument(doc, bytes);
}

export interface MetadataEdit {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
}

/**
 * Removes every Info entry and the XMP metadata stream, then optionally sets
 * the fields the user wants to keep. Producer/Creator are left empty rather
 * than replaced, so nothing identifies the original software.
 */
export async function stripMetadata(
  bytes: Uint8Array,
  keep: MetadataEdit = {},
): Promise<Uint8Array> {
  const doc = await loadPdfDocument(bytes, { updateMetadata: false });
  const infoRef = doc.context.trailerInfo.Info;
  const info = doc.context.lookup(infoRef);
  if (info instanceof PDFDict) {
    for (const [key] of info.entries()) info.delete(key);
  }
  if (doc.catalog.has(PDFName.of("Metadata"))) {
    const ref = doc.catalog.get(PDFName.of("Metadata"));
    doc.catalog.delete(PDFName.of("Metadata"));
    if (ref && "objectNumber" in ref) doc.context.delete(ref as never);
  }
  // Also drop page-level /Metadata streams (some generators attach XMP per page).
  for (const page of doc.getPages()) {
    if (page.node.has(PDFName.of("Metadata"))) page.node.delete(PDFName.of("Metadata"));
  }
  if (keep.title) doc.setTitle(keep.title);
  if (keep.author) doc.setAuthor(keep.author);
  if (keep.subject) doc.setSubject(keep.subject);
  if (keep.keywords) doc.setKeywords(keep.keywords.split(/[,;]\s*/).filter(Boolean));
  return doc.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false });
}

/** Updates standard fields without touching anything else. */
export async function updateMetadata(bytes: Uint8Array, edit: MetadataEdit): Promise<Uint8Array> {
  const doc = await loadPdfDocument(bytes, { updateMetadata: false });
  if (edit.title !== undefined) doc.setTitle(edit.title);
  if (edit.author !== undefined) doc.setAuthor(edit.author);
  if (edit.subject !== undefined) doc.setSubject(edit.subject);
  if (edit.keywords !== undefined) doc.setKeywords(edit.keywords.split(/[,;]\s*/).filter(Boolean));
  doc.setModificationDate(new Date());
  return savePdfDocument(doc);
}
