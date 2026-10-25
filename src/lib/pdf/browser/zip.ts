import { zipSync } from "fflate";

export interface ZipEntry {
  name: string;
  bytes: Uint8Array;
}

/** Builds a ZIP (stored, PDFs are already compressed) for multi-file downloads. */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const input: Record<string, Uint8Array> = {};
  const used = new Set<string>();
  for (const entry of entries) {
    let name = entry.name;
    let n = 2;
    while (used.has(name)) {
      name = entry.name.replace(/(\.[a-z0-9]+)?$/i, `-${n}$1`);
      n += 1;
    }
    used.add(name);
    input[name] = entry.bytes;
  }
  return zipSync(input, { level: 0 });
}
