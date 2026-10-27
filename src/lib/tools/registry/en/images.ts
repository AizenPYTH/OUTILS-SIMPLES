import type { ToolLocalization } from "../../types";

const formatsLimitation =
  "Supported input formats: JPG, PNG, WebP, GIF (first frame), BMP, AVIF, SVG and HEIC/HEIF (iPhone photos, decoded by libheif loaded on demand, ~1.5 MB). TIFF is not supported by browsers.";

const exifLimitation =
  "Output files no longer contain EXIF metadata (orientation, camera, GPS): the orientation is applied before processing.";

const imagePrivacyNote =
  "Images are decoded and processed by your browser (canvas). They are never sent to a server; EXIF metadata is not kept in the output files.";

export const imagesEn: Record<string, ToolLocalization> = {
  "image-compress": {
    slug: "compress",
    name: "Compress an image",
    shortDescription:
      "Reduce the file size of your JPG, PNG or WebP photos, one at a time or in batches, while controlling the quality.",
    description:
      "Lighten your images before emailing, publishing or storing them: set the JPG/WebP quality, limit the size in pixels and process up to 50 images at once. The actual saving is shown for each file, and the original is kept if compression brings no gain.",
    keywords: [
      "compress image",
      "reduce photo size",
      "compress jpg",
      "compress png",
      "reduce image file size",
      "optimize image",
      "image too large",
      "batch compress photos",
    ],
    seo: {
      title: "Compress an Image Online (JPG, PNG, WebP) Without Uploading",
      description:
        "Reduce the size of JPG, PNG or WebP photos by adjusting quality and dimensions, singly or in batches of 50. Saving shown per file, 100% local processing.",
    },
    content: {
      steps: [
        "Drop one or more images.",
        "Choose the output format, the quality and a maximum size in pixels.",
        "Compress, check the saving, then download (ZIP if several files).",
      ],
      limitations: [
        "JPG/WebP compression is lossy: the lower the quality, the more visible the artifacts. PNG remains lossless, so the saving there is limited.",
        formatsLimitation,
        exifLimitation,
      ],
      faq: [
        {
          question: "Why isn't my PNG any smaller?",
          answer:
            "PNG is lossless: the browser cannot reduce its colors. For a photo, convert it to JPG or WebP; for a logo with transparency, choose WebP.",
        },
      ],
      privacyNote: imagePrivacyNote,
    },
  },
  "image-resize": {
    slug: "resize",
    name: "Resize an image",
    shortDescription:
      "Change the dimensions of an image by width, height, percentage or maximum size, keeping the proportions.",
    description:
      "Resize your images to the exact size you need: target width or height with proportions preserved, maximum bounding box, percentage, or exact dimensions. Downscaling is done in steps for a sharp result, and batch processing applies the same setting to all the images.",
    keywords: [
      "resize image",
      "change image size",
      "reduce image dimensions",
      "enlarge image",
      "resize photo",
      "image size in pixels",
      "batch resize images",
      "resize image online",
    ],
    seo: {
      title: "Resize an Image Online (Pixels, Percentage, Batch)",
      description:
        "Change the size of an image by width, height, percentage or bounding box, proportions preserved, up to 50 images at once. Free and processed locally.",
    },
    content: {
      steps: [
        "Drop your images.",
        "Choose the method (width, height, fit within, percentage, exact) and the output format.",
        "Resize, then download.",
      ],
      limitations: [
        "Enlarging adds no detail: it is disabled by default to avoid blur.",
        'The "Exact" mode can distort the image if the proportions differ.',
        formatsLimitation,
      ],
      faq: [
        {
          question: "Can I enlarge an image without making it blurry?",
          answer:
            "No: enlarging adds no detail, the browser interpolates the existing pixels. Enlarging is disabled by default; enable it only if a specific size is required of you.",
        },
        {
          question: "How do I resize without distortion?",
          answer:
            'Use width, height, percentage or maximum size: the proportions are preserved. Only the "Exact" mode forces both dimensions and can distort the image if the ratio differs.',
        },
      ],
      privacyNote: imagePrivacyNote,
    },
  },
  "image-crop": {
    slug: "crop",
    name: "Crop an image",
    shortDescription:
      "Cut out an area of your image, freely or to a ratio (square, 16:9, 4:3, A4...).",
    description:
      "Crop an image precisely: move and resize the area directly on the preview (mouse or finger), choose a preset ratio or enter pixel coordinates, then export as JPG, PNG or WebP.",
    keywords: [
      "crop image",
      "crop photo",
      "cut image",
      "trim image",
      "crop to square",
      "crop 16:9",
      "crop image online",
      "crop picture free",
    ],
    seo: {
      title: "Crop an Image Online (Freeform, Square, 16:9, 4:3)",
      description:
        "Crop a photo with an adjustable area using your mouse or finger, preset ratios and pixel coordinates. Export as JPG, PNG or WebP, processed locally.",
    },
    content: {
      steps: [
        "Drop an image.",
        "Adjust the crop area on the preview or enter the values.",
        "Crop, then download.",
      ],
      limitations: ["One image at a time.", formatsLimitation],
      faq: [
        {
          question: "Is cropping lossless?",
          answer:
            "The image is decoded again and saved in the chosen format: in PNG or lossless WebP, the kept pixels are identical; in JPEG, recompression applies (adjust the quality accordingly).",
        },
        {
          question: "Are iPhone photos (HEIC) accepted?",
          answer:
            "Yes: they are decoded in the browser by libheif (WebAssembly, loaded on demand). The result is saved as JPEG, PNG or WebP, formats readable everywhere.",
        },
      ],
      privacyNote: imagePrivacyNote,
    },
  },
  "image-convert": {
    slug: "convert",
    name: "Convert an image (JPG, PNG, WebP)",
    shortDescription:
      "Convert your images to JPG, PNG or WebP, one at a time or in batches, transparency included.",
    description:
      "Change the format of your images: PNG to JPG to lighten a screenshot, JPG to PNG, any format to WebP for the web, WebP to PNG or JPG for compatibility. Transparency is preserved in PNG and WebP, and flattened onto a color of your choice in JPG.",
    keywords: [
      "convert image",
      "heic to jpg",
      "png to jpg",
      "jpg to png",
      "webp to jpg",
      "webp to png",
      "convert to webp",
      "image converter",
    ],
    seo: {
      title: "Convert an Image to JPG, PNG or WebP Online (PNG to JPG, WebP...)",
      description:
        "Convert your images between JPG, PNG and WebP, one at a time or in batches, with transparency preserved or flattened. Processed locally, no file upload.",
    },
    content: {
      steps: [
        "Drop your images.",
        "Choose the target format and the quality; set the background color for JPG.",
        "Convert, then download.",
      ],
      limitations: [
        "JPG does not support transparency: transparent areas are filled with the chosen color.",
        "Animated GIFs keep only their first frame.",
        formatsLimitation,
      ],
      faq: [
        {
          question: "WebP or JPG?",
          answer:
            "WebP is 25 to 35% lighter at equal quality and supports transparency; all recent browsers can read it. JPG remains the most universal (older software, print shops).",
        },
      ],
      privacyNote: imagePrivacyNote,
    },
  },
  "image-rotate": {
    slug: "rotate-flip",
    name: "Rotate or flip an image",
    shortDescription:
      "Rotate your images by 90°, 180° or 270° and flip them horizontally or vertically, in batches.",
    description:
      "Fix the orientation of your photos or create a mirror effect: rotate 90° right or left, half-turn, horizontal or vertical flip, applied to one or several images at once. The EXIF orientation of smartphone photos is taken into account before rotating.",
    keywords: [
      "rotate image",
      "flip image",
      "mirror image",
      "turn image",
      "image rotation",
      "upside down photo",
      "rotate photo online",
      "invert image",
    ],
    seo: {
      title: "Rotate or Flip an Image Online (90° Rotation, Mirror)",
      description:
        "Rotate your images by 90°, 180° or 270° and apply a horizontal or vertical mirror, singly or in batches. Export as JPG, PNG, WebP, processed locally.",
    },
    content: {
      steps: ["Drop your images.", "Choose the rotation and/or the flip.", "Apply, then download."],
      limitations: [formatsLimitation, exifLimitation],
      faq: [
        {
          question: "Why is my photo already the right way up after import?",
          answer:
            "The orientation recorded by the camera (EXIF) is applied on opening. If a photo appears sideways elsewhere, save it here without any extra rotation: the output file is physically oriented and no longer depends on that metadata.",
        },
        {
          question: "Is the photo's metadata preserved?",
          answer:
            "No: the output files no longer contain EXIF data (camera, date, GPS). This is often desirable before publishing; keep the original if you care about that information.",
        },
      ],
      privacyNote: imagePrivacyNote,
    },
  },
  "image-exif": {
    slug: "exif-metadata",
    name: "View and remove EXIF metadata",
    shortDescription:
      "See what a photo reveals (camera, date, GPS location) and remove that metadata without recompressing the image.",
    description:
      "Before publishing or sending a photo, check what it contains: camera make and model, date and time taken, settings, software, author and above all GPS coordinates. The tool lists this metadata (EXIF, XMP, IPTC) with plain-language labels, flags sensitive data, then removes it. For JPEG and PNG, removal is lossless: the pixels are not recompressed.",
    keywords: [
      "exif",
      "photo metadata",
      "remove exif",
      "photo gps data",
      "exif viewer",
      "delete image metadata",
      "photo geolocation",
      "clean photo before posting",
    ],
    seo: {
      title: "View and Remove a Photo's EXIF Metadata (GPS, Camera)",
      description:
        "View a photo's EXIF, XMP and IPTC metadata (camera, date, GPS location) and remove it without losing quality. Processed locally, nothing is sent.",
    },
    content: {
      steps: [
        "Drop a photo: its metadata is read by the open source exifr library.",
        "Spot the sensitive data (GPS location, camera, date, author).",
        "Remove it and download the cleaned image.",
      ],
      limitations: [
        "JPEG and PNG: lossless removal (the metadata segments are stripped from the file). Other formats (WebP, AVIF, GIF): the image is re-encoded as PNG.",
        "HEIC/HEIF (iPhone) cannot be read by browsers: convert the photo to JPG from your phone first.",
        'The EXIF orientation is removed along with the rest: if the photo was stored rotated, rotate it afterwards with the "Rotate or flip an image" tool.',
      ],
      faq: [
        {
          question: "Don't social networks already strip EXIF data?",
          answer:
            "Most remove it on publication, but messaging apps, emails, classified ad sites and storage services do not. Cleaning the photo before sending remains the only guarantee.",
        },
      ],
      privacyNote:
        "The photo is read and cleaned in your browser; neither the image nor its metadata is transmitted.",
    },
  },
  "image-watermark": {
    slug: "watermark",
    name: "Add a watermark to an image",
    shortDescription:
      'Stamp text (name, ©, "confidential") on your photos, in a corner, in the center or tiled, in batches.',
    description:
      "Protect or sign your images: add a text watermark with the font, size, color, opacity, angle and position of your choice (corners, center or a tiled pattern covering the whole image), applied at once to all the photos in a batch. Export as JPG, PNG or WebP.",
    keywords: [
      "image watermark",
      "watermark photo",
      "add text to image",
      "protect photo",
      "copyright image",
      "batch watermark",
      "watermark online",
      "mark photos",
    ],
    seo: {
      title: "Add a Text Watermark to an Image Online (Batch)",
      description:
        "Stamp a text watermark on your photos: position, opacity, size, color, angle and tiling, up to 50 images at once. Processed locally in your browser.",
    },
    content: {
      steps: [
        "Drop your images and enter the watermark text.",
        "Adjust position, size, opacity, color and angle.",
        "Apply, then download (ZIP if several files).",
      ],
      limitations: [
        "Text watermark only (no image logo for now).",
        "A watermark does not prevent copying: it discourages it and identifies the author.",
        formatsLimitation,
        exifLimitation,
      ],
      faq: [
        {
          question: "Can I use a logo as a watermark?",
          answer:
            "Not yet: the tool stamps text (name, ©, notice) in a corner, in the center or tiled. For a logo, overlay it with the PDF editor after converting the image to PDF, or wait for the announced addition of this option.",
        },
        {
          question: "Does a watermark prevent my photos from being stolen?",
          answer:
            "It discourages theft and identifies the author, but it can be cropped out or retouched. A semi-transparent tiled pattern covering the image is harder to remove than a notice in a corner.",
        },
      ],
      privacyNote: imagePrivacyNote,
    },
  },
};
