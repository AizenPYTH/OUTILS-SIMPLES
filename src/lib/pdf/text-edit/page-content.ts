import { PDFDocument } from "pdf-lib";
import { pageContentBytes } from "./apply";

const cache = new WeakMap<Uint8Array, Promise<PDFDocument>>();

/** Decoded page content for a document, parsing the bytes with pdf-lib once. */
export async function getPageContent(bytes: Uint8Array, pageIndex: number): Promise<Uint8Array> {
  let pending = cache.get(bytes);
  if (!pending) {
    pending = PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
      throwOnInvalidObject: false,
    });
    cache.set(bytes, pending);
  }
  const doc = await pending;
  return pageContentBytes(doc, doc.getPage(pageIndex));
}
