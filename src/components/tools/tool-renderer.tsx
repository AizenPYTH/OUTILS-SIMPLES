"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocale } from "@/lib/i18n/locale";
import { tr } from "@/lib/i18n/messages";

const loading = () => (
  <div className="space-y-3" aria-busy="true" aria-label={tr("Chargement de l'outil")}>
    <Skeleton className="h-64 w-full rounded-[24px]" />
  </div>
);

/**
 * Maps registry ids to lazily loaded client-only components. Each tool bundle
 * (pdf-lib, pdf.js, Tesseract, qpdf, dnd-kit…) is only downloaded on its own
 * page. Tools are not server-rendered: the editorial content around them is,
 * and mounting them only once JavaScript runs avoids losing input typed
 * before hydration.
 */
/**
 * On an English page the tool needs the English registry (names, limits,
 * content) which is not part of the page's initial bundle: load it with the
 * tool component. No-op in French.
 */
function load<T>(factory: () => Promise<T>): () => Promise<T> {
  return async () => {
    if (getLocale() === "en") await import("@/lib/i18n/register-en-registry");
    return factory();
  };
}

const components = {
  // ---------------------------------------------------------------- Conversion
  "conv-docx-pdf": dynamic(
    load(() => import("@/components/conversion/office-to-pdf-tool").then((m) => m.DocxPdfTool)),
    { ssr: false, loading },
  ),
  "conv-sheet-pdf": dynamic(
    load(() => import("@/components/conversion/office-to-pdf-tool").then((m) => m.SheetPdfTool)),
    { ssr: false, loading },
  ),
  "conv-pdf-docx": dynamic(
    load(() => import("@/components/conversion/pdf-to-docx-tool").then((m) => m.PdfToDocxTool)),
    { ssr: false, loading },
  ),
  // ---------------------------------------------------------------- PDF (core)
  "pdf-merge": dynamic(
    load(() => import("@/components/pdf/tools/merge-tool").then((m) => m.MergeTool)),
    {
      ssr: false,
      loading,
    },
  ),
  "pdf-split": dynamic(
    load(() => import("@/components/pdf/tools/split-tool").then((m) => m.SplitTool)),
    {
      ssr: false,
      loading,
    },
  ),
  "pdf-extract-pages": dynamic(
    load(() => import("@/components/pdf/tools/extract-pages-tool").then((m) => m.ExtractPagesTool)),
    { ssr: false, loading },
  ),
  "pdf-organize": dynamic(
    load(() => import("@/components/pdf/tools/organize-tool").then((m) => m.OrganizeTool)),
    { ssr: false, loading },
  ),
  "pdf-rotate": dynamic(
    load(() => import("@/components/pdf/tools/rotate-tool").then((m) => m.RotateTool)),
    { ssr: false, loading },
  ),
  "pdf-compress": dynamic(
    load(() => import("@/components/pdf/tools/compress-tool").then((m) => m.CompressTool)),
    { ssr: false, loading },
  ),
  "pdf-watermark": dynamic(
    load(() => import("@/components/pdf/tools/watermark-tool").then((m) => m.WatermarkTool)),
    { ssr: false, loading },
  ),
  "pdf-manage-watermark": dynamic(
    load(() =>
      import("@/components/pdf/tools/manage-watermark-tool").then((m) => m.ManageWatermarkTool),
    ),
    { ssr: false, loading },
  ),
  "pdf-fill-form": dynamic(
    load(() => import("@/components/pdf/tools/fill-form-tool").then((m) => m.FillFormTool)),
    { ssr: false, loading },
  ),
  "pdf-edit": dynamic(
    load(() => import("@/components/pdf/tools/annotation-tool").then((m) => m.EditorTool)),
    { ssr: false, loading },
  ),
  "pdf-annotate": dynamic(
    load(() => import("@/components/pdf/tools/annotation-tool").then((m) => m.AnnotateTool)),
    { ssr: false, loading },
  ),
  "pdf-add-text": dynamic(
    load(() => import("@/components/pdf/tools/annotation-tool").then((m) => m.AddTextTool)),
    { ssr: false, loading },
  ),
  "pdf-sign": dynamic(
    load(() => import("@/components/pdf/tools/annotation-tool").then((m) => m.SignTool)),
    { ssr: false, loading },
  ),
  // ---------------------------------------------------------------- PDF (extras)
  "pdf-extract-text": dynamic(
    load(() => import("@/components/pdf/tools/extract-text-tool").then((m) => m.ExtractTextTool)),
    { ssr: false, loading },
  ),
  "pdf-search": dynamic(
    load(() => import("@/components/pdf/tools/extract-text-tool").then((m) => m.PdfSearchTool)),
    { ssr: false, loading },
  ),
  "pdf-to-images": dynamic(
    load(() => import("@/components/pdf/tools/pdf-to-images-tool").then((m) => m.PdfToImagesTool)),
    { ssr: false, loading },
  ),
  "pdf-from-images": dynamic(
    load(() => import("@/components/pdf/tools/images-to-pdf-tool").then((m) => m.ImagesToPdfTool)),
    { ssr: false, loading },
  ),
  "pdf-crop": dynamic(
    load(() => import("@/components/pdf/tools/crop-pages-tool").then((m) => m.CropPagesTool)),
    { ssr: false, loading },
  ),
  "pdf-stamp": dynamic(
    load(() => import("@/components/pdf/tools/stamp-tool").then((m) => m.StampTool)),
    {
      ssr: false,
      loading,
    },
  ),
  "pdf-protect": dynamic(
    load(() => import("@/components/pdf/tools/protect-tool").then((m) => m.ProtectTool)),
    { ssr: false, loading },
  ),
  "pdf-unlock": dynamic(
    load(() => import("@/components/pdf/tools/protect-tool").then((m) => m.UnlockTool)),
    { ssr: false, loading },
  ),
  "pdf-check": dynamic(
    load(() => import("@/components/pdf/tools/protect-tool").then((m) => m.CheckPdfTool)),
    { ssr: false, loading },
  ),
  "pdf-metadata": dynamic(
    load(() => import("@/components/pdf/tools/metadata-tool").then((m) => m.MetadataTool)),
    { ssr: false, loading },
  ),
  "pdf-links": dynamic(
    load(() => import("@/components/pdf/tools/links-tool").then((m) => m.LinksTool)),
    {
      ssr: false,
      loading,
    },
  ),
  "pdf-extract-images": dynamic(
    load(() =>
      import("@/components/pdf/tools/extract-images-tool").then((m) => m.ExtractImagesTool),
    ),
    { ssr: false, loading },
  ),
  "pdf-compare": dynamic(
    load(() => import("@/components/pdf/tools/compare-tool").then((m) => m.ComparePdfTool)),
    { ssr: false, loading },
  ),
  "pdf-redact": dynamic(
    load(() => import("@/components/pdf/tools/redact-tool").then((m) => m.RedactTool)),
    { ssr: false, loading },
  ),
  // ---------------------------------------------------------------- Numérisation
  "scan-document": dynamic(
    load(() => import("@/components/scan/scanner-tool").then((m) => m.ScannerTool)),
    { ssr: false, loading },
  ),
  "scan-ocr": dynamic(
    load(() => import("@/components/ocr/ocr-tool").then((m) => m.OcrTool)),
    {
      ssr: false,
      loading,
    },
  ),
  "scan-perspective": dynamic(
    load(() => import("@/components/scan/perspective-tool").then((m) => m.PerspectiveTool)),
    { ssr: false, loading },
  ),
  // ---------------------------------------------------------------- Images
  "image-compress": dynamic(
    load(() => import("@/components/images/compress-tool").then((m) => m.CompressImageTool)),
    { ssr: false, loading },
  ),
  "image-resize": dynamic(
    load(() => import("@/components/images/resize-tool").then((m) => m.ResizeImageTool)),
    { ssr: false, loading },
  ),
  "image-crop": dynamic(
    load(() => import("@/components/images/crop-tool").then((m) => m.CropImageTool)),
    { ssr: false, loading },
  ),
  "image-convert": dynamic(
    load(() => import("@/components/images/convert-tool").then((m) => m.ConvertImageTool)),
    { ssr: false, loading },
  ),
  "image-rotate": dynamic(
    load(() => import("@/components/images/rotate-tool").then((m) => m.RotateImageTool)),
    { ssr: false, loading },
  ),
  "image-exif": dynamic(
    load(() => import("@/components/images/exif-tool").then((m) => m.ExifTool)),
    {
      ssr: false,
      loading,
    },
  ),
  "image-watermark": dynamic(
    load(() => import("@/components/images/watermark-tool").then((m) => m.WatermarkImageTool)),
    { ssr: false, loading },
  ),
  // ---------------------------------------------------------------- Codes & développeur
  "qr-generate": dynamic(
    load(() => import("@/components/codes/qr-generator-tool").then((m) => m.QrGeneratorTool)),
    { ssr: false, loading },
  ),
  "dev-json": dynamic(
    load(() => import("@/components/dev/json-tool").then((m) => m.JsonTool)),
    {
      ssr: false,
      loading,
    },
  ),
  "dev-csv-json": dynamic(
    load(() => import("@/components/dev/json-tool").then((m) => m.CsvToJsonTool)),
    {
      ssr: false,
      loading,
    },
  ),
  "dev-base64": dynamic(
    load(() => import("@/components/dev/encoder-tool").then((m) => m.Base64Tool)),
    {
      ssr: false,
      loading,
    },
  ),
  "dev-url-encode": dynamic(
    load(() => import("@/components/dev/encoder-tool").then((m) => m.UrlEncodeTool)),
    { ssr: false, loading },
  ),
  "dev-html-entities": dynamic(
    load(() => import("@/components/dev/encoder-tool").then((m) => m.HtmlEntitiesTool)),
    { ssr: false, loading },
  ),
  "dev-uuid": dynamic(
    load(() => import("@/components/dev/uuid-tool").then((m) => m.UuidTool)),
    {
      ssr: false,
      loading,
    },
  ),
  "dev-password": dynamic(
    load(() => import("@/components/dev/password-tool").then((m) => m.PasswordTool)),
    { ssr: false, loading },
  ),
  "dev-hash": dynamic(
    load(() => import("@/components/dev/hash-tool").then((m) => m.HashTool)),
    {
      ssr: false,
      loading,
    },
  ),
  "dev-regex": dynamic(
    load(() => import("@/components/dev/regex-tool").then((m) => m.RegexTool)),
    {
      ssr: false,
      loading,
    },
  ),
  "dev-timestamp": dynamic(
    load(() => import("@/components/dev/timestamp-tool").then((m) => m.TimestampTool)),
    { ssr: false, loading },
  ),
  "qr-read": dynamic(
    load(() => import("@/components/codes/qr-reader-tool").then((m) => m.QrReaderTool)),
    { ssr: false, loading },
  ),
  "barcode-generate": dynamic(
    load(() => import("@/components/codes/barcode-tool").then((m) => m.BarcodeTool)),
    { ssr: false, loading },
  ),
  "color-convert": dynamic(
    load(() => import("@/components/codes/color-tool").then((m) => m.ColorTool)),
    {
      ssr: false,
      loading,
    },
  ),
  "image-palette": dynamic(
    load(() => import("@/components/codes/color-tool").then((m) => m.ImagePaletteTool)),
    { ssr: false, loading },
  ),
  // ---------------------------------------------------------------- Calculatrices
  "calc-percent": dynamic(
    load(() => import("@/components/calc/percent-tool").then((m) => m.PercentTool)),
    { ssr: false, loading },
  ),
  "calc-vat": dynamic(
    load(() => import("@/components/calc/percent-tool").then((m) => m.VatTool)),
    {
      ssr: false,
      loading,
    },
  ),
  "calc-dates": dynamic(
    load(() => import("@/components/calc/dates-tool").then((m) => m.DatesTool)),
    {
      ssr: false,
      loading,
    },
  ),
  "calc-units": dynamic(
    load(() => import("@/components/calc/units-tool").then((m) => m.UnitsTool)),
    {
      ssr: false,
      loading,
    },
  ),
  // ---------------------------------------------------------------- Texte
  "text-word-counter": dynamic(
    load(() => import("@/components/text/word-counter-tool").then((m) => m.WordCounterTool)),
    { ssr: false, loading },
  ),
  "text-case": dynamic(
    load(() => import("@/components/text/case-converter-tool").then((m) => m.CaseConverterTool)),
    { ssr: false, loading },
  ),
  "text-clean": dynamic(
    load(() => import("@/components/text/text-cleaner-tool").then((m) => m.TextCleanerTool)),
    { ssr: false, loading },
  ),
  "text-diff": dynamic(
    load(() => import("@/components/text/text-diff-tool").then((m) => m.TextDiffTool)),
    { ssr: false, loading },
  ),
  "text-slug": dynamic(
    load(() => import("@/components/text/slug-tool").then((m) => m.SlugTool)),
    {
      ssr: false,
      loading,
    },
  ),
  // ---------------------------------------------------------------- Documents
  "doc-markdown-pdf": dynamic(
    load(() => import("@/components/documents/markdown-pdf-tool").then((m) => m.MarkdownPdfTool)),
    { ssr: false, loading },
  ),
  "doc-text-pdf": dynamic(
    load(() => import("@/components/documents/markdown-pdf-tool").then((m) => m.TextPdfTool)),
    { ssr: false, loading },
  ),
  "doc-paper": dynamic(
    load(() => import("@/components/documents/printables-tool").then((m) => m.PaperTool)),
    { ssr: false, loading },
  ),
  "doc-calendar": dynamic(
    load(() => import("@/components/documents/printables-tool").then((m) => m.CalendarTool)),
    { ssr: false, loading },
  ),
  "doc-cover": dynamic(
    load(() => import("@/components/documents/printables-tool").then((m) => m.CoverPageTool)),
    { ssr: false, loading },
  ),
} as const;

export type ImplementedToolId = keyof typeof components;

export function isImplementedTool(id: string): id is ImplementedToolId {
  return id in components;
}

export function ToolRenderer({ toolId }: { toolId: string }) {
  if (!isImplementedTool(toolId)) {
    // A published registry entry without a component is a build-time mistake, not a runtime feature.
    throw new Error(`Tool "${toolId}" is published but has no implementation.`);
  }
  const Component = components[toolId];
  return <Component />;
}
