import { PDFArray, PDFDict, PDFHexString, PDFName, PDFString } from "pdf-lib";
import { loadPdfDocument } from "../load";
import { tr } from "@/lib/i18n/messages";

export type LinkKind = "lien" | "texte" | "e-mail";

export interface PdfLink {
  pageIndex: number;
  url: string;
  /** "lien" = clickable annotation, "texte"/"e-mail" = found in the page text. */
  kind: LinkKind;
}

export interface LinkExtraction {
  links: PdfLink[];
  /** Internal links (to another page of the same document). */
  internalLinks: number;
}

function decodeString(value: unknown): string | null {
  if (value instanceof PDFString || value instanceof PDFHexString) return value.decodeText();
  return null;
}

/** Reads clickable link annotations (URI actions) from every page. */
export async function extractLinkAnnotations(bytes: Uint8Array): Promise<LinkExtraction> {
  const doc = await loadPdfDocument(bytes);
  const links: PdfLink[] = [];
  let internalLinks = 0;
  doc.getPages().forEach((page, pageIndex) => {
    const annots = page.node.Annots();
    if (!(annots instanceof PDFArray)) return;
    for (let i = 0; i < annots.size(); i += 1) {
      const annot = doc.context.lookup(annots.get(i));
      if (!(annot instanceof PDFDict)) continue;
      const subtype = annot.get(PDFName.of("Subtype"));
      if (!(subtype instanceof PDFName) || subtype.decodeText() !== "Link") continue;
      const action = doc.context.lookup(annot.get(PDFName.of("A")));
      if (action instanceof PDFDict) {
        const kind = action.get(PDFName.of("S"));
        const kindName = kind instanceof PDFName ? kind.decodeText() : "";
        if (kindName === "URI") {
          const uri = decodeString(doc.context.lookup(action.get(PDFName.of("URI"))));
          if (uri) {
            links.push({
              pageIndex,
              url: uri,
              kind: uri.toLowerCase().startsWith("mailto:") ? "e-mail" : "lien",
            });
            continue;
          }
        }
        if (kindName === "GoTo") internalLinks += 1;
        continue;
      }
      if (annot.has(PDFName.of("Dest"))) internalLinks += 1;
    }
  });
  return { links, internalLinks };
}

const URL_PATTERN = /\b((?:https?:\/\/|www\.)[^\s<>"'()[\]{}]+)/gi;
const EMAIL_PATTERN = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;

/** Finds URLs and e-mail addresses written in the page text (not clickable). */
export function findTextLinks(pages: { pageIndex: number; text: string }[]): PdfLink[] {
  const out: PdfLink[] = [];
  for (const page of pages) {
    for (const match of page.text.matchAll(URL_PATTERN)) {
      const raw = match[1]!.replace(/[.,;:!?]+$/, "");
      out.push({
        pageIndex: page.pageIndex,
        url: raw.startsWith("www.") ? `https://${raw}` : raw,
        kind: "texte",
      });
    }
    for (const match of page.text.matchAll(EMAIL_PATTERN))
      out.push({ pageIndex: page.pageIndex, url: `mailto:${match[0]}`, kind: "e-mail" });
  }
  return out;
}

/** Merges annotation links and text links, dropping duplicates per page. */
export function mergeLinks(...lists: PdfLink[][]): PdfLink[] {
  const seen = new Set<string>();
  const out: PdfLink[] = [];
  for (const list of lists) {
    for (const link of list) {
      const key = `${link.pageIndex}|${link.url.trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(link);
    }
  }
  return out.sort((a, b) => a.pageIndex - b.pageIndex);
}

export function linksToCsv(links: PdfLink[]): string {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return [
    tr("page;type;adresse"),
    ...links.map((l) => `${l.pageIndex + 1};${tr(l.kind)};${escape(l.url)}`),
  ].join("\n");
}

export function linksToText(links: PdfLink[]): string {
  return Array.from(new Set(links.map((l) => l.url))).join("\n");
}
