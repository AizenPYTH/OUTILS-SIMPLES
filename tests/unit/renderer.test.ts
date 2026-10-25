import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getOperationalTools } from "@/lib/tools";

/** Every operational registry entry must have a component in the renderer map (checked statically). */
describe("tool renderer coverage", () => {
  it("maps every operational tool id", () => {
    const source = readFileSync(new URL("../../src/components/tools/tool-renderer.tsx", import.meta.url), "utf8");
    const missing = getOperationalTools().filter((t) => !source.includes(`"${t.id}":`));
    expect(missing.map((t) => t.id)).toEqual([]);
  });
});
