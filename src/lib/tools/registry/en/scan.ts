import type { ToolLocalization } from "../../types";

const scanPrivacyNote =
  "Photos and recognized text stay in your browser. The OCR engine (Tesseract, WebAssembly) and its language models are downloaded from this site, never your documents.";

export const scanEn: Record<string, ToolLocalization> = {
  "scan-document": {
    slug: "scan-a-document",
    name: "Scan a document",
    shortDescription:
      "Photograph your pages with your phone, check them, crop or straighten, then get a multi-page PDF.",
    description:
      "Turn your smartphone into a scanner: take a photo of each page (or import existing photos), crop, straighten the orientation, apply a document, grayscale or black-and-white filter, adjust brightness and contrast, reorder the pages, then export a multi-page PDF or each page as an image. Everything happens in your browser, with no app to install.",
    keywords: [
      "scan a document",
      "scan with phone",
      "scan to pdf",
      "photo to pdf",
      "free document scanner",
      "scanner app online",
      "mobile document scan",
      "free camscanner alternative",
    ],
    seo: {
      title: "Scan a Document With Your Phone Online (Free PDF)",
      description:
        "Scan a sheet with your phone camera: cropping, document and black-and-white filters, multiple pages, export to PDF or images. No file upload.",
    },
    content: {
      steps: [
        'Take a photo of the page (camera button): check the preview, then "Keep" or "Retake". You can also import existing photos.',
        "Crop or straighten (four corners), rotate, then choose a filter: color (original photo), grayscale, black and white or document.",
        "Add more pages, reorder them, then export as a multi-page PDF or as images.",
      ],
      limitations: [
        "Camera capture requires a recent browser and a page served over HTTPS; otherwise, importing photos remains available.",
        'The original photo is kept as is: no filter is applied unless you choose one. The "Document" and "Black and white" filters produce an image without color, best reserved for text pages.',
        "Straightening corrects the perspective from the four corners; a folded or curved sheet remains locally distorted.",
        "Quality depends on the photo: even lighting and a sheet lying flat give the best results.",
      ],
      faq: [
        {
          question: "Are the photos sent anywhere?",
          answer:
            "No. The photos are processed by your browser (canvas) and the PDF is assembled locally with pdf-lib. Nothing goes through a server.",
        },
      ],
      privacyNote: scanPrivacyNote,
    },
  },
  "scan-perspective": {
    slug: "fix-a-photographed-document",
    name: "Fix a photographed document",
    shortDescription:
      "Straighten a sheet photographed at an angle: corner detection, manual adjustment, perspective and contrast correction.",
    description:
      "A document photo taken at an angle becomes a straight page: the tool automatically suggests the four corners of the sheet (when the contrast with the background allows it), you adjust them with your finger or mouse, then the perspective is corrected, the orientation straightened and the contrast improved. Export as JPG, PNG or PDF.",
    keywords: [
      "fix document perspective",
      "straighten a photo of a document",
      "straighten photographed page",
      "perspective correction",
      "deskew image",
      "crooked document photo",
      "straighten scan",
      "flatten document photo",
    ],
    seo: {
      title: "Straighten a Photographed Document Online (Perspective)",
      description:
        "Fix the perspective of a document photographed at an angle: auto-detected, adjustable corners, straightening, contrast, JPG, PNG or PDF export. Processed locally.",
    },
    content: {
      steps: [
        "Drop or photograph the document: the corners of the sheet are suggested automatically.",
        "Adjust the four corners with your finger or mouse, choose a filter and check the straightened preview.",
        "Export as JPG, PNG or PDF.",
      ],
      limitations: [
        "Automatic detection assumes a sheet lighter than its background; on a white desk or a very dark photo, place the corners by hand.",
        "The correction is geometric: a folded or curved document remains locally distorted.",
        'One page at a time; for a multi-page document, use "Scan a document".',
        "Output resolution is limited to 3000 px on the longest side to preserve browser memory.",
      ],
      faq: [
        {
          question: "How is the perspective corrected?",
          answer:
            "A homography (projective transformation) is computed from the four corners you set, then each pixel of the straightened page is resampled from the original photo (bilinear interpolation). Everything is computed in JavaScript in your browser.",
        },
      ],
      privacyNote: scanPrivacyNote,
    },
  },
  "scan-ocr": {
    slug: "ocr",
    name: "OCR: recognize text in a PDF or image",
    shortDescription:
      "Extract the text from a scan or photo (French, English) and create a searchable PDF.",
    description:
      "Recognize the text in your scanned documents, photos and image-only PDFs with Tesseract (open source), running in your browser: choose the language (French, English or both), process page by page with the preview alongside the text, correct the result, then copy it, download it as TXT or Markdown, or create a searchable PDF that keeps the original image with an invisible text layer.",
    keywords: [
      "ocr online",
      "free ocr",
      "text recognition",
      "extract text from image",
      "image to text",
      "scanned pdf to text",
      "make pdf searchable",
      "ocr pdf",
    ],
    seo: {
      title: "Free Online OCR: Scanned PDF or Image to Text (French, English)",
      description:
        "Text recognition in your browser (Tesseract): scanned PDFs, JPG, PNG, French and English, export to TXT, Markdown and searchable PDF. No file upload.",
    },
    content: {
      steps: [
        "Drop a scanned PDF or an image (JPG, PNG, WebP) and choose the language.",
        "Start recognition: the engine is downloaded once, then each page is processed (a few seconds per page).",
        "Proofread and correct the text page by page, then copy it, download it as TXT/Markdown or create a searchable PDF.",
      ],
      limitations: [
        "Tesseract 5 engine (LSTM) running in the browser: slower than an online service, but fully private. Expect 2 to 15 seconds per page depending on the device.",
        "Quality depends on the document: sharp, well-contrasted printed text at 200-300 dpi gives the best results. Handwriting, decorative fonts and blurry photos are poorly recognized.",
        "Tables and column layouts may get mixed up; stamps and signatures sometimes produce stray characters.",
        "The searchable PDF keeps the image and adds an invisible text layer: the formatting is not rebuilt. Words with low confidence are ignored.",
        "Up to 200 pages per document; browser memory limits very large files.",
      ],
      faq: [
        {
          question: "Are my documents sent to a server?",
          answer:
            "No. Tesseract runs in WebAssembly in your browser. Only the engine and the language model (public files, hosted on OUTILIA) are downloaded, never your pages.",
        },
        {
          question: "What is a searchable PDF?",
          answer:
            "A PDF whose pages remain images (faithful to the original) but contain an invisible text layer positioned over the words. You can select, copy and search text in it, and it can be indexed by file search engines.",
        },
      ],
      privacyNote: scanPrivacyNote,
    },
  },
};
