"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import {
  annotationBounds,
  isResizable,
  rgbToCss,
  translateAnnotation,
  type Annotation,
  type PdfPoint,
  type PdfRect,
  type TextAnnotation,
} from "@/lib/pdf/annotations/types";
import { pdfRectToViewport, pdfToViewport, viewportRectToPdf, viewportScale, viewportToPdf, type ViewportLike } from "@/lib/pdf/coordinates";
import { fontFamilies } from "@/lib/pdf/fonts";
import { uid } from "@/lib/utils";
import { COMMENT_BACKGROUND, type ToolSettings, type WorkspaceTool } from "./types";
import { t } from "@/lib/i18n";

export interface OverlayProps {
  viewport: ViewportLike;
  pageIndex: number;
  pageRotation: number;
  annotations: Annotation[];
  tool: WorkspaceTool;
  settings: ToolSettings;
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string | null) => void;
  /** Live (uncommitted) update during a drag. */
  onLiveChange: (next: Annotation[]) => void;
  onBeginInteraction: () => void;
  onEndInteraction: (next: Annotation[]) => void;
  /** Committed change (create, delete, text edit). */
  onCommit: (next: Annotation[]) => void;
  /** Image / signature tools: the user clicked the page. */
  onPlaceAt?: (point: PdfPoint) => void;
}

type Draft =
  | { kind: "path"; points: PdfPoint[] }
  | { kind: "box"; start: PdfPoint; current: PdfPoint } // viewport space
  | { kind: "line"; start: PdfPoint; current: PdfPoint } // viewport space
  | { kind: "move"; id: string; origin: Annotation; startPdf: PdfPoint }
  | { kind: "resize"; id: string; origin: Annotation; handle: Corner; startBox: PdfRect; keepRatio: boolean };

type Corner = "nw" | "ne" | "sw" | "se";

const MIN_SIZE_PX = 10;
const measureCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;

export function fontCssFor(a: TextAnnotation): string {
  return fontFamilies.find((f) => f.id === a.fontFamily)?.css ?? "sans-serif";
}

export function measureTextWidth(text: string, fontPx: number, a: TextAnnotation): number {
  const ctx = measureCanvas?.getContext("2d");
  if (!ctx) return text.length * fontPx * 0.55;
  ctx.font = `${a.italic ? "italic " : ""}${a.bold ? "700 " : "400 "}${fontPx}px ${fontCssFor(a)}`;
  return Math.max(...text.split("\n").map((line) => ctx.measureText(line || " ").width));
}

/** Visual (upright) dimensions of a text box in points. */
export function visualTextSize(a: TextAnnotation, rotation: number): { width: number; height: number } {
  const rot = ((rotation % 360) + 360) % 360;
  return rot === 90 || rot === 270 ? { width: a.height, height: a.width } : { width: a.width, height: a.height };
}

/** Recomputes a text box so it hugs its content (used while typing). */
export function autosizeText(a: TextAnnotation, viewport: ViewportLike, rotation: number): TextAnnotation {
  const scale = viewportScale(viewport);
  const padding = a.background ? 4 : 0;
  const widthPt = measureTextWidth(a.text || " ", a.fontSize * scale, a) / scale + padding * 2 + 2;
  const lines = Math.max(1, a.text.split("\n").length);
  const heightPt = lines * a.fontSize * 1.2 + padding * 2;
  const box = pdfRectToViewport(viewport, a);
  const visual = visualTextSize(a, rotation);
  const newWidth = Math.max(widthPt, visual.width > widthPt && a.text.length > 0 ? visual.width : widthPt);
  const next = viewportRectToPdf(viewport, { x: box.x, y: box.y, width: newWidth * scale, height: heightPt * scale });
  return { ...a, x: next.x, y: next.y, width: next.width, height: next.height };
}

export function AnnotationOverlay(props: OverlayProps) {
  const { viewport, pageIndex, pageRotation, annotations, tool, settings, selectedId, editingId, onSelect, onEdit, onLiveChange, onBeginInteraction, onEndInteraction, onCommit, onPlaceAt } = props;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const draftRef = React.useRef<Draft | null>(null);
  const liveRef = React.useRef<Annotation[]>(annotations);
  React.useEffect(() => {
    liveRef.current = annotations;
  }, [annotations]);
  const scale = viewportScale(viewport);
  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex);
  const selected = pageAnnotations.find((a) => a.id === selectedId) ?? null;

  const setDraftBoth = (d: Draft | null) => {
    draftRef.current = d;
    setDraft(d);
  };

  const toViewport = (e: React.PointerEvent): PdfPoint => {
    const rect = rootRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitTest = (pdfPoint: PdfPoint): Annotation | null => {
    for (let i = pageAnnotations.length - 1; i >= 0; i -= 1) {
      const a = pageAnnotations[i]!;
      const b = annotationBounds(a);
      const pad = 4 / scale;
      if (pdfPoint.x >= b.x - pad && pdfPoint.x <= b.x + b.width + pad && pdfPoint.y >= b.y - pad && pdfPoint.y <= b.y + b.height + pad) return a;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (editingId) return; // textarea handles its own events; blur commits
    const vp = toViewport(e);
    const pdf = viewportToPdf(viewport, vp);
    e.currentTarget.setPointerCapture(e.pointerId);

    if (tool === "select") {
      const hit = hitTest(pdf);
      if (!hit) {
        onSelect(null);
        return;
      }
      onSelect(hit.id);
      onBeginInteraction();
      setDraftBoth({ kind: "move", id: hit.id, origin: hit, startPdf: pdf });
      return;
    }
    if (tool === "image" || tool === "signature") {
      onPlaceAt?.(pdf);
      return;
    }
    if (tool === "text" || tool === "comment") {
      const fontSize = settings.fontSize;
      const padding = tool === "comment" ? 4 : 0;
      const widthPt = 24 + padding * 2;
      const heightPt = fontSize * 1.2 + padding * 2;
      const rect = viewportRectToPdf(viewport, { x: vp.x, y: vp.y, width: widthPt * scale, height: heightPt * scale });
      const annotation: TextAnnotation = {
        id: uid("txt"),
        type: "text",
        pageIndex,
        ...rect,
        text: "",
        fontFamily: settings.fontFamily,
        fontSize,
        bold: settings.bold,
        italic: settings.italic,
        color: settings.color,
        align: settings.align,
        background: tool === "comment" ? COMMENT_BACKGROUND : undefined,
      };
      onCommit([...annotations, annotation]);
      onSelect(annotation.id);
      onEdit(annotation.id);
      return;
    }
    onSelect(null);
    if (tool === "pen") setDraftBoth({ kind: "path", points: [pdf] });
    else if (tool === "arrow" || tool === "underline") setDraftBoth({ kind: "line", start: vp, current: vp });
    else setDraftBoth({ kind: "box", start: vp, current: vp });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = draftRef.current;
    if (!d) return;
    const vp = toViewport(e);
    const pdf = viewportToPdf(viewport, vp);
    switch (d.kind) {
      case "path": {
        const lastPoint = d.points.at(-1)!;
        if (Math.hypot(pdf.x - lastPoint.x, pdf.y - lastPoint.y) * scale < 1.5) return;
        setDraftBoth({ kind: "path", points: [...d.points, pdf] });
        return;
      }
      case "box":
      case "line":
        setDraftBoth({ ...d, current: vp });
        return;
      case "move": {
        const moved = translateAnnotation(d.origin, pdf.x - d.startPdf.x, pdf.y - d.startPdf.y);
        onLiveChange(liveRef.current.map((a) => (a.id === d.id ? moved : a)));
        return;
      }
      case "resize": {
        const box = resizeBox(d.startBox, d.handle, vp, d.keepRatio);
        const rect = viewportRectToPdf(viewport, box);
        onLiveChange(liveRef.current.map((a) => (a.id === d.id ? { ...a, ...rect } : a)));
        return;
      }
    }
  };

  const onPointerUp = () => {
    const d = draftRef.current;
    if (!d) return;
    setDraftBoth(null);
    switch (d.kind) {
      case "path": {
        if (d.points.length === 0) return;
        onCommit([...annotations, { id: uid("path"), type: "path", pageIndex, points: d.points, strokeWidth: settings.strokeWidth, color: settings.color, opacity: settings.opacity }]);
        return;
      }
      case "line": {
        const dist = Math.hypot(d.current.x - d.start.x, d.current.y - d.start.y);
        if (dist < 4) return;
        onCommit([
          ...annotations,
          {
            id: uid("line"),
            type: "line",
            pageIndex,
            start: viewportToPdf(viewport, d.start),
            end: viewportToPdf(viewport, d.current),
            strokeWidth: tool === "underline" ? Math.max(1.5, settings.strokeWidth) : settings.strokeWidth,
            color: settings.color,
            opacity: settings.opacity,
            arrow: tool === "arrow",
          },
        ]);
        return;
      }
      case "box": {
        const box = normalizeBox(d.start, d.current);
        if (box.width < MIN_SIZE_PX || box.height < MIN_SIZE_PX) return;
        const rect = viewportRectToPdf(viewport, box);
        if (tool === "highlight") {
          onCommit([...annotations, { id: uid("hl"), type: "highlight", pageIndex, ...rect, color: settings.color, opacity: Math.min(settings.opacity, 0.5) }]);
        } else if (tool === "rect") {
          onCommit([...annotations, { id: uid("rect"), type: "rect", pageIndex, ...rect, strokeWidth: settings.strokeWidth, strokeColor: settings.color, fillColor: settings.fill ? settings.color : null, opacity: settings.opacity }]);
        } else if (tool === "ellipse") {
          onCommit([...annotations, { id: uid("ell"), type: "ellipse", pageIndex, ...rect, strokeWidth: settings.strokeWidth, strokeColor: settings.color, fillColor: settings.fill ? settings.color : null, opacity: settings.opacity }]);
        }
        return;
      }
      case "move":
      case "resize":
        onEndInteraction(liveRef.current);
        return;
    }
  };

  const startResize = (e: React.PointerEvent, handle: Corner) => {
    if (!selected) return;
    e.stopPropagation();
    e.preventDefault();
    rootRef.current?.setPointerCapture(e.pointerId);
    onBeginInteraction();
    setDraftBoth({ kind: "resize", id: selected.id, origin: selected, handle, startBox: pdfRectToViewport(viewport, annotationBounds(selected)), keepRatio: selected.type === "image" });
  };

  const deleteSelected = () => {
    if (!selected) return;
    onCommit(annotations.filter((a) => a.id !== selected.id));
    onSelect(null);
  };

  const cursor = tool === "select" ? "default" : tool === "pen" ? "crosshair" : tool === "text" || tool === "comment" ? "text" : "crosshair";

  return (
    <div
      ref={rootRef}
      className="absolute left-0 top-0 select-none"
      style={{ width: viewport.width, height: viewport.height, cursor, touchAction: tool === "select" && !selected ? "pan-x pan-y" : "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      data-testid="annotation-overlay"
      role="application"
      aria-label="Zone d'annotation de la page"
    >
      <svg className="absolute inset-0 overflow-visible" width={viewport.width} height={viewport.height} aria-hidden="true">
        <defs>
          <marker id="arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker>
        </defs>
        {pageAnnotations.map((a) => (
          <ShapeView key={a.id} annotation={a} viewport={viewport} scale={scale} />
        ))}
        {draft?.kind === "path" ? <PathView points={draft.points} viewport={viewport} color={rgbToCss(settings.color, settings.opacity)} width={settings.strokeWidth * scale} /> : null}
        {draft?.kind === "box" ? <DraftBox box={normalizeBox(draft.start, draft.current)} tool={tool} settings={settings} scale={scale} /> : null}
        {draft?.kind === "line" ? (
          <line x1={draft.start.x} y1={draft.start.y} x2={draft.current.x} y2={draft.current.y} stroke={rgbToCss(settings.color, settings.opacity)} strokeWidth={settings.strokeWidth * scale} strokeLinecap="round" markerEnd={tool === "arrow" ? "url(#arrow-head)" : undefined} />
        ) : null}
      </svg>

      {pageAnnotations.map((a) => {
        if (a.type === "text") return <TextView key={a.id} annotation={a} viewport={viewport} scale={scale} rotation={pageRotation} editing={editingId === a.id} selected={selectedId === a.id} onCommit={onCommit} annotations={annotations} onEdit={onEdit} onSelect={onSelect} />;
        if (a.type === "image") {
          const box = pdfRectToViewport(viewport, a);
          return (
            // eslint-disable-next-line @next/next/no-img-element -- object URL preview, not optimisable
            <img
              key={a.id}
              src={a.previewUrl}
              alt={a.role === "signature" ? "Signature" : "Image ajoutée"}
              draggable={false}
              className="pointer-events-none absolute"
              style={{ left: box.x, top: box.y, width: box.width, height: box.height, transform: `rotate(${-pageRotation}deg)`, transformOrigin: "center" }}
            />
          );
        }
        return null;
      })}

      {selected && tool === "select" ? (
        <SelectionFrame annotation={selected} viewport={viewport} onResizeStart={startResize} onDelete={deleteSelected} resizable={isResizable(selected)} onDoubleClick={() => selected.type === "text" && onEdit(selected.id)} />
      ) : null}
    </div>
  );
}

function normalizeBox(a: PdfPoint, b: PdfPoint): PdfRect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
}

function resizeBox(start: PdfRect, handle: Corner, pointer: PdfPoint, keepRatio: boolean): PdfRect {
  const right = start.x + start.width;
  const bottom = start.y + start.height;
  let x = start.x, y = start.y, w = start.width, h = start.height;
  if (handle.includes("w")) {
    x = Math.min(pointer.x, right - MIN_SIZE_PX);
    w = right - x;
  } else {
    w = Math.max(MIN_SIZE_PX, pointer.x - start.x);
  }
  if (handle.includes("n")) {
    y = Math.min(pointer.y, bottom - MIN_SIZE_PX);
    h = bottom - y;
  } else {
    h = Math.max(MIN_SIZE_PX, pointer.y - start.y);
  }
  if (keepRatio && start.width > 0 && start.height > 0) {
    const ratio = start.height / start.width;
    const useWidth = Math.abs(w - start.width) >= Math.abs(h - start.height);
    if (useWidth) h = w * ratio;
    else w = h / ratio;
    if (handle.includes("w")) x = right - w;
    if (handle.includes("n")) y = bottom - h;
  }
  return { x, y, width: w, height: h };
}

function PathView({ points, viewport, color, width }: { points: PdfPoint[]; viewport: ViewportLike; color: string; width: number }) {
  if (points.length === 0) return null;
  const vp = points.map((p) => pdfToViewport(viewport, p));
  if (vp.length === 1) return <circle cx={vp[0]!.x} cy={vp[0]!.y} r={width / 2} fill={color} />;
  return <polyline points={vp.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />;
}

function ShapeView({ annotation: a, viewport, scale }: { annotation: Annotation; viewport: ViewportLike; scale: number }) {
  switch (a.type) {
    case "path":
      return <PathView points={a.points} viewport={viewport} color={rgbToCss(a.color, a.opacity)} width={a.strokeWidth * scale} />;
    case "highlight": {
      const b = pdfRectToViewport(viewport, a);
      return <rect x={b.x} y={b.y} width={b.width} height={b.height} fill={rgbToCss(a.color, a.opacity)} style={{ mixBlendMode: "multiply" }} />;
    }
    case "rect": {
      const b = pdfRectToViewport(viewport, a);
      return <rect x={b.x} y={b.y} width={b.width} height={b.height} fill={a.fillColor ? rgbToCss(a.fillColor, a.opacity) : "none"} stroke={a.strokeColor ? rgbToCss(a.strokeColor, a.opacity) : "none"} strokeWidth={a.strokeWidth * scale} />;
    }
    case "ellipse": {
      const b = pdfRectToViewport(viewport, a);
      return <ellipse cx={b.x + b.width / 2} cy={b.y + b.height / 2} rx={b.width / 2} ry={b.height / 2} fill={a.fillColor ? rgbToCss(a.fillColor, a.opacity) : "none"} stroke={a.strokeColor ? rgbToCss(a.strokeColor, a.opacity) : "none"} strokeWidth={a.strokeWidth * scale} />;
    }
    case "line": {
      const s = pdfToViewport(viewport, a.start);
      const e = pdfToViewport(viewport, a.end);
      return <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={rgbToCss(a.color, a.opacity)} strokeWidth={a.strokeWidth * scale} strokeLinecap="round" markerEnd={a.arrow ? "url(#arrow-head)" : undefined} />;
    }
    default:
      return null;
  }
}

function DraftBox({ box, tool, settings, scale }: { box: PdfRect; tool: WorkspaceTool; settings: ToolSettings; scale: number }) {
  const stroke = rgbToCss(settings.color, settings.opacity);
  if (tool === "highlight") return <rect x={box.x} y={box.y} width={box.width} height={box.height} fill={rgbToCss(settings.color, 0.4)} style={{ mixBlendMode: "multiply" }} />;
  if (tool === "ellipse") return <ellipse cx={box.x + box.width / 2} cy={box.y + box.height / 2} rx={box.width / 2} ry={box.height / 2} fill={settings.fill ? rgbToCss(settings.color, settings.opacity) : "none"} stroke={stroke} strokeWidth={settings.strokeWidth * scale} />;
  return <rect x={box.x} y={box.y} width={box.width} height={box.height} fill={settings.fill ? rgbToCss(settings.color, settings.opacity) : "none"} stroke={stroke} strokeWidth={settings.strokeWidth * scale} strokeDasharray={tool === "rect" ? undefined : "4 3"} />;
}

interface TextViewProps {
  annotation: TextAnnotation;
  viewport: ViewportLike;
  scale: number;
  rotation: number;
  editing: boolean;
  selected: boolean;
  annotations: Annotation[];
  onCommit: (next: Annotation[]) => void;
  onEdit: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}

function TextView({ annotation: a, viewport, scale, rotation, editing, annotations, onCommit, onEdit }: TextViewProps) {
  const box = pdfRectToViewport(viewport, a);
  const fontPx = a.fontSize * scale;
  const padding = a.background ? 4 * scale : 0;
  const style: React.CSSProperties = {
    left: box.x,
    top: box.y,
    width: box.width,
    minHeight: box.height,
    fontSize: fontPx,
    lineHeight: 1.2,
    fontFamily: fontCssFor(a),
    fontWeight: a.bold ? 700 : 400,
    fontStyle: a.italic ? "italic" : "normal",
    color: rgbToCss(a.color),
    textAlign: a.align,
    background: a.background ? rgbToCss(a.background) : "transparent",
    padding,
    whiteSpace: "pre",
    boxSizing: "border-box",
  };

  if (editing) {
    return (
      <textarea
        autoFocus
        aria-label="Texte de l'annotation"
        className="absolute resize-none overflow-hidden rounded-none border border-primary bg-transparent outline-hidden"
        style={{ ...style, background: a.background ? rgbToCss(a.background) : "rgba(255,255,255,0.6)" }}
        value={a.text}
        rows={Math.max(1, a.text.split("\n").length)}
        onChange={(e) => {
          const next = autosizeText({ ...a, text: e.target.value }, viewport, rotation);
          onCommit(annotations.map((x) => (x.id === a.id ? next : x)));
        }}
        onBlur={() => {
          onEdit(null);
          if (a.text.trim().length === 0) onCommit(annotations.filter((x) => x.id !== a.id));
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
          e.stopPropagation();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        data-testid="text-annotation-editor"
      />
    );
  }

  return (
    <div className="pointer-events-none absolute" style={style} aria-hidden="true">
      {a.text}
    </div>
  );
}

function SelectionFrame({
  annotation,
  viewport,
  onResizeStart,
  onDelete,
  resizable,
  onDoubleClick,
}: {
  annotation: Annotation;
  viewport: ViewportLike;
  onResizeStart: (e: React.PointerEvent, handle: Corner) => void;
  onDelete: () => void;
  resizable: boolean;
  onDoubleClick: () => void;
}) {
  const box = pdfRectToViewport(viewport, annotationBounds(annotation));
  const handles: { id: Corner; x: number; y: number; cursor: string }[] = [
    { id: "nw", x: box.x, y: box.y, cursor: "nwse-resize" },
    { id: "ne", x: box.x + box.width, y: box.y, cursor: "nesw-resize" },
    { id: "sw", x: box.x, y: box.y + box.height, cursor: "nesw-resize" },
    { id: "se", x: box.x + box.width, y: box.y + box.height, cursor: "nwse-resize" },
  ];
  return (
    <>
      <div
        className="absolute border-2 border-dashed border-primary"
        style={{ left: box.x - 2, top: box.y - 2, width: box.width + 4, height: box.height + 4, pointerEvents: "none" }}
        onDoubleClick={onDoubleClick}
        data-testid="selection-frame"
      />
      {resizable
        ? handles.map((h) => (
            <button
              key={h.id}
              type="button"
              aria-label={`Redimensionner (${h.id})`}
              className="absolute size-4 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-primary bg-surface shadow-sm sm:size-3.5"
              style={{ left: h.x, top: h.y, cursor: h.cursor }}
              onPointerDown={(e) => onResizeStart(e, h.id)}
            />
          ))
        : null}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onDelete}
        aria-label={t.common.delete}
        className="absolute flex h-8 items-center gap-1 rounded-full bg-foreground px-2.5 text-xs font-medium text-background shadow-md"
        style={{ left: box.x + box.width / 2, top: Math.max(4, box.y - 40), transform: "translateX(-50%)" }}
        data-testid="delete-annotation"
      >
        <Trash2 className="size-3.5" aria-hidden="true" /> {t.common.delete}
      </button>
    </>
  );
}
