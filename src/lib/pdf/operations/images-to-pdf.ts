import { PageSizes } from "pdf-lib";
import { PdfError, toPdfError } from "../errors";
import { createPdfDocument, savePdfDocument } from "../load";
import type { ProgressReporter } from "./merge";
import { t } from "@/lib/i18n";

export interface ImageInput {
  name: string;
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg";
}

export type PageSizeMode = "fit-image" | "a4-portrait" | "a4-landscape" | "letter";

export interface ImagesToPdfOptions {
  pageSize: PageSizeMode;
  /** Margin in points when a fixed page size is used. */
  margin: number;
  /** Pixels per inch used to size "fit-image" pages (72 = 1 px per pt). */
  dpi: number;
}

export const defaultImagesToPdfOptions: ImagesToPdfOptions = {
  pageSize: "a4-portrait",
  margin: 24,
  dpi: 150,
};

/** Places each image on its own page (one page per image), preserving aspect ratio. */
export async function imagesToPdf(
  images: ImageInput[],
  options: ImagesToPdfOptions,
  onProgress?: ProgressReporter,
): Promise<Uint8Array> {
  if (images.length === 0)
    throw new PdfError("NO_SELECTION", t.errors.noFiles, { recoverable: true });
  const doc = await createPdfDocument();
  try {
    for (let i = 0; i < images.length; i += 1) {
      const input = images[i]!;
      onProgress?.({
        current: i + 1,
        total: images.length,
        label: t.progress.processingFile(i + 1, images.length),
      });
      const image =
        input.mimeType === "image/png"
          ? await doc.embedPng(input.bytes)
          : await doc.embedJpg(input.bytes);
      const scale = 72 / options.dpi;
      if (options.pageSize === "fit-image") {
        const page = doc.addPage([image.width * scale, image.height * scale]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width * scale,
          height: image.height * scale,
        });
        continue;
      }
      const [w, h] =
        options.pageSize === "a4-portrait"
          ? PageSizes.A4
          : options.pageSize === "a4-landscape"
            ? [PageSizes.A4[1], PageSizes.A4[0]]
            : PageSizes.Letter;
      const page = doc.addPage([w, h]);
      const maxW = w - options.margin * 2;
      const maxH = h - options.margin * 2;
      const fit = Math.min(maxW / image.width, maxH / image.height);
      const drawW = image.width * fit;
      const drawH = image.height * fit;
      page.drawImage(image, {
        x: (w - drawW) / 2,
        y: (h - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    }
  } catch (error) {
    throw toPdfError(error);
  }
  return savePdfDocument(doc);
}
