"use client";

import * as React from "react";
import { Droplets, ImageIcon, Type } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { PageRangeInput } from "@/components/pdf/shared/page-range-input";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { formatBytes } from "@/lib/files/format";
import { fitScale, renderPageToCanvas, visualSize } from "@/lib/pdf/browser/pdfjs";
import { measureImage, readImageFile } from "@/lib/pdf/browser/read-file";
import { hexToRgb, rgbToCss, rgbToHex } from "@/lib/pdf/annotations/types";
import { fontFamilies, type FontFamily } from "@/lib/pdf/fonts";
import { isPdfError } from "@/lib/pdf/errors";
import { pdfRectToViewport } from "@/lib/pdf/coordinates";
import type { ParsedRanges } from "@/lib/pdf/page-ranges";
import {
  addWatermark,
  placeWatermark,
  tilePositions,
  type WatermarkOptions,
  type WatermarkPosition,
  type WatermarkResult,
} from "@/lib/pdf/operations/watermark";
import { getToolById, getToolPath } from "@/lib/tools";
import { t } from "@/lib/i18n";

const TOOL_ID = "pdf-watermark";

const positions: { value: WatermarkPosition; label: string }[] = [
  { value: "top-left", label: "Haut gauche" },
  { value: "top-center", label: "Haut centre" },
  { value: "top-right", label: "Haut droite" },
  { value: "middle-left", label: "Milieu gauche" },
  { value: "center", label: "Centre" },
  { value: "middle-right", label: "Milieu droite" },
  { value: "bottom-left", label: "Bas gauche" },
  { value: "bottom-center", label: "Bas centre" },
  { value: "bottom-right", label: "Bas droite" },
];

export function WatermarkTool() {
  return (
    <SingleFileTool toolId={TOOL_ID}>
      {({ pdf, reset }) => <WatermarkWorkspace pdf={pdf} reset={reset} />}
    </SingleFileTool>
  );
}

interface ImageAsset {
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg";
  url: string;
  ratio: number;
}

function WatermarkWorkspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [kind, setKind] = React.useState<"text" | "image">("text");
  const [text, setText] = React.useState("CONFIDENTIEL");
  const [fontSize, setFontSize] = React.useState(48);
  const [fontFamily, setFontFamily] = React.useState<FontFamily>("helvetica");
  const [color, setColor] = React.useState("#c0392b");
  const [opacity, setOpacity] = React.useState(0.3);
  const [rotation, setRotation] = React.useState(45);
  const [position, setPosition] = React.useState<WatermarkPosition>("center");
  const [widthRatio, setWidthRatio] = React.useState(0.3);
  const [image, setImage] = React.useState<ImageAsset | null>(null);
  const [pageMode, setPageMode] = React.useState<"all" | "range">("all");
  const [rangeText, setRangeText] = React.useState("");
  const [range, setRange] = React.useState<ParsedRanges | null>(null);
  const [rangeError, setRangeError] = React.useState<string | null>(null);
  const [previewPage, setPreviewPage] = React.useState(0);
  const op = useOperation<WatermarkResult>(TOOL_ID);
  const manageTool = getToolById("pdf-manage-watermark");

  React.useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image.url);
    };
  }, [image]);

  const pageIndices = pageMode === "all" ? [] : (range?.indices ?? []);
  const options: WatermarkOptions | null =
    kind === "text"
      ? {
          kind: "text",
          text,
          fontSize,
          fontFamily,
          bold: true,
          color: hexToRgb(color),
          opacity,
          rotation,
          position,
          pageIndices,
        }
      : image
        ? {
            kind: "image",
            bytes: image.bytes,
            mimeType: image.mimeType,
            widthRatio,
            opacity,
            rotation,
            position,
            pageIndices,
          }
        : null;

  const canRun =
    !!options &&
    (kind === "image" || text.trim().length > 0) &&
    (pageMode === "all" || (!!range && !rangeError));

  const onImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { bytes, mimeType } = await readImageFile(file);
      const { width, height } = await measureImage(bytes, mimeType);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      const url = URL.createObjectURL(new Blob([copy], { type: mimeType }));
      setImage({ bytes, mimeType, url, ratio: height / width });
    } catch (error) {
      toast.error(isPdfError(error) ? error.message : t.errors.notImage);
    }
  };

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const result = op.state.result;
    return (
      <DonePanel
        summary={`Filigrane appliqué sur ${result.pagesMarked.length} page(s) · ${formatBytes(result.bytes.byteLength)}`}
        onDownload={() => downloadPdf(result.bytes, pdf.file.name, "filigrane", TOOL_ID)}
        onStartOver={() => {
          op.reset();
          reset();
        }}
      >
        {result.replacedCharacters ? (
          <Alert variant="warning">
            Certains caractères non pris en charge par les polices standard ont été remplacés par «
            ? ».
          </Alert>
        ) : null}
        {manageTool ? (
          <p className="text-center text-sm text-muted-foreground">
            Ce filigrane porte un marqueur OUTILIA : vous pourrez le retirer plus tard avec{" "}
            <a href={getToolPath(manageTool)} className="font-medium text-link underline">
              {manageTool.name}
            </a>
            .
          </p>
        ) : null}
      </DonePanel>
    );
  }

  return (
    <div className="space-y-6">
      <FileSummary
        name={pdf.file.name}
        size={pdf.file.size}
        pageCount={pdf.pageCount}
        onReset={reset}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Tabs value={kind} onValueChange={(v) => setKind(v as "text" | "image")}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="text" data-testid="wm-tab-text">
                <Type aria-hidden="true" /> Texte
              </TabsTrigger>
              <TabsTrigger value="image" data-testid="wm-tab-image">
                <ImageIcon aria-hidden="true" /> Image
              </TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="wm-text">Texte du filigrane</Label>
                <Input
                  id="wm-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={80}
                  data-testid="wm-text"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wm-font">Police</Label>
                  <Select value={fontFamily} onValueChange={(v) => setFontFamily(v as FontFamily)}>
                    <SelectTrigger id="wm-font">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wm-size">Taille ({fontSize} pt)</Label>
                  <Slider
                    id="wm-size"
                    min={8}
                    max={160}
                    step={1}
                    value={[fontSize]}
                    onValueChange={([v]) => v !== undefined && setFontSize(v)}
                    aria-label="Taille du texte"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wm-color">Couleur</Label>
                  <input
                    id="wm-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-11 w-full cursor-pointer rounded-md border border-input bg-background p-1"
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="image" className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-surface px-4 text-sm font-medium shadow-sm hover:bg-muted">
                  <ImageIcon className="size-4" aria-hidden="true" />
                  {image ? "Changer l'image" : t.upload.imageBrowse}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="sr-only"
                    onChange={(e) => void onImage(e.target.files?.[0])}
                    data-testid="wm-image-input"
                  />
                </label>
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- object URL preview
                  <img
                    src={image.url}
                    alt="Aperçu de l'image du filigrane"
                    className="h-12 max-w-32 rounded border border-border object-contain checkerboard"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    PNG ou JPEG, transparence conservée
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wm-width">
                  Largeur ({Math.round(widthRatio * 100)} % de la page)
                </Label>
                <Slider
                  id="wm-width"
                  min={5}
                  max={100}
                  step={1}
                  value={[Math.round(widthRatio * 100)]}
                  onValueChange={([v]) => v !== undefined && setWidthRatio(v / 100)}
                  aria-label="Largeur de l'image"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wm-opacity">Opacité ({Math.round(opacity * 100)} %)</Label>
              <Slider
                id="wm-opacity"
                min={5}
                max={100}
                step={1}
                value={[Math.round(opacity * 100)]}
                onValueChange={([v]) => v !== undefined && setOpacity(v / 100)}
                aria-label="Opacité"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wm-rotation">Rotation ({rotation}°)</Label>
              <Slider
                id="wm-rotation"
                min={-90}
                max={90}
                step={5}
                value={[rotation]}
                onValueChange={([v]) => v !== undefined && setRotation(v)}
                aria-label="Rotation"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Position</Label>
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="grid grid-cols-3 gap-1 rounded-md border border-border bg-surface p-1"
                role="radiogroup"
                aria-label="Position du filigrane"
              >
                {positions.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    role="radio"
                    aria-checked={position === p.value}
                    aria-label={p.label}
                    onClick={() => setPosition(p.value)}
                    className={`size-9 rounded-sm transition-colors ${position === p.value ? "bg-primary" : "bg-muted hover:bg-primary-soft"}`}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant={position === "tiled" ? "default" : "outline"}
                onClick={() => setPosition("tiled")}
                aria-pressed={position === "tiled"}
              >
                Mosaïque (toute la page)
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Segmented
              label="Pages concernées"
              value={pageMode}
              onChange={setPageMode}
              className="sm:grid-cols-2"
              options={[
                { value: "all", label: "Toutes les pages", description: `${pdf.pageCount} pages` },
                { value: "range", label: "Pages choisies", description: "ex. 1, 3-5" },
              ]}
            />
            {pageMode === "range" ? (
              <PageRangeInput
                pageCount={pdf.pageCount}
                value={rangeText}
                onChange={(v, parsed, error) => {
                  setRangeText(v);
                  setRange(parsed);
                  setRangeError(error);
                  if (parsed?.indices[0] !== undefined) setPreviewPage(parsed.indices[0]);
                }}
              />
            ) : null}
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!canRun}
            onClick={() => options && void op.run(() => addWatermark(pdf.bytes, options))}
            data-testid="watermark-button"
          >
            <Droplets aria-hidden="true" /> Appliquer le filigrane
          </Button>
        </div>

        <aside className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Aperçu · {t.common.pageOf(previewPage + 1, pdf.pageCount)}
            </p>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={previewPage === 0}
                onClick={() => setPreviewPage((p) => p - 1)}
              >
                {t.common.previous}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={previewPage >= pdf.pageCount - 1}
                onClick={() => setPreviewPage((p) => p + 1)}
              >
                {t.common.next}
              </Button>
            </div>
          </div>
          <WatermarkPreview
            pdf={pdf}
            pageIndex={previewPage}
            options={options}
            image={image}
            applies={pageMode === "all" || (range?.indices.includes(previewPage) ?? false)}
          />
        </aside>
      </div>
    </div>
  );
}

/**
 * Live preview: renders the page with pdf.js, then draws the watermark boxes
 * using the same placement math as the exporter (placeWatermark/tilePositions).
 */
function WatermarkPreview({
  pdf,
  pageIndex,
  options,
  image,
  applies,
}: {
  pdf: LoadedPdf;
  pageIndex: number;
  options: WatermarkOptions | null;
  image: ImageAsset | null;
  applies: boolean;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = React.useState<{
    width: number;
    height: number;
    transform: number[];
  } | null>(null);
  const page = pdf.pages[pageIndex] ?? pdf.pages[0]!;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    const size = visualSize(page);
    const scale = fitScale(size.width, size.height, 320, 440);
    renderPageToCanvas(pdf.opened.doc, page.index, canvas, { scale, signal: controller.signal })
      .then(
        ({ viewport: vp }) =>
          !controller.signal.aborted &&
          setViewport({ width: vp.width, height: vp.height, transform: vp.transform }),
      )
      .catch(() => {});
    return () => controller.abort();
  }, [pdf.opened.doc, page]);

  const boxes = React.useMemo(() => {
    if (!options || !viewport || !applies) return [];
    let w: number;
    let h: number;
    if (options.kind === "text") {
      // Approximate Helvetica Bold average advance (~0.6 em) for the preview box.
      w = Math.max(10, options.text.length * options.fontSize * 0.6);
      h = options.fontSize;
    } else {
      w = page.width * Math.min(1, Math.max(0.05, options.widthRatio));
      h = w * (image?.ratio ?? 0.5);
    }
    const anchors =
      options.position === "tiled"
        ? tilePositions(page.width, page.height, w, h)
        : [placeWatermark(page.width, page.height, w, h, options.position)];
    return anchors.map((a) => ({
      rect: pdfRectToViewport(viewport, { x: a.x, y: a.y, width: w, height: h }),
      w,
      h,
    }));
  }, [options, viewport, applies, page.width, page.height, image?.ratio]);

  const scale = viewport ? Math.hypot(viewport.transform[0]!, viewport.transform[1]!) : 1;

  return (
    <div
      className="relative mx-auto inline-block overflow-hidden rounded-[6px] border border-border bg-muted"
      data-testid="watermark-preview"
    >
      <canvas ref={canvasRef} aria-label="Aperçu de la page avec filigrane" />
      {viewport && options ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {boxes.map((b, i) => (
            <div
              key={i}
              className="absolute flex items-center justify-center"
              style={{
                left: b.rect.x + b.rect.width / 2 - (b.w * scale) / 2,
                top: b.rect.y + b.rect.height / 2 - (b.h * scale) / 2,
                width: b.w * scale,
                height: b.h * scale,
                opacity: options.opacity,
                transform: `rotate(${-options.rotation - page.rotation}deg)`,
              }}
            >
              {options.kind === "text" ? (
                <span
                  className="whitespace-nowrap font-bold leading-none"
                  style={{
                    fontSize: options.fontSize * scale,
                    color: rgbToCss(options.color),
                    fontFamily: fontFamilies.find((f) => f.id === options.fontFamily)?.css,
                  }}
                >
                  {options.text}
                </span>
              ) : image ? (
                // eslint-disable-next-line @next/next/no-img-element -- object URL preview
                <img src={image.url} alt="" className="h-full w-full object-contain" />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {!applies ? (
        <p className="absolute inset-x-0 bottom-0 bg-background/80 p-1 text-center text-xs text-muted-foreground">
          Page non concernée par la sélection
        </p>
      ) : null}
      <span className="sr-only">{rgbToHex(hexToRgb("#000"))}</span>
    </div>
  );
}
