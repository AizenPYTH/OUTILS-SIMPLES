"use client";

import * as React from "react";
import { Download, Minus, Plus, Redo2, Undo2, X, ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogoMark } from "@/components/layout/logo";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { fitScale, renderPageToCanvas, visualSize } from "@/lib/pdf/browser/pdfjs";
import { measureImage, readImageFile } from "@/lib/pdf/browser/read-file";
import { applyAnnotations, type AnnotateResult } from "@/lib/pdf/operations/annotate";
import { translateAnnotation, type Annotation, type ImageAnnotation, type PdfPoint } from "@/lib/pdf/annotations/types";
import { viewportRectToPdf, viewportScale, type ViewportLike } from "@/lib/pdf/coordinates";
import { isPdfError } from "@/lib/pdf/errors";
import { formatBytes } from "@/lib/files/format";
import { t } from "@/lib/i18n";
import { cn, clamp, uid } from "@/lib/utils";
import { AnnotationOverlay } from "./overlay";
import { ContextBar } from "./context-bar";
import { SignatureDialog, type SignatureAsset } from "./signature-dialog";
import { ThumbnailRail } from "./thumbnail-rail";
import { Toolbar } from "./toolbar";
import { defaultSettings, HIGHLIGHT_COLOR, modeTools, type ToolSettings, type WorkspaceMode, type WorkspaceTool } from "./types";
import { useAnnotationHistory } from "./use-annotation-history";

interface AnnotationWorkspaceProps {
  pdf: LoadedPdf;
  mode: WorkspaceMode;
  toolId: string;
  title: string;
  onClose: () => void;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * Full-screen editing shell (handoff: 56px top bar, 76px tool rail, 150px
 * thumbnails, context bar 48px, 44px page navigation; bottom toolbar on mobile).
 */
export function AnnotationWorkspace({ pdf, mode, toolId, title, onClose }: AnnotationWorkspaceProps) {
  const tools = modeTools[mode];
  const [tool, setToolState] = React.useState<WorkspaceTool>(tools[1] ?? "select");
  const [settings, setSettings] = React.useState<ToolSettings>(defaultSettings);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [viewport, setViewport] = React.useState<ViewportLike | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [signatureOpen, setSignatureOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [renderError, setRenderError] = React.useState(false);
  const pendingAsset = React.useRef<SignatureAsset | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [containerSize, setContainerSize] = React.useState({ width: 800, height: 600 });
  const history = useAnnotationHistory();
  const exportOp = useOperation<AnnotateResult>(toolId);
  const page = pdf.pages[pageIndex] ?? pdf.pages[0]!;

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
      if (entry) setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const baseScale = React.useMemo(() => {
    const size = visualSize(page);
    const fit = fitScale(size.width, size.height, Math.max(200, containerSize.width - 32), Math.max(200, containerSize.height - 32));
    return Math.min(fit, 2);
  }, [page, containerSize]);
  const scale = baseScale * zoom;

  // Render the current page.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    setRenderError(false);
    renderPageToCanvas(pdf.opened.doc, page.index, canvas, { scale, signal: controller.signal })
      .then(({ viewport: vp }) => {
        if (!controller.signal.aborted) setViewport({ width: vp.width, height: vp.height, transform: vp.transform });
      })
      .catch(() => !controller.signal.aborted && setRenderError(true));
    return () => controller.abort();
  }, [pdf.opened.doc, page, scale]);

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
    else if (next === "pen" || next === "rect" || next === "ellipse" || next === "arrow" || next === "underline" || next === "text" || next === "comment") {
      setSettings((s) => (s.color === HIGHLIGHT_COLOR ? { ...s, color: defaultSettings.color, opacity: 1 } : { ...s, opacity: s.opacity < 1 && next !== "pen" ? 1 : s.opacity }));
    }
    if (next === "signature") setSignatureOpen(true);
    if (next === "image") imageInputRef.current?.click();
  };

  const selected = history.annotations.find((a) => a.id === selectedId) ?? null;

  // Apply context-bar changes to a selected text annotation as well.
  const updateSettings = (patch: Partial<ToolSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    if (selected && selected.type === "text") {
      const next = { ...selected, ...("color" in patch && patch.color ? { color: patch.color } : {}), ...("fontSize" in patch && patch.fontSize ? { fontSize: patch.fontSize } : {}), ...("fontFamily" in patch && patch.fontFamily ? { fontFamily: patch.fontFamily } : {}), ...("bold" in patch ? { bold: !!patch.bold } : {}), ...("italic" in patch ? { italic: !!patch.italic } : {}), ...("align" in patch && patch.align ? { align: patch.align } : {}) };
      history.commit(history.annotations.map((a) => (a.id === selected.id ? next : a)));
    } else if (selected && "color" in patch && patch.color) {
      const color = patch.color;
      history.commit(
        history.annotations.map((a) => {
          if (a.id !== selected.id) return a;
          if (a.type === "rect" || a.type === "ellipse") return { ...a, strokeColor: color, fillColor: a.fillColor ? color : null };
          if (a.type === "path" || a.type === "line" || a.type === "highlight") return { ...a, color };
          return a;
        }),
      );
    }
  };

  const placeImage = (asset: SignatureAsset, role: ImageAnnotation["role"], at?: PdfPoint) => {
    if (!viewport) return;
    const visual = visualSize(page);
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
    const box = { x: center.x - (widthPt * s) / 2, y: center.y - (heightPt * s) / 2, width: widthPt * s, height: heightPt * s };
    const rect = viewportRectToPdf(viewport, box);
    const copy = new Uint8Array(asset.bytes.byteLength);
    copy.set(asset.bytes);
    const url = URL.createObjectURL(new Blob([copy], { type: asset.mimeType }));
    urlsRef.current.add(url);
    const annotation: ImageAnnotation = { id: uid("img"), type: "image", pageIndex, ...rect, bytes: asset.bytes, mimeType: asset.mimeType, previewUrl: url, role };
    history.commit([...history.annotations, annotation]);
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

  // Keyboard shortcuts.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        history.redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        history.commit(history.annotations.filter((a) => a.id !== selectedId));
        setSelectedId(null);
      } else if (e.key === "Escape") {
        setSelectedId(null);
        if (tool !== "select") setToolState("select");
      } else if (e.key.startsWith("Arrow") && selected && viewport) {
        e.preventDefault();
        const step = (e.shiftKey ? 10 : 1) / viewportScale(viewport);
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0;
        history.commit(history.annotations.map((a) => (a.id === selected.id ? translateAnnotation(a, dx, dy) : a)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, history, selected, selectedId, tool, viewport]);

  const goTo = (index: number) => {
    setPageIndex(clamp(index, 0, pdf.pageCount - 1));
    setSelectedId(null);
    setEditingId(null);
  };

  const zoomBy = (direction: 1 | -1) => {
    const current = ZOOM_STEPS.findIndex((z) => Math.abs(z - zoom) < 0.01);
    const next = ZOOM_STEPS[clamp((current === -1 ? 2 : current) + direction, 0, ZOOM_STEPS.length - 1)]!;
    setZoom(next);
  };

  const annotatedPages = React.useMemo(() => new Set(history.annotations.map((a) => a.pageIndex)), [history.annotations]);

  const startExport = () => {
    setExportOpen(true);
    const annotations: Annotation[] = history.annotations.filter((a) => a.type !== "text" || a.text.trim().length > 0);
    void exportOp.run(() => applyAnnotations(pdf.bytes, annotations));
  };

  const suffix = mode === "sign" ? "signe" : mode === "annotate" ? "annote" : mode === "text" ? "texte" : "modifie";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground" role="dialog" aria-modal="true" aria-label={title} data-testid="editor-shell">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
        <LogoMark className="size-7" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{pdf.file.name}</p>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:block" aria-live="polite">
          {history.annotations.length} élément{history.annotations.length > 1 ? "s" : ""}
        </span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={history.undo} disabled={!history.canUndo} aria-label={t.common.undo} data-testid="undo">
          <Undo2 aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={history.redo} disabled={!history.canRedo} aria-label={t.common.redo} data-testid="redo">
          <Redo2 aria-hidden="true" />
        </Button>
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <Button type="button" size="sm" onClick={startExport} data-testid="editor-download">
          <Download aria-hidden="true" />
          <span className="hidden sm:inline">{t.common.downloadPdf}</span>
          <span className="sm:hidden">{t.common.download}</span>
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label={t.common.close} data-testid="editor-close">
          <X aria-hidden="true" />
        </Button>
      </header>

      <ContextBar tool={tool} settings={settings} onChange={updateSettings} textSelected={selected?.type === "text"} hasSelection={!!selected} />

      <div className="flex min-h-0 flex-1">
        {/* Desktop tool rail */}
        <aside className="hidden w-[76px] shrink-0 border-r border-border bg-surface p-1.5 sm:block">
          <Toolbar tools={tools} active={tool} onChange={setTool} orientation="vertical" />
        </aside>
        {/* Thumbnails */}
        <aside className="hidden w-[150px] shrink-0 lg:block">
          <ThumbnailRail doc={pdf.opened.doc} pages={pdf.pages} current={pageIndex} onSelect={goTo} annotatedPages={annotatedPages} />
        </aside>
        {/* Canvas */}
        <div ref={containerRef} className="relative flex min-w-0 flex-1 overflow-auto bg-muted/60 p-4" data-testid="editor-canvas-area">
          <div className="relative m-auto shadow-lg" style={viewport ? { width: viewport.width, height: viewport.height } : undefined}>
            <canvas ref={canvasRef} className="block bg-white" aria-label={t.common.pageOf(pageIndex + 1, pdf.pageCount)} />
            {viewport ? (
              <AnnotationOverlay
                viewport={viewport}
                pageIndex={pageIndex}
                pageRotation={page.rotation}
                annotations={history.annotations}
                tool={tool}
                settings={settings}
                selectedId={selectedId}
                editingId={editingId}
                onSelect={setSelectedId}
                onEdit={setEditingId}
                onLiveChange={history.replaceLive}
                onBeginInteraction={() => history.beginLive(history.annotations)}
                onEndInteraction={history.endLive}
                onCommit={history.commit}
                onPlaceAt={onPlaceAt}
              />
            ) : null}
            {renderError ? <p className="absolute inset-x-0 top-2 text-center text-sm text-destructive">{t.errors.renderFailed}</p> : null}
          </div>
        </div>
      </div>

      {/* Bottom bar: page navigation + zoom (+ mobile toolbar) */}
      <footer className="shrink-0 border-t border-border bg-surface">
        <div className="flex h-11 items-center justify-between gap-2 px-3">
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => goTo(pageIndex - 1)} disabled={pageIndex === 0} aria-label={t.common.previous} data-testid="page-prev">
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="min-w-24 text-center text-sm tabular-nums" aria-live="polite" data-testid="page-indicator">
              {t.common.pageOf(pageIndex + 1, pdf.pageCount)}
            </span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => goTo(pageIndex + 1)} disabled={pageIndex >= pdf.pageCount - 1} aria-label={t.common.next} data-testid="page-next">
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => zoomBy(-1)} disabled={zoom <= ZOOM_STEPS[0]!} aria-label={t.common.zoomOut}>
              <Minus aria-hidden="true" />
            </Button>
            <button type="button" className="min-w-14 rounded-md px-1 text-sm tabular-nums hover:bg-muted" onClick={() => setZoom(1)} aria-label={t.common.zoomFit} data-testid="zoom-level">
              {Math.round(zoom * 100)} %
            </button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => zoomBy(1)} disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]!} aria-label={t.common.zoomIn}>
              <Plus aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="h-[72px] border-t border-border py-1 sm:hidden">
          <Toolbar tools={tools} active={tool} onChange={setTool} orientation="horizontal" />
        </div>
      </footer>

      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => void onImageFile(e.target.files?.[0])} aria-label={t.upload.imageBrowse} tabIndex={-1} data-testid="editor-image-input" />
      <SignatureDialog
        open={signatureOpen}
        onOpenChange={(open) => {
          setSignatureOpen(open);
          if (!open && tool === "signature" && !pendingAsset.current) setToolState("select");
        }}
        onConfirm={onSignature}
      />

      <Dialog
        open={exportOpen}
        onOpenChange={(open) => {
          setExportOpen(open);
          if (!open) exportOp.reset();
        }}
      >
        <DialogContent size="sm" className="rounded-[20px]">
          <DialogHeader>
            <DialogTitle>{exportOp.state.status === "done" ? t.result.downloadReady : t.progress.finalizing}</DialogTitle>
            <DialogDescription>
              {exportOp.state.status === "done"
                ? `${history.annotations.length} élément(s) intégré(s) · ${formatBytes(exportOp.state.result.bytes.byteLength)}`
                : "Les éléments sont dessinés dans les pages du document, localement."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            {exportOp.state.status === "busy" ? <Loader2 className="size-10 animate-spin text-link" aria-hidden="true" /> : null}
            {exportOp.state.status === "done" ? <CheckCircle2 className="size-10 text-success" aria-hidden="true" /> : null}
            {exportOp.state.status === "error" ? (
              <p role="alert" className="text-sm text-destructive">
                {exportOp.state.error.message}
              </p>
            ) : null}
          </div>
          {exportOp.state.status === "done" && exportOp.state.result.report.replacedCharacters > 0 ? (
            <p className="text-xs text-warning-foreground">Certains caractères non pris en charge par les polices standard ont été remplacés par « ? ».</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExportOpen(false)}>
              {t.common.close}
            </Button>
            {exportOp.state.status === "done" ? (
              <Button type="button" onClick={() => exportOp.state.status === "done" && downloadPdf(exportOp.state.result.bytes, pdf.file.name, suffix, toolId)} data-testid="export-download">
                <Download aria-hidden="true" /> {t.common.downloadPdf}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function workspaceClassName(active: boolean): string {
  return cn(active && "pointer-events-none");
}
