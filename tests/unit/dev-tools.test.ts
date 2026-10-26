import { describe, expect, it } from "vitest";
import { describeJson, formatJson, minifyJson, validateJson } from "@/lib/dev/json";
import {
  decodeBase64,
  decodeUrl,
  encodeBase64,
  encodeUrl,
  escapeHtml,
  unescapeHtml,
} from "@/lib/dev/encoding";
import { generatePassword, generateUuid, passwordEntropyBits, sha256Hex } from "@/lib/dev/random";
import { csvToJson, detectDelimiter, jsonToCsv, parseCsv } from "@/lib/dev/csv";

describe("json", () => {
  it("validates and formats", () => {
    expect(validateJson('{"a":[1,2,{"b":null}],"c":"é"}')).toEqual({
      ok: true,
      value: { a: [1, 2, { b: null }], c: "é" },
    });
    expect(formatJson('{"b":1,"a":{"z":2,"y":[3]}}', 2, true)).toBe(
      '{\n  "a": {\n    "y": [\n      3\n    ],\n    "z": 2\n  },\n  "b": 1\n}',
    );
    expect(minifyJson('{ "a" : 1 }')).toBe('{"a":1}');
    expect(describeJson([1, 2])).toBe("tableau de 2 élément(s)");
  });
  it("reports precise error positions", () => {
    const r = validateJson('{\n  "a": 1,\n  "b": 2,\n}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.line).toBe(4);
      expect(r.error.column).toBe(1);
      expect(r.error.message).toContain("Virgule en trop");
    }
    const single = validateJson("{'a': 1}");
    expect(!single.ok && single.error.message).toContain("guillemets doubles");
    expect(validateJson("").ok).toBe(false);
    expect(validateJson('"abc').ok).toBe(false);
    expect(validateJson("01").ok).toBe(false);
    const trailing = validateJson("{} x");
    expect(!trailing.ok && trailing.error.column).toBe(4);
  });
});

describe("encodings", () => {
  it("round-trips base64 with unicode and url-safe variant", () => {
    expect(encodeBase64("héllo wörld ✓")).toBe("aMOpbGxvIHfDtnJsZCDinJM=");
    expect(decodeBase64("aMOpbGxvIHfDtnJsZCDinJM=")).toBe("héllo wörld ✓");
    expect(decodeBase64(encodeBase64("a?b/c", true))).toBe("a?b/c");
    expect(() => decodeBase64("not base64!!")).toThrow();
  });
  it("encodes urls and html", () => {
    expect(encodeUrl("a b&c=é")).toBe("a%20b%26c%3D%C3%A9");
    expect(decodeUrl("a+b%20c")).toBe("a b c");
    expect(() => decodeUrl("%E0%A4%A")).toThrow();
    expect(escapeHtml('<a href="x">&</a>')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
    expect(unescapeHtml("&lt;b&gt;caf&eacute; &#233; &#x1F600;&lt;/b&gt;")).toBe(
      "<b>café é 😀</b>",
    );
  });
});

describe("random & hash", () => {
  it("generates valid uuids and passwords with required classes", () => {
    expect(generateUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    const options = {
      length: 20,
      lowercase: true,
      uppercase: true,
      digits: true,
      symbols: true,
      excludeAmbiguous: true,
    };
    for (let i = 0; i < 20; i += 1) {
      const pw = generatePassword(options);
      expect(pw).toHaveLength(20);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/\d/);
      expect(pw).not.toMatch(/[0O1lI|]/);
    }
    expect(passwordEntropyBits(options)).toBeGreaterThan(100);
    expect(() =>
      generatePassword({
        ...options,
        lowercase: false,
        uppercase: false,
        digits: false,
        symbols: false,
      }),
    ).toThrow();
  });
  it("hashes with SHA-256", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("csv", () => {
  it("parses quoted fields and detects delimiters", () => {
    const text = 'nom;ville;note\n"Martin, Jeanne";Paris;12.5\nDupont;"Lyon ""centre""";7';
    expect(detectDelimiter(text)).toBe(";");
    expect(parseCsv(text)).toEqual([
      ["nom", "ville", "note"],
      ["Martin, Jeanne", "Paris", "12.5"],
      ["Dupont", 'Lyon "centre"', "7"],
    ]);
    expect(csvToJson(text, { header: true, inferTypes: true })).toEqual([
      { nom: "Martin, Jeanne", ville: "Paris", note: 12.5 },
      { nom: "Dupont", ville: 'Lyon "centre"', note: 7 },
    ]);
  });
  it("serialises json to csv", () => {
    expect(
      jsonToCsv(
        [
          { a: 1, b: "x;y" },
          { a: 2, c: true },
        ],
        ";",
      ),
    ).toBe('a;b;c\n1;"x;y";\n2;;true');
    expect(() => jsonToCsv("nope")).toThrow();
    expect(
      jsonToCsv(
        [
          [1, 2],
          [3, 4],
        ],
        ",",
      ),
    ).toBe("1,2\n3,4");
  });
});
