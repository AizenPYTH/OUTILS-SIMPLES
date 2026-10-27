import { PdfError, toPdfError } from "@/lib/pdf/errors";
import {
  defaultTextToPdfOptions,
  textToPdf,
  type TextToPdfOptions,
  type TextToPdfResult,
} from "@/lib/pdf/operations/text-to-pdf";
import { htmlToMarkdown } from "./html-to-markdown";
import { tr } from "@/lib/i18n/messages";

export interface OfficeToPdfResult extends TextToPdfResult {
  /** Honest list of what was simplified or dropped during the conversion. */
  warnings: string[];
}

export type OfficeToPdfOptions = Omit<TextToPdfOptions, "markdown">;

export const defaultOfficeToPdfOptions: OfficeToPdfOptions = {
  ...defaultTextToPdfOptions,
  fontFamily: "helvetica",
  fontSize: 11,
  pageNumbers: true,
};

export function looksLikeZip(bytes: Uint8Array): boolean {
  return (
    bytes.length > 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

function assertDocx(bytes: Uint8Array): void {
  if (!looksLikeZip(bytes))
    throw new PdfError(
      "UNSUPPORTED",
      tr(
        "Ce fichier n'est pas un document Word (.docx). Les anciens .doc ne sont pas pris en charge : enregistrez-le au format .docx depuis Word ou LibreOffice.",
      ),
    );
}

/** mammoth takes a Node Buffer in Node and an ArrayBuffer in the browser. */
function mammothInput(bytes: Uint8Array): { arrayBuffer: ArrayBuffer } | { buffer: Buffer } {
  if (typeof window === "undefined" && typeof Buffer !== "undefined")
    return { buffer: Buffer.from(bytes) };
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return { arrayBuffer: copy.buffer };
}

/**
 * Word (.docx) → Markdown via mammoth's semantic HTML (headings, lists, tables,
 * bold/italic, links, embedded images). Layout details of Word (columns, text
 * boxes, headers/footers, footnotes) are not represented and are reported.
 */
export async function docxToMarkdown(
  bytes: Uint8Array,
): Promise<{ markdown: string; warnings: string[] }> {
  assertDocx(bytes);
  const mammoth = await import("mammoth");
  let html: string;
  const warnings: string[] = [];
  try {
    const result = await mammoth.convertToHtml(mammothInput(bytes) as { arrayBuffer: ArrayBuffer });
    html = result.value;
    for (const message of result.messages) {
      if (message.type === "warning" || message.type === "error")
        warnings.push(humanize(message.message));
    }
  } catch (error) {
    throw new PdfError(
      "CORRUPTED",
      tr(
        "Impossible de lire ce document Word : le fichier est peut-être endommagé ou protégé par un mot de passe.",
      ),
      { cause: error },
    );
  }
  const converted = htmlToMarkdown(html);
  if (/<w:hdr|<w:ftr/.test(html))
    warnings.push(tr("Les en-têtes et pieds de page ne sont pas convertis."));
  return {
    markdown: converted.markdown,
    warnings: Array.from(new Set([...warnings, ...converted.warnings])),
  };
}

function humanize(message: string): string {
  if (/unrecognised paragraph style/i.test(message))
    return tr("Certains styles de paragraphe inconnus ont été rendus comme du texte normal.");
  if (/unrecognised run style/i.test(message))
    return tr("Certains styles de caractère inconnus ont été ignorés.");
  if (/image/i.test(message)) return tr("Une image n'a pas pu être lue et a été ignorée.");
  if (/footnote|endnote/i.test(message)) return tr("Les notes de bas de page ont été simplifiées.");
  return tr("Un élément non pris en charge a été ignoré.");
}

export async function docxToPdf(
  bytes: Uint8Array,
  options: OfficeToPdfOptions = defaultOfficeToPdfOptions,
): Promise<OfficeToPdfResult> {
  const { markdown, warnings } = await docxToMarkdown(bytes);
  if (!markdown.trim() && !options.title?.trim())
    throw new PdfError(
      "EMPTY",
      tr(
        "Ce document Word ne contient aucun texte convertible (document vide ou composé uniquement d'images non prises en charge).",
      ),
    );
  try {
    const result = await textToPdf(markdown, { ...options, markdown: true });
    const notes = [...warnings, ...result.skipped];
    if (result.replacedCharacters)
      notes.push(
        tr(
          "Certains caractères (emoji, alphabets non latins, symboles) ont été remplacés par « ? ».",
        ),
      );
    return { ...result, warnings: Array.from(new Set(notes)) };
  } catch (error) {
    throw toPdfError(error, "PROCESSING_FAILED");
  }
}
