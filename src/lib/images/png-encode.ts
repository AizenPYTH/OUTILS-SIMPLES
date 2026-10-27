import { zlibSync } from "fflate";
import { tr } from "@/lib/i18n/messages";

export type PngChannels = 1 | 2 | 3 | 4;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1)
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Minimal PNG encoder for 8-bit samples (gray, gray+alpha, RGB, RGBA), used
 * where no canvas is available (extracting raw images from a PDF in a worker
 * or in tests). Filter type 0 on every scanline; zlib level 6.
 */
export function encodePng(
  width: number,
  height: number,
  channels: PngChannels,
  samples: Uint8Array,
): Uint8Array {
  if (width <= 0 || height <= 0) throw new Error(tr("Dimensions PNG invalides."));
  const rowBytes = width * channels;
  if (samples.length < rowBytes * height) throw new Error(tr("Données d'image incomplètes."));
  const raw = new Uint8Array((rowBytes + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (rowBytes + 1)] = 0;
    raw.set(samples.subarray(y * rowBytes, (y + 1) * rowBytes), y * (rowBytes + 1) + 1);
  }
  const colorType = channels === 1 ? 0 : channels === 2 ? 4 : channels === 3 ? 2 : 6;
  const ihdr = new Uint8Array(13);
  writeUint32(ihdr, 0, width);
  writeUint32(ihdr, 4, height);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlibSync(raw, { level: 6 });
  return concat([
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  writeUint32(out, 0, data.length);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  writeUint32(out, 8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function writeUint32(target: Uint8Array, pos: number, value: number): void {
  target[pos] = (value >>> 24) & 0xff;
  target[pos + 1] = (value >>> 16) & 0xff;
  target[pos + 2] = (value >>> 8) & 0xff;
  target[pos + 3] = value & 0xff;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
