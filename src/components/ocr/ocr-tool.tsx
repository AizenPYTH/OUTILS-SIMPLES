"use client";

import * as React from "react";
import { ChevronDown, Download, FileSearch, Play, RotateCw, Square } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { TextOutputPanel } from "@/components/tools/shared/text-io";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import { PageRangeInput } from "@/components/pdf/shared/page-range-input";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { pdfLimits } from "@/config/limits";
import { validateImageFile } from "@/components/images/image-batch-tool";
import {
  decodeImage,
  drawToCanvas,
  encodeCanvas,
  getRgba,
  putRgba,
  releaseCanvas,
  resizeCanvas,
} from "@/lib/images/canvas";
import type { RgbaImage } from "@/lib/images/pixels";
import { openPdf, renderPageToCanvas, visualSize, type OpenedPdf } from "@/lib/pdf/browser/pdfjs";
import { assertPdfBytes, looksLikePdf } from "@/lib/files/validation";
import { formatBytes } from "@/lib/files/format";
import { deriveOutputName, stripExtension } from "@/lib/files/filename";
import {
  createOcrEngine,
  defaultOcrRunOptions,
  type OcrEngine,
  type OcrRunOptions,
} from "@/lib/ocr/engine";
import { ocrPagesToMarkdown, ocrPagesToText } from "@/lib/ocr/export";
import { buildSearchablePdf, type SearchablePageInput } from "@/lib/ocr/searchable-pdf";
import {
  ocrLanguages,
  ocrOrientationModes,
  ocrPreprocessModes,
  type OcrLanguage,
  type OcrOrientationMode,
  type OcrPageResult,
  type OcrPreprocessMode,
} from "@/lib/ocr/types";
import type { ParsedRanges } from "@/lib/pdf/page-ranges";
import { isPdfError } from "@/lib/pdf/errors";
import { track } from "@/lib/analytics/events";
import { tr } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const TOOL_ID = "scan-ocr";
const OCR_DPI = 200;
const MAX_OCR_PAGES = 200;

interface SourcePage {
  index: number;
  /** Rendered image for OCR and preview (the original: filters only touch a working copy). */
  canvasUrl: string;
  image: Uint8Array;
  mimeType: "image/jpeg" | "image/png";
  width: number;
  height: number;
}

interface PageState {
  index: number;
  status: "pending" | "running" | "done" | "error";
  result?: OcrPageResult;
  editedText?: string;
  error?: string;
}

/** PNG (lossless) of a working image for the Tesseract worker. */
async function encodeWorkingImage(img: RgbaImage): Promise<Blob> {
  const canvas = putRgba(img);
  try {
    const { blob } = await encodeCanvas(canvas, "image/png");
    return blob;
  } finally {
    releaseCanvas(canvas);
  }
}

async function decodeToRgba(page: SourcePage): Promise<RgbaImage> {
  const decoded = await decodeImage(
    new Blob([page.image as Uint8Array<ArrayBuffer>], { type: page.mimeType }),
  );
  const canvas = drawToCanvas(decoded.bitmap, decoded.width, decoded.height, "#ffffff");
  decoded.bitmap.close();
  try {
    return getRgba(canvas);
  } finally {
    releaseCanvas(canvas);
  }
}

const STATUS_LABELS: Record<string, string> = {
  "pass-0": tr("Reconnaissance à l'endroit"),
  "pass-90": tr("Reconnaissance du texte tourné à 90°"),
  "pass-180": tr("Reconnaissance du texte à l'envers"),
  "pass-270": tr("Reconnaissance du texte tourné à 270°"),
  "recognizing text": tr("Reconnaissance"),
  "loading tesseract core": tr("Chargement du moteur"),
  "initializing tesseract": tr("Initialisation du moteur"),
  "loading language traineddata": tr("Chargement du modèle de langue"),
  "initializing api": tr("Préparation"),
};

export function OcrTool() {
  const [source, setSource] = React.useState<{
    name: string;
    kind: "pdf" | "image";
    pages: SourcePage[];
    pageCount: number;
  } | null>(null);
  const [loading, setLoading] = React.useState<string | null>(null);
  const [language, setLanguage] = React.useState<OcrLanguage>("fra");
  const [options, setOptions] = React.useState<OcrRunOptions>(defaultOcrRunOptions);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [showZones, setShowZones] = React.useState(true);
  const [pageMode, setPageMode] = React.useState<"all" | "range">("all");
  const [rangeText, setRangeText] = React.useState("");
  const [range, setRange] = React.useState<ParsedRanges | null>(null);
  const [states, setStates] = React.useState<PageState[]>([]);
  const [running, setRunning] = React.useState(false);
  const [engineStatus, setEngineStatus] = React.useState<{
    status: string;
    progress: number;
  } | null>(null);
  const [current, setCurrent] = React.useState<number>(0);
  const [exporting, setExporting] = React.useState(false);
  const engineRef = React.useRef<OcrEngine | null>(null);
  const abortRef = React.useRef(false);
  const sourceRef = React.useRef(source);
  React.useEffect(() => {
    sourceRef.current = source;
  }, [source]);
  React.useEffect(
    () => () => {
      sourceRef.current?.pages.forEach((p) => URL.revokeObjectURL(p.canvasUrl));
      void engineRef.current?.terminate();
    },
    [],
  );

  const load = async (file: File) => {
    setLoading(tr("Lecture du fichier…"));
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pages: SourcePage[] = [];
      if (looksLikePdf(bytes)) {
        assertPdfBytes(bytes);
        if (file.size > pdfLimits.maxFileSizeBytes)
          throw new Error(
            tr("Fichier trop volumineux (max {max}).", {
              max: formatBytes(pdfLimits.maxFileSizeBytes),
            }),
          );
        const opened: OpenedPdf = await openPdf(bytes);
        try {
          const count = Math.min(opened.pageCount, MAX_OCR_PAGES);
          if (opened.pageCount > MAX_OCR_PAGES)
            toast.info(tr("Seules les {n} premières pages seront traitées.", { n: MAX_OCR_PAGES }));
          for (let i = 0; i < count; i += 1) {
            setLoading(tr("Préparation de la page {n} sur {total}…", { n: i + 1, total: count }));
            const page = opened.pages[i]!;
            const size = visualSize(page);
            const scale = Math.min(OCR_DPI / 72, 3000 / Math.max(size.width, size.height));
            const canvas = document.createElement("canvas");
            await renderPageToCanvas(opened.doc, i, canvas, { scale });
            // Normalise to CSS size (renderPageToCanvas uses devicePixelRatio).
            const target = drawToCanvas(
              canvas,
              Math.round(size.width * scale),
              Math.round(size.height * scale),
              "#ffffff",
            );
            releaseCanvas(canvas);
            const { blob } = await encodeCanvas(target, "image/jpeg", 0.92);
            releaseCanvas(target);
            pages.push({
              index: i,
              canvasUrl: URL.createObjectURL(blob),
              image: new Uint8Array(await blob.arrayBuffer()),
              mimeType: "image/jpeg",
              width: Math.round(size.width * scale),
              height: Math.round(size.height * scale),
            });
          }
          setSource({ name: file.name, kind: "pdf", pages, pageCount: opened.pageCount });
        } finally {
          await opened.destroy();
        }
      } else {
        const error = validateImageFile(file);
        if (error) throw new Error(error);
        const decoded = await decodeImage(file);
        const maxSide = 3000;
        const scale = Math.min(1, maxSide / Math.max(decoded.width, decoded.height));
        const canvas =
          scale < 1
            ? resizeCanvas(
                decoded.bitmap,
                Math.round(decoded.width * scale),
                Math.round(decoded.height * scale),
              )
            : drawToCanvas(decoded.bitmap, decoded.width, decoded.height, "#ffffff");
        decoded.bitmap.close();
        const { blob } = await encodeCanvas(canvas, "image/jpeg", 0.92);
        pages.push({
          index: 0,
          canvasUrl: URL.createObjectURL(blob),
          image: new Uint8Array(await blob.arrayBuffer()),
          mimeType: "image/jpeg",
          width: canvas.width,
          height: canvas.height,
        });
        releaseCanvas(canvas);
        setSource({ name: file.name, kind: "image", pages, pageCount: 1 });
      }
      setStates(pages.map((p) => ({ index: p.index, status: "pending" })));
      setCurrent(0);
      track("tool_start", { tool: TOOL_ID, pagesBucket: pages.length > 10 ? "gt10" : "le10" });
    } catch (e) {
      toast.error(
        isPdfError(e)
          ? tr(e.message)
          : e instanceof Error
            ? tr(e.message)
            : tr("Fichier illisible."),
      );
    } finally {
      setLoading(null);
    }
  };

  const reset = async () => {
    abortRef.current = true;
    source?.pages.forEach((p) => URL.revokeObjectURL(p.canvasUrl));
    setSource(null);
    setStates([]);
    setRunning(false);
    await engineRef.current?.terminate();
    engineRef.current = null;
  };

  const targetIndices = React.useMemo(() => {
    if (!source) return [];
    if (pageMode === "all") return source.pages.map((p) => p.index);
    return (range?.indices ?? []).filter((i) => i < source.pages.length);
  }, [source, pageMode, range]);

  const runOcr = async () => {
    if (!source) return;
    setRunning(true);
    abortRef.current = false;
    try {
      if (!engineRef.current) {
        setEngineStatus({ status: tr("Chargement du moteur OCR…"), progress: 0 });
        engineRef.current = await createOcrEngine(language, {
          encode: encodeWorkingImage,
          onProgress: (p) => setEngineStatus({ status: p.status, progress: p.progress }),
        });
      }
      const engine = engineRef.current;
      for (const index of targetIndices) {
        if (abortRef.current) break;
        const page = source.pages[index]!;
        setCurrent(index);
        setStates((s) =>
          s.map((st) => (st.index === index ? { ...st, status: "running", error: undefined } : st)),
        );
        try {
          const rgba = await decodeToRgba(page);
          const result = await engine.recognize(rgba, index, options, (p) =>
            setEngineStatus({
              status: tr("{status} · page {n}", {
                status: STATUS_LABELS[p.status] ?? p.status,
                n: index + 1,
              }),
              progress: p.progress,
            }),
          );
          setStates((s) =>
            s.map((st) =>
              st.index === index ? { ...st, status: "done", result, editedText: result.text } : st,
            ),
          );
        } catch (e) {
          setStates((s) =>
            s.map((st) =>
              st.index === index
                ? {
                    ...st,
                    status: "error",
                    error: e instanceof Error ? e.message : tr("Reconnaissance impossible."),
                  }
                : st,
            ),
          );
        }
      }
      track("tool_success", { tool: TOOL_ID, option: language });
    } catch (e) {
      toast.error(
        e instanceof Error
          ? tr("Moteur OCR indisponible : {message}", { message: e.message })
          : tr("Moteur OCR indisponible."),
      );
      track("tool_error", { tool: TOOL_ID, errorCode: "OCR_ENGINE" });
    } finally {
      setRunning(false);
      setEngineStatus(null);
    }
  };

  // Changing the language requires a new worker.
  const changeLanguage = async (lang: OcrLanguage) => {
    setLanguage(lang);
    await engineRef.current?.terminate();
    engineRef.current = null;
  };

  const donePages = states.filter((s) => s.status === "done" && s.result);
  const textPages = donePages.map((s) => ({
    pageIndex: s.index,
    text: s.editedText ?? s.result!.text,
  }));
  const plain = ocrPagesToText(textPages);
  const markdown = source ? ocrPagesToMarkdown(textPages, stripExtension(source.name)) : "";
  const avgConfidence = donePages.length
    ? Math.round(donePages.reduce((s, p) => s + p.result!.confidence, 0) / donePages.length)
    : 0;

  const exportSearchable = async () => {
    if (!source) return;
    setExporting(true);
    try {
      const inputs: SearchablePageInput[] = donePages.map((s) => {
        const p = source.pages[s.index]!;
        return {
          image: p.image,
          mimeType: p.mimeType,
          width: p.width,
          height: p.height,
          ocr: s.result!,
          pageWidthPt: (p.width * 72) / OCR_DPI,
          pageHeightPt: (p.height * 72) / OCR_DPI,
        };
      });
      const { bytes, wordsPlaced } = await buildSearchablePdf(inputs, {
        minConfidence: 30,
        title: stripExtension(source.name),
      });
      downloadPdf(bytes, source.name, "ocr", TOOL_ID);
      toast.success(tr("PDF recherchable créé : {n} mots indexés.", { n: wordsPlaced }));
    } catch (e) {
      toast.error(e instanceof Error ? tr(e.message) : tr("Création du PDF impossible."));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <ToolPanel className="space-y-3 text-center" role="status" aria-live="polite">
        <p className="font-heading text-lg font-bold">{loading}</p>
        <Progress label={tr("Préparation")} />
      </ToolPanel>
    );
  }

  if (!source) {
    return (
      <div className="space-y-4">
        <FileDropzone
          onFiles={(f) => f[0] && void load(f[0])}
          accept="application/pdf,image/jpeg,image/png,image/webp"
          validate={(f) =>
            f.size === 0
              ? tr("fichier vide")
              : f.size > pdfLimits.maxFileSizeBytes
                ? tr("fichier trop volumineux")
                : null
          }
          title={tr("Déposez un PDF scanné ou une image")}
          hint={tr("PDF, JPG, PNG, WebP · {max} max · {pages} pages max", {
            max: formatBytes(pdfLimits.maxFileSizeBytes),
            pages: MAX_OCR_PAGES,
          })}
          buttonLabel={tr("Choisir un fichier")}
          testId="ocr-dropzone"
        />
        <Alert variant="info" title={tr("Premier lancement : téléchargement du moteur")}>
          {tr(
            "Le moteur Tesseract (≈ 4 Mo) et le modèle de langue (≈ 6 Mo pour le français, ≈ 11 Mo pour l'anglais) sont téléchargés depuis ce site puis gardés en cache par votre navigateur. La reconnaissance prend quelques secondes par page selon votre appareil.",
          )}
        </Alert>
      </div>
    );
  }

  const currentPage = source.pages[current] ?? source.pages[0]!;
  const currentState = states.find((s) => s.index === currentPage.index);
  const currentResult = currentState?.result;
  const doneCount = states.filter((s) => s.status === "done").length;
  const progressValue = running
    ? ((doneCount + (engineStatus?.progress ?? 0)) / Math.max(1, targetIndices.length)) * 100
    : undefined;
  const weakWords = currentResult
    ? currentResult.lines.flatMap((l) => l.words).filter((w) => w.confidence < 60).length
    : 0;

  return (
    <div className="space-y-5">
      <ToolPanel className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={source.name}>
              {source.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {source.kind === "pdf"
                ? tr("{n} page(s)", { n: source.pageCount })
                : `${currentPage.width}×${currentPage.height} px`}{" "}
              ·{" "}
              {tr("{done} / {total} reconnue(s)", { done: doneCount, total: source.pages.length })}
              {donePages.length
                ? ` · ${tr("confiance moyenne {value} %", { value: avgConfidence })}`
                : ""}
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ocr-lang">{tr("Langue")}</Label>
            <Select
              value={language}
              onValueChange={(v) => void changeLanguage(v as OcrLanguage)}
              disabled={running}
            >
              <SelectTrigger id="ocr-lang" className="w-48" data-testid="ocr-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ocrLanguages.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {source.pages.length > 1 ? (
            <div className="w-full sm:w-auto">
              <Segmented
                label={tr("Pages")}
                value={pageMode}
                onChange={setPageMode}
                className="sm:grid-cols-2"
                options={[
                  {
                    value: "all",
                    label: tr("Toutes"),
                    description: tr("{n} pages", { n: source.pages.length }),
                  },
                  { value: "range", label: tr("Choisies"), description: tr("ex. 1-3") },
                ]}
              />
            </div>
          ) : null}
          {pageMode === "range" && source.pages.length > 1 ? (
            <div className="w-full">
              <PageRangeInput
                pageCount={source.pages.length}
                value={rangeText}
                onChange={(v, parsed) => (setRangeText(v), setRange(parsed))}
              />
            </div>
          ) : null}
          <div className="flex gap-2">
            {running ? (
              <Button type="button" variant="outline" onClick={() => (abortRef.current = true)}>
                <Square aria-hidden="true" /> {tr("Arrêter")}
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                onClick={() => void runOcr()}
                disabled={targetIndices.length === 0}
                data-testid="ocr-run"
              >
                <Play aria-hidden="true" />{" "}
                {doneCount > 0 ? tr("Relancer la reconnaissance") : tr("Lancer la reconnaissance")}
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => void reset()} disabled={running}>
              {tr("Autre fichier")}
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            aria-expanded={advancedOpen}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-link hover:underline"
            data-testid="ocr-advanced-toggle"
          >
            <ChevronDown
              className={cn("size-4 transition-transform", advancedOpen && "rotate-180")}
              aria-hidden="true"
            />
            {tr("Options avancées : orientation {orientation}, prétraitement {preprocess}", {
              orientation:
                ocrOrientationModes
                  .find((m) => m.id === options.orientation)
                  ?.label.toLowerCase() ?? "",
              preprocess:
                ocrPreprocessModes.find((m) => m.id === options.preprocess)?.label.toLowerCase() ??
                "",
            })}
          </button>
          {advancedOpen ? (
            <div className="mt-3 grid gap-4 sm:grid-cols-2" data-testid="ocr-advanced">
              <div className="space-y-1">
                <Label htmlFor="ocr-orientation">{tr("Orientation du texte")}</Label>
                <Select
                  value={options.orientation}
                  onValueChange={(v) =>
                    setOptions((o) => ({ ...o, orientation: v as OcrOrientationMode }))
                  }
                  disabled={running}
                >
                  <SelectTrigger id="ocr-orientation" data-testid="ocr-orientation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ocrOrientationModes.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ocrOrientationModes.find((m) => m.id === options.orientation)?.description}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ocr-preprocess">
                  {tr("Prétraitement (copie de travail, l'original est conservé)")}
                </Label>
                <Select
                  value={options.preprocess}
                  onValueChange={(v) =>
                    setOptions((o) => ({ ...o, preprocess: v as OcrPreprocessMode }))
                  }
                  disabled={running}
                >
                  <SelectTrigger id="ocr-preprocess" data-testid="ocr-preprocess">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ocrPreprocessModes.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ocrPreprocessModes.find((m) => m.id === options.preprocess)?.description}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  id="ocr-deskew"
                  checked={options.deskew !== false}
                  onCheckedChange={(checked) => setOptions((o) => ({ ...o, deskew: checked }))}
                  disabled={running}
                />
                <Label htmlFor="ocr-deskew">
                  {tr("Redresser les lignes légèrement inclinées (± 6°)")}
                </Label>
              </div>
            </div>
          ) : null}
        </div>
      </ToolPanel>

      {running ? (
        <ToolPanel
          className="space-y-2"
          role="status"
          aria-live="polite"
          data-testid="ocr-progress"
        >
          <p className="text-sm">
            {engineStatus
              ? tr("{status} · {percent} %", {
                  status: STATUS_LABELS[engineStatus.status] ?? engineStatus.status,
                  percent: Math.round(engineStatus.progress * 100),
                })
              : tr("Démarrage…")}
          </p>
          <Progress value={progressValue} label={tr("Progression OCR")} />
        </ToolPanel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{tr("Page {n}", { n: currentPage.index + 1 })}</p>
            <div className="flex items-center gap-3">
              {currentResult ? (
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={showZones}
                    onCheckedChange={setShowZones}
                    aria-label={tr("Afficher les zones reconnues")}
                  />
                  {tr("Zones reconnues")}
                </label>
              ) : null}
              {source.pages.length > 1 ? (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={current === 0}
                    onClick={() => setCurrent((c) => c - 1)}
                  >
                    {tr("Précédente")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={current >= source.pages.length - 1}
                    onClick={() => setCurrent((c) => c + 1)}
                  >
                    {tr("Suivante")}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          <div className="overflow-auto rounded-[12px] border border-border bg-muted/60 p-2">
            <div className="relative mx-auto w-fit max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview */}
              <img
                src={currentPage.canvasUrl}
                alt={tr("Page {n}", { n: currentPage.index + 1 })}
                className="block max-h-[60vh] max-w-full rounded-[4px] shadow-sm"
              />
              {currentResult && showZones ? (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${currentResult.width} ${currentResult.height}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  data-testid="ocr-zones"
                >
                  {currentResult.lines.map((line, i) => (
                    <g key={i}>
                      {line.words.map((w, j) => (
                        <rect
                          key={j}
                          x={w.x0}
                          y={w.y0}
                          width={Math.max(1, w.x1 - w.x0)}
                          height={Math.max(1, w.y1 - w.y0)}
                          fill={
                            w.confidence < 60
                              ? "rgba(220, 38, 38, 0.28)"
                              : w.confidence < 80
                                ? "rgba(217, 119, 6, 0.22)"
                                : "rgba(22, 163, 74, 0.16)"
                          }
                          stroke={
                            w.confidence < 60 ? "rgba(220, 38, 38, 0.9)" : "rgba(22, 163, 74, 0.6)"
                          }
                          strokeWidth={Math.max(1, currentResult.width / 600)}
                        />
                      ))}
                    </g>
                  ))}
                </svg>
              ) : null}
            </div>
          </div>
          {currentResult ? (
            <p
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
              data-testid="ocr-page-meta"
            >
              <span>
                {tr(
                  currentResult.passes.length > 1
                    ? "{n} passes ({angles})"
                    : "{n} passe ({angles})",
                  {
                    n: currentResult.passes.length,
                    angles: currentResult.passes.map((p) => `${p}°`).join(", "),
                  },
                )}
              </span>
              {currentResult.mixedOrientation ? (
                <span className="inline-flex items-center gap-1 font-medium text-warning-foreground">
                  <RotateCw className="size-3" aria-hidden="true" />{" "}
                  {tr("Orientations mixtes : le texte tourné est restitué en sections séparées")}
                </span>
              ) : currentResult.dominantAngle !== 0 ? (
                <span>{tr("Texte lu à {angle}°", { angle: currentResult.dominantAngle })}</span>
              ) : null}
              {currentResult.skewCorrected ? (
                <span>
                  {tr("Inclinaison corrigée : {value}°", {
                    value: currentResult.skewCorrected.toFixed(1),
                  })}
                </span>
              ) : null}
              {weakWords ? (
                <span className="text-destructive">
                  {weakWords > 1
                    ? tr("{n} mots peu fiables (zones rouges)", { n: weakWords })
                    : tr("{n} mot peu fiable (zones rouges)", { n: weakWords })}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ocr-page-text" className="text-sm font-medium">
            {tr("Texte reconnu")}{" "}
            {currentResult
              ? tr("· confiance {value} %", { value: Math.round(currentResult.confidence) })
              : ""}
          </Label>
          <Textarea
            id="ocr-page-text"
            value={currentState?.editedText ?? ""}
            onChange={(e) =>
              setStates((s) =>
                s.map((st) =>
                  st.index === currentPage.index ? { ...st, editedText: e.target.value } : st,
                ),
              )
            }
            rows={18}
            placeholder={
              currentState?.status === "error"
                ? tr(currentState.error ?? "")
                : currentState?.status === "running"
                  ? tr("Reconnaissance en cours…")
                  : tr(
                      "Lancez la reconnaissance pour afficher le texte de cette page. Vous pourrez le corriger ici.",
                    )
            }
            className="font-mono text-[13px] leading-relaxed"
            data-testid="ocr-page-text"
          />
          {currentState?.status === "error" ? (
            <Alert variant="destructive">{tr(currentState.error ?? "")}</Alert>
          ) : null}
          {currentResult && currentResult.confidence < 60 ? (
            <Alert variant="warning">
              {tr(
                "Confiance faible : vérifiez le texte. Une image plus nette, bien éclairée et à plat améliore nettement la reconnaissance ; pour une page tournée, choisissez l'orientation dans les options avancées.",
              )}
            </Alert>
          ) : null}
        </div>
      </div>

      {donePages.length ? (
        <Tabs defaultValue="txt">
          <TabsList>
            <TabsTrigger value="txt">{tr("Texte brut")}</TabsTrigger>
            <TabsTrigger value="md">Markdown</TabsTrigger>
            <TabsTrigger value="pdf">{tr("PDF recherchable")}</TabsTrigger>
          </TabsList>
          <TabsContent value="txt">
            <TextOutputPanel
              id="ocr-text"
              label={tr("Texte complet ({n} page(s))", { n: donePages.length })}
              value={plain}
              filename={deriveOutputName(source.name, "ocr", "txt")}
              toolId={TOOL_ID}
              rows={10}
            />
          </TabsContent>
          <TabsContent value="md">
            <TextOutputPanel
              id="ocr-markdown"
              label="Markdown"
              value={markdown}
              filename={deriveOutputName(source.name, "ocr", "md")}
              mimeType="text/markdown;charset=utf-8"
              toolId={TOOL_ID}
              rows={10}
            />
          </TabsContent>
          <TabsContent value="pdf" className="space-y-3">
            <ToolPanel className="space-y-3">
              <p className="text-sm">
                {tr(
                  "Le PDF recherchable conserve l'image d'origine de chaque page reconnue et y ajoute une couche de texte invisible positionnée sur les mots, dans leur orientation (texte tourné compris) : vous pouvez sélectionner, copier et rechercher le texte dans n'importe quel lecteur. Les mots dont la confiance est inférieure à 30 % sont ignorés.",
                )}
              </p>
              <Button
                type="button"
                size="lg"
                onClick={() => void exportSearchable()}
                loading={exporting}
                data-testid="ocr-export-pdf"
              >
                <Download aria-hidden="true" />{" "}
                {donePages.length > 1
                  ? tr("Télécharger le PDF recherchable ({n} pages)", { n: donePages.length })
                  : tr("Télécharger le PDF recherchable ({n} page)", { n: donePages.length })}
              </Button>
            </ToolPanel>
          </TabsContent>
        </Tabs>
      ) : null}
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <FileSearch className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {tr(
          "La qualité dépend du document : texte imprimé net à 200–300 dpi ≈ très bonne ; photo floue, texte manuscrit ou mise en page complexe ≈ résultats à vérifier (zones rouges). Les orientations 0°, 90°, 180° et 270° sont reconnues ; un texte en biais au-delà de 6° doit être redressé avant (outil « Corriger un document photographié »).",
        )}
      </p>
    </div>
  );
}
