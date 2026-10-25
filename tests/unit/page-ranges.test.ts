import { describe, expect, it } from "vitest";
import { chunkRanges, formatPageIndices, parsePageRanges } from "@/lib/pdf/page-ranges";
import { PdfError } from "@/lib/pdf/errors";

describe("parsePageRanges", () => {
  it("parses single pages and ranges", () => {
    const result = parsePageRanges("1-3, 5, 8-10", 10);
    expect(result.ranges).toEqual([
      { from: 1, to: 3 },
      { from: 5, to: 5 },
      { from: 8, to: 10 },
    ]);
    expect(result.indices).toEqual([0, 1, 2, 4, 7, 8, 9]);
  });

  it("deduplicates overlapping ranges in indices but keeps ranges", () => {
    const result = parsePageRanges("1-3, 2-4", 5);
    expect(result.ranges).toHaveLength(2);
    expect(result.indices).toEqual([0, 1, 2, 3]);
  });

  it("accepts en dashes, semicolons and extra spaces", () => {
    const result = parsePageRanges(" 1 – 2 ; 4 ", 5);
    expect(result.indices).toEqual([0, 1, 3]);
  });

  it("rejects out of bounds pages", () => {
    expect(() => parsePageRanges("1-12", 10)).toThrowError(PdfError);
    expect(() => parsePageRanges("0", 10)).toThrowError(/entre 1 et 10/);
  });

  it("rejects reversed ranges", () => {
    expect(() => parsePageRanges("5-2", 10)).toThrowError(/inversée/);
  });

  it("rejects garbage", () => {
    expect(() => parsePageRanges("a-b", 10)).toThrowError(/Format/);
    expect(() => parsePageRanges("", 10)).toThrowError(PdfError);
    expect(() => parsePageRanges(",,", 10)).toThrowError(PdfError);
  });
});

describe("formatPageIndices", () => {
  it("collapses consecutive indices", () => {
    expect(formatPageIndices([0, 1, 2, 4, 7, 8, 9])).toBe("1-3, 5, 8-10");
    expect(formatPageIndices([3, 1, 2])).toBe("2-4");
    expect(formatPageIndices([])).toBe("");
  });
});

describe("chunkRanges", () => {
  it("splits every N pages", () => {
    expect(chunkRanges(7, 3)).toEqual([
      { from: 1, to: 3 },
      { from: 4, to: 6 },
      { from: 7, to: 7 },
    ]);
    expect(chunkRanges(3, 1)).toHaveLength(3);
  });
});
