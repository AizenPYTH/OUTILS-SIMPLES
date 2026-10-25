import { describe, expect, it } from "vitest";
import { computeTextStats } from "@/lib/text/stats";
import { changeCase, cleanText, compareLists, defaultCleanOptions, extractEmails, extractPhones, extractUrls, findAndReplace, loremIpsum, slugify } from "@/lib/text/transform";
import { computeDiff, formatUnified } from "@/lib/text/diff";

describe("text stats", () => {
  it("counts words, sentences, paragraphs and reading time", () => {
    const s = computeTextStats("Bonjour le monde. Ceci est un test !\n\nDeuxième paragraphe… fin.");
    expect(s.words).toBe(10);
    expect(s.sentences).toBe(4);
    expect(s.paragraphs).toBe(2);
    expect(s.characters).toBeGreaterThan(50);
    expect(s.readingMinutes).toBe(0.5);
    expect(s.topWords.map((w) => w.word)).not.toContain("le");
  });
  it("handles empty text", () => {
    expect(computeTextStats("")).toMatchObject({ words: 0, sentences: 0, paragraphs: 0, lines: 0, readingMinutes: 0 });
  });
});

describe("case conversion", () => {
  it("converts French text with accents", () => {
    expect(changeCase("élève à l'école", "upper")).toBe("ÉLÈVE À L'ÉCOLE");
    expect(changeCase("BONJOUR. ÇA VA ? oui", "sentence")).toBe("Bonjour. Ça va ? Oui");
    expect(changeCase("le guide de la montagne", "title")).toBe("Le Guide de la Montagne");
    expect(changeCase("Fusionner des PDF", "snake")).toBe("fusionner_des_pdf");
    expect(changeCase("mon super outil", "camel")).toBe("monSuperOutil");
    expect(changeCase("aBc", "invert")).toBe("AbC");
  });
});

describe("cleanText", () => {
  it("trims, collapses and dedupes", () => {
    const out = cleanText("  a   b \n\n\n\n c \n a   b \n", { ...defaultCleanOptions, removeDuplicateLines: true });
    expect(out).toBe("a b\n\nc\n");
  });
  it("joins wrapped lines and fixes hyphenation from PDFs", () => {
    const out = cleanText("Le docu-\nment est long\net utile.\n\nAutre paragraphe.", { ...defaultCleanOptions, joinWrappedLines: true, fixPdfHyphenation: true });
    expect(out).toBe("Le document est long et utile.\n\nAutre paragraphe.");
  });
  it("sorts naturally", () => {
    expect(cleanText("item10\nitem2\nÉtude\nabc", { ...defaultCleanOptions, sortLines: "asc" }).split("\n")).toEqual(["abc", "Étude", "item2", "item10"]);
  });
});

describe("extractors and helpers", () => {
  it("extracts emails, urls and phones", () => {
    const text = "Contact : jeanne.martin@example.fr ou https://outilia.fr/pdf/?x=1, tel 06 12 34 56 78 / +33 1 23 45 67 89.";
    expect(extractEmails(text)).toEqual(["jeanne.martin@example.fr"]);
    expect(extractUrls(text)).toEqual(["https://outilia.fr/pdf/?x=1"]);
    expect(extractPhones(text)).toEqual(["06 12 34 56 78", "+33 1 23 45 67 89"]);
  });
  it("slugifies and compares lists", () => {
    expect(slugify("Été 2026 : les outils PDF !")).toBe("ete-2026-les-outils-pdf");
    expect(compareLists("a\nb\nc", "B\nc\nd", true)).toEqual({ onlyA: ["a"], onlyB: ["d"], both: ["b", "c"] });
  });
  it("find and replace with whole word and regex groups", () => {
    expect(findAndReplace("chat chaton chat", "chat", "chien", { regex: false, caseInsensitive: false, wholeWord: true })).toEqual({ result: "chien chaton chien", count: 2 });
    expect(findAndReplace("2026-10-25", "(\\d+)-(\\d+)-(\\d+)", "$3/$2/$1", { regex: true, caseInsensitive: false, wholeWord: false }).result).toBe("25/10/2026");
  });
  it("generates deterministic lorem ipsum", () => {
    const a = loremIpsum(2, 3, 7);
    expect(a).toBe(loremIpsum(2, 3, 7));
    expect(a.split("\n\n")).toHaveLength(2);
  });
});

describe("diff", () => {
  it("reports additions and removals", () => {
    const r = computeDiff("a\nb\nc\n", "a\nc\nd\n", "lines");
    expect(r.summary).toEqual({ added: 1, removed: 1, unchanged: 2 });
    expect(formatUnified(r.changes)).toBe("  a\n- b\n  c\n+ d");
    expect(computeDiff("Bonjour", "bonjour", "words", { ignoreCase: true }).summary.added).toBe(0);
  });
});
