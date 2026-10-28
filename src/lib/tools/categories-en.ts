import type { CategoryLocalization, ToolCategoryId } from "./types";

export const categoriesEn: Record<ToolCategoryId, CategoryLocalization> = {
  pdf: {
    slug: "pdf",
    name: "PDF tools",
    shortName: "PDF",
    description:
      "Merge, split, compress, organise, annotate, sign, protect and convert your PDF documents directly in the browser.",
    seo: {
      title: "Free online PDF tools: merge, split, compress, sign",
      description:
        "All AVEROPDF PDF tools: merge, split, compress, organise, rotate, text, annotation, signature, watermark, protection, conversion. Local processing, no file upload.",
    },
  },
  numerisation: {
    slug: "scanning",
    name: "Scanning and OCR",
    shortName: "Scanning",
    description:
      "Scan a document with your phone camera, straighten a photographed page and recognise text (OCR) to get a searchable PDF.",
    seo: {
      title: "Scan a document and recognise text (OCR) online",
      description:
        "Scanner, perspective correction and OCR in your browser: photograph a document, straighten it, extract its text and create a searchable PDF, without uploading anything.",
    },
  },
  images: {
    slug: "images",
    name: "Image tools",
    shortName: "Images",
    description:
      "Compress, resize, crop, convert, rotate and watermark your images, one by one or in batches, with EXIF data kept under control.",
    seo: {
      title: "Online image tools: compress, resize, convert",
      description:
        "Compression, resizing, cropping, JPG/PNG/WebP conversion, rotation, watermark and EXIF metadata, processed locally in your browser.",
    },
  },
  conversion: {
    slug: "conversion",
    name: "File conversion",
    shortName: "Conversion",
    description:
      "Convert documents and data from one format to another: PDF, images, text, Markdown, CSV, JSON.",
    seo: {
      title: "Online file conversion: PDF, images, text, CSV, JSON",
      description:
        "File converters processed in the browser: Word and Excel to PDF, PDF to Word, PDF to images, images to PDF, text and Markdown to PDF, CSV to JSON and back.",
    },
  },
  texte: {
    slug: "text",
    name: "Text and productivity",
    shortName: "Text",
    description:
      "Count, clean, compare and transform text: word counter, case converter, cleaner, diff and URL slug generator.",
    seo: {
      title: "Online text tools: count, clean, compare, transform",
      description:
        "Word counter, upper/lower case, text cleaner, text comparison and slug generator, all running in your browser.",
    },
  },
  developpeur: {
    slug: "developer",
    name: "Developer tools",
    shortName: "Developer",
    description:
      "JSON, CSV, Base64, URL encoding, HTML entities, UUIDs, passwords, hashes, regular expressions and timestamps, without leaving the page.",
    seo: {
      title: "Online developer tools: JSON, Base64, UUID, hash, regex",
      description:
        "JSON formatter, CSV to JSON, Base64, URL and HTML encoding, UUID and password generators, SHA hashes, regex tester and Unix timestamp converter, processed locally.",
    },
  },
  calculatrices: {
    slug: "calculators",
    name: "Calculators and conversions",
    shortName: "Calculators",
    description:
      "Percentages, VAT, dates and working days, unit conversions: quick answers with the formula shown.",
    seo: {
      title: "Online calculators: percentages, VAT, dates, units",
      description:
        "Percentage, VAT, date and working-day calculators and unit converter, with the formulas shown, running in your browser.",
    },
  },
  codes: {
    slug: "codes",
    name: "QR codes, barcodes and colours",
    shortName: "QR & colours",
    description:
      "Generate and read QR codes, create barcodes, convert colours, check WCAG contrast and extract a colour palette from an image.",
    seo: {
      title: "QR code generator, barcodes and colour tools",
      description:
        "QR code generator and reader, barcode generator, colour converter with WCAG contrast check and image palette extractor, all local.",
    },
  },
  documents: {
    slug: "documents",
    name: "Printable documents",
    shortName: "Documents",
    description:
      "Turn Markdown or plain text into PDF, generate printable sheets, calendars and cover pages.",
    seo: {
      title: "Printable PDF documents: sheets, calendars, cover pages",
      description:
        "Markdown and text to PDF, ruled, squared and dotted sheets, monthly and yearly calendars, cover pages: PDFs generated in your browser.",
    },
  },
};
