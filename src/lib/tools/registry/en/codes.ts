import type { ToolLocalization } from "../../types";

export const codesEn: Record<string, ToolLocalization> = {
  "qr-generate": {
    slug: "qr-code-generator",
    name: "QR Code Generator",
    shortDescription:
      "Create a QR code for a link, text, Wi-Fi network or contact card, as PNG or SVG.",
    description:
      "Generate a custom QR code in seconds: web link, free text, Wi-Fi access (network name, password, security) or vCard business card. Adjust the size, margin, colors and error correction level, preview the result and download it as PNG (for print) or SVG (vector, scales without loss).",
    keywords: [
      "qr code generator",
      "create qr code",
      "free qr code",
      "wifi qr code",
      "vcard qr code",
      "qr code for a link",
      "qr code svg",
      "qr code png",
    ],
    seo: {
      title: "Free QR Code Generator: Link, Text, Wi-Fi, Contact (PNG, SVG)",
      description:
        "Create a QR code for a URL, text, Wi-Fi network or vCard. Adjustable size, margin, colors and error correction, PNG or SVG export. Processed locally.",
    },
    content: {
      steps: [
        "Choose the content type (link, text, Wi-Fi, contact) and fill in the fields.",
        "Set the size, margin, colors and error correction.",
        "Download as PNG or SVG, then test it with your phone.",
      ],
      limitations: [
        "The QR code is static: its content is written into the image and cannot be changed after printing (no redirection or statistics).",
        "Very long content produces dense codes that need to be printed at a large size.",
        "The Wi-Fi format is recognized by Android and iOS 11+; the vCard by most QR code readers.",
      ],
      faq: [
        {
          question: "Is the QR code stored on your servers?",
          answer:
            'No. It is computed by the open source "qrcode" library directly in your browser; the content (Wi-Fi password, contact details) never leaves your device.',
        },
      ],
      privacyNote:
        "The QR code is generated in your browser. The encoded content (link, Wi-Fi password, contact details) is neither transmitted nor stored.",
    },
  },
  "qr-read": {
    slug: "read-a-qr-code",
    name: "Read a QR Code from an Image",
    shortDescription:
      "Decode a QR code from a photo or screenshot, with no app needed: link, Wi-Fi, text, contact.",
    description:
      "Got a QR code in an image, a printed PDF or a screenshot and no phone at hand? Drop the image (or photograph the code): its content is decoded in your browser and presented according to its type (link, Wi-Fi network with password, contact card, email, text). Links are never opened automatically.",
    keywords: [
      "read qr code",
      "online qr code reader",
      "decode qr code",
      "scan qr code from image",
      "qr code from a photo",
      "read qr code on pc",
      "qr reader",
      "qr code screenshot",
    ],
    seo: {
      title: "Read a QR Code Online from an Image or Screenshot",
      description:
        "Decode a QR code from a photo or screenshot in your browser: link, Wi-Fi, text, vCard. Nothing is uploaded, and no link is opened without your consent.",
    },
    content: {
      steps: [
        "Drop an image containing the QR code (or photograph it).",
        "Read the decoded content and its type.",
        "Copy it, or open the link once you have checked it.",
      ],
      limitations: [
        "QR codes only: linear barcodes (EAN, Code 128) and Data Matrix codes are not read.",
        "The code must be sharp and take up a sufficient part of the image; a heavily tilted or damaged code may fail.",
        "Decoding by the open source jsQR library, run locally.",
      ],
      faq: [
        {
          question: "The QR code isn't recognized. What can I do?",
          answer:
            "Check that the code is sharp, well lit and takes up a sufficient part of the image (crop it if needed). A heavily tilted, damaged or partly hidden code may fail; retake the photo straight on.",
        },
        {
          question: "Are product barcodes read?",
          answer:
            "No: only QR codes are decoded. Linear barcodes (EAN-13, Code 128) and Data Matrix codes are not supported by this reader.",
        },
      ],
    },
  },
  "barcode-generate": {
    slug: "barcode-generator",
    name: "Barcode Generator",
    shortDescription:
      "Create EAN-13, EAN-8, UPC-A, Code 128 and Code 39 barcodes as PNG or SVG, with the check digit calculated.",
    description:
      "Generate a barcode for a product label, an inventory or a document: EAN-13 and EAN-8 (retail products in Europe, check digit calculated or verified), UPC-A (North America), Code 128 (text and logistics, automatic subsets B and C) and Code 39. Set the bar width, height, colors and text, then download as PNG or vector SVG.",
    keywords: [
      "barcode generator",
      "create a barcode online",
      "ean-13 generator",
      "code 128 barcode",
      "code 39 barcode",
      "upc-a barcode",
      "free barcode",
      "barcode svg",
    ],
    seo: {
      title: "Barcode Generator: EAN-13, Code 128, Code 39 (PNG, SVG)",
      description:
        "Create EAN-13, EAN-8, UPC-A, Code 128 and Code 39 barcodes with check digit, adjustable colors and dimensions, PNG or SVG export. Processed locally.",
    },
    content: {
      steps: [
        "Choose the code type and enter the content.",
        "Adjust the size, colors and text.",
        "Download as PNG (for print) or SVG (vector).",
      ],
      limitations: [
        "To sell a product in stores, the EAN prefix must be assigned by GS1: this tool draws the code, it does not assign a number.",
        "Code 128 is limited to printable ASCII characters (subset B); Code 39 to uppercase letters, digits and - . $ / + % space.",
        "Test the printed result with a barcode scanner: contrast and a clear quiet zone are essential.",
      ],
      faq: [
        {
          question: "EAN-13 or Code 128?",
          answer:
            "EAN-13 is reserved for consumer products with a GS1 number. For internal use (inventory, parcels, documents), Code 128 encodes any ASCII text compactly.",
        },
      ],
    },
  },
  "color-convert": {
    slug: "color-converter",
    name: "Color Converter & Contrast Checker",
    shortDescription:
      "Convert a color between HEX, RGB, HSL and CMYK, get its shades and check WCAG contrast.",
    description:
      "Paste a color in any format (HEX, rgb(), hsl(), CSS name) or pick it with the eyedropper: it is converted to HEX, RGB, HSL and CMYK, expanded into lighter and darker shades plus its complementary color, and its contrast against a background is rated against the WCAG 2.1 criteria (AA, AAA, large text, UI components).",
    keywords: [
      "color converter",
      "hex to rgb",
      "rgb to hex",
      "hsl converter",
      "cmyk converter",
      "wcag contrast checker",
      "check color contrast",
      "online color picker",
    ],
    seo: {
      title: "Color Converter: HEX, RGB, HSL, CMYK and WCAG Contrast",
      description:
        "Convert a color between HEX, RGB, HSL and CMYK, generate its shades and check WCAG 2.1 contrast against a background. Instant, no data sent.",
    },
    content: {
      steps: [
        "Enter or pick a color.",
        "Copy the format you need, or a shade.",
        "Enter a background color to check the contrast.",
      ],
      limitations: [
        "The CMYK conversion is an approximation with no ICC profile: actual print values depend on the printer.",
        "Only the most common CSS color names are recognized.",
      ],
      faq: [
        {
          question: "Do the CMYK values match what will be printed?",
          answer:
            "They are a mathematical approximation with no ICC profile. The printer converts your colors with their own profile: give them the HEX or RGB value and ask for a proof.",
        },
        {
          question: "What does the WCAG contrast result mean?",
          answer:
            "The ratio compares the luminance of the text and the background. The guidelines require at least 4.5:1 for body text (level AA) and 3:1 for large headings; 7:1 corresponds to level AAA.",
        },
      ],
    },
  },
  "image-palette": {
    slug: "image-color-palette",
    name: "Extract an Image's Color Palette",
    shortDescription:
      "Get the dominant colors of a photo or logo in HEX and RGB, with their share, and export them as CSS variables.",
    description:
      "Drop an image to extract its dominant colors (2 to 12): each shade is given in HEX and RGB with its proportion of the image, ready to copy or export as CSS variables for a brand guide, a presentation or a website. The analysis (median-cut quantization followed by k-means) runs in your browser.",
    keywords: [
      "color palette from image",
      "extract colors from image",
      "dominant colors",
      "palette from a photo",
      "color palette generator",
      "logo colors",
      "palette generator",
      "hex colors from an image",
    ],
    seo: {
      title: "Extract the Color Palette of an Image Online (HEX, CSS)",
      description:
        "Get the dominant colors of a photo or logo (2 to 12 shades) in HEX and RGB with their proportion, and export them as CSS variables. Local analysis, no upload.",
    },
    content: {
      steps: [
        "Drop an image.",
        "Adjust the number of colors.",
        "Copy a shade or export the CSS variables.",
      ],
      limitations: [
        "Colors are averages of areas: a small but important shade (a small logo) can be absorbed by neighboring colors.",
        "The image is downscaled to 320 px for analysis: fine details do not affect the palette.",
      ],
      faq: [
        {
          question: "Why doesn't my logo's color show up?",
          answer:
            "Colors are averages of areas: a shade covering a small area, even one that is visually important, can be absorbed by neighboring colors. Crop the image to the logo to isolate it.",
        },
        {
          question: "Are the extracted colors exact?",
          answer:
            "The image is downscaled to 320 px and grouped into dominant areas: the values are representative, not pixel-exact. For a precise color, use an eyedropper in an image editor.",
        },
      ],
    },
  },
};
