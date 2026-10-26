import { PdfError } from "../errors";
import { loadPdfDocument, savePdfDocument } from "../load";
import { t } from "@/lib/i18n";

/** Margins to remove, in points, expressed in the page's visual (rotated) orientation. */
export interface CropMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Crops pages by setting their CropBox (what viewers display and print). The
 * content is kept intact under the box: the operation is non-destructive and
 * reversible by another tool, which is stated on the page.
 */
export async function cropPages(
  bytes: Uint8Array,
  margins: CropMargins,
  pageIndices: number[] = [],
): Promise<Uint8Array> {
  const doc = await loadPdfDocument(bytes);
  const pages = doc.getPages();
  const targets = pageIndices.length ? pageIndices : pages.map((_, i) => i);
  for (const index of targets) {
    const page = pages[index];
    if (!page)
      throw new PdfError("INVALID_RANGE", t.ranges.errorOutOfBounds(pages.length), {
        recoverable: true,
      });
    const { x, y, width, height } = page.getCropBox();
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;
    // Map visual margins back to user-space edges.
    let { top, right, bottom, left } = margins;
    if (rotation === 90) [top, right, bottom, left] = [right, bottom, left, top];
    else if (rotation === 180) [top, right, bottom, left] = [bottom, left, top, right];
    else if (rotation === 270) [top, right, bottom, left] = [left, top, right, bottom];
    const newWidth = width - left - right;
    const newHeight = height - top - bottom;
    if (newWidth < 20 || newHeight < 20) {
      throw new PdfError(
        "INVALID_RANGE",
        "Les marges à retirer laissent une page trop petite (moins de 20 pt).",
        { recoverable: true },
      );
    }
    page.setCropBox(x + left, y + bottom, newWidth, newHeight);
  }
  return savePdfDocument(doc);
}

/** Resets the CropBox to the MediaBox (undo a crop made with any tool). */
export async function uncropPages(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await loadPdfDocument(bytes);
  for (const page of doc.getPages()) {
    const { x, y, width, height } = page.getMediaBox();
    page.setCropBox(x, y, width, height);
  }
  return savePdfDocument(doc);
}
