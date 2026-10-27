import type { ToolLocalization } from "../../types";

export const conversionEn: Record<string, ToolLocalization> = {
  "conv-docx-pdf": {
    slug: "word-to-pdf",
    name: "Convert Word to PDF",
    shortDescription:
      "Turn a Word document (.docx) into a PDF that opens anywhere: headings, paragraphs, lists, tables and images, without uploading the file.",
    description:
      "Drop a .docx file and get a paginated PDF that keeps the document's structure: hierarchical headings, paragraphs with bold and italic, lists, tables, links and embedded images (PNG, JPEG). The layout is simplified and regular (single column, standard fonts): the right choice for sharing, archiving or printing a text, not for reproducing a Word layout pixel for pixel. The file never leaves your browser.",
    keywords: [
      "word to pdf",
      "docx to pdf",
      "convert word to pdf",
      "word to pdf online",
      "turn a word document into a pdf",
      "doc to pdf",
      "save word as pdf",
      "free word to pdf converter",
    ],
    seo: {
      title: "Convert a Word document (DOCX) to PDF online, no upload",
      description:
        "Turn a Word .docx file into a PDF in your browser: headings, lists, tables and images kept, simplified layout. Free, nothing is uploaded.",
    },
    content: {
      steps: [
        "Drop your .docx document (Word 2007 or later, LibreOffice, or exported from Google Docs).",
        "Choose the font, size, page format and margins; page numbering is optional.",
        "Create the PDF, review any warnings shown in the preview and download it.",
      ],
      limitations: [
        "Simplified layout: single column, standard fonts, no exact reproduction of positions, multiple columns, text boxes or the original page breaks.",
        "Headers, footers, footnotes, comments, tracked changes and fields (table of contents, numbers) are not converted.",
        "EMF/WMF/TIFF images, charts and embedded objects are skipped and reported; PNG and JPEG images are kept.",
        "Tables are rendered with equal-width columns, without merged cells or colors.",
        'Standard PDF fonts (Helvetica, Times, Courier): the original document\'s fonts are not carried over; emoji, non-Latin alphabets and rare symbols are replaced with "?" and reported.',
        ".docx format only (no .doc, .odt or .rtf); files up to 25 MB.",
      ],
      faq: [
        {
          question: "Will the PDF be identical to my Word document?",
          answer:
            'No, and we would rather say so upfront: the conversion keeps the content and structure (headings, lists, tables, images) with a regular layout, but not the fonts, columns, text boxes or exact positions. For a faithful copy, use "Save as PDF" in Word or LibreOffice; this tool is for when you do not have Word at hand or do not want to upload the document to an online service.',
        },
        {
          question: "Why is my .doc file (older Word format) not accepted?",
          answer:
            "The old binary .doc format is not supported in the browser. Open the file in Word, LibreOffice or Google Docs, save it as .docx, then try again.",
        },
        {
          question: "Is the document uploaded to a server?",
          answer:
            "No. Reading the .docx (mammoth library) and generating the PDF (pdf-lib) happen entirely in your browser. You can even go offline once the page has loaded.",
        },
      ],
      privacyNote:
        "The file is read and laid out in your browser (mammoth, exceljs, pdf-lib). It is never uploaded to a server: the conversion works even offline once the tool has been saved.",
    },
  },
  "conv-sheet-pdf": {
    slug: "excel-to-pdf",
    name: "Convert Excel or CSV to PDF",
    shortDescription:
      "Turn an Excel workbook (.xlsx) or a CSV file into paginated PDF tables, one sheet after another, without uploading the file.",
    description:
      "Drop an .xlsx workbook or a .csv file: each sheet becomes a PDF table with its header row, numbers, dates and formula results, in portrait or landscape. Ideal for sending a list, a statement or a data export in a fixed, printable form. Advanced formatting (colors, column widths, charts) is not carried over.",
    keywords: [
      "excel to pdf",
      "xlsx to pdf",
      "csv to pdf",
      "convert excel to pdf",
      "excel to pdf online",
      "table to pdf",
      "spreadsheet to pdf",
      "free excel to pdf converter",
    ],
    seo: {
      title: "Convert an Excel (XLSX) or CSV file to PDF online, no upload",
      description:
        "Turn an Excel .xlsx workbook or a CSV file into paginated PDF tables in your browser: sheets, headers, formulas, dates. Free, no upload.",
    },
    content: {
      steps: [
        "Drop an .xlsx workbook or a .csv file (the separator is detected automatically).",
        "Choose the orientation (landscape recommended beyond 6 columns), the font, the size and whether the first row is a header.",
        "Create the PDF and download it; empty or truncated sheets are reported.",
      ],
      limitations: [
        "Equal-width columns and wrapped text: very wide sheets become hard to read, so prefer landscape or split the sheet.",
        "Formulas are converted using their last saved result; custom number formats are approximated (decimals, percentages, dates).",
        "Colors, borders, merged cells, images, charts, filters and pivot tables are not converted.",
        "At most 5,000 rows per sheet are converted (the remaining rows are reported).",
        'Standard PDF fonts (Helvetica, Times, Courier): the original document\'s fonts are not carried over; emoji, non-Latin alphabets and rare symbols are replaced with "?" and reported.',
        ".xlsx and .csv formats only (no .xls or .ods); files up to 15 MB.",
      ],
      faq: [
        {
          question: "Are formulas recalculated?",
          answer:
            "No: the tool uses the result stored in the file by Excel or LibreOffice at the last save. If a cell shows an empty value, save the workbook again after recalculating.",
        },
        {
          question: "Can I convert a single sheet?",
          answer:
            "All non-empty sheets are converted, each under its own name. To keep only one, delete the others in the workbook or export the sheet you want as CSV, then convert that CSV.",
        },
      ],
      privacyNote:
        "The file is read and laid out in your browser (mammoth, exceljs, pdf-lib). It is never uploaded to a server: the conversion works even offline once the tool has been saved.",
    },
  },
  "conv-pdf-docx": {
    slug: "pdf-to-word",
    name: "Convert PDF to Word",
    shortDescription:
      "Recover the text and images of a PDF in an editable Word document (.docx), without uploading the file.",
    description:
      "Drop a PDF and get a .docx file that opens in Word, LibreOffice or Google Docs: the text of each page becomes editable paragraphs with bold and italic, headings are detected from their size, embedded images are carried over and each PDF page stays a Word page. The exact layout (columns, positions, fonts) is not reproduced: the goal is to let you reuse and edit the content, not to clone the PDF.",
    keywords: [
      "pdf to word",
      "pdf to docx",
      "convert pdf to word",
      "pdf to word online",
      "editable pdf",
      "turn a pdf into a word document",
      "pdf to docx free",
      "get the text of a pdf into word",
    ],
    seo: {
      title: "Convert a PDF to an editable Word (DOCX) file online, no upload",
      description:
        "Turn a PDF into a Word .docx document in your browser: editable paragraphs, headings, bold and italic, images carried over. Free, nothing is uploaded.",
    },
    content: {
      steps: [
        "Drop your PDF (a password is requested if the document is protected).",
        "Choose whether each PDF page should stay a Word page and whether images should be carried over.",
        "Create the Word document and download it; open it in Word or LibreOffice to edit it.",
      ],
      limitations: [
        "Text is carried over as successive paragraphs: columns, boxes, tables and exact positions are not rebuilt (table cells become plain text).",
        "The original fonts are not carried over (Word applies its own); bold, italic, size and headings are estimated from the PDF.",
        "Scanned PDFs without a text layer only yield their images: run text recognition (OCR) first to get editable text.",
        "Vector drawings, forms, annotations, links and signatures are not converted; JPEG 2000, CCITT and JBIG2 images are skipped.",
        "Right-to-left or vertical documents (Arabic, Hebrew, vertical Japanese) may come out in the wrong order.",
      ],
      faq: [
        {
          question: "Why doesn't my Word document look exactly like the PDF?",
          answer:
            "A PDF describes character positions, not a document structure. The tool rebuilds paragraphs from those positions, which is enough to reuse and edit the text, but not to clone a complex layout (newspaper columns, forms). Converters that promise a perfect copy generally upload your file to their servers.",
        },
        {
          question: "The PDF is a scan: the text does not show up in Word.",
          answer:
            'A scan contains no text, only an image. Use the "OCR" tool first to create a PDF with a text layer, then convert that PDF to Word.',
        },
        {
          question: "Is the file sent anywhere?",
          answer:
            "No. pdf.js reads the PDF and the docx library writes the Word document, both in your browser. Nothing is transmitted or kept.",
        },
      ],
      privacyNote:
        "Your file is read and transformed directly in your browser using open source libraries (pdf.js and pdf-lib). It is never uploaded to our servers, stored or analyzed.",
    },
  },
};
