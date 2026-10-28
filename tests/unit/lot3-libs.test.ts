import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { regexPresets, replaceWithRegex, runRegex, segmentMatches } from "@/lib/dev/regex";
import { describeInstant, isoWeek, parseInstant } from "@/lib/dev/timestamp";
import {
  FRENCH_VAT_RATES,
  applyPercent,
  beforePercent,
  parseNumber,
  percentChange,
  percentOf,
  vatFromHt,
  vatFromTtc,
  whatPercent,
} from "@/lib/calc/percent";
import {
  addBusinessDays,
  businessDaysBetween,
  day,
  durationBetween,
  easterSunday,
  frenchPublicHolidays,
  parseDay,
  toIsoDay,
} from "@/lib/calc/dates";
import { UNIT_CATEGORIES, convertUnit, formatConverted } from "@/lib/calc/units";
import {
  BARCODE_TYPES,
  CODE128_PATTERNS,
  CODE39,
  barcodeToSvg,
  eanCheckDigit,
  encodeBarcode,
} from "@/lib/codes/barcode";
import {
  contrastRatio,
  hslToRgb,
  parseColor,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  wcagContrast,
} from "@/lib/codes/color";
import { classifyQr, decodeQrFromRgba, parseWifiPayload } from "@/lib/codes/qr-read";
import { calendarPdf, coverPagePdf, paperPdf } from "@/lib/pdf/operations/printables";
import { extractPageText } from "../helpers";

describe("regex tester", () => {
  it("lists matches with groups and highlights segments", () => {
    const result = runRegex(
      "(\\d{2})/(\\d{2})/(?<year>\\d{4})",
      "g",
      "Le 12/03/2026 puis le 01/01/2027.",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.matches).toHaveLength(2);
    expect(result.matches[0]!.groups).toEqual(["12", "03", "2026"]);
    expect(result.matches[1]!.named.year).toBe("2027");
    const segments = segmentMatches("Le 12/03/2026 puis le 01/01/2027.", result.matches);
    expect(segments.filter((s) => s.match)).toHaveLength(2);
    expect(segments.map((s) => s.text).join("")).toBe("Le 12/03/2026 puis le 01/01/2027.");
  });

  it("reports invalid patterns, avoids infinite loops and replaces", () => {
    expect(runRegex("(", "g", "x")).toMatchObject({ ok: false });
    const empty = runRegex("a*", "g", "bbb", 10);
    expect(empty.ok && empty.matches.length).toBe(4);
    expect(runRegex("b", "", "bbb")).toMatchObject({ ok: true, matches: [{ index: 0 }] });
    expect(replaceWithRegex("(\\w+)@(\\w+)", "g", "a@b", "$2@$1")).toEqual({
      ok: true,
      result: "b@a",
    });
    for (const preset of regexPresets())
      expect(runRegex(preset.pattern, preset.flags, "test").ok).toBe(true);
    const email = runRegex(
      regexPresets()[0]!.pattern,
      regexPresets()[0]!.flags,
      "Écrire à jean.dupont@exemple.fr vite",
    );
    expect(email.ok && email.matches[0]!.text).toBe("jean.dupont@exemple.fr");
  });
});

describe("timestamps", () => {
  it("parses seconds, milliseconds, ISO and French dates", () => {
    expect(parseInstant("1700000000")).toEqual({ ms: 1700000000000, source: "seconds" });
    expect(parseInstant("1700000000000")).toEqual({ ms: 1700000000000, source: "milliseconds" });
    expect(parseInstant("2026-03-12T10:00:00Z")?.ms).toBe(Date.UTC(2026, 2, 12, 10));
    expect(parseInstant("12/03/2026")?.source).toBe("date");
    expect(parseInstant("n'importe quoi")).toBeNull();
    const d = describeInstant(Date.UTC(2026, 0, 1, 12), Date.UTC(2026, 0, 1, 13), "fr-FR", "UTC");
    expect(d.iso).toBe("2026-01-01T12:00:00.000Z");
    expect(d.unixSeconds).toBe(1767268800);
    expect(d.relative).toBe("il y a 1 heure");
    expect(d.weekday).toBe("jeudi");
    expect(d.dayOfYear).toBe(1);
    expect(isoWeek(new Date(Date.UTC(2026, 0, 1)))).toBe(1);
    expect(isoWeek(new Date(Date.UTC(2021, 0, 1)))).toBe(53);
    expect(describeInstant(Number.NaN).valid).toBe(false);
  });
});

describe("percentages and VAT", () => {
  it("computes the classic percentage questions", () => {
    expect(percentOf(20, 150)).toBe(30);
    expect(whatPercent(30, 150)).toBe(20);
    expect(whatPercent(1, 0)).toBeNull();
    expect(percentChange(80, 100)).toBe(25);
    expect(percentChange(100, 80)).toBe(-20);
    expect(applyPercent(100, -30)).toBe(70);
    expect(beforePercent(120, 20)).toBeCloseTo(100);
    expect(parseNumber("1 234,56 €")).toBe(1234.56);
    expect(parseNumber("12 %")).toBe(12);
    expect(parseNumber("")).toBeNull();
  });

  it("splits HT/TVA/TTC with cent rounding", () => {
    expect(vatFromHt(100, 20)).toEqual({ ht: 100, tva: 20, ttc: 120, rate: 20 });
    expect(vatFromTtc(120, 20)).toEqual({ ht: 100, tva: 20, ttc: 120, rate: 20 });
    expect(vatFromTtc(10, 5.5)).toEqual({ ht: 9.48, tva: 0.52, ttc: 10, rate: 5.5 });
    expect(FRENCH_VAT_RATES.map((r) => r.rate)).toContain(20);
  });
});

describe("dates", () => {
  it("computes Easter, public holidays and durations", () => {
    expect(toIsoDay(easterSunday(2026))).toBe("2026-04-05");
    expect(toIsoDay(easterSunday(2024))).toBe("2024-03-31");
    const holidays = frenchPublicHolidays(2026);
    expect(holidays).toHaveLength(11);
    expect(
      holidays.find((h) => h.name === "Ascension") &&
        toIsoDay(holidays.find((h) => h.name === "Ascension")!.date),
    ).toBe("2026-05-14");
    expect(frenchPublicHolidays(2026, true)).toHaveLength(13);
    const d = durationBetween(day(2024, 1, 31), day(2026, 3, 1));
    expect(d).toMatchObject({ years: 2, months: 1, days: 1, totalDays: 760 });
    expect(durationBetween(day(2024, 1, 31), day(2024, 2, 29))).toMatchObject({
      years: 0,
      months: 1,
      days: 0,
    });
    expect(durationBetween(day(2024, 1, 31), day(2024, 2, 28))).toMatchObject({
      years: 0,
      months: 0,
      days: 28,
    });
    expect(durationBetween(day(2024, 1, 15), day(2024, 2, 15))).toMatchObject({
      years: 0,
      months: 1,
      days: 0,
    });
    expect(durationBetween(day(2026, 3, 1), day(2024, 1, 31)).negative).toBe(true);
    expect(parseDay("2026-02-30")).toBeNull();
    expect(toIsoDay(parseDay("12/03/2026")!)).toBe("2026-03-12");
  });

  it("counts and adds business days with French holidays", () => {
    // May 2026: 1 (Fri, holiday), 8 (Fri, holiday), 14 (Thu, Ascension), 25 (Mon, Pentecôte).
    const result = businessDaysBetween(day(2026, 5, 1), day(2026, 5, 31), {
      excludeHolidays: true,
    });
    expect(result.businessDays).toBe(17);
    expect(result.weekendDays).toBe(10);
    expect(result.holidays.map((h) => h.name)).toEqual([
      "Fête du Travail",
      "Victoire 1945",
      "Ascension",
      "Lundi de Pentecôte",
    ]);
    expect(
      businessDaysBetween(day(2026, 5, 1), day(2026, 5, 31), { excludeHolidays: false })
        .businessDays,
    ).toBe(21);
    // Friday 2026-05-07 + 1 business day → Monday 11 (8 May is a holiday).
    expect(toIsoDay(addBusinessDays(day(2026, 5, 7), 1, { excludeHolidays: true }))).toBe(
      "2026-05-11",
    );
    expect(toIsoDay(addBusinessDays(day(2026, 5, 11), -1, { excludeHolidays: true }))).toBe(
      "2026-05-07",
    );
  });
});

describe("units", () => {
  it("converts within every category and formats", () => {
    expect(convertUnit("length", 1, "km", "mi")).toBeCloseTo(0.621371, 5);
    expect(convertUnit("temperature", 100, "c", "f")).toBe(212);
    expect(convertUnit("temperature", 0, "k", "c")).toBeCloseTo(-273.15);
    expect(convertUnit("data", 1, "GiB", "MB")).toBeCloseTo(1073.741824);
    expect(convertUnit("mass", 1, "lb", "g")).toBeCloseTo(453.59237);
    expect(convertUnit("length", 1, "m", "nope")).toBeNull();
    for (const category of UNIT_CATEGORIES) {
      const [a, b] = [category.units[0]!, category.units[category.units.length - 1]!];
      const there = convertUnit(category.id, 12.5, a.id, b.id)!;
      expect(convertUnit(category.id, there, b.id, a.id)).toBeCloseTo(12.5, 6);
    }
    expect(formatConverted(1234.5678).replace(/\u202f/g, " ")).toBe("1 234,57");
    expect(formatConverted(0)).toBe("0");
  });
});

describe("barcodes", () => {
  it("has consistent symbol tables", () => {
    expect(CODE128_PATTERNS).toHaveLength(107);
    CODE128_PATTERNS.slice(0, 106).forEach((p) =>
      expect(p.split("").reduce((s, c) => s + Number(c), 0)).toBe(11),
    );
    expect(CODE128_PATTERNS[106]!.split("").reduce((s, c) => s + Number(c), 0)).toBe(13);
    for (const pattern of Object.values(CODE39)) {
      expect(pattern).toHaveLength(9);
      expect(pattern.split("").filter((c) => c === "w")).toHaveLength(3);
    }
    expect(new Set(Object.values(CODE39)).size).toBe(Object.keys(CODE39).length);
    expect(BARCODE_TYPES).toHaveLength(5);
  });

  it("encodes EAN-13 / EAN-8 / UPC-A with check digits", () => {
    expect(eanCheckDigit("400638133393")).toBe(1);
    const ean = encodeBarcode("ean13", "4006381333931");
    expect(ean.ok && ean.barcode.modules).toHaveLength(95);
    expect(ean.ok && ean.barcode.text).toBe("4006381333931");
    expect(encodeBarcode("ean13", "4006381333930")).toMatchObject({ ok: false });
    expect(encodeBarcode("ean13", "400638133393")).toMatchObject({
      ok: true,
      barcode: { text: "4006381333931" },
    });
    const ean8 = encodeBarcode("ean8", "9638507");
    expect(ean8.ok && ean8.barcode.text).toBe("96385074");
    expect(ean8.ok && ean8.barcode.modules).toHaveLength(67);
    const upc = encodeBarcode("upca", "03600029145");
    expect(upc.ok && upc.barcode.text).toBe("036000291452");
    // Guards: start 101, centre 01010, end 101.
    if (ean.ok) {
      expect(ean.barcode.modules.slice(0, 3)).toEqual([true, false, true]);
      expect(ean.barcode.modules.slice(45, 50)).toEqual([false, true, false, true, false]);
    }
  });

  it("encodes Code 128 and Code 39 and renders SVG", () => {
    const c128 = encodeBarcode("code128", "AVEROPDF-2026");
    expect(c128.ok).toBe(true);
    if (c128.ok) {
      // Start B + "AVEROPDF-" (9) + switch to C + "20" "26" + checksum = 14 symbols × 11 modules + stop 13 modules.
      expect(c128.barcode.modules).toHaveLength(14 * 11 + 13);
      expect(c128.barcode.modules[0]).toBe(true);
      expect(c128.barcode.modules[c128.barcode.modules.length - 1]).toBe(true);
    }
    const digits = encodeBarcode("code128", "12345678");
    // Start C + 4 pairs + checksum = 6 symbols × 11 + 13.
    expect(digits.ok && digits.barcode.modules).toHaveLength(6 * 11 + 13);
    expect(encodeBarcode("code128", "é")).toMatchObject({ ok: false });
    const c39 = encodeBarcode("code39", "abc 1");
    expect(c39.ok && c39.barcode.text).toBe("ABC 1");
    expect(encodeBarcode("code39", "a*b")).toMatchObject({ ok: false });
    if (c39.ok) {
      const svg = barcodeToSvg(c39.barcode);
      expect(svg).toContain("<svg");
      expect(svg).toContain("ABC 1");
      expect((svg.match(/<rect/g) ?? []).length).toBeGreaterThan(10);
    }
  });
});

describe("colours", () => {
  it("parses and converts between formats", () => {
    expect(parseColor("#5146E5")).toEqual({ r: 81, g: 70, b: 229, a: 1 });
    expect(parseColor("#abc")).toEqual({ r: 170, g: 187, b: 204, a: 1 });
    expect(parseColor("rgb(255, 0, 0)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor("rgba(0 0 255 / 50%)")?.a).toBe(0.5);
    expect(parseColor("hsl(120, 100%, 50%)")).toEqual({ r: 0, g: 255, b: 0, a: 1 });
    expect(parseColor("tomato")).toEqual({ r: 255, g: 99, b: 71, a: 1 });
    expect(parseColor("rien")).toBeNull();
    expect(rgbToHex({ r: 81, g: 70, b: 229, a: 1 })).toBe("#5146e5");
    expect(rgbToHsl({ r: 81, g: 70, b: 229, a: 1 })).toEqual({ h: 244, s: 75, l: 59 });
    expect(hslToRgb({ h: 0, s: 100, l: 50 })).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(rgbToCmyk({ r: 0, g: 0, b: 0, a: 1 })).toEqual({ c: 0, m: 0, y: 0, k: 100 });
    expect(rgbToCmyk({ r: 255, g: 0, b: 0, a: 1 })).toEqual({ c: 0, m: 100, y: 100, k: 0 });
  });

  it("computes WCAG contrast", () => {
    const black = parseColor("#000")!;
    const white = parseColor("#fff")!;
    expect(contrastRatio(black, white)).toBeCloseTo(21, 1);
    expect(wcagContrast(parseColor("#777")!, white)).toMatchObject({
      aaNormal: false,
      aaLarge: true,
      ratio: 4.48,
    });
    expect(wcagContrast(parseColor("#767676")!, white)).toMatchObject({
      aaNormal: true,
      aaaNormal: false,
      ratio: 4.54,
    });
    expect(wcagContrast(parseColor("#5146e5")!, white).aaNormal).toBe(true);
  });
});

describe("qr reading", () => {
  async function qrPixels(text: string, scale = 6, margin = 4) {
    const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
    const size = qr.modules.size;
    const total = (size + margin * 2) * scale;
    const data = new Uint8ClampedArray(total * total * 4).fill(255);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!qr.modules.get(y, x)) continue;
        for (let dy = 0; dy < scale; dy += 1) {
          for (let dx = 0; dx < scale; dx += 1) {
            const px = ((y + margin) * scale + dy) * total + (x + margin) * scale + dx;
            data[px * 4] = 0;
            data[px * 4 + 1] = 0;
            data[px * 4 + 2] = 0;
          }
        }
      }
    }
    return { data, size: total };
  }

  it("decodes a generated QR code and classifies the payload", async () => {
    const { data, size } = await qrPixels("https://averopdf.fr/");
    const decoded = decodeQrFromRgba(data, size, size);
    expect(decoded?.text).toBe("https://averopdf.fr/");
    expect(decoded?.kind).toBe("url");
    expect(decoded?.corners).toHaveLength(4);
    const wifi = await qrPixels("WIFI:T:WPA;S:Ma\\;Box;P:secret;;");
    const decodedWifi = decodeQrFromRgba(wifi.data, wifi.size, wifi.size);
    expect(decodedWifi?.kind).toBe("wifi");
    expect(parseWifiPayload(decodedWifi!.text)).toEqual({
      ssid: "Ma;Box",
      password: "secret",
      security: "WPA",
      hidden: false,
    });
    expect(classifyQr("BEGIN:VCARD\nFN:X")).toBe("vcard");
    expect(classifyQr("bonjour")).toBe("text");
    expect(decodeQrFromRgba(new Uint8ClampedArray(64 * 64 * 4).fill(255), 64, 64)).toBeNull();
  });
});

describe("printables", () => {
  it("generates paper, calendars and cover pages", async () => {
    const paper = await paperPdf({
      kind: "grid",
      spacingMm: 5,
      page: "a4",
      marginMm: 10,
      color: "#9aa3b2",
      pages: 2,
      title: "Quadrillage 5 mm",
    });
    const paperDoc = await PDFDocument.load(paper);
    expect(paperDoc.getPageCount()).toBe(2);
    expect((await extractPageText(paper, 0)).join(" ")).toContain("Quadrillage 5 mm");
    for (const kind of ["lines", "dots", "seyes", "millimeter", "isometric", "music"] as const) {
      const bytes = await paperPdf({
        kind,
        spacingMm: 7,
        page: "a5",
        marginMm: 8,
        color: "#000",
        pages: 1,
      });
      expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    }
    const month = await calendarPdf({
      year: 2026,
      month: 5,
      holidays: true,
      notes: true,
      page: "a4-landscape",
    });
    const monthText = (await extractPageText(month, 0)).join(" ");
    expect(monthText).toContain("Mai 2026");
    expect(monthText).toContain("Ascension");
    expect(monthText).toContain("31");
    const year = await calendarPdf({
      year: 2027,
      month: null,
      holidays: true,
      notes: false,
      page: "a4",
    });
    const yearText = (await extractPageText(year, 0)).join(" ");
    expect(yearText).toContain("2027");
    expect(yearText).toContain("Décembre");
    const cover = await coverPagePdf({
      title: "Rapport de stage",
      subtitle: "Développement web",
      author: "Camille Martin",
      institution: "Université",
      date: "Juin 2026",
      footer: "Confidentiel",
      page: "a4",
      accent: "#5146e5",
    });
    expect(cover.replaced).toBe(false);
    const coverText = (await extractPageText(cover.bytes, 0)).join(" ");
    expect(coverText).toContain("Rapport de stage");
    expect(coverText).toContain("Camille Martin");
  });
});
