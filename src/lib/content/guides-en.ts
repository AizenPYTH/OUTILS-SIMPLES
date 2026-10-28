import type { Guide } from "./guides";

/** English guides: hand-written translations of the French ones (`frSlug` links them). */
export const guidesEn: readonly Guide[] = [
  {
    slug: "how-to-merge-pdf-files",
    frSlug: "comment-fusionner-des-pdf",
    title: "How to merge several PDF files into one",
    seoTitle: "How to merge PDFs into a single file (step-by-step guide)",
    description:
      "Combine several PDFs into one document, in the right order, without installing software and without uploading your files to a server.",
    toolId: "pdf-merge",
    publishedAt: "2026-10-25",
    updatedAt: "2026-10-27",
    intro:
      "A file to send as a single attachment, invoices to archive together, chapters scanned separately: merging PDFs is one of the most common tasks. Here is how to do it cleanly, and what to check before sending the result.",
    sections: [
      {
        heading: "Prepare the files",
        paragraphs: [
          "First gather all the PDFs in one folder and rename them if their order matters (for example 01-cover.pdf, 02-contents.pdf). Make sure none is password-protected: a locked PDF cannot be merged until its owner unlocks it.",
        ],
      },
      {
        heading: "Merge in the browser",
        paragraphs: ["With AVEROPDF's Merge PDFs tool, it takes three steps:"],
        list: [
          "Drop your files in the drop zone (or click to pick them). You can add more afterwards.",
          "Reorder them by drag and drop or with the arrows. The order shown is the final order.",
          "Click “Merge”, then download the resulting document.",
        ],
      },
      {
        heading: "Good to know",
        paragraphs: [
          "Pages are copied as they are: no recompression, no quality loss. Different page formats (A4, Letter, landscape) are kept. Bookmarks of each file, however, are not carried into the merged document.",
          "Everything happens in your browser: the files go through no server, which matters for contracts, medical or accounting documents.",
        ],
      },
    ],
  },
  {
    slug: "convert-a-word-document-to-pdf-without-software",
    frSlug: "convertir-un-document-word-en-pdf-sans-logiciel",
    title: "Convert a Word document to PDF without software or upload",
    seoTitle: "Convert a Word file (DOCX) to PDF without software: method and limits",
    description:
      "Turn a .docx file into a PDF directly in the browser, understand what is kept (structure, images) and what is not (exact layout).",
    toolId: "conv-docx-pdf",
    publishedAt: "2026-10-26",
    updatedAt: "2026-10-27",
    intro:
      "You need to send a document as a PDF, but Word is not installed on this computer, or you do not want to upload a contract to an unknown online converter. Here is how to convert locally, and how to judge whether the result fits your needs.",
    sections: [
      {
        heading: "When local conversion is enough",
        paragraphs: [
          "A letter, minutes, a simple CV, a dissertation: as soon as the document is made of headings, paragraphs, lists, simple tables and images, converting in the browser gives a clean PDF readable everywhere. The structure is kept; the layout is regularised (one column, standard fonts).",
          "If the document relies on a precise layout (multiple columns, text boxes, elaborate headers, brand fonts), prefer “Save as PDF” in Word or LibreOffice: those programs reproduce the page pixel for pixel, which local conversion does not promise.",
        ],
      },
      {
        heading: "Convert in the browser",
        paragraphs: ["With the Convert Word to PDF tool:"],
        list: [
          "Drop the .docx file (old .doc files must first be saved as .docx).",
          "Choose the font, size, page format, margins and page numbering.",
          "Create the PDF, read the warnings shown (ignored elements, replaced characters) and download.",
        ],
      },
      {
        heading: "What to check",
        paragraphs: [
          "Open the PDF and browse it: tables have equal-width columns, EMF/WMF images are missing, headers, footers and footnotes are not reproduced. The tool's warnings list exactly what was simplified: nothing is dropped silently.",
          "The file never leaves your device: reading the .docx (mammoth) and generating the PDF (pdf-lib) both happen in the browser. You can save the tool to use it offline.",
        ],
      },
    ],
  },
  {
    slug: "use-the-tools-offline",
    frSlug: "utiliser-les-outils-hors-connexion",
    title: "Use the tools without an internet connection",
    seoTitle: "Use the PDF and image tools offline (offline mode)",
    description:
      "Save a tool on your device to use it on the train, on the move or on an unstable network, and know the limits of offline mode.",
    toolId: "pdf-merge",
    publishedAt: "2026-10-26",
    updatedAt: "2026-10-27",
    intro:
      "Since the tools work in the browser, they only need the internet to load. Once saved on the device, they work without a network. Here is how, and what stays unavailable.",
    sections: [
      {
        heading: "Save a tool",
        paragraphs: ["While you are online:"],
        list: [
          "Open the tool's page (for example Merge PDFs).",
          "Below the work area, press “Use offline”: the download size is shown (PDF engine 4.7 MB, OCR 17 MB, editor fonts 4.2 MB).",
          "Wait for “Available offline”. The offline page lists the saved tools and lets you remove them.",
        ],
      },
      {
        heading: "Use without a network",
        paragraphs: [
          "Open the site as usual: saved pages are displayed, a banner tells you that you are offline, and the tools process your files normally. A page that was never saved sends you to the offline page.",
        ],
      },
      {
        heading: "Limits to know",
        paragraphs: [
          "The first visit must happen online. The English OCR model and fonts other than Liberation are only saved after a first connected use. The browser may delete the files when it runs out of space, in private browsing, or after a long period of inactivity (Safari is the strictest). Site updates apply on the next connected visit.",
        ],
      },
    ],
  },
  {
    slug: "recover-the-text-of-a-scanned-pdf",
    frSlug: "recuperer-le-texte-d-un-pdf-scanne",
    title: "Recover the text of a scanned PDF (OCR)",
    seoTitle: "Recover the text of a scanned PDF with OCR, in the browser",
    description:
      "Turn a scan into a searchable PDF or editable text, choose the language, judge the recognition quality and fix the errors.",
    toolId: "scan-ocr",
    publishedAt: "2026-10-26",
    updatedAt: "2026-10-27",
    intro:
      "A contract received as a photo, a digitised archive, a scanned statement: the text is visible but neither searchable nor copyable. Optical character recognition (OCR) makes it usable, and it runs entirely in the browser thanks to Tesseract.",
    sections: [
      {
        heading: "Prepare the document",
        paragraphs: [
          "The result depends on the image: 300 dpi or more, a straight page, sharp contrast. A phone photo benefits from a pass through “Fix a photographed document” first (straightening, black-and-white filter).",
        ],
      },
      {
        heading: "Run the recognition",
        paragraphs: ["With the OCR tool:"],
        list: [
          "Drop the image or scanned PDF and pick the language (French, English): the matching model (6 to 11 MB) is downloaded once and kept.",
          "Start the recognition; the orientation of each page is detected, even for rotated pages.",
          "Get the result: plain text to copy, or a searchable PDF where the invisible text is aligned with the original image.",
        ],
      },
      {
        heading: "Proofread and correct",
        paragraphs: [
          "OCR makes mistakes on pale scans, fancy fonts, tables and numbers: proofread the important passages. The average confidence shown gives an idea. In the PDF editor, the built-in OCR makes every recognised passage editable directly on the page.",
          "To get an editable Word document, then convert the searchable PDF with “Convert a PDF to Word”.",
        ],
      },
    ],
  },
];
