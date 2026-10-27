/**
 * HEIC / HEIF decoding (iPhone photos) with libheif compiled to WebAssembly
 * (libheif-js, LGPL-3.0, loaded on demand; the .wasm is served from /heif).
 * Chrome, Firefox and Edge cannot decode HEIC natively; Safari can but goes
 * through the same path for consistency of the EXIF orientation handling.
 */
import { tr } from "@/lib/i18n/messages";

export const HEIF_ASSET_BASE = "/heif/";

const HEIF_BRANDS = /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/;

export function isHeic(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const box = String.fromCharCode(bytes[4]!, bytes[5]!, bytes[6]!, bytes[7]!);
  if (box !== "ftyp") return false;
  const brand = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!).toLowerCase();
  return HEIF_BRANDS.test(brand);
}

export interface DecodedRaster {
  width: number;
  height: number;
  /** RGBA, non-premultiplied. */
  data: Uint8ClampedArray;
}

interface HeifImage {
  get_width(): number;
  get_height(): number;
  display(
    target: { data: Uint8ClampedArray; width: number; height: number },
    cb: (r: unknown) => void,
  ): void;
  free?(): void;
}

interface HeifModule {
  ready?: Promise<unknown>;
  HeifDecoder: new () => { decode(bytes: Uint8Array): HeifImage[] };
}

type Factory = (options: {
  locateFile?: (file: string) => string;
  wasmBinary?: Uint8Array;
}) => HeifModule;

let modulePromise: Promise<HeifModule> | null = null;

/**
 * Loads the decoder once. The libheif build fetches its .wasm synchronously
 * unless the binary is supplied, so the browser fetches /heif/libheif.wasm
 * itself (cached by the service worker); Node tests pass the bytes directly.
 */
export function loadHeif(wasmBinary?: Uint8Array): Promise<HeifModule> {
  if (!modulePromise) {
    modulePromise = (async () => {
      const m = await import("libheif-js/libheif-wasm/libheif.js");
      const loaded = m as unknown as { default?: Factory };
      const factory = (loaded.default ?? (m as unknown)) as Factory;
      let binary = wasmBinary;
      if (!binary) {
        const response = await fetch(`${HEIF_ASSET_BASE}libheif.wasm`);
        if (!response.ok)
          throw new Error(
            tr("Décodeur HEIC indisponible ({status}).", { status: response.status }),
          );
        binary = new Uint8Array(await response.arrayBuffer());
      }
      const mod = factory({ wasmBinary: binary });
      await (mod.ready ?? Promise.resolve());
      return mod;
    })();
    modulePromise.catch(() => {
      modulePromise = null;
    });
  }
  return modulePromise;
}

/** Decodes the primary image of a HEIC/HEIF file to RGBA pixels. */
export async function decodeHeic(
  bytes: Uint8Array,
  wasmBinary?: Uint8Array,
): Promise<DecodedRaster> {
  const mod = await loadHeif(wasmBinary);
  const decoder = new mod.HeifDecoder();
  const images = decoder.decode(bytes);
  const image = images[0];
  if (!image) throw new Error(tr("Aucune image lisible dans ce fichier HEIC."));
  try {
    const width = image.get_width();
    const height = image.get_height();
    const data = new Uint8ClampedArray(width * height * 4);
    await new Promise<void>((resolve, reject) => {
      try {
        image.display({ data, width, height }, (result) => {
          if (result === null || result === undefined)
            reject(new Error(tr("Décodage HEIC impossible.")));
          else resolve();
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    return { width, height, data };
  } finally {
    for (const img of images) img.free?.();
  }
}
