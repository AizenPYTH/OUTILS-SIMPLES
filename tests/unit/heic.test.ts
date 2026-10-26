import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decodeHeic, isHeic } from "@/lib/images/heic";
import { detectFileKind } from "@/lib/files/detect";

const require = createRequire(__filename);
const fixtures = path.resolve(__dirname, "../fixtures");

describe("HEIC decoding (libheif WebAssembly)", () => {
  it("recognises the HEIF container and decodes the libheif example photo to RGBA pixels", async () => {
    const bytes = new Uint8Array(await readFile(path.join(fixtures, "photo-sample.heic")));
    expect(isHeic(bytes)).toBe(true);
    expect(detectFileKind("IMG_0001.HEIC", bytes)).toBe("heic");
    expect(isHeic(new Uint8Array(await readFile(path.join(fixtures, "photo-800x600.jpg"))))).toBe(
      false,
    );
    const wasm = new Uint8Array(
      await readFile(
        path.join(
          path.dirname(require.resolve("libheif-js/package.json")),
          "libheif-wasm/libheif.wasm",
        ),
      ),
    );
    const raster = await decodeHeic(bytes, wasm);
    expect(raster.width).toBe(1280);
    expect(raster.height).toBe(854);
    expect(raster.data.length).toBe(1280 * 854 * 4);
    // Real pixels, opaque, not a blank buffer.
    let sum = 0;
    for (let i = 0; i < raster.data.length; i += 4003) sum += raster.data[i]!;
    expect(sum).toBeGreaterThan(0);
    expect(raster.data[3]).toBe(255);
  }, 60_000);
});
