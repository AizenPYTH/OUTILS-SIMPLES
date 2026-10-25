import type { ImageReencoder, ReencodedImage, SourceImage } from "../operations/compress";

/**
 * Browser implementation of the compression image re-encoder using a canvas.
 * JPEG inputs are decoded by the browser; raw samples are copied into ImageData.
 */
export const canvasImageReencoder: ImageReencoder = async (image, quality, maxDimension) => {
  const bitmap = await decodeSource(image);
  if (!bitmap) return null;
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return null;
    const jpeg = new Uint8Array(await blob.arrayBuffer());
    const result: ReencodedImage = { jpeg, width, height };
    canvas.width = 0;
    canvas.height = 0;
    return result;
  } finally {
    if ("close" in bitmap) bitmap.close();
  }
};

async function decodeSource(image: SourceImage): Promise<ImageBitmap | null> {
  if (image.encoding === "jpeg") {
    try {
      const copy = new Uint8Array(image.data.byteLength);
      copy.set(image.data);
      return await createImageBitmap(new Blob([copy], { type: "image/jpeg" }));
    } catch {
      return null;
    }
  }
  const components = image.colorSpace === "DeviceRGB" ? 3 : 1;
  const expected = image.width * image.height * components;
  if (image.data.length < expected) return null;
  const rgba = new Uint8ClampedArray(image.width * image.height * 4);
  for (let p = 0, s = 0; p < rgba.length; p += 4, s += components) {
    if (components === 3) {
      rgba[p] = image.data[s]!;
      rgba[p + 1] = image.data[s + 1]!;
      rgba[p + 2] = image.data[s + 2]!;
    } else {
      rgba[p] = rgba[p + 1] = rgba[p + 2] = image.data[s]!;
    }
    rgba[p + 3] = 255;
  }
  try {
    return await createImageBitmap(new ImageData(rgba, image.width, image.height));
  } catch {
    return null;
  }
}
