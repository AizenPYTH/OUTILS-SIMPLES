import { assertPdfBytes, validateImageFile, validatePdfFileMeta } from "@/lib/files/validation";
import { toPdfError } from "../errors";
import type { DetectedImageType } from "@/lib/files/validation";

export async function readFileBytes(file: File): Promise<Uint8Array> {
  try {
    return new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    throw toPdfError(error, "OUT_OF_MEMORY");
  }
}

/** Validates metadata, reads the bytes and checks the PDF signature. */
export async function readPdfFile(file: File, maxFileSizeBytes?: number): Promise<Uint8Array> {
  validatePdfFileMeta(file, { maxFileSizeBytes });
  const bytes = await readFileBytes(file);
  assertPdfBytes(bytes);
  return bytes;
}

export async function readImageFile(
  file: File,
): Promise<{ bytes: Uint8Array; mimeType: Exclude<DetectedImageType, null> }> {
  const bytes = await readFileBytes(file);
  const mimeType = validateImageFile(file, bytes);
  if (!mimeType) throw toPdfError(new Error("not an image"), "UNSUPPORTED");
  return { bytes, mimeType };
}

/** Reads the natural size of an encoded image in the browser. */
export function measureImage(
  bytes: Uint8Array,
  mimeType: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const url = URL.createObjectURL(new Blob([copy], { type: mimeType }));
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    img.src = url;
  });
}
