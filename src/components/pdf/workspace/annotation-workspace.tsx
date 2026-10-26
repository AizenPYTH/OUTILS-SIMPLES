"use client";

import * as React from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  LayoutList,
  Minus,
  Plus,
  ScanText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import {
  fitScale,
  openPdf,
  renderPageToCanvas,
  visualSize,
  type OpenedPdf,
} from "@/lib/pdf/browser/pdfjs";
import { applyTextEdits } from "@/lib/pdf/text-edit/apply";
import { extractTextRuns } from "@/lib/pdf/text-edit/extract-runs";
import { getPageContent } from "@/lib/pdf/text-edit/page-content";
import type { PageTextStatus, TextEdit, TextRun } from "@/lib/pdf/text-edit/types";
import { measureImage, readImageFile } from "@/lib/pdf/browser/read-file";
import { applyAnnotations } from "@/lib/pdf/operations/annotate";
import { applyPagePlan, identityPlan, isIdentityPlan } from "@/lib/pdf/operations/page-plan";
import {
  translateAnnotation,
  type Annotation,
  type ImageAnnotation,
  type PdfPoint,
} from "@/lib/pdf/annotations/types";
import { viewportRectToPdf, viewportScale, type ViewportLike } from "@/lib/pdf/coordinates";
import { isPdfError, PdfError } from "@/lib/pdf/errors";
import type { OcrLanguage } from "@/lib/ocr/types";
import { t } from "@/lib/i18n";
import { clamp, uid } from "@/lib/utils";
import { AnnotationOverlay } from "./overlay";
import { ContextBar } from "./context-bar";
import { EditorHeader, type DocumentStatus, type HeaderMenuItem } from "./editor-header";
import { ExportDialog, type ExportResult } from "./export-dialog";
import { ImportDiagnosis } from "./import-diagnosis";
import { PagesPanel } from "./pages-panel";
import { SidePanel, OcrPanel, DocumentPanel, HistoryPanel, ShortcutsPanel } from "./side-panel";
import { SignatureDialog, type SignatureAsset } from "./signature-dialog";
import { TextEditLayer, type RunVisual } from "./text-edit-layer";
import { Toolbar, type ToolbarExtra } from "./toolbar";
import {
  defaultSettings,
  HIGHLIGHT_COLOR,
  modeTools,
  toolShortcuts,
  type EditorPanel,
  type ToolSettings,
  type WorkspaceMode,
  type WorkspaceTool,
} from "./types";
import { useEditorHistory } from "./use-editor-history";
import { useEditorOcr, type OcrLayerInfo } from "./use-editor-ocr";

interface AnnotationWorkspaceProps {
  pdf: LoadedPdf;
  mode: WorkspaceMode;
  toolId: string;
  title: string;
  onClose: () => void;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
/** Largest "fit" scale: an A4 page at 2× is 1 190 CSS px wide, enough on any screen. */
const MAX_FIT_SCALE = 2;

/**
 * Full-screen editor in four zones: compact header (A), tool rail by intent
 * (B), workspace centred on the page (C), collapsible pages panel (D), plus
 * one side panel at a time (OCR, document, history, shortcuts).
 */
export function AnnotationWorkspace({
  pdf,
  mode,
  toolId,
  title,
  onClose,
}: AnnotationWorkspaceProps) {
  const tools = modeTools[mode];
  const isEditor = mode === "editor";
  const [tool, setToolState] = React.useState<WorkspaceTool>(tools[1] ?? "select");
  const [settings, setSettings] = React.useState<ToolSettings>(defaultSettings);
  const [positionState, setPosition] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [fitMode, setFitMode] = React.useState<"width" | "page">("width");
  const [viewport, setViewport] = React.useState<ViewportLike | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [signatureOpen, setSignatureOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = React.useState(false);
  const [renderError, setRenderError] = React.useState(false);
  const [showRuns, setShowRuns] = React.useState(false);
  // Pages panel open by default on large screens only (the editor only mounts in the browser).
  const [pagesOpen, setPagesOpen] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  const [panel, setPanel] = React.useState<EditorPanel | null>(null);
  const [diagnosisDismissed, setDiagnosisDismissed] = React.useState(false);
  const pendingAsset = React.useRef<SignatureAsset | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [containerSize, setContainerSize] = React.useState({ width: 800, height: 600 });
  const history = useEditorHistory({
    annotations: [],
    textEdits: [],
    plan: identityPlan(pdf.pageCount),
  });
  const { annotations, textEdits, plan } = history;
  const exportOp = useOperation<ExportResult>(toolId);

  // --- Base document: the original, or the original with an OCR text layer.
  const [ocrLayer, setOcrLayer] = React.useState<{ info: OcrLayerInfo; opened: OpenedPdf } | null>(
    null,
  );
  const ocrLayerRef = React.useRef(ocrLayer);
  React.useEffect(() => {
    ocrLayerRef.current = ocrLayer;
  }, [ocrLayer]);
  React.useEffect(() => () => void ocrLayerRef.current?.opened.destroy(), []);
  const baseBytes = ocrLayer?.info.bytes ?? pdf.bytes;
  const baseDoc = ocrLayer?.opened.doc ?? pdf.opened.doc;
  const ocr = useEditorOcr();
  const [ocrLanguage, setOcrLanguage] = React.useState<OcrLanguage>("fra");
  const scannedPages = React.useMemo(
    () => pdf.diagnosis?.pages.filter((p) => p.kind === "scanned").map((p) => p.index) ?? [],
    [pdf.diagnosis],
  );
  const [ocrScope, setOcrScope] = React.useState<"scanned" | "all">(
    scannedPages.length > 0 ? "scanned" : "all",
  );

  // --- Current page: a position in the plan, pointing at a source page with an extra rotation.
  // Clamped at render time: undoing a duplication can shorten the plan under the position.
  const position = Math.min(positionState, plan.length - 1);
  const planned = plan[position] ?? plan[0]!;
  const page = pdf.pages[planned.source] ?? pdf.pages[0]!;
  const pageIndex = page.index;
  const extraRotation = planned.rotation;

  // --- Existing-text edits: applied to the real content stream, previewed from the result.
  const [preview, setPreview] = React.useState<{
    bytes: Uint8Array;
    opened: OpenedPdf;
    version: number;
  } | null>(null);
  const [previewBusy, setPreviewBusy] = React.useState(false);
  const [pageText, setPageText] = React.useState<{ key: string; status: PageTextStatus } | null>(
    null,
  );
  const previewRequest = React.useRef(0);
  const previewRef = React.useRef<typeof preview>(null);
  React.useEffect(() => {
    previewRef.current = preview;
  }, [preview]);
  React.useEffect(() => () => void previewRef.current?.opened.destroy(), []);
  const displayDoc = preview?.opened.doc ?? baseDoc;
  const displayBytes = preview?.bytes ?? baseBytes;
  const textKey = `${pageIndex}:${preview?.version ?? 0}:${ocrLayer ? "ocr" : "base"}`;

  // Rebuild the preview whenever the edits (or the base document) change: undo/redo included.
  React.useEffect(() => {
    const request = (previewRequest.current += 1);
    let cancelled = false;
    const rebuild = async () => {
      if (textEdits.length === 0) {
        setPreview((current) => {
          void current?.opened.destroy();
          return null;
        });
        return;
      }
      setPreviewBusy(true);
      try {
        const { bytes, report } = await applyTextEdits(baseBytes, textEdits);
        const opened = await openPdf(bytes);
        if (cancelled || request !== previewRequest.current) {
          void opened.destroy();
          return;
        }
        setPreview((current) => {
          void current?.opened.destroy();
          return { bytes, opened, version: request };
        });
        if (report.skipped.length)
          toast.error(
            `${report.skipped.length} modification(s) impossible(s) : ${report.skipped.map((s) => s.reason).join(", ")}.`,
          );
        if (report.fontReplaced)
          toast.info(
            "Un caractère est absent de la police d'origine : ce passage utilise une police standard proche.",
          );
      } catch (error) {
        if (!cancelled)
          toast.error(isPdfError(error) ? error.message : "La modification du texte a échoué.");
      } finally {
        if (!cancelled && request === previewRequest.current) setPreviewBusy(false);
      }
    };
    // Deferred so the state updates happen outside the effect body (and a burst of
    // undo/redo only rebuilds once).
    const timer = setTimeout(() => void rebuild(), 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [textEdits, baseBytes]);

  const commitTextEdit = (run: TextRun, text: string, visual?: RunVisual) => {
    const existing = textEdits.find(
      (e) => e.pageIndex === run.pageIndex && e.opIndex === run.opIndex,
    );
    const edit: TextEdit = existing
      ? { ...existing, text, ...(visual ? { visual } : {}) }
      : {
          pageIndex: run.pageIndex,
          opIndex: run.opIndex,
          removeOps: run.extraOps,
          text,
          original: run.original,
          fallback: run.fallback,
          ...(visual ? { visual } : {}),
        };
    history.commit(
      { textEdits: [...textEdits.filter((e) => e !== existing), edit] },
      `Texte modifié : « ${text.slice(0, 24)}${text.length > 24 ? "…" : ""} »`,
    );
  };

  const revertTextEdit = (run: TextRun) => {
    history.commit(
      {
        textEdits: textEdits.filter(
          (e) => !(e.pageIndex === run.pageIndex && e.opIndex === run.opIndex),
        ),
      },
      "Texte d'origine rétabli",
    );
  };

  // Analyse the page's text runs while the text tool is active.
  React.useEffect(() => {
    if (tool !== "editText") return;
    let cancelled = false;
    (async () => {
      const content = await getPageContent(displayBytes, pageIndex);
      const status = await extractTextRuns(displayDoc, pageIndex, content);
      if (!cancelled) setPageText({ key: textKey, status });
    })().catch(() => {
      if (!cancelled)
        setPageText({
          key: textKey,
          status: { kind: "mismatch", runs: [], detail: "analyse impossible" },
        });
    });
    return () => {
      cancelled = true;
    };
  }, [tool, displayBytes, displayDoc, pageIndex, textKey]);

  // Lock the document scroll while the editor is full-screen.
  React.useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Track the canvas container size for "fit" scaling.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry)
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Smooth zoom with Ctrl + wheel (native listener: React's onWheel is passive).
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => clamp(z * Math.exp(-e.deltaY * 0.0015), ZOOM_MIN, ZOOM_MAX));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // "Fit width" fills the available width, but never makes the page taller than
  // 1.3 × the visible height; "fit page" shows the whole page. The zoom goes further.
  const baseScale = React.useMemo(() => {
    const size = visualSize(page, extraRotation);
    const width = Math.max(200, containerSize.width - 2);
    const height = Math.max(200, containerSize.height) * (fitMode === "page" ? 1 : 1.3);
    return Math.min(fitScale(size.width, size.height, width, height), MAX_FIT_SCALE);
  }, [page, extraRotation, containerSize, fitMode]);
  const scale = baseScale * zoom;

  // Render the current page.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    setRenderError(false);
    renderPageToCanvas(displayDoc, pageIndex, canvas, {
      scale,
      extraRotation,
      signal: controller.signal,
    })
      .then(({ viewport: vp }) => {
        if (!controller.signal.aborted)
          setViewport({ width: vp.width, height: vp.height, transform: vp.transform });
      })
      .catch(() => !controller.signal.aborted && setRenderError(true));
    return () => controller.abort();
  }, [displayDoc, pageIndex, extraRotation, scale]);

  // Revoke image preview URLs on unmount.
  const urlsRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  const setTool = (next: WorkspaceTool) => {
    setToolState(next);
    setSelectedId(null);
    setEditingId(null);
    if (next === "highlight") setSettings((s) => ({ ...s, color: HIGHLIGHT_COLOR, opacity: 0.45 }));
    else if (
      next === "pen" ||
      next === "rect" ||
      next === "ellipse" ||
      next === "arrow" ||
      next === "underline" ||
      next === "text" ||
      next === "comment"
    ) {
      setSettings((s) =>
        s.color === HIGHLIGHT_COLOR
          ? { ...s, color: defaultSettings.color, opacity: 1 }
          : { ...s, opacity: s.opacity < 1 && next !== "pen" ? 1 : s.opacity },
      );
    }
    if (next === "signature") setSignatureOpen(true);
    if (next === "image") imageInputRef.current?.click();
  };

  const selected = annotations.find((a) => a.id === selectedId) ?? null;
  const commitAnnotations = (next: Annotation[], label: string) =>
    history.commit({ annotations: next }, label);

  // Apply context-bar changes to a selected text annotation as well.
  const updateSettings = (patch: Partial<ToolSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    if (selected && selected.type === "text") {
      const next = {
        ...selected,
        ...("color" in patch && patch.color ? { color: patch.color } : {}),
        ...("fontSize" in patch && patch.fontSize ? { fontSize: patch.fontSize } : {}),
        ...("fontFamily" in patch && patch.fontFamily ? { fontFamily: patch.fontFamily } : {}),
        ...("bold" in patch ? { bold: !!patch.bold } : {}),
        ...("italic" in patch ? { italic: !!patch.italic } : {}),
        ...("align" in patch && patch.align ? { align: patch.align } : {}),
      };
      commitAnnotations(
        annotations.map((a) => (a.id === selected.id ? next : a)),
        "Style du texte",
      );
    } else if (selected && "color" in patch && patch.color) {
      const color = patch.color;
      commitAnnotations(
        annotations.map((a) => {
          if (a.id !== selected.id) return a;
          if (a.type === "rect" || a.type === "ellipse")
            return { ...a, strokeColor: color, fillColor: a.fillColor ? color : null };
          if (a.type === "path" || a.type === "line" || a.type === "highlight")
            return { ...a, color };
          return a;
        }),
        "Couleur",
      );
    }
  };

  const placeImage = (asset: SignatureAsset, role: ImageAnnotation["role"], at?: PdfPoint) => {
    if (!viewport) return;
    const visual = visualSize(page, extraRotation);
    const maxWidthPt = visual.width * (role === "signature" ? 0.35 : 0.5);
    const widthPt = Math.min(maxWidthPt, asset.width * 0.75);
    const heightPt = widthPt * (asset.height / asset.width);
    const s = viewportScale(viewport);
    // Centre on the click point, or on the page.
    const center = at
      ? (() => {
          const [a, b, c, d, e, f] = viewport.transform as number[];
          return { x: a! * at.x + c! * at.y + e!, y: b! * at.x + d! * at.y + f! };
        })()
      : { x: viewport.width / 2, y: viewport.height / 2 };
    const box = {
      x: center.x - (widthPt * s) / 2,
      y: center.y - (heightPt * s) / 2,
      width: widthPt * s,
      height: heightPt * s,
    };
    const rect = viewportRectToPdf(viewport, box);
    const copy = new Uint8Array(asset.bytes.byteLength);
    copy.set(asset.bytes);
    const url = URL.createObjectURL(new Blob([copy], { type: asset.mimeType }));
    urlsRef.current.add(url);
    const annotation: ImageAnnotation = {
      id: uid("img"),
      type: "image",
      pageIndex,
      ...rect,
      bytes: asset.bytes,
      mimeType: asset.mimeType,
      previewUrl: url,
      role,
    };
    commitAnnotations(
      [...annotations, annotation],
      role === "signature" ? "Signature placée" : "Image insérée",
    );
    setSelectedId(annotation.id);
    setToolState("select");
  };

  const onPlaceAt = (point: PdfPoint) => {
    const asset = pendingAsset.current;
    if (asset) {
      placeImage(asset, tool === "signature" ? "signature" : "image", point);
      return;
    }
    if (tool === "signature") setSignatureOpen(true);
    else imageInputRef.current?.click();
  };

  const onImageFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { bytes, mimeType } = await readImageFile(file);
      const { width, height } = await measureImage(bytes, mimeType);
      const asset = { bytes, mimeType, width, height };
      pendingAsset.current = asset;
      placeImage(asset, "image");
      pendingAsset.current = null;
    } catch (error) {
      toast.error(isPdfError(error) ? error.message : t.errors.notImage);
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const onSignature = (asset: SignatureAsset) => {
    pendingAsset.current = asset;
    placeImage(asset, "signature");
    pendingAsset.current = null;
  };

  const goTo = React.useCallback(
    (index: number) => {
      setPosition((current) => {
        const next = clamp(index, 0, plan.length - 1);
        return next === current ? current : next;
      });
      setSelectedId(null);
      setEditingId(null);
    },
    [plan.length],
  );

  const zoomBy = (direction: 1 | -1) => {
    const current = ZOOM_STEPS.findIndex((z) => Math.abs(z - zoom) < 0.01);
    const index =
      current === -1 ? ZOOM_STEPS.findIndex((z) => z > zoom) - (direction === 1 ? 1 : 0) : current;
    const next = ZOOM_STEPS[clamp(index + direction, 0, ZOOM_STEPS.length - 1)]!;
    setZoom(next);
  };

  // --- OCR in the editor: original pages → engine → layered copy as the new base.
  const runOcr = async () => {
    setPanel("ocr");
    setDiagnosisDismissed(true);
    const pages =
      ocrScope === "scanned" && scannedPages.length > 0
        ? scannedPages
        : pdf.pages.map((p) => p.index);
    const info = await ocr.run({
      doc: pdf.opened.doc,
      bytes: pdf.bytes,
      pages,
      language: ocrLanguage,
    });
    if (!info) return;
    try {
      const opened = await openPdf(info.bytes);
      setOcrLayer((current) => {
        void current?.opened.destroy();
        return { info, opened };
      });
      // Edits of a previous OCR layer point at operators that no longer exist.
      const kept = textEdits.filter((e) => !pages.includes(e.pageIndex) || !ocrLayerRef.current);
      if (kept.length !== textEdits.length) history.commit({ textEdits: kept }, "OCR relancé");
      toast.success(
        `OCR terminé : ${info.words} mots reconnus, qualité estimée ${info.confidence} %.`,
      );
      if (tool !== "editText") setTool("editText");
    } catch (error) {
      toast.error(
        isPdfError(error) ? error.message : "Le document reconnu n'a pas pu être rouvert.",
      );
    }
  };

  const revertOcr = () => {
    const layer = ocrLayerRef.current;
    if (!layer) return;
    setOcrLayer(null);
    void layer.opened.destroy();
    ocr.reset();
    const kept = textEdits.filter((e) => !layer.info.pages.includes(e.pageIndex));
    if (kept.length !== textEdits.length) history.commit({ textEdits: kept }, "Couche OCR retirée");
    toast.info("Couche OCR retirée : le document est revenu à son état d'origine.");
  };

  const revertAll = () => {
    revertOcr();
    history.reset({ annotations: [], textEdits: [], plan: identityPlan(pdf.pageCount) });
    setSelectedId(null);
    setPosition(0);
    toast.info("Document d'origine rétabli.");
  };

  // Background colour under a run (viewport px) from the rendered canvas: median of samples
  // taken just outside the box, so the text itself does not tint the fill.
  const sampleFill = (points: { x: number; y: number }[]) => {
    const canvas = canvasRef.current;
    if (!canvas || !viewport || points.length === 0) return { r: 1, g: 1, b: 1 };
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { r: 1, g: 1, b: 1 };
    const ratio = canvas.width / viewport.width;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs) - 3;
    const maxX = Math.max(...xs) + 3;
    const minY = Math.min(...ys) - 3;
    const maxY = Math.max(...ys) + 3;
    const samples = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
      { x: minX, y: (minY + maxY) / 2 },
      { x: maxX, y: (minY + maxY) / 2 },
      { x: (minX + maxX) / 2, y: minY },
      { x: (minX + maxX) / 2, y: maxY },
    ];
    const channels: number[][] = [[], [], []];
    for (const s of samples) {
      const px = clamp(Math.round(s.x * ratio), 0, canvas.width - 1);
      const py = clamp(Math.round(s.y * ratio), 0, canvas.height - 1);
      const d = ctx.getImageData(px, py, 1, 1).data;
      channels[0]!.push(d[0]!);
      channels[1]!.push(d[1]!);
      channels[2]!.push(d[2]!);
    }
    const median = (v: number[]) => {
      const s = [...v].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)]! / 255;
    };
    return { r: median(channels[0]!), g: median(channels[1]!), b: median(channels[2]!) };
  };

  // --- Export: text edits → annotations → page plan → verification by reopening.
  const planChanged = !isIdentityPlan(plan, pdf.pageCount);
  const startExport = () => {
    setExportOpen(true);
    const kept: Annotation[] = annotations.filter(
      (a) => a.type !== "text" || a.text.trim().length > 0,
    );
    void exportOp.run(async (report) => {
      let bytes = baseBytes;
      if (textEdits.length) {
        report({ current: 1, total: 4, label: "Application des textes modifiés…" });
        bytes = (await applyTextEdits(bytes, textEdits)).bytes;
      }
      report({ current: 2, total: 4, label: "Intégration des éléments ajoutés…" });
      const annotated = await applyAnnotations(bytes, kept);
      bytes = annotated.bytes;
      if (planChanged) {
        report({ current: 3, total: 4, label: "Réorganisation des pages…" });
        bytes = await applyPagePlan(bytes, plan);
      }
      report({ current: 4, total: 4, label: "Vérification du fichier produit…" });
      const check = await openPdf(bytes);
      const pageCount = check.pageCount;
      await check.destroy();
      if (pageCount !== plan.length)
        throw new PdfError(
          "PROCESSING_FAILED",
          `Le fichier produit compte ${pageCount} pages au lieu de ${plan.length}.`,
          { recoverable: true },
        );
      return { bytes, report: annotated.report, verified: { pageCount } };
    });
  };

  const dirty = annotations.length > 0 || textEdits.length > 0 || planChanged || !!ocrLayer;
  const requestClose = () => {
    if (dirty) setCloseConfirmOpen(true);
    else onClose();
  };

  // Keyboard shortcuts.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      )
        return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        history.redo();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        startExport();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        commitAnnotations(
          annotations.filter((a) => a.id !== selectedId),
          "Élément supprimé",
        );
        setSelectedId(null);
      } else if (e.key === "Escape") {
        if (panel) setPanel(null);
        else if (!diagnosisDismissed && pdf.diagnosis) setDiagnosisDismissed(true);
        setSelectedId(null);
        if (tool !== "select") setToolState("select");
      } else if (e.key.startsWith("Arrow") && selected && viewport) {
        e.preventDefault();
        const step = (e.shiftKey ? 10 : 1) / viewportScale(viewport);
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0;
        commitAnnotations(
          annotations.map((a) => (a.id === selected.id ? translateAnnotation(a, dx, dy) : a)),
          "Élément déplacé",
        );
      } else if (e.key === "PageDown") {
        e.preventDefault();
        goTo(position + 1);
      } else if (e.key === "PageUp") {
        e.preventDefault();
        goTo(position - 1);
      } else if (!mod && (e.key === "+" || e.key === "=")) {
        zoomBy(1);
      } else if (!mod && e.key === "-") {
        zoomBy(-1);
      } else if (!mod && e.key === "0") {
        setZoom(1);
      } else if (e.key === "?") {
        setPanel((p) => (p === "shortcuts" ? null : "shortcuts"));
      } else if (!mod && !e.altKey && e.key.length === 1) {
        const letter = e.key.toUpperCase();
        const match = (Object.keys(toolShortcuts) as WorkspaceTool[]).find(
          (k) => toolShortcuts[k] === letter && tools.includes(k),
        );
        if (match) {
          e.preventDefault();
          setTool(match);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const modifiedSources = React.useMemo(
    () => new Set([...annotations.map((a) => a.pageIndex), ...textEdits.map((e) => e.pageIndex)]),
    [annotations, textEdits],
  );

  const suffix =
    mode === "sign"
      ? "signe"
      : mode === "annotate"
        ? "annote"
        : mode === "text"
          ? "texte"
          : "modifie";

  // --- Header state.
  const status: DocumentStatus = (() => {
    const pages = `${pdf.pageCount} page${pdf.pageCount > 1 ? "s" : ""}`;
    if (ocrLayer)
      return {
        label: `${pages} · OCR ${ocrLayer.info.confidence} %`,
        tone: ocrLayer.info.confidence >= 80 ? "success" : "warning",
      };
    const d = pdf.diagnosis;
    if (!d) return { label: pages, tone: "neutral" };
    switch (d.kind) {
      case "native":
        return {
          label: `${pages} · ${d.ocrLayerPages > 0 ? "texte reconnu (OCR)" : "texte natif"}`,
          tone: "info",
        };
      case "mixed":
        return {
          label: `${pages} · ${d.scannedPages} scannée${d.scannedPages > 1 ? "s" : ""}`,
          tone: "warning",
        };
      case "scanned":
        return { label: `${pages} · document scanné`, tone: "warning" };
      default:
        return { label: `${pages} · sans texte`, tone: "neutral" };
    }
  })();
  const summary = [
    `${annotations.length} élément${annotations.length > 1 ? "s" : ""}`,
    textEdits.length
      ? `${textEdits.length} texte${textEdits.length > 1 ? "s" : ""} modifié${textEdits.length > 1 ? "s" : ""}`
      : null,
    planChanged ? `${plan.length} page${plan.length > 1 ? "s" : ""} (réorganisées)` : null,
    pdf.unlocked ? "déverrouillé" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const togglePanel = (next: EditorPanel) => setPanel((p) => (p === next ? null : next));
  const menu: HeaderMenuItem[] = [
    {
      id: "pages",
      label: pagesOpen ? "Masquer le panneau des pages" : "Afficher le panneau des pages",
      onSelect: () => setPagesOpen((o) => !o),
    },
    ...(isEditor
      ? [{ id: "ocr", label: "Reconnaissance de texte (OCR)…", onSelect: () => setPanel("ocr") }]
      : []),
    { id: "document", label: "Informations sur le document", onSelect: () => setPanel("document") },
    { id: "history", label: "Historique des modifications", onSelect: () => setPanel("history") },
    { id: "shortcuts", label: "Raccourcis clavier", onSelect: () => setPanel("shortcuts") },
    {
      id: "fit-page",
      label: fitMode === "page" ? "Ajuster à la largeur" : "Afficher la page entière",
      onSelect: () => setFitMode((m) => (m === "page" ? "width" : "page")),
      separator: true,
    },
    {
      id: "revert",
      label: "Revenir au document d'origine",
      onSelect: revertAll,
      disabled: !dirty,
      destructive: true,
      separator: true,
    },
    { id: "close", label: "Fermer le document", onSelect: requestClose },
  ];
  const extras: ToolbarExtra[] = [
    {
      id: "pages",
      label: "Pages",
      icon: LayoutList,
      active: pagesOpen,
      onClick: () => setPagesOpen((o) => !o),
    },
    ...(isEditor
      ? [
          {
            id: "ocr",
            label: "OCR",
            icon: ScanText,
            active: panel === "ocr",
            onClick: () => togglePanel("ocr"),
            attention: !ocrLayer && scannedPages.length > 0,
          },
        ]
      : []),
    {
      id: "document",
      label: "Infos",
      icon: BookOpen,
      active: panel === "document",
      onClick: () => togglePanel("document"),
    },
    {
      id: "shortcuts",
      label: "Aide",
      icon: Keyboard,
      active: panel === "shortcuts",
      onClick: () => togglePanel("shortcuts"),
    },
  ];

  const textStatus = pageText?.key === textKey ? pageText.status : null;
  const textInfo =
    tool !== "editText"
      ? null
      : textStatus === null
        ? null
        : textStatus.kind === "ok"
          ? `${textStatus.runs.filter((r) => r.editable).length} passage${textStatus.runs.filter((r) => r.editable).length > 1 ? "s" : ""} modifiable${textStatus.runs.filter((r) => r.editable).length > 1 ? "s" : ""}`
          : textStatus.kind === "scanned"
            ? "page scannée"
            : textStatus.kind === "empty"
              ? "page sans texte"
              : "structure non prise en charge";
  const showDiagnosis =
    isEditor &&
    !!pdf.diagnosis &&
    pdf.diagnosis.kind !== "native" &&
    !diagnosisDismissed &&
    panel !== "ocr";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="editor-shell"
    >
      <EditorHeader
        title={title}
        fileName={pdf.file.name}
        status={status}
        summary={summary}
        dirty={dirty}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        undoLabel={history.undoLabel}
        redoLabel={history.redoLabel}
        onUndo={history.undo}
        onRedo={history.redo}
        onExport={startExport}
        onClose={requestClose}
        menu={menu}
      />

      <ContextBar
        tool={tool}
        settings={settings}
        onChange={updateSettings}
        textSelected={selected?.type === "text"}
        hasSelection={!!selected}
        showRuns={showRuns}
        onToggleRuns={() => setShowRuns((v) => !v)}
        textInfo={textInfo}
      />

      <div className="relative flex min-h-0 flex-1">
        {/* B. Desktop tool rail */}
        <aside className="hidden w-[76px] shrink-0 overflow-y-auto border-r border-border bg-surface p-1.5 sm:block">
          <Toolbar
            tools={tools}
            active={tool}
            onChange={setTool}
            orientation="vertical"
            extras={extras}
          />
        </aside>
        {/* D. Pages panel: docked on large screens, overlay below */}
        {pagesOpen ? (
          <aside className="absolute inset-y-0 left-0 z-20 w-[180px] shadow-xl lg:static lg:shadow-none">
            <PagesPanel
              doc={pdf.opened.doc}
              pages={pdf.pages}
              plan={plan}
              current={position}
              onSelect={goTo}
              modifiedSources={modifiedSources}
              onPlanChange={(next, label) => history.commit({ plan: next }, label)}
              onClose={() => setPagesOpen(false)}
            />
          </aside>
        ) : null}
        {/* C. Workspace */}
        <div
          ref={containerRef}
          className="relative flex min-w-0 flex-1 overflow-auto bg-muted/60 p-3 sm:p-4"
          data-testid="editor-canvas-area"
        >
          <div
            className="relative m-auto shadow-lg"
            style={viewport ? { width: viewport.width, height: viewport.height } : undefined}
            data-testid="editor-page"
          >
            <canvas
              ref={canvasRef}
              className="block bg-white"
              aria-label={t.common.pageOf(position + 1, plan.length)}
            />
            {viewport ? (
              <div className={tool === "editText" ? "pointer-events-none" : undefined}>
                <AnnotationOverlay
                  viewport={viewport}
                  pageIndex={pageIndex}
                  pageRotation={page.rotation + extraRotation}
                  annotations={annotations}
                  tool={tool}
                  settings={settings}
                  selectedId={selectedId}
                  editingId={editingId}
                  onSelect={setSelectedId}
                  onEdit={setEditingId}
                  onLiveChange={history.replaceLive}
                  onBeginInteraction={() => history.beginLive(annotations)}
                  onEndInteraction={history.endLive}
                  onCommit={(next) => commitAnnotations(next, "Élément ajouté ou modifié")}
                  onPlaceAt={onPlaceAt}
                />
              </div>
            ) : null}
            {viewport && tool === "editText" ? (
              <TextEditLayer
                viewport={viewport}
                pageRotation={page.rotation + extraRotation}
                status={textStatus}
                busy={previewBusy}
                edits={textEdits.filter((e) => e.pageIndex === pageIndex)}
                showRuns={showRuns}
                ocrQuality={
                  ocrLayer && ocrLayer.info.pages.includes(pageIndex)
                    ? ocrLayer.info.confidence
                    : null
                }
                ocrRunning={ocr.state.status === "running"}
                sampleFill={sampleFill}
                onCommit={commitTextEdit}
                onRevert={revertTextEdit}
                onRequestOcr={() => void runOcr()}
              />
            ) : null}
            {renderError ? (
              <p className="absolute inset-x-0 top-2 text-center text-sm text-destructive">
                {t.errors.renderFailed}
              </p>
            ) : null}
          </div>
          {showDiagnosis && pdf.diagnosis ? (
            <ImportDiagnosis
              diagnosis={pdf.diagnosis}
              pageCount={pdf.pageCount}
              onRunOcr={() => void runOcr()}
              onContinue={() => setDiagnosisDismissed(true)}
            />
          ) : null}
        </div>
        {/* Side panels */}
        {panel ? (
          <SidePanel panel={panel} onClose={() => setPanel(null)}>
            {panel === "ocr" ? (
              <OcrPanel
                diagnosis={pdf.diagnosis}
                pageCount={pdf.pageCount}
                state={ocr.state}
                layer={ocrLayer?.info ?? null}
                language={ocrLanguage}
                onLanguage={setOcrLanguage}
                scope={ocrScope}
                onScope={setOcrScope}
                onRun={() => void runOcr()}
                onCancel={ocr.cancel}
                onRevert={revertOcr}
              />
            ) : null}
            {panel === "document" ? (
              <DocumentPanel
                fileName={pdf.file.name}
                size={pdf.file.size}
                pageCount={pdf.pageCount}
                diagnosis={pdf.diagnosis}
                unlocked={pdf.unlocked}
                layer={ocrLayer?.info ?? null}
                planSummary={
                  planChanged
                    ? `${plan.length} à l'export (ordre, rotation ou suppression modifiés)`
                    : null
                }
                textEdits={textEdits.length}
                annotations={annotations.length}
              />
            ) : null}
            {panel === "history" ? (
              <HistoryPanel steps={history.steps} futureCount={history.canRedo ? 1 : 0} />
            ) : null}
            {panel === "shortcuts" ? <ShortcutsPanel /> : null}
          </SidePanel>
        ) : null}
      </div>

      {/* Bottom bar: page navigation + zoom (+ mobile toolbar) */}
      <footer className="shrink-0 border-t border-border bg-surface">
        <div className="flex h-11 items-center justify-between gap-2 px-2 sm:px-3">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => goTo(position - 1)}
              disabled={position === 0}
              aria-label={t.common.previous}
              data-testid="page-prev"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span
              className="min-w-24 text-center text-sm tabular-nums"
              aria-live="polite"
              data-testid="page-indicator"
            >
              {t.common.pageOf(position + 1, plan.length)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => goTo(position + 1)}
              disabled={position >= plan.length - 1}
              aria-label={t.common.next}
              data-testid="page-next"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => zoomBy(-1)}
              disabled={zoom <= ZOOM_MIN}
              aria-label={t.common.zoomOut}
            >
              <Minus aria-hidden="true" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="min-w-14 rounded-md px-1 text-sm tabular-nums hover:bg-muted"
                  aria-label={`Zoom ${Math.round(zoom * 100)} % : choisir`}
                  data-testid="zoom-level"
                >
                  {Math.round(zoom * 100)} %
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setFitMode("width");
                    setZoom(1);
                  }}
                >
                  Ajuster à la largeur
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setFitMode("page");
                    setZoom(1);
                  }}
                >
                  Page entière
                </DropdownMenuItem>
                {[0.5, 1, 1.5, 2, 3, 4].map((z) => (
                  <DropdownMenuItem key={z} onSelect={() => setZoom(z)}>
                    {Math.round(z * 100)} %
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => zoomBy(1)}
              disabled={zoom >= ZOOM_MAX}
              aria-label={t.common.zoomIn}
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="h-[72px] border-t border-border py-1 sm:hidden">
          <Toolbar
            tools={tools}
            active={tool}
            onChange={setTool}
            orientation="horizontal"
            extras={extras}
          />
        </div>
      </footer>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        onChange={(e) => void onImageFile(e.target.files?.[0])}
        aria-label={t.upload.imageBrowse}
        tabIndex={-1}
        data-testid="editor-image-input"
      />
      <SignatureDialog
        open={signatureOpen}
        onOpenChange={(open) => {
          setSignatureOpen(open);
          if (!open && tool === "signature" && !pendingAsset.current) setToolState("select");
        }}
        onConfirm={onSignature}
      />

      <ExportDialog
        open={exportOpen}
        onOpenChange={(open) => {
          setExportOpen(open);
          if (!open) exportOp.reset();
        }}
        state={exportOp.state}
        summary={{
          annotations: annotations.length,
          textEdits: textEdits.length,
          pagesChanged: planChanged,
          ocr: !!ocrLayer,
          expectedPages: plan.length,
        }}
        onDownload={() =>
          exportOp.state.status === "done" &&
          downloadPdf(exportOp.state.result.bytes, pdf.file.name, suffix, toolId)
        }
      />

      <Dialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <DialogContent size="sm" className="rounded-[20px]" data-testid="close-confirm">
          <DialogHeader>
            <DialogTitle>Fermer sans télécharger ?</DialogTitle>
            <DialogDescription>
              Vos modifications ne sont pas enregistrées : le fichier d&apos;origine reste intact
              sur votre appareil, et ce qui a été fait ici sera perdu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCloseConfirmOpen(false)}>
              Continuer l&apos;édition
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setCloseConfirmOpen(false);
                onClose();
              }}
              data-testid="close-confirm-discard"
            >
              Fermer sans enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
