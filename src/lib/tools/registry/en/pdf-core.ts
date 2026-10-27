import type { ToolLocalization } from "../../types";

const PRIVACY_PDF =
  "Your file is read and transformed directly in your browser using open source libraries (pdf.js and pdf-lib). It is never sent to our servers, stored or analyzed.";

export const pdfCoreEn: Record<string, ToolLocalization> = {
  "pdf-edit": {
    slug: "edit",
    name: "Edit a PDF",
    shortDescription: "Edit existing text, add text, annotations, shapes, images and a signature.",
    description:
      "OUTILIA's PDF editor changes the original text of your pages when the file allows it (real text, known font), and lets you add text, draw freehand, highlight, draw shapes, insert images and place a signature. Every addition can be moved, resized or deleted before export, and the resulting PDF opens in any reader.",
    keywords: [
      "edit pdf",
      "pdf editor",
      "edit pdf online",
      "write on a pdf",
      "fill in pdf",
      "annotate pdf",
      "add image to pdf",
      "edit pdf text",
    ],
    seo: {
      title: "Edit a PDF Online for Free: Text, Annotations, Signature",
      description:
        "Free PDF editor: add text, highlights, shapes, images and a signature to your pages. 100% processed locally in your browser, no sign-up.",
    },
    content: {
      steps: [
        "Drop your PDF or click to select it. OUTILIA analyzes it (native text, scanned document, mixed) and asks for the password if it is protected.",
        'To correct existing text: pick the "Edit text" tool, click the passage, type the new text, then press Enter. The page is re-rendered from the actually modified file. On a scan, run the built-in OCR first: the recognized text then becomes editable.',
        'To add elements: choose a tool (text, rectangle, ellipse, line, arrow, drawing, highlight, comment, image, signature, mask) and draw on the page; the object stays selected and its floating bar sets outline, stroke, fill, opacity, font, size, bold, italic, underline, alignment and colors. Move, resize, duplicate (Ctrl + D) or delete it. The pages panel rotates, duplicates, deletes and reorders pages, and "Insert a PDF" adds the pages of another document after the current page. Undo / Redo cover everything.',
        'Click "Download the edited PDF": the file is generated locally, then reopened for verification before download.',
      ],
      limitations: [
        "Editing existing text replaces the passage (the text operator) in the page content, with no white rectangle. The passage is rewritten with its original font when every character exists in it; otherwise a close standard font is used for that passage (different appearance). The text that follows on the same line is not shifted: longer text can overlap what comes next.",
        "A passage is a block as the PDF producer wrote it: sometimes a word, sometimes a line. Type 3 fonts and vertical writing cannot be edited; neither can form and annotation text.",
        'Scanned documents: the built-in OCR (Tesseract, in the browser, a few seconds per page) adds an invisible text layer aligned with the image. Correcting a recognized passage changes that layer (search, copy); the "rewrite visibly" option repaints the area with the background color and a standard font, without reproducing the scan\'s font. The estimated quality is displayed: proofread the recognized text.',
        'Fonts for added text: Helvetica, Times and Courier (PDF standard) plus nine free families embedded in the file (Liberation Sans / Serif / Mono, compatible with Arial, Times New Roman and Courier New; Carlito, compatible with Calibri; Caladea, compatible with Cambria; Gelasio, compatible with Georgia; Open Sans; Fira Sans; DejaVu Sans). Accents and Latin characters are supported; non-Latin alphabets and emojis are replaced with "?" and flagged. No free rotation of objects and no paragraph reflow.',
        "Protected files: the open password is requested and the document is unlocked locally (qpdf); the downloaded PDF is no longer protected. A damaged file or one that is not a PDF is reported as such.",
      ],
      faq: [
        {
          question: "Can I edit the existing text of a PDF?",
          answer:
            "Yes, in the supported cases: the text must be real text with a font the browser can read. The editor then replaces the passage in the page content, with the same font when it contains every character you typed, and re-renders the page from the modified file. It does not reformat the paragraph: the text that follows does not move, and a longer passage can overlap what comes next. For a scanned document, run the built-in OCR: the recognized text then becomes editable (search layer, or visible rewrite in a standard font).",
        },
        {
          question: "What happens with a scanned or protected PDF?",
          answer:
            'A scan is not rejected: the editor tells you the pages are images and offers "Run OCR" or "Continue without OCR" (annotations, added text, signature, pages). A protected PDF asks for its password, which stays in your browser. The original file is never modified: the result is a new copy, verified before download.',
        },
        {
          question: "Is the edited PDF compatible with all readers?",
          answer:
            "Yes. Added elements are integrated into the page content in a standard way, and the file opens in Adobe Reader, Preview, Chrome, Firefox or any other PDF reader.",
        },
      ],
      privacyNote: PRIVACY_PDF,
    },
  },

  "pdf-merge": {
    slug: "merge",
    name: "Merge PDFs",
    shortDescription: "Combine several PDF files into a single document, in the order you choose.",
    description:
      "Bring several PDFs together in one file. Add your documents, reorder them by drag and drop, remove the ones you no longer need, then download the merged PDF. All pages, their dimensions and their rotations are preserved.",
    keywords: [
      "merge pdf",
      "combine pdf",
      "join pdf files",
      "merge pdf online",
      "merge pdf free",
      "put pdfs together",
      "concatenate pdf",
    ],
    seo: {
      title: "Merge PDFs Online for Free, Without Uploading Your Files",
      description:
        "Merge several PDFs into a single document in seconds, in the order you choose. Processed locally in your browser, free and with no sign-up.",
    },
    content: {
      steps: [
        "Add two or more PDF files (drag and drop or select).",
        "Reorder them by dragging; remove the ones you do not want to include.",
        'Click "Merge", then download the resulting document.',
      ],
      limitations: [
        "Password-protected files cannot be merged until they are unlocked.",
        "Interactive forms are preserved page by page, but fields with the same name in several files may conflict.",
        "Up to 30 files per merge.",
      ],
      faq: [
        {
          question: "Is the file order respected?",
          answer:
            "Yes. The final document follows exactly the order shown in the list. You can change it at any time by drag and drop or with the arrows before starting the merge.",
        },
        {
          question: "Is page quality altered?",
          answer: "No. Pages are copied as they are, with no recompression or resizing.",
        },
      ],
      privacyNote: PRIVACY_PDF,
    },
  },

  "pdf-split": {
    slug: "split",
    name: "Split a PDF",
    shortDescription: "Cut a PDF into several files based on page ranges you define.",
    description:
      'Split a PDF document into several files: enter page ranges (for example "1-3, 4-6, 10"), choose one file per range or a single file gathering the selected pages, check the preview, then download the result, individually or in a ZIP archive.',
    keywords: [
      "split pdf",
      "separate pdf pages",
      "cut pdf",
      "split pdf online",
      "split pdf free",
      "divide pdf",
      "extract page range pdf",
    ],
    seo: {
      title: "Split a PDF Online: Separate a PDF into Several Files",
      description:
        "Cut a PDF into several documents from page ranges, with preview and validation. Download files individually or as a ZIP. 100% local, free.",
    },
    content: {
      steps: [
        "Drop your PDF: the page count and a preview are displayed.",
        'Enter your page ranges (e.g. "1-3, 5, 8-10") or choose an automatic split (one page per file, every N pages).',
        'Choose "one file per range" or "a single file".',
        "Check the preview of each file to be produced, then download.",
      ],
      limitations: [
        "Ranges are validated: a page number outside the document or a reversed range is reported before any processing.",
        "The original document's bookmarks are not carried over into the produced files.",
      ],
      faq: [
        {
          question: "What happens if two ranges overlap?",
          answer:
            'In "one file per range" mode, each range produces its own file, so a page can appear in two files if you requested it twice. In "a single file" mode, duplicates are merged and pages appear only once, in document order.',
        },
      ],
      privacyNote: PRIVACY_PDF,
    },
  },

  "pdf-compress": {
    slug: "compress",
    name: "Compress a PDF",
    shortDescription:
      "Reduce a PDF's file size by cleaning its structure and recompressing its images, with a transparent report.",
    description:
      "Make your PDFs lighter before emailing or archiving them. OUTILIA cleans the file structure (unused objects, object streams) and, if you wish, recompresses embedded images at the chosen quality. The actual saving is shown before download: the reduction depends on the document's content and is never guaranteed.",
    keywords: [
      "compress pdf",
      "reduce pdf size",
      "shrink pdf",
      "pdf too large",
      "optimize pdf",
      "compress pdf online",
      "compress pdf free",
    ],
    seo: {
      title: "Compress a PDF Online: Reduce PDF File Size for Free",
      description:
        "Reduce a PDF's size in your browser: structure cleanup and optional image recompression. Size before / after displayed. Free, no sign-up.",
    },
    content: {
      steps: [
        'Drop your PDF, or switch to the "Multiple files" tab to compress up to 30 at once (result as a ZIP or file by file).',
        'Choose a level: "Structure only" (lossless), "Balanced" or "Maximum" (image recompression).',
        "Start the compression and compare the size before / after.",
        "Download if the result suits you; otherwise, try another level.",
      ],
      limitations: [
        "A PDF made only of vector text is often already compact: the saving may be small or nil.",
        "Only JPEG images and uncompressed (Flate) images in RGB or grayscale are recompressed. Images with transparency, a mask or a special color space are kept as they are to avoid any alteration.",
        'The "Balanced" and "Maximum" levels degrade image quality (lossy JPEG compression). The "Structure only" level does not modify any image.',
        "Pages are never converted to images (no rasterization of text).",
      ],
      faq: [
        {
          question: "Why isn't my PDF smaller?",
          answer:
            "A PDF's size depends on its content. If the file mostly contains text and already compressed vector drawings, there is little room left. If the images are already heavily compressed, recompressing them can even increase their size: in that case OUTILIA keeps the original image and tells you so.",
        },
        {
          question: "Does the text stay selectable?",
          answer: "Yes. Text and vector drawings are never converted to images.",
        },
      ],
      privacyNote: PRIVACY_PDF,
    },
  },

  "pdf-organize": {
    slug: "organize",
    name: "Organize PDF Pages",
    shortDescription: "Reorder, rotate or delete pages from thumbnails.",
    description:
      "Reorganize your PDF's pages visually: drag thumbnails to change the order, delete unneeded pages, rotate those facing the wrong way, then export a document matching the displayed arrangement.",
    keywords: [
      "organize pdf pages",
      "reorder pdf pages",
      "move pdf pages",
      "delete pdf pages",
      "change pdf page order",
      "sort pdf pages",
      "rearrange pdf",
    ],
    seo: {
      title: "Organize PDF Pages: Reorder, Delete, Rotate",
      description:
        "Reorder a PDF's pages by drag and drop, delete or rotate pages from thumbnails, then export. Processed locally in your browser, free.",
    },
    content: {
      steps: [
        "Drop your PDF: thumbnails of all pages appear.",
        "Drag thumbnails to reorder them; use the buttons to rotate or delete a page.",
        'Check the final order, then click "Export".',
      ],
      limitations: [
        "Bookmarks and internal links pointing to deleted pages are not preserved.",
        "Up to 1000 pages per document.",
      ],
      faq: [
        {
          question: "Are bookmarks and links preserved after reorganizing?",
          answer:
            "Pages are copied as they are, with their content and quality. Bookmarks (table of contents) and internal links that pointed to a deleted page are not carried over: check the final document if your PDF relies on them.",
        },
        {
          question: "Can I reorganize a PDF with several hundred pages?",
          answer:
            "Yes, up to 1,000 pages. Thumbnails are rendered on demand to spare the browser's memory; on a phone, a very long document remains workable but slower to display.",
        },
      ],
      privacyNote: PRIVACY_PDF,
    },
  },

  "pdf-rotate": {
    slug: "rotate",
    name: "Rotate a PDF",
    shortDescription: "Rotate all pages, a selection or individual pages by 90°, 180° or 270°.",
    description:
      "Fix the orientation of your PDFs: rotate the whole document, a page range or specific pages. The preview reflects the applied rotation and the exported file opens correctly oriented in every reader.",
    keywords: [
      "rotate pdf",
      "turn pdf pages",
      "pdf rotation",
      "flip pdf",
      "upside down pdf",
      "pdf orientation",
      "rotate pdf online",
    ],
    seo: {
      title: "Rotate a PDF Online: Free Page Rotation",
      description:
        "Rotate the pages of a PDF (all, a range or a selection) by 90°, 180° or 270° with instant preview. Processed in your browser, free.",
    },
    content: {
      steps: [
        "Drop your PDF.",
        'Click the arrows on a thumbnail to rotate a page, or use "Rotate all" / a page range.',
        "Export the corrected document.",
      ],
      limitations: [
        "Rotation is applied through the page's rotation attribute (the standard method). The content is not redrawn, which preserves quality.",
      ],
      faq: [
        {
          question: "Does rotation degrade document quality?",
          answer:
            "No. The tool changes each page's rotation attribute (the method provided by the PDF format) without redrawing the content: text, images and vectors remain strictly identical.",
        },
        {
          question: "Why do some pages already appear rotated?",
          answer:
            "A scanner or a program may have saved the page with an intrinsic rotation. The tool applies on top of it: select only the affected pages and choose the angle that sets them straight.",
        },
      ],
      privacyNote: PRIVACY_PDF,
    },
  },

  "pdf-extract-pages": {
    slug: "extract-pages",
    name: "Extract PDF Pages",
    shortDescription: "Select pages from thumbnails or by range and export them to a new PDF.",
    description:
      'Extract only the pages you need: click thumbnails to select them or enter a range ("2-4, 7"), check the selection, then download a new PDF containing only those pages, in document order.',
    keywords: [
      "extract pdf pages",
      "select pdf pages",
      "save one page of a pdf",
      "pull pages from pdf",
      "extract pages from pdf online",
      "isolate pdf page",
    ],
    seo: {
      title: "Extract Pages from a PDF Online for Free",
      description:
        "Select pages from a PDF (thumbnails or ranges) and export them to a new document. Range validation, preview, processed locally in your browser.",
    },
    content: {
      steps: [
        "Drop your PDF.",
        "Click the pages to keep or enter a page range.",
        'Click "Extract", then download.',
      ],
      limitations: ["Extracted pages keep the order of the original document."],
      faq: [
        {
          question: "Can I change the order of the extracted pages?",
          answer:
            'No: extracted pages keep the order of the original document. To reorder them, use "Organize pages" afterwards, or use that tool directly, since it also lets you delete pages.',
        },
        {
          question: "How do I enter several page ranges?",
          answer:
            'Separate them with commas, for example "1-3, 7, 10-12". The numbers refer to the position of pages in the file, not the numbers printed at the bottom of the page.',
        },
      ],
      privacyNote: PRIVACY_PDF,
    },
  },

  "pdf-add-text": {
    slug: "add-text",
    name: "Add Text to a PDF",
    shortDescription: "Place text anywhere on your pages: size, color, font and alignment.",
    description:
      "Add text to an existing PDF: click where you want it, type your text, adjust the font, size, color and alignment, then export. Ideal for completing a document, adding a note or dating a non-interactive form.",
    keywords: [
      "add text to pdf",
      "write on pdf",
      "insert text in pdf",
      "fill in a non-editable pdf",
      "type on a pdf",
      "add text to pdf online",
    ],
    seo: {
      title: "Add Text to a PDF Online for Free",
      description:
        "Write on a PDF: place text at the desired position, choose font, size, color and alignment, then download. Free and 100% in your browser.",
    },
    content: {
      steps: [
        "Drop your PDF and open the relevant page.",
        "Click the page where the text should appear, then type it.",
        "Set font, size, color and alignment; move the block if needed.",
        "Download the PDF.",
      ],
      limitations: [
        "Available fonts: Helvetica, Times and Courier (PDF standard fonts), with their bold and italic variants.",
        "Latin characters (including French accents, €, œ) are supported. Non-Latin alphabets (Cyrillic, Arabic, Chinese...) and emojis cannot be displayed with these fonts.",
        "The text is added on top of the document: the original text is not modified.",
      ],
      faq: [
        {
          question: "Does the added text change the document's existing text?",
          answer:
            'No, it is drawn on top of the page. To correct an existing passage, use the PDF editor ("Edit text" tool), which rewrites the page content when the font allows it.',
        },
        {
          question: "Which fonts and characters are available?",
          answer:
            'Helvetica, Times and Courier (the PDF format\'s standard fonts) in regular, bold and italic, plus the embedded free families offered in the editor. Accents and Latin characters work; non-Latin alphabets and emojis are replaced with "?" and flagged.',
        },
      ],
      privacyNote: PRIVACY_PDF,
    },
  },

  "pdf-annotate": {
    slug: "annotate",
    name: "Annotate a PDF",
    shortDescription: "Highlight, underline, draw, comment and add shapes to your PDFs.",
    description:
      "Annotate your PDF documents: area highlighting, underlining, freehand drawing, text comments, rectangles, ellipses and arrows. Delete an annotation with one click, undo or redo your actions, then export a PDF readable everywhere.",
    keywords: [
      "annotate pdf",
      "highlight pdf",
      "underline pdf",
      "draw on pdf",
      "comment on pdf",
      "mark up pdf",
      "annotate pdf online",
      "pdf markup",
    ],
    seo: {
      title: "Annotate a PDF Online: Highlight, Draw, Comment",
      description:
        "Annotate a PDF for free: highlighting, underlining, freehand drawing, comments and shapes. Easy undo, processed locally in your browser.",
    },
    content: {
      steps: [
        "Drop your PDF.",
        "Choose a tool (highlighter, underline, pencil, comment, shape) and draw on the page.",
        "Select an annotation to move or delete it.",
        "Download the annotated PDF.",
      ],
      limitations: [
        'Annotations are drawn into the page content (visual, "flattened" annotations). They are not created as native PDF annotations editable in other software: they are visible everywhere but can no longer be moved once the file is exported.',
        "Highlighting and underlining work by area (rectangle or line): there is no automatic text selection.",
      ],
      faq: [
        {
          question: "Can I edit my annotations later?",
          answer:
            "During the session, yes: everything can be changed until export. Once the PDF is downloaded, annotations are part of the page content and can no longer be edited individually.",
        },
      ],
      privacyNote: PRIVACY_PDF,
    },
  },

  "pdf-sign": {
    slug: "sign",
    name: "Sign a PDF",
    shortDescription: "Draw or import your signature, place it and export the signed document.",
    description:
      "Sign a PDF from your browser: draw your signature with the mouse or your finger, or import a signature image (PNG, JPEG), position and resize it on the page, then download. Your signature never leaves your device.",
    keywords: [
      "sign pdf",
      "pdf signature",
      "add signature to pdf",
      "sign document online",
      "handwritten signature pdf",
      "sign pdf free",
      "initial pdf",
    ],
    seo: {
      title: "Sign a PDF Online for Free: Handwritten Signature or Image",
      description:
        "Sign a PDF: draw your signature or import an image, place it on the page and download. Visual signature processed locally, never uploaded.",
    },
    content: {
      steps: [
        "Drop the PDF to sign and open the relevant page.",
        'Click "Signature": draw it in the dedicated area or import an image.',
        "Place it on the page, adjust its size, and optionally add the date as text.",
        "Download the signed document.",
      ],
      limitations: [
        "This is a visual signature (an image placed on the page). It is neither a qualified electronic signature under the eIDAS regulation nor a cryptographic digital signature: it does not attest to the signer's identity and does not protect the document against later changes.",
        "No signature is saved: if you reload the page, you will need to draw or import it again.",
      ],
      faq: [
        {
          question: "Is this signature legally valid?",
          answer:
            "A visual signature can be enough for many everyday uses when the parties accept it, but it does not offer the guarantees of an advanced or qualified electronic signature (signer identification, document integrity). For a document requiring those guarantees, use a qualified electronic signature provider.",
        },
      ],
      privacyNote:
        "The PDF and your signature are processed only in your browser. No signature image is sent to or stored on our servers.",
    },
  },

  "pdf-watermark": {
    slug: "add-watermark",
    name: "Add a Watermark to a PDF",
    shortDescription:
      "Apply a text or image watermark, with adjustable opacity, rotation, size and position.",
    description:
      'Protect or mark your documents with a text watermark ("CONFIDENTIAL", "DRAFT", your name...) or an image (logo). Set the opacity, rotation, size and position, choose the pages to cover, preview, then export.',
    keywords: [
      "pdf watermark",
      "add watermark to pdf",
      "watermark pdf online",
      "mark pdf confidential",
      "stamp pdf",
      "logo on pdf",
      "protect pdf with watermark",
    ],
    seo: {
      title: "Add a Watermark to a PDF Online (Text or Image)",
      description:
        "Add a text or image watermark to your PDFs: opacity, rotation, size, position and pages of your choice, with preview. Free, processed locally in your browser.",
    },
    content: {
      steps: [
        "Drop your PDF.",
        'Choose "Text" or "Image", type the text or import your logo.',
        "Set opacity, rotation, size, position and the pages to cover; check the preview.",
        "Export the watermarked PDF.",
      ],
      limitations: [
        'The watermark is drawn into the page content. OUTILIA adds a technical marker that lets the "Manage a watermark" tool remove it later if you need to.',
        "A visual watermark does not prevent copying the document: it identifies it, it does not lock it.",
      ],
      faq: [
        {
          question: "Does the watermark protect my document against copying?",
          answer:
            'No. A watermark identifies a document\'s origin or status (draft, confidential) and discourages reuse, but it prevents neither copying nor printing. To restrict use, add a password with "Protect a PDF".',
        },
        {
          question: "Will I be able to remove the watermark later?",
          answer:
            'Yes, if you added it with OUTILIA: a technical marker lets "Manage a watermark" find and remove it. Watermarks placed by other software can only be removed if they are annotations or identifiable objects.',
        },
      ],
      privacyNote: PRIVACY_PDF,
    },
  },

  "pdf-manage-watermark": {
    slug: "manage-watermark",
    name: "Manage a PDF Watermark",
    shortDescription:
      'Remove a watermark added with OUTILIA or an identifiable "Watermark" annotation, when it can be done without damaging the document.',
    description:
      'This tool analyzes your PDF and tells you honestly what can be removed: watermarks added with OUTILIA (identified by their technical marker) and PDF annotations of the "Watermark" type present in the file. When a watermark is blended into the page content or into an image, it cannot be removed reliably and the tool explains this instead of damaging your document.',
    keywords: [
      "remove watermark from pdf",
      "delete pdf watermark",
      "pdf watermark remover",
      "manage watermark",
      "remove watermark online",
    ],
    seo: {
      title: "Remove a PDF Watermark: OUTILIA Watermarks and Annotations",
      description:
        "Analyze a PDF and remove watermarks added with OUTILIA or watermark-type annotations when possible. Honest diagnosis, processed locally in your browser.",
    },
    content: {
      steps: [
        "Drop your PDF: the tool looks for identifiable watermarks.",
        'Review the diagnosis: OUTILIA watermarks detected, "Watermark" annotations, or nothing removable.',
        "Confirm that you are authorized to modify this document, then remove the proposed elements.",
        "Download the cleaned PDF.",
      ],
      limitations: [
        'Only two kinds of elements are supported: watermarks added by OUTILIA (thanks to their marker) and PDF annotations of the "Watermark" subtype. A watermark embedded in an image, merged into the content or produced by other software without a marker cannot be removed reliably.',
        "This tool is intended for your own documents or those you are authorized to modify. It is not meant to circumvent copyright or ownership notices or document protections.",
      ],
      faq: [
        {
          question: "Why does the tool refuse to remove some watermarks?",
          answer:
            "When a watermark is drawn in the same stream as the page text or embedded in an image, no method can separate it without risking damage to the content. Rather than producing a degraded file, OUTILIA explains the situation.",
        },
      ],
      privacyNote: PRIVACY_PDF,
    },
  },

  "pdf-fill-form": {
    slug: "fill-form",
    name: "Fill a PDF Form",
    shortDescription: "Detect the interactive fields of a PDF form, fill them in and export.",
    description:
      "Fill in an interactive PDF form (AcroForm): OUTILIA detects text fields, checkboxes, radio buttons and dropdown lists, lets you complete them in a clear interface with a page preview, then exports the filled document, flattened or not.",
    keywords: [
      "fill pdf form",
      "pdf form",
      "complete pdf form",
      "pdf fields",
      "fill pdf form online",
      "interactive pdf",
      "fillable pdf",
    ],
    seo: {
      title: "Fill a PDF Form Online for Free",
      description:
        "Fill in the fields of an interactive PDF form (text, checkboxes, lists) in your browser and download the result, flattened or not. No file upload.",
    },
    content: {
      steps: [
        "Drop your PDF form: the detected fields are shown page by page.",
        'Fill in the fields; click "Update preview" to check the rendering.',
        "Choose whether or not to flatten the form, then download.",
      ],
      limitations: [
        'Only interactive forms (AcroForm fields) are supported. A scanned or "flattened" form contains no fields: use the "Add text" tool instead.',
        "XFA forms (proprietary Adobe technology) are not supported.",
        'Digital signature fields cannot be signed here; use "Sign a PDF" for a visual signature.',
      ],
      faq: [
        {
          question: 'What does "flattening" the form mean?',
          answer:
            "Flattening converts the fields into fixed content: the values remain visible but can no longer be changed. Without flattening, the recipient can still edit the fields.",
        },
      ],
      privacyNote: PRIVACY_PDF,
    },
  },
};
