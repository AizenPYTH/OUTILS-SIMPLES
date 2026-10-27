import type { ToolLocalization } from "../../types";

const PDF_PRIVACY =
  "Your file is read and transformed directly in your browser using open source libraries (pdf.js and pdf-lib). It is never sent to our servers, stored or analyzed.";

const QPDF_PRIVACY =
  "Encryption is handled by qpdf (WebAssembly) directly in your browser: neither the file nor the password is ever transmitted.";

export const pdfExtraEn: Record<string, ToolLocalization> = {
  "pdf-extract-text": {
    slug: "extract-text",
    name: "Extract text from a PDF",
    shortDescription: "Get all the text of a PDF as TXT or Markdown, page by page.",
    description:
      "Extract the selectable text of a PDF to copy it, rework it or archive it: the text is rebuilt page by page, preserving lines and paragraphs, then offered as plain text or Markdown (one heading per page). Pages without text (scans) are flagged so you can turn to OCR.",
    keywords: [
      "extract text from pdf",
      "pdf to txt",
      "copy text from pdf",
      "pdf to text",
      "convert pdf to text",
      "pdf to markdown",
      "get text from pdf online",
      "pdf text extractor free",
    ],
    seo: {
      title: "Extract text from a PDF online (PDF to TXT or Markdown)",
      description:
        "Get the text of a PDF page by page and download it as TXT or Markdown. Scanned page detection, in-document search, processed locally in your browser.",
    },
    content: {
      steps: [
        "Drop your PDF: the text of each page is read by pdf.js.",
        "Search for a word if needed, then choose plain text or Markdown.",
        "Copy the result or download the file.",
      ],
      limitations: [
        "Only text actually present in the PDF is extracted: a scanned document (image) contains no text, so use the OCR tool instead.",
        "Word order follows the position on the page; tables and multi-column layouts may come out mixed up.",
        "Characters from badly encoded fonts may appear as symbols: this is a limitation of the original file.",
      ],
      faq: [
        {
          question: "Why are some pages empty?",
          answer:
            'They contain only images (a scanned document, or text converted to outlines). The "OCR PDF and image" tool can then recognize the text from the image.',
        },
      ],
      privacyNote: PDF_PRIVACY,
    },
  },

  "pdf-search": {
    slug: "search",
    name: "Search inside a PDF",
    shortDescription: "Find a word or phrase in a PDF, with the page and context of every match.",
    description:
      'Search for a word, a name or a phrase in a PDF document without opening it in a reader: every match is listed with its page number and a context excerpt. The search ignores case and accents, so you can find "café" by typing "cafe".',
    keywords: [
      "search in pdf",
      "find a word in a pdf",
      "search pdf online",
      "find text in pdf",
      "pdf search tool",
      "pdf word occurrences",
    ],
    seo: {
      title: "Search for a word in a PDF online (matches by page)",
      description:
        "Find every occurrence of a word or phrase in a PDF, with the page number and surrounding context. Accent-insensitive search, processed locally in your browser.",
    },
    content: {
      steps: [
        "Drop your PDF.",
        "Type the word or phrase you are looking for.",
        "Browse the matches with their page and context.",
      ],
      limitations: [
        "The search covers selectable text only: scanned documents must go through OCR first.",
        "Words split by a line break or hyphenation may not be found.",
      ],
      faq: [
        {
          question: "Why does the search find nothing in my PDF?",
          answer:
            "The document is probably a scan: it contains an image of the page, not text. Run it through the OCR tool first to get a PDF with a text layer, then search again.",
        },
        {
          question: "Are words split at the end of a line found?",
          answer:
            'Not always: a hyphenated word ("docu-ment") or a phrase split by a line break can escape the search. Try a shorter word or part of the phrase.',
        },
      ],
      privacyNote: PDF_PRIVACY,
    },
  },

  "pdf-to-images": {
    slug: "pdf-to-images",
    name: "Convert a PDF to images",
    shortDescription:
      "Turn every page of a PDF into a JPG, PNG or WebP image at the resolution of your choice.",
    description:
      "Convert the pages of a PDF into images to share them or insert them into a presentation or a website: choose the format (JPG, PNG, WebP), the resolution (72, 150 or 300 dpi) and the pages to convert. Download the images one by one or as a ZIP archive.",
    keywords: [
      "pdf to jpg",
      "pdf to png",
      "pdf to webp",
      "convert pdf to image",
      "pdf page to image",
      "pdf to jpg online free",
      "pdf to image converter",
    ],
    seo: {
      title: "Convert a PDF to JPG, PNG or WebP online (pages to images)",
      description:
        "Turn the pages of a PDF into JPG, PNG or WebP images at 72, 150 or 300 dpi. Download individually or as a ZIP, rendered locally in your browser.",
    },
    content: {
      steps: [
        "Drop your PDF.",
        "Choose the format, the resolution and the pages.",
        "Download the images (as a ZIP if there are several pages).",
      ],
      limitations: [
        "Rendering is done by pdf.js: very large pages at 300 dpi are capped at about 25 megapixels to preserve browser memory.",
        'Text becomes an image: it is no longer selectable. To keep the text, use "Extract text".',
      ],
      faq: [
        {
          question: "Which resolution should I choose?",
          answer:
            "72 dpi is enough for an on-screen preview, 150 dpi for comfortable reading, 300 dpi for printing or OCR.",
        },
      ],
      privacyNote: PDF_PRIVACY,
    },
  },

  "pdf-from-images": {
    slug: "images-to-pdf",
    name: "Convert images to PDF",
    shortDescription:
      "Combine photos or JPG, PNG, WebP images into one PDF, one page per image, in the order you choose.",
    description:
      "Create a PDF from one or more images: photos of documents, screenshots, scans. Reorder the images by drag and drop, choose the page size (A4, Letter or the image's own dimensions) and the margins, then download a multi-page PDF ready to send.",
    keywords: [
      "jpg to pdf",
      "image to pdf",
      "png to pdf",
      "convert image to pdf",
      "photos to pdf",
      "webp to pdf",
      "multiple images to one pdf",
      "create pdf from images online",
    ],
    seo: {
      title: "Convert JPG, PNG or WebP images to PDF online",
      description:
        "Turn one or more images into a multi-page PDF: drag-and-drop ordering, A4 pages or image-sized pages, adjustable margins. Free, processed locally in your browser.",
    },
    content: {
      steps: [
        "Drop your images (or take a photo on mobile).",
        "Reorder them, choose the page size and the margins.",
        "Create the PDF and download it.",
      ],
      limitations: [
        "JPG and PNG files are embedded without recompression; other formats (WebP, GIF, BMP, AVIF, SVG) are converted to PNG or JPG along the way.",
        "Up to 100 images per PDF.",
      ],
      faq: [
        {
          question: "How do I scan a sheet of paper cleanly?",
          answer:
            'To crop, straighten and improve the contrast of a photographed document, use the "Scan a document" tool, which produces a PDF directly.',
        },
      ],
      privacyNote: PDF_PRIVACY,
    },
  },

  "pdf-crop": {
    slug: "crop",
    name: "Crop a PDF",
    shortDescription: "Remove the margins of a PDF by defining the area to keep, with a preview.",
    description:
      "Trim the margins of your PDF pages (in millimeters, per side) to remove unwanted edges, headers or blank areas before printing or reading on an e-reader. The preview shows the area that is kept; the crop applies to all pages or to a selection.",
    keywords: [
      "crop pdf",
      "trim pdf margins",
      "remove pdf margins",
      "cut pdf margins",
      "crop pdf pages online",
      "reduce pdf margins",
    ],
    seo: {
      title: "Crop a PDF online: trim the margins of the pages",
      description:
        "Remove the margins of a PDF by entering the edges to trim, with a preview of the kept area. Non-destructive, reversible crop, processed locally in your browser.",
    },
    content: {
      steps: [
        "Drop your PDF.",
        "Enter the margins to remove (top, bottom, left, right) and check the preview.",
        "Crop, then download.",
      ],
      limitations: [
        'Cropping changes the display area (CropBox): the hidden content stays in the file and can be restored with "Restore full page". This is not redaction.',
        "The margins are the same for every selected page.",
      ],
      faq: [
        {
          question: "Does cropping really remove what is outside the area?",
          answer:
            'No. It sets the display area (CropBox): the hidden content stays in the file and can be restored. To permanently remove information, use "Redact a PDF".',
        },
        {
          question: "Can I apply different margins to different pages?",
          answer:
            "The margins are the same for every selected page. For different crops, run the tool several times, selecting the relevant pages each time.",
        },
      ],
      privacyNote: PDF_PRIVACY,
    },
  },

  "pdf-stamp": {
    slug: "page-numbers",
    name: "Add page numbers to a PDF",
    shortDescription:
      "Add page numbers, a date, a file name or custom text in the header and footer.",
    description:
      'Add page numbering ("1 / 12", "Page 1 of 12"...), today\'s date, the file name or any text in the header or footer, on the left, center or right. Choose the font, size, color, margin, first number and starting page.',
    keywords: [
      "add page numbers to pdf",
      "pdf page numbers",
      "pdf pagination",
      "add header to pdf",
      "pdf footer",
      "add date to pdf",
      "number pdf pages online",
      "page number pdf free",
    ],
    seo: {
      title: "Add page numbers to a PDF online (header, footer, date)",
      description:
        "Add page numbers, date, file name or text to the header and footer of a PDF. Adjustable font, size, position and first number. Processed locally in your browser.",
    },
    content: {
      steps: [
        "Drop your PDF.",
        "Choose the footer and/or header template, the position and the style.",
        "Apply, then download.",
      ],
      limitations: [
        "The text is added on top of the content: if numbering already exists, it is not replaced.",
        "Standard PDF fonts (Helvetica, Times, Courier): Latin characters only.",
      ],
      faq: [
        {
          question: "How do I start numbering from a number other than 1?",
          answer:
            "Enter the starting number in the options: useful when the document is one chapter of a larger set. The {page} / {total} template shows the position and the total number of pages.",
        },
        {
          question: "Is existing numbering replaced?",
          answer:
            "No: the text is added on top of the content. If the document already has numbers in the same spot, the two overlap; choose another position (corner, center) or hide the old one with the editor.",
        },
      ],
      privacyNote: PDF_PRIVACY,
    },
  },

  "pdf-protect": {
    slug: "protect",
    name: "Password-protect a PDF",
    shortDescription:
      "Encrypt a PDF (AES-256) with an open password and printing or copying restrictions.",
    description:
      "Protect a confidential document with an open password and, if needed, an owner password that controls printing, copying, editing and annotations. AES-256 encryption (or AES-128 for older readers) is performed by qpdf, compiled to WebAssembly, without the file ever leaving your browser.",
    keywords: [
      "password protect pdf",
      "pdf password",
      "encrypt pdf",
      "lock pdf",
      "secure pdf online",
      "prevent pdf copying",
      "prevent pdf printing",
      "encrypt pdf free",
    ],
    seo: {
      title: "Password-protect a PDF online (AES-256 encryption)",
      description:
        "Add an open password and restrictions (printing, copying, editing) to a PDF. Local AES-256 encryption by qpdf, your file is never uploaded.",
    },
    content: {
      steps: [
        "Drop your PDF.",
        "Enter an open password and, if needed, an owner password; choose the permissions.",
        "Protect, then download the encrypted PDF.",
      ],
      limitations: [
        "Restrictions (printing, copying...) depend on the goodwill of the PDF reader: only the open password guarantees confidentiality.",
        "A forgotten password cannot be recovered by OUTILIA or by anyone else: keep it somewhere safe.",
        "AES-256 requires a reader compatible with PDF 1.7 (all recent readers).",
      ],
      faq: [
        {
          question: "What is the difference between the open password and the owner password?",
          answer:
            "The open password is required to read the document. The owner password allows the restrictions (printing, copying...) to be lifted; if left empty, it takes the value of the open password.",
        },
      ],
      privacyNote: QPDF_PRIVACY,
    },
  },

  "pdf-unlock": {
    slug: "unlock",
    name: "Unlock a PDF",
    shortDescription: "Remove the password and restrictions from a PDF whose password you know.",
    description:
      "Remove the protection from a PDF you are allowed to edit: enter its password (open or owner) and get an unencrypted copy with no printing or copying restrictions. Decryption is performed by qpdf in your browser; the password is never transmitted.",
    keywords: [
      "unlock pdf",
      "remove pdf password",
      "remove pdf protection",
      "protected pdf",
      "decrypt pdf",
      "unprotect pdf online",
      "remove pdf restrictions",
    ],
    seo: {
      title: "Unlock a password-protected PDF (with the password)",
      description:
        "Remove the password and restrictions from a PDF whose password you know. Local decryption by qpdf, no file or password is ever uploaded.",
    },
    content: {
      steps: [
        "Drop the protected PDF.",
        "Enter its password and confirm that you are allowed to remove the protection.",
        "Unlock, then download the unencrypted copy.",
      ],
      limitations: [
        "This tool does not crack passwords: without the right password, the document stays locked.",
        "It is meant only for documents you authored or have the right to edit.",
      ],
      faq: [
        {
          question: "I forgot the password, can you open it?",
          answer:
            "No. An AES-encrypted PDF cannot be opened without its password, and OUTILIA offers no brute-force attack. Contact the author of the document.",
        },
      ],
      privacyNote: QPDF_PRIVACY,
    },
  },

  "pdf-check": {
    slug: "check-repair",
    name: "Check and repair a PDF",
    shortDescription:
      "Diagnose the structure of a PDF (syntax errors, encryption, version) and get a rewritten copy when possible.",
    description:
      "A PDF that will not open or displays badly? This tool checks its structure with qpdf: version, encryption, syntax and stream errors. When the file is still readable despite warnings, a rewritten copy with clean tables is offered. The tool states clearly what it detects and what it cannot repair.",
    keywords: [
      "repair pdf",
      "corrupted pdf",
      "damaged pdf",
      "check pdf",
      "pdf won't open",
      "fix pdf online",
      "analyze pdf",
      "unreadable pdf",
    ],
    seo: {
      title: "Check and repair a damaged PDF online (honest diagnosis)",
      description:
        "Analyze the structure of a PDF with qpdf: syntax errors, encryption, version. A rewritten copy is offered when repair is possible. Processed locally in your browser.",
    },
    content: {
      steps: [
        "Drop the PDF to analyze.",
        "Read the diagnosis: version, encryption, warnings and errors.",
        "If a repaired copy is offered, download it and check it.",
      ],
      limitations: [
        "The repair rebuilds the cross-reference tables and malformed objects; it does not recreate missing or truncated content.",
        "A file whose header or trailer is missing may be unrecoverable.",
        "An encrypted document must be unlocked for a full analysis.",
      ],
      faq: [
        {
          question: "What exactly does the tool repair?",
          answer:
            "It rewrites the file, rebuilding the cross-reference tables and malformed objects (missing end of file, wrong offsets). It cannot recreate missing or truncated content: a cut-off file stays unreadable.",
        },
        {
          question: "Why is an encrypted PDF reported without details?",
          answer:
            'A full analysis requires opening the content. Unlock the document with its password first ("Unlock a PDF"), then run the check again.',
        },
      ],
      privacyNote: QPDF_PRIVACY,
    },
  },

  "pdf-metadata": {
    slug: "metadata",
    name: "PDF metadata",
    shortDescription:
      "View, edit or remove the metadata of a PDF (title, author, software, dates).",
    description:
      "See the hidden information of a PDF: title, author, subject, keywords, creating software, producer, dates and XMP metadata. Edit the useful fields or remove everything in one click before sharing a document, leaving no trace of the author or the software used.",
    keywords: [
      "pdf metadata",
      "remove pdf metadata",
      "pdf author",
      "edit pdf title",
      "pdf properties",
      "anonymize pdf",
      "hidden pdf information",
      "pdf metadata viewer online",
    ],
    seo: {
      title: "View, edit and remove PDF metadata online",
      description:
        "View the metadata of a PDF (author, title, software, dates, XMP), edit it or remove it before sharing. Processed locally in your browser, no file upload.",
    },
    content: {
      steps: [
        "Drop your PDF: its metadata is displayed.",
        'Edit the fields or choose "Remove all metadata".',
        "Download the updated PDF.",
      ],
      limitations: [
        "Removal covers the information dictionary and the XMP streams of the document and its pages. Information contained in images (EXIF), text or annotations is not changed.",
        "The dates shown are those declared by the file, not those of the system.",
      ],
      faq: [
        {
          question: "Does removing the metadata erase every trace?",
          answer:
            "It clears the information dictionary and the XMP streams of the document and its pages. Data contained in images (EXIF of an inserted photo), in the text or in annotations remains: for full anonymization, check those elements too.",
        },
        {
          question: "Why do the dates shown not match my file?",
          answer:
            "They are the dates declared inside the PDF by the software that produced it, not those of the file system. They may be missing, in another time zone, or deliberately changed.",
        },
      ],
      privacyNote: PDF_PRIVACY,
    },
  },

  "pdf-links": {
    slug: "extract-links",
    name: "Extract links from a PDF",
    shortDescription:
      "List every clickable link, web address and email in a PDF, page by page, as TXT or CSV.",
    description:
      "Collect in one go every address contained in a document: clickable links (annotations), URLs and email addresses written in the text, each with its page number. Handy for checking the references of a report, auditing the links of a brochure or gathering the contacts of a list. Export as text or CSV.",
    keywords: [
      "extract links from pdf",
      "pdf links",
      "pdf urls",
      "extract emails from pdf",
      "email addresses in pdf",
      "list pdf links",
      "pdf hyperlinks",
      "pdf link extractor online",
    ],
    seo: {
      title: "Extract links and emails from a PDF online (TXT, CSV)",
      description:
        "List the clickable links, URLs and email addresses of a PDF with their page, then export as TXT or CSV. Processed locally in your browser, no file upload.",
    },
    content: {
      steps: [
        "Drop your PDF: links and text are analyzed.",
        "Filter (clickable links only, each address once).",
        "Copy or download the list as TXT or CSV.",
      ],
      limitations: [
        "Internal links (to another page of the same document) are counted but not listed.",
        "Addresses in a scanned document cannot be detected without OCR.",
        "A URL split across two lines in the text may be truncated.",
      ],
      faq: [
        {
          question: "Are addresses written in plain text without a clickable link found?",
          answer:
            "Yes: the tool reads link annotations and also spots URLs and emails present in the text. An address split across two lines may be truncated, and a scanned document contains no text without OCR.",
        },
        {
          question: "What happens to internal links?",
          answer:
            "Links to another page of the same document are counted but not listed, since they do not point to any address. The TXT or CSV export contains external links only.",
        },
      ],
      privacyNote: PDF_PRIVACY,
    },
  },

  "pdf-extract-images": {
    slug: "extract-images",
    name: "Extract images from a PDF",
    shortDescription:
      "Recover the photos and illustrations embedded in a PDF in their original quality (JPG, PNG).",
    description:
      "Extract the images embedded in a PDF without recompressing them: JPEGs are copied as is, other formats are converted to lossless PNG, transparency included. Filter out tiny icons and separators, preview each image and download them one by one or as a ZIP.",
    keywords: [
      "extract images from pdf",
      "get images from pdf",
      "pdf images to jpg",
      "embedded pdf images",
      "save image from pdf",
      "pdf image extractor online",
      "photos from pdf",
    ],
    seo: {
      title: "Extract images from a PDF online (original quality, ZIP)",
      description:
        "Recover the photos and illustrations embedded in a PDF without recompression, as JPG or PNG, with preview and ZIP download. Processed locally in your browser.",
    },
    content: {
      steps: [
        "Drop your PDF.",
        "Choose the minimum size of the images to keep.",
        "Preview, then download the images (as a ZIP if there are several).",
      ],
      limitations: [
        'CCITT fax or JBIG2 images (some scanners) and vector drawings are not extracted: use "PDF to images" to get a rendering of the pages.',
        "JPEG 2000 images are delivered as .jp2 files, which few browsers can display.",
        "A JPEG transparency mask is not preserved (the image is delivered without its transparency).",
      ],
      faq: [
        {
          question: 'How is this different from "PDF to images"?',
          answer:
            '"PDF to images" takes a picture of each whole page at a chosen resolution. This tool recovers the original image files embedded in the PDF, at their native resolution, without the text or the layout.',
        },
      ],
      privacyNote: PDF_PRIVACY,
    },
  },

  "pdf-compare": {
    slug: "compare",
    name: "Compare two PDFs",
    shortDescription:
      "Spot the text differences between two versions of a PDF, page by page, additions in green and deletions in red.",
    description:
      "Compare two versions of a contract, a quote, a report or an article: the text of each page is extracted and then matched, word by word or line by line, with additions highlighted in green and deletions in red. A summary lists the modified, added or removed pages, and the report can be downloaded as text.",
    keywords: [
      "compare two pdfs",
      "difference between two pdfs",
      "compare pdf versions",
      "pdf diff",
      "pdf compare online",
      "compare contracts",
      "document comparison",
      "find changes in pdf",
    ],
    seo: {
      title: "Compare two PDFs online and see the differences (text)",
      description:
        "Compare the text of two PDFs page by page: additions in green, deletions in red, modified pages, downloadable report. Processed locally in your browser, no upload.",
    },
    content: {
      steps: [
        "Drop the original document, then the modified document.",
        '"Text" mode: choose the granularity (words, lines, characters) and browse the modified pages or download the report.',
        '"Visual" mode: both pages are rendered at the same size and compared pixel by pixel, with differences in red; "Analyze all pages" lists the percentage of differing pixels per page.',
      ],
      limitations: [
        "Text mode: images, layout, fonts and colors are not compared. Visual mode: a one-pixel offset or different anti-aliasing counts as a difference; it shows where to look, not what changed.",
        "Pages are compared by number: an inserted page shifts the following ones, which then appear as modified.",
        "Scanned documents contain no text: run them through OCR first.",
      ],
      faq: [
        {
          question: "What is the difference between text mode and visual mode?",
          answer:
            "Text mode compares words, lines or characters and shows precisely what changed; it ignores images and layout. Visual mode renders both pages and compares the pixels: it shows where to look (images, stamps, shifts) but does not say what changed.",
        },
        {
          question: "Why do all the pages appear as modified?",
          answer:
            "Pages are compared by number. An inserted or removed page shifts all the following ones, which then look different. Compare versions with the same pagination, or extract the relevant sections before comparing.",
        },
      ],
      privacyNote: PDF_PRIVACY,
    },
  },

  "pdf-redact": {
    slug: "redact",
    name: "Redact a PDF (remove information)",
    shortDescription:
      "Permanently hide names, numbers or areas of a PDF: the hidden text is actually removed, not just covered up.",
    description:
      "Remove sensitive information from a PDF for good before sharing it: search for a word, a name or a number to mark every occurrence, draw rectangles over the areas to hide, then generate the redacted document. The affected pages are converted to images with the areas blacked out: the original text no longer exists in the file, unlike a simple black rectangle placed on top. The metadata is removed as well.",
    keywords: [
      "redact pdf",
      "pdf redaction",
      "hide text in pdf",
      "remove information from pdf",
      "anonymize pdf",
      "black out pdf",
      "gdpr pdf",
      "hide name in pdf",
      "redact pdf online free",
    ],
    seo: {
      title: "Redact a PDF online: permanently remove text",
      description:
        "Hide names, numbers and areas of a PDF irreversibly (text actually removed, not covered up), metadata erased. Processed locally in your browser, no upload.",
    },
    content: {
      steps: [
        "Drop the PDF; search for a word to mark its occurrences automatically, or draw rectangles on the pages.",
        "Check the areas (clicking an area removes it) and choose the output resolution.",
        "Generate the redacted PDF, then review it before sharing it.",
      ],
      limitations: [
        "Redacted pages become images: their text is no longer selectable or searchable (that is the point). The other pages are left untouched.",
        "The automatic search only covers the real text of the PDF: on a scan, draw the areas by hand.",
        "The file size may increase (images at 150-300 dpi).",
        "Always check the result: the tool cannot guess what is sensitive.",
      ],
      faq: [
        {
          question: "Why convert the pages to images?",
          answer:
            "A black rectangle drawn on top leaves the text in the file: it remains copyable and searchable. By replacing the page with its rendering with the areas blacked out, the hidden content really disappears from the PDF. This is the safest approach achievable in a browser.",
        },
      ],
      privacyNote: PDF_PRIVACY,
    },
  },
};
