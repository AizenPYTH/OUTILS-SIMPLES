"use client";

import * as React from "react";
import { Download, FileSearch, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { decodeImage, drawToCanvas, encodeCanvas, releaseCanvas, resizeCanvas } from "@/lib/images/canvas";
import { openPdf, renderPageToCanvas, visualSize, type OpenedPdf } from "@/lib/pdf/browser/pdfjs";
import { assertPdfBytes, looksLikePdf } from "@/lib/files/validation";
import { formatBytes } from "@/lib/files/format";
import { deriveOutputName, stripExtension } from "@/lib/files/filename";
import { createOcrEngine, type OcrEngine } from "@/lib/ocr/engine";
import { ocrPagesToMarkdown, ocrPagesToText } from "@/lib/ocr/export";
import { buildSearchablePdf, type SearchablePageInput } from "@/lib/ocr/searchable-pdf";
import { ocrLanguages, type OcrLanguage, type OcrPageResult } from "@/lib/ocr/types";
import type { ParsedRanges } from "@/lib/pdf/page-ranges";
import { isPdfError } from "@/lib/pdf/errors";
import { track } from "@/lib/analytics/events";

const TOOL_ID = "scan-ocr";
const OCR_DPI = 200;
const MAX_OCR_PAGES = 200;

interface SourcePage {
  index: number;
  /** Rendered image for OCR and preview. */
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

export function OcrTool() {
  const [source, setSource] = React.useState<{ name: string; kind: "pdf" | "image"; pages: SourcePage[]; pageCount: number } | null>(null);
  const [loading, setLoading] = React.useState<string | null>(null);
  const [language, setLanguage] = React.useState<OcrLanguage>("fra");
  const [pageMode, setPageMode] = React.useState<"all" | "range">("all");
  const [rangeText, setRangeText] = React.useState("");
  const [range, setRange] = React.useState<ParsedRanges | null>(null);
  const [states, setStates] = React.useState<PageState[]>([]);
  const [running, setRunning] = React.useState(false);
  const [engineStatus, setEngineStatus] = React.useState<{ status: string; progress: number } | null>(null);
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
    setLoading("Lecture du fichier…");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pages: SourcePage[] = [];
      if (looksLikePdf(bytes)) {
        assertPdfBytes(bytes);
        if (file.size > pdfLimits.maxFileSizeBytes) throw new Error(`Fichier trop volumineux (max ${formatBytes(pdfLimits.maxFileSizeBytes)}).`);
        const opened: OpenedPdf = await openPdf(bytes);
        try {
          const count = Math.min(opened.pageCount, MAX_OCR_PAGES);
          if (opened.pageCount > MAX_OCR_PAGES) toast.info(`Seules les ${MAX_OCR_PAGES} premières pages seront traitées.`);
          for (let i = 0; i < count; i += 1) {
            setLoading(`Préparation de la page ${i + 1} sur ${count}…`);
            const page = opened.pages[i]!;
            const size = visualSize(page);
            const scale = Math.min(OCR_DPI / 72, 3000 / Math.max(size.width, size.height));
            const canvas = document.createElement("canvas");
            await renderPageToCanvas(opened.doc, i, canvas, { scale });
            // Normalise to CSS size (renderPageToCanvas uses devicePixelRatio).
            const target = drawToCanvas(canvas, Math.round(size.width * scale), Math.round(size.height * scale), "#ffffff");
            releaseCanvas(canvas);
            const { blob } = await encodeCanvas(target, "image/jpeg", 0.9);
            releaseCanvas(target);
            pages.push({ index: i, canvasUrl: URL.createObjectURL(blob), image: new Uint8Array(await blob.arrayBuffer()), mimeType: "image/jpeg", width: Math.round(size.width * scale), height: Math.round(size.height * scale) });
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
        const canvas = scale < 1 ? resizeCanvas(decoded.bitmap, Math.round(decoded.width * scale), Math.round(decoded.height * scale)) : drawToCanvas(decoded.bitmap, decoded.width, decoded.height, "#ffffff");
        decoded.bitmap.close();
        const { blob } = await encodeCanvas(canvas, "image/jpeg", 0.92);
        pages.push({ index: 0, canvasUrl: URL.createObjectURL(blob), image: new Uint8Array(await blob.arrayBuffer()), mimeType: "image/jpeg", width: canvas.width, height: canvas.height });
        releaseCanvas(canvas);
        setSource({ name: file.name, kind: "image", pages, pageCount: 1 });
      }
      setStates(pages.map((p) => ({ index: p.index, status: "pending" })));
      setCurrent(0);
      track("tool_start", { tool: TOOL_ID, pagesBucket: pages.length > 10 ? "gt10" : "le10" });
    } catch (e) {
      toast.error(isPdfError(e) ? e.message : e instanceof Error ? e.message : "Fichier illisible.");
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
        setEngineStatus({ status: "Chargement du moteur OCR…", progress: 0 });
        engineRef.current = await createOcrEngine(language, (p) => setEngineStatus({ status: p.status, progress: p.progress }));
      }
      const engine = engineRef.current;
      for (const index of targetIndices) {
        if (abortRef.current) break;
        const page = source.pages[index]!;
        setCurrent(index);
        setStates((s) => s.map((st) => (st.index === index ? { ...st, status: "running", error: undefined } : st)));
        try {
          const blob = new Blob([page.image as Uint8Array<ArrayBuffer>], { type: page.mimeType });
          const result = await engine.recognize(blob, index, (p) => setEngineStatus({ status: p.status === "recognizing text" ? `Reconnaissance page ${index + 1}` : p.status, progress: p.progress }));
          setStates((s) => s.map((st) => (st.index === index ? { ...st, status: "done", result, editedText: result.text } : st)));
        } catch (e) {
          setStates((s) => s.map((st) => (st.index === index ? { ...st, status: "error", error: e instanceof Error ? e.message : "Reconnaissance impossible." } : st)));
        }
      }
      track("tool_success", { tool: TOOL_ID, option: language });
    } catch (e) {
      toast.error(e instanceof Error ? `Moteur OCR indisponible : ${e.message}` : "Moteur OCR indisponible.");
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
  const textPages = donePages.map((s) => ({ pageIndex: s.index, text: s.editedText ?? s.result!.text }));
  const plain = ocrPagesToText(textPages);
  const markdown = source ? ocrPagesToMarkdown(textPages, stripExtension(source.name)) : "";
  const avgConfidence = donePages.length ? Math.round(donePages.reduce((s, p) => s + p.result!.confidence, 0) / donePages.length) : 0;

  const exportSearchable = async () => {
    if (!source) return;
    setExporting(true);
    try {
      const inputs: SearchablePageInput[] = donePages.map((s) => {
        const p = source.pages[s.index]!;
        return { image: p.image, mimeType: p.mimeType, width: p.width, height: p.height, ocr: s.result!, pageWidthPt: (p.width * 72) / OCR_DPI, pageHeightPt: (p.height * 72) / OCR_DPI };
      });
      const { bytes, wordsPlaced } = await buildSearchablePdf(inputs, { minConfidence: 30, title: stripExtension(source.name) });
      downloadPdf(bytes, source.name, "ocr", TOOL_ID);
      toast.success(`PDF recherchable créé : ${wordsPlaced} mots indexés.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création du PDF impossible.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <ToolPanel className="space-y-3 text-center" role="status" aria-live="polite">
        <p className="font-heading text-lg font-bold">{loading}</p>
        <Progress label="Préparation" />
      </ToolPanel>
    );
  }

  if (!source) {
    return (
      <div className="space-y-4">
        <FileDropzone onFiles={(f) => f[0] && void load(f[0])} accept="application/pdf,image/jpeg,image/png,image/webp" validate={(f) => (f.size === 0 ? "fichier vide" : f.size > pdfLimits.maxFileSizeBytes ? "fichier trop volumineux" : null)} title="Déposez un PDF scanné ou une image" hint={`PDF, JPG, PNG, WebP · ${formatBytes(pdfLimits.maxFileSizeBytes)} max · ${MAX_OCR_PAGES} pages max`} buttonLabel="Choisir un fichier" testId="ocr-dropzone" />
        <Alert variant="info" title="Premier lancement : téléchargement du moteur">
          Le moteur Tesseract (≈ 4 Mo) et le modèle de langue (≈ 6 Mo pour le français, ≈ 11 Mo pour l&apos;anglais) sont téléchargés depuis ce site puis gardés en cache par votre navigateur. La reconnaissance prend quelques secondes par page selon votre appareil.
        </Alert>
      </div>
    );
  }

  const currentPage = source.pages[current] ?? source.pages[0]!;
  const currentState = states.find((s) => s.index === currentPage.index);
  const doneCount = states.filter((s) => s.status === "done").length;
  const progressValue = running ? ((doneCount + (engineStatus?.progress ?? 0)) / Math.max(1, targetIndices.length)) * 100 : undefined;

  return (
    <div className="space-y-5">
      <ToolPanel className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={source.name}>
            {source.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {source.kind === "pdf" ? `${source.pageCount} page(s)` : `${currentPage.width}×${currentPage.height} px`} · {doneCount} / {source.pages.length} reconnue(s)
            {donePages.length ? ` · confiance moyenne ${avgConfidence} %` : ""}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ocr-lang">Langue</Label>
          <Select value={language} onValueChange={(v) => void changeLanguage(v as OcrLanguage)} disabled={running}>
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
            <Segmented label="Pages" value={pageMode} onChange={setPageMode} className="sm:grid-cols-2" options={[{ value: "all", label: "Toutes", description: `${source.pages.length} pages` }, { value: "range", label: "Choisies", description: "ex. 1-3" }]} />
          </div>
        ) : null}
        {pageMode === "range" && source.pages.length > 1 ? (
          <div className="w-full">
            <PageRangeInput pageCount={source.pages.length} value={rangeText} onChange={(v, parsed) => (setRangeText(v), setRange(parsed))} />
          </div>
        ) : null}
        <div className="flex gap-2">
          {running ? (
            <Button type="button" variant="outline" onClick={() => (abortRef.current = true)}>
              <Square aria-hidden="true" /> Arrêter
            </Button>
          ) : (
            <Button type="button" size="lg" onClick={() => void runOcr()} disabled={targetIndices.length === 0} data-testid="ocr-run">
              <Play aria-hidden="true" /> {doneCount > 0 ? "Relancer la reconnaissance" : "Lancer la reconnaissance"}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => void reset()} disabled={running}>
            Autre fichier
          </Button>
        </div>
      </ToolPanel>

      {running ? (
        <ToolPanel className="space-y-2" role="status" aria-live="polite" data-testid="ocr-progress">
          <p className="text-sm">
            {engineStatus?.status ?? "Démarrage…"} {engineStatus ? `· ${Math.round(engineStatus.progress * 100)} %` : ""}
          </p>
          <Progress value={progressValue} label="Progression OCR" />
        </ToolPanel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Page {currentPage.index + 1}</p>
            {source.pages.length > 1 ? (
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
                  Précédente
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={current >= source.pages.length - 1} onClick={() => setCurrent((c) => c + 1)}>
                  Suivante
                </Button>
              </div>
            ) : null}
          </div>
          <div className="overflow-auto rounded-[12px] border border-border bg-muted/60 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview */}
            <img src={currentPage.canvasUrl} alt={`Page ${currentPage.index + 1}`} className="mx-auto max-h-[60vh] rounded-[4px] shadow-sm" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ocr-page-text" className="text-sm font-medium">
            Texte reconnu {currentState?.result ? `· confiance ${Math.round(currentState.result.confidence)} %` : ""}
          </Label>
          <Textarea id="ocr-page-text" value={currentState?.editedText ?? ""} onChange={(e) => setStates((s) => s.map((st) => (st.index === currentPage.index ? { ...st, editedText: e.target.value } : st)))} rows={18} placeholder={currentState?.status === "error" ? currentState.error : currentState?.status === "running" ? "Reconnaissance en cours…" : "Lancez la reconnaissance pour afficher le texte de cette page. Vous pourrez le corriger ici."} className="font-mono text-[13px] leading-relaxed" data-testid="ocr-page-text" />
          {currentState?.status === "error" ? <Alert variant="destructive">{currentState.error}</Alert> : null}
          {currentState?.result && currentState.result.confidence < 60 ? <Alert variant="warning">Confiance faible : vérifiez le texte. Une image plus nette, bien éclairée et à plat améliore nettement la reconnaissance.</Alert> : null}
        </div>
      </div>

      {donePages.length ? (
        <Tabs defaultValue="txt">
          <TabsList>
            <TabsTrigger value="txt">Texte brut</TabsTrigger>
            <TabsTrigger value="md">Markdown</TabsTrigger>
            <TabsTrigger value="pdf">PDF recherchable</TabsTrigger>
          </TabsList>
          <TabsContent value="txt">
            <TextOutputPanel id="ocr-text" label={`Texte complet (${donePages.length} page(s))`} value={plain} filename={deriveOutputName(source.name, "ocr", "txt")} toolId={TOOL_ID} rows={10} />
          </TabsContent>
          <TabsContent value="md">
            <TextOutputPanel id="ocr-markdown" label="Markdown" value={markdown} filename={deriveOutputName(source.name, "ocr", "md")} mimeType="text/markdown;charset=utf-8" toolId={TOOL_ID} rows={10} />
          </TabsContent>
          <TabsContent value="pdf" className="space-y-3">
            <ToolPanel className="space-y-3">
              <p className="text-sm">
                Le PDF recherchable conserve l&apos;image de chaque page reconnue et y ajoute une couche de texte invisible positionnée sur les mots : vous pouvez sélectionner, copier et rechercher le texte dans n&apos;importe quel lecteur. Les mots dont la confiance est inférieure à 30 % sont ignorés.
              </p>
              <Button type="button" size="lg" onClick={() => void exportSearchable()} loading={exporting} data-testid="ocr-export-pdf">
                <Download aria-hidden="true" /> Télécharger le PDF recherchable ({donePages.length} page{donePages.length > 1 ? "s" : ""})
              </Button>
            </ToolPanel>
          </TabsContent>
        </Tabs>
      ) : null}
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <FileSearch className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        La qualité dépend du document : texte imprimé net à 200–300 dpi ≈ très bonne ; photo floue, texte manuscrit ou mise en page complexe ≈ résultats à vérifier. Les tableaux et colonnes peuvent être mélangés.
      </p>
    </div>
  );
}
