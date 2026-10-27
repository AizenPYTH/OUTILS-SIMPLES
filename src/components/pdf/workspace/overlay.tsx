"use client";

import * as React from "react";
import {
  annotationBounds,
  dashArrayFor,
  isResizable,
  rgbToCss,
  translateAnnotation,
  type Annotation,
  type LineAnnotation,
  type PdfPoint,
  type PdfRect,
  type TextAnnotation,
} from "@/lib/pdf/annotations/types";
import {
  pdfRectToViewport,
  pdfToViewport,
  viewportRectToPdf,
  viewportScale,
  viewportToPdf,
  type ViewportLike,
} from "@/lib/pdf/coordinates";
import { fontInfo } from "@/lib/pdf/fonts";
import { ensureFontFace } from "@/lib/pdf/fonts-embed";
import { clamp, uid } from "@/lib/utils";
import { tr } from "@/lib/i18n/messages";
import { ONE_SHOT_TOOLS, type ToolSettings, type WorkspaceTool } from "./types";

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
  /** Live (uncommitted) update during a drag or while typing. */
  onLiveChange: (next: Annotation[]) => void;
  onBeginInteraction: () => void;
  onEndInteraction: (next: Annotation[], label?: string) => void;
  /** Committed change (create, delete). */
  onCommit: (next: Annotation[], label?: string) => void;
  /** Image / signature tools: the user clicked the page. */
  onPlaceAt?: (point: PdfPoint) => void;
  /** A one-shot tool finished drawing: hand back to the selection tool. */
  onToolChange?: (tool: WorkspaceTool) => void;
}

type Draft =
  | { kind: "path"; points: PdfPoint[] }
  | { kind: "box"; start: PdfPoint; current: PdfPoint } // viewport space
  | { kind: "line"; start: PdfPoint; current: PdfPoint } // viewport space
  | { kind: "place"; point: PdfPoint } // viewport space, text/comment placement on pointer up
  | { kind: "move"; id: string; origin: Annotation; startPdf: PdfPoint; moved: boolean }
  | {
      kind: "resize";
      id: string;
      origin: Annotation;
      handle: Corner;
      startBox: PdfRect;
      keepRatio: boolean;
    }
  | { kind: "endpoint"; id: string; origin: LineAnnotation; which: "start" | "end" };

type Corner = "nw" | "ne" | "sw" | "se";

const MIN_SIZE_PX = 10;
const measureCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;

export function fontCssFor(a: TextAnnotation): string {
  return fontInfo(a.fontFamily).css;
}

export function measureTextWidth(text: string, fontPx: number, a: TextAnnotation): number {
  const ctx = measureCanvas?.getContext("2d");
  if (!ctx) return text.length * fontPx * 0.55;
  ctx.font = `${a.italic ? "italic " : ""}${a.bold ? "700 " : "400 "}${fontPx}px ${fontCssFor(a)}`;
  return Math.max(...text.split("\n").map((line) => ctx.measureText(line || " ").width));
}

/** Visual (upright) dimensions of a text box in points. */
export function visualTextSize(
  a: TextAnnotation,
  rotation: number,
): { width: number; height: number } {
  const rot = ((rotation % 360) + 360) % 360;
  return rot === 90 || rot === 270
    ? { width: a.height, height: a.width }
    : { width: a.width, height: a.height };
}

/** Recomputes a text box so it hugs its content (used while typing and after style changes). */
export function autosizeText(
  a: TextAnnotation,
  viewport: ViewportLike,
  rotation: number,
): TextAnnotation {
  const scale = viewportScale(viewport);
  const padding = a.background ? 4 : 0;
  const widthPt = measureTextWidth(a.text || " ", a.fontSize * scale, a) / scale + padding * 2 + 2;
  const lines = Math.max(1, a.text.split("\n").length);
  const heightPt = lines * a.fontSize * 1.2 + padding * 2;
  const box = pdfRectToViewport(viewport, a);
  const next = viewportRectToPdf(viewport, {
    x: box.x,
    y: box.y,
    width: widthPt * scale,
    height: heightPt * scale,
  });
  void rotation;
  return { ...a, x: next.x, y: next.y, width: next.width, height: next.height };
}

/** Distance from a point to a segment, in the same unit as the points. */
export function distanceToSegment(p: PdfPoint, a: PdfPoint, b: PdfPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Whether a PDF-space point hits an annotation: lines and strokes within a
 * tolerance of the stroke itself, boxes (text, images, shapes, highlights)
 * anywhere inside their bounds.
 */
export function hitsAnnotation(a: Annotation, p: PdfPoint, tolerance: number): boolean {
  if (a.type === "line")
    return (
      distanceToSegment(p, a.start, a.end) <= Math.max(tolerance, a.strokeWidth / 2 + tolerance / 2)
    );
  if (a.type === "path") {
    const tol = Math.max(tolerance, a.strokeWidth / 2 + tolerance / 2);
    if (a.points.length === 1) return Math.hypot(p.x - a.points[0]!.x, p.y - a.points[0]!.y) <= tol;
    for (let i = 1; i < a.points.length; i += 1)
      if (distanceToSegment(p, a.points[i - 1]!, a.points[i]!) <= tol) return true;
    return false;
  }
  const b = annotationBounds(a);
  return (
    p.x >= b.x - tolerance &&
    p.x <= b.x + b.width + tolerance &&
    p.y >= b.y - tolerance &&
    p.y <= b.y + b.height + tolerance
  );
}

export function AnnotationOverlay(props: OverlayProps) {
  const {
    viewport,
    pageIndex,
    pageRotation,
    annotations,
    tool,
    settings,
    selectedId,
    editingId,
    onSelect,
    onEdit,
    onLiveChange,
    onBeginInteraction,
    onEndInteraction,
    onCommit,
    onPlaceAt,
    onToolChange,
  } = props;
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

  const toViewport = (e: { clientX: number; clientY: number }): PdfPoint => {
    const rect = rootRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitTest = (pdfPoint: PdfPoint): Annotation | null => {
    const tolerance = 4 / scale;
    for (let i = pageAnnotations.length - 1; i >= 0; i -= 1) {
      const a = pageAnnotations[i]!;
      if (hitsAnnotation(a, pdfPoint, tolerance)) return a;
    }
    return null;
  };

  const startEditing = (id: string) => {
    onSelect(id);
    onBeginInteraction();
    onEdit(id);
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
      setDraftBoth({ kind: "move", id: hit.id, origin: hit, startPdf: pdf, moved: false });
      return;
    }
    if (tool === "image" || tool === "signature") {
      onPlaceAt?.(pdf);
      return;
    }
    if (tool === "text" || tool === "comment") {
      // Clicking an existing text block edits it instead of stacking a new one.
      const hit = hitTest(pdf);
      if (hit && hit.type === "text") {
        e.preventDefault();
        startEditing(hit.id);
        return;
      }
      // Prevent the compatibility mousedown from stealing focus from the textarea created on pointer up.
      e.preventDefault();
      setDraftBoth({ kind: "place", point: vp });
      return;
    }
    onSelect(null);
    if (tool === "pen") setDraftBoth({ kind: "path", points: [pdf] });
    else if (tool === "arrow" || tool === "line" || tool === "underline")
      setDraftBoth({ kind: "line", start: vp, current: vp });
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
      case "place":
        return;
      case "move": {
        const dx = pdf.x - d.startPdf.x;
        const dy = pdf.y - d.startPdf.y;
        if (!d.moved && Math.hypot(dx, dy) * scale < 2) return; // a click is not a move
        if (!d.moved) draftRef.current = { ...d, moved: true };
        const moved = translateAnnotation(d.origin, dx, dy);
        onLiveChange(liveRef.current.map((a) => (a.id === d.id ? moved : a)));
        return;
      }
      case "resize": {
        const box = resizeBox(d.startBox, d.handle, vp, d.keepRatio);
        if (d.origin.type === "text") {
          // Corner handles scale the text: the box always follows the font metrics.
          const ratio = box.width / Math.max(1, d.startBox.width);
          const fontSize = clamp(d.origin.fontSize * ratio, 4, 300);
          const rect = viewportRectToPdf(viewport, box);
          const next = autosizeText({ ...d.origin, ...rect, fontSize }, viewport, pageRotation);
          onLiveChange(liveRef.current.map((a) => (a.id === d.id ? next : a)));
          return;
        }
        const rect = viewportRectToPdf(viewport, box);
        onLiveChange(liveRef.current.map((a) => (a.id === d.id ? { ...a, ...rect } : a)));
        return;
      }
      case "endpoint": {
        const next: LineAnnotation = { ...d.origin, [d.which]: pdf };
        onLiveChange(liveRef.current.map((a) => (a.id === d.id ? next : a)));
        return;
      }
    }
  };

  const finishShape = (annotation: Annotation, label: string) => {
    onCommit([...annotations, annotation], label);
    onSelect(annotation.id);
    if (ONE_SHOT_TOOLS.includes(tool)) onToolChange?.("select");
  };

  const onPointerUp = () => {
    const d = draftRef.current;
    if (!d) return;
    setDraftBoth(null);
    switch (d.kind) {
      case "place": {
        const fontSize = settings.fontSize;
        const background =
          tool === "comment"
            ? (settings.background ?? undefined)
            : (settings.background ?? undefined);
        const padding = background ? 4 : 0;
        const widthPt = 24 + padding * 2;
        const heightPt = fontSize * 1.2 + padding * 2;
        const rect = viewportRectToPdf(viewport, {
          x: d.point.x,
          y: d.point.y,
          width: widthPt * scale,
          height: heightPt * scale,
        });
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
          underline: settings.underline,
          color: settings.color,
          align: settings.align,
          background,
        };
        // Creation and typing form one history step, committed when the field closes.
        onBeginInteraction();
        onLiveChange([...liveRef.current, annotation]);
        onSelect(annotation.id);
        onEdit(annotation.id);
        return;
      }
      case "path": {
        if (d.points.length === 0) return;
        onCommit(
          [
            ...annotations,
            {
              id: uid("path"),
              type: "path",
              pageIndex,
              points: d.points,
              strokeWidth: settings.strokeWidth,
              color: settings.color,
              opacity: settings.opacity,
              dash: settings.dash,
            },
          ],
          tr("Dessin ajouté"),
        );
        return;
      }
      case "line": {
        const dist = Math.hypot(d.current.x - d.start.x, d.current.y - d.start.y);
        if (dist < 4) return;
        finishShape(
          {
            id: uid("line"),
            type: "line",
            pageIndex,
            start: viewportToPdf(viewport, d.start),
            end: viewportToPdf(viewport, d.current),
            strokeWidth:
              tool === "underline" ? Math.max(1.5, settings.strokeWidth) : settings.strokeWidth,
            color: settings.color,
            opacity: settings.opacity,
            arrow: tool === "arrow",
            dash: settings.dash,
          },
          tool === "arrow"
            ? tr("Flèche ajoutée")
            : tool === "underline"
              ? tr("Soulignement ajouté")
              : tr("Ligne ajoutée"),
        );
        return;
      }
      case "box": {
        const box = normalizeBox(d.start, d.current);
        if (box.width < MIN_SIZE_PX || box.height < MIN_SIZE_PX) return;
        const rect = viewportRectToPdf(viewport, box);
        if (tool === "highlight") {
          finishShape(
            {
              id: uid("hl"),
              type: "highlight",
              pageIndex,
              ...rect,
              color: settings.color,
              opacity: Math.min(settings.opacity, 0.5),
            },
            tr("Surlignage ajouté"),
          );
        } else if (tool === "mask") {
          finishShape(
            {
              id: uid("mask"),
              type: "rect",
              pageIndex,
              ...rect,
              strokeWidth: 0,
              strokeColor: null,
              fillColor: settings.color,
              opacity: 1,
              mask: true,
            },
            tr("Masque ajouté"),
          );
        } else if (tool === "rect" || tool === "ellipse") {
          finishShape(
            {
              id: uid(tool === "rect" ? "rect" : "ell"),
              type: tool,
              pageIndex,
              ...rect,
              strokeWidth: settings.strokeWidth,
              strokeColor: settings.color,
              fillColor: settings.fill ? settings.fillColor : null,
              opacity: settings.opacity,
              dash: settings.dash,
            },
            tool === "rect" ? tr("Rectangle ajouté") : tr("Ellipse ajoutée"),
          );
        }
        return;
      }
      case "move":
        onEndInteraction(liveRef.current, tr("Élément déplacé"));
        return;
      case "resize":
        onEndInteraction(
          liveRef.current,
          d.origin.type === "text" ? tr("Taille du texte") : tr("Élément redimensionné"),
        );
        return;
      case "endpoint":
        onEndInteraction(liveRef.current, tr("Extrémité déplacée"));
        return;
    }
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editingId || tool !== "select") return;
    const hit = hitTest(viewportToPdf(viewport, toViewport(e)));
    if (hit && hit.type === "text") {
      e.preventDefault();
      startEditing(hit.id);
    }
  };

  const startResize = (e: React.PointerEvent, handle: Corner) => {
    if (!selected) return;
    e.stopPropagation();
    e.preventDefault();
    rootRef.current?.setPointerCapture(e.pointerId);
    onBeginInteraction();
    setDraftBoth({
      kind: "resize",
      id: selected.id,
      origin: selected,
      handle,
      startBox: pdfRectToViewport(viewport, annotationBounds(selected)),
      keepRatio: selected.type === "image" || selected.type === "text",
    });
  };

  const startEndpoint = (e: React.PointerEvent, which: "start" | "end") => {
    if (!selected || selected.type !== "line") return;
    e.stopPropagation();
    e.preventDefault();
    rootRef.current?.setPointerCapture(e.pointerId);
    onBeginInteraction();
    setDraftBoth({ kind: "endpoint", id: selected.id, origin: selected, which });
  };

  const cursor =
    tool === "select"
      ? draft?.kind === "move" && draft.moved
        ? "grabbing"
        : "default"
      : tool === "pen"
        ? "crosshair"
        : tool === "text" || tool === "comment"
          ? "text"
          : "crosshair";

  return (
    <div
      ref={rootRef}
      className="absolute left-0 top-0 select-none"
      style={{
        width: viewport.width,
        height: viewport.height,
        cursor,
        touchAction: tool === "select" && !selected ? "pan-x pan-y" : "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      data-testid="annotation-overlay"
      role="application"
      aria-label={tr("Zone d'annotation de la page")}
    >
      <svg
        className="absolute inset-0 overflow-visible"
        width={viewport.width}
        height={viewport.height}
        aria-hidden="true"
      >
        <defs>
          <marker
            id="arrow-head"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker>
        </defs>
        {pageAnnotations.map((a) => (
          <ShapeView key={a.id} annotation={a} viewport={viewport} scale={scale} />
        ))}
        {draft?.kind === "path" ? (
          <PathView
            points={draft.points}
            viewport={viewport}
            color={rgbToCss(settings.color, settings.opacity)}
            width={settings.strokeWidth * scale}
            dash={dashCss(settings.dash, settings.strokeWidth * scale)}
          />
        ) : null}
        {draft?.kind === "box" ? (
          <DraftBox
            box={normalizeBox(draft.start, draft.current)}
            tool={tool}
            settings={settings}
            scale={scale}
          />
        ) : null}
        {draft?.kind === "line" ? (
          <line
            x1={draft.start.x}
            y1={draft.start.y}
            x2={draft.current.x}
            y2={draft.current.y}
            stroke={rgbToCss(settings.color, settings.opacity)}
            strokeWidth={settings.strokeWidth * scale}
            strokeLinecap="round"
            strokeDasharray={dashCss(settings.dash, settings.strokeWidth * scale)}
            markerEnd={tool === "arrow" ? "url(#arrow-head)" : undefined}
          />
        ) : null}
      </svg>

      {pageAnnotations.map((a) => {
        if (a.type === "text")
          return (
            <TextView
              key={a.id}
              annotation={a}
              viewport={viewport}
              scale={scale}
              rotation={pageRotation}
              editing={editingId === a.id}
              onLiveChange={(next) =>
                onLiveChange(liveRef.current.map((x) => (x.id === a.id ? next : x)))
              }
              onFinish={(final) => {
                onEdit(null);
                if (final.text.trim().length === 0) {
                  onEndInteraction(
                    liveRef.current.filter((x) => x.id !== a.id),
                    tr("Texte vide retiré"),
                  );
                  onSelect(null);
                } else onEndInteraction(liveRef.current, tr("Texte saisi"));
              }}
            />
          );
        if (a.type === "image") {
          const box = pdfRectToViewport(viewport, a);
          return (
            // eslint-disable-next-line @next/next/no-img-element -- object URL preview, not optimisable
            <img
              key={a.id}
              src={a.previewUrl}
              alt={a.role === "signature" ? tr("Signature") : tr("Image ajoutée")}
              draggable={false}
              className="pointer-events-none absolute"
              style={{
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
                transform: `rotate(${-pageRotation}deg)`,
                transformOrigin: "center",
              }}
            />
          );
        }
        return null;
      })}

      {selected && tool === "select" && editingId !== selected.id ? (
        <SelectionFrame
          annotation={selected}
          viewport={viewport}
          onResizeStart={startResize}
          onEndpointStart={startEndpoint}
          resizable={isResizable(selected)}
        />
      ) : null}
    </div>
  );
}

function normalizeBox(a: PdfPoint, b: PdfPoint): PdfRect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

export function resizeBox(
  start: PdfRect,
  handle: Corner,
  pointer: PdfPoint,
  keepRatio: boolean,
): PdfRect {
  const right = start.x + start.width;
  const bottom = start.y + start.height;
  let x = start.x,
    y = start.y,
    w = start.width,
    h = start.height;
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

/** SVG dash pattern matching the exported one (points → viewport px). */
export function dashCss(
  dash: "solid" | "dashed" | "dotted" | undefined,
  strokePx: number,
): string | undefined {
  const arr = dashArrayFor(dash, strokePx);
  return arr ? arr.map((v) => Math.max(0.1, v)).join(" ") : undefined;
}

function PathView({
  points,
  viewport,
  color,
  width,
  dash,
}: {
  points: PdfPoint[];
  viewport: ViewportLike;
  color: string;
  width: number;
  dash?: string;
}) {
  if (points.length === 0) return null;
  const vp = points.map((p) => pdfToViewport(viewport, p));
  if (vp.length === 1) return <circle cx={vp[0]!.x} cy={vp[0]!.y} r={width / 2} fill={color} />;
  return (
    <polyline
      points={vp.map((p) => `${p.x},${p.y}`).join(" ")}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash}
    />
  );
}

function ShapeView({
  annotation: a,
  viewport,
  scale,
}: {
  annotation: Annotation;
  viewport: ViewportLike;
  scale: number;
}) {
  switch (a.type) {
    case "path":
      return (
        <PathView
          points={a.points}
          viewport={viewport}
          color={rgbToCss(a.color, a.opacity)}
          width={a.strokeWidth * scale}
          dash={dashCss(a.dash, a.strokeWidth * scale)}
        />
      );
    case "highlight": {
      const b = pdfRectToViewport(viewport, a);
      return (
        <rect
          x={b.x}
          y={b.y}
          width={b.width}
          height={b.height}
          fill={rgbToCss(a.color, a.opacity)}
          style={{ mixBlendMode: "multiply" }}
        />
      );
    }
    case "rect": {
      const b = pdfRectToViewport(viewport, a);
      return (
        <rect
          x={b.x}
          y={b.y}
          width={b.width}
          height={b.height}
          fill={a.fillColor ? rgbToCss(a.fillColor, a.opacity) : "none"}
          stroke={a.strokeColor && a.strokeWidth > 0 ? rgbToCss(a.strokeColor, a.opacity) : "none"}
          strokeWidth={a.strokeWidth * scale}
          strokeDasharray={dashCss(a.dash, a.strokeWidth * scale)}
        />
      );
    }
    case "ellipse": {
      const b = pdfRectToViewport(viewport, a);
      return (
        <ellipse
          cx={b.x + b.width / 2}
          cy={b.y + b.height / 2}
          rx={b.width / 2}
          ry={b.height / 2}
          fill={a.fillColor ? rgbToCss(a.fillColor, a.opacity) : "none"}
          stroke={a.strokeColor && a.strokeWidth > 0 ? rgbToCss(a.strokeColor, a.opacity) : "none"}
          strokeWidth={a.strokeWidth * scale}
          strokeDasharray={dashCss(a.dash, a.strokeWidth * scale)}
        />
      );
    }
    case "line": {
      const s = pdfToViewport(viewport, a.start);
      const e = pdfToViewport(viewport, a.end);
      return (
        <line
          x1={s.x}
          y1={s.y}
          x2={e.x}
          y2={e.y}
          stroke={rgbToCss(a.color, a.opacity)}
          strokeWidth={a.strokeWidth * scale}
          strokeLinecap="round"
          strokeDasharray={dashCss(a.dash, a.strokeWidth * scale)}
          markerEnd={a.arrow ? "url(#arrow-head)" : undefined}
        />
      );
    }
    default:
      return null;
  }
}

function DraftBox({
  box,
  tool,
  settings,
  scale,
}: {
  box: PdfRect;
  tool: WorkspaceTool;
  settings: ToolSettings;
  scale: number;
}) {
  const stroke = rgbToCss(settings.color, settings.opacity);
  const dash = dashCss(settings.dash, settings.strokeWidth * scale);
  if (tool === "highlight")
    return (
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        fill={rgbToCss(settings.color, 0.4)}
        style={{ mixBlendMode: "multiply" }}
      />
    );
  if (tool === "mask")
    return (
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        fill={rgbToCss(settings.color, 0.85)}
      />
    );
  if (tool === "ellipse")
    return (
      <ellipse
        cx={box.x + box.width / 2}
        cy={box.y + box.height / 2}
        rx={box.width / 2}
        ry={box.height / 2}
        fill={settings.fill ? rgbToCss(settings.fillColor, settings.opacity) : "none"}
        stroke={stroke}
        strokeWidth={settings.strokeWidth * scale}
        strokeDasharray={dash}
      />
    );
  return (
    <rect
      x={box.x}
      y={box.y}
      width={box.width}
      height={box.height}
      fill={settings.fill ? rgbToCss(settings.fillColor, settings.opacity) : "none"}
      stroke={stroke}
      strokeWidth={settings.strokeWidth * scale}
      strokeDasharray={dash}
    />
  );
}

interface TextViewProps {
  annotation: TextAnnotation;
  viewport: ViewportLike;
  scale: number;
  rotation: number;
  editing: boolean;
  onLiveChange: (next: TextAnnotation) => void;
  onFinish: (final: TextAnnotation) => void;
}

function TextView({
  annotation: a,
  viewport,
  scale,
  rotation,
  editing,
  onLiveChange,
  onFinish,
}: TextViewProps) {
  const box = pdfRectToViewport(viewport, a);
  const fontPx = a.fontSize * scale;
  const padding = a.background ? 4 * scale : 0;
  // Make sure the face is available on screen (no-op for standard fonts).
  React.useEffect(() => {
    void ensureFontFace(a.fontFamily);
  }, [a.fontFamily]);
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
    textDecoration: a.underline ? "underline" : "none",
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
        aria-label={tr("Texte de l'annotation")}
        className="absolute resize-none overflow-hidden rounded-none border border-primary bg-transparent outline-hidden"
        style={{
          ...style,
          userSelect: "text",
          background: a.background ? rgbToCss(a.background) : "rgba(255,255,255,0.6)",
        }}
        value={a.text}
        rows={Math.max(1, a.text.split("\n").length)}
        onChange={(e) =>
          onLiveChange(autosizeText({ ...a, text: e.target.value }, viewport, rotation))
        }
        onBlur={() => onFinish(a)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
          e.stopPropagation();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
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
  onEndpointStart,
  resizable,
}: {
  annotation: Annotation;
  viewport: ViewportLike;
  onResizeStart: (e: React.PointerEvent, handle: Corner) => void;
  onEndpointStart: (e: React.PointerEvent, which: "start" | "end") => void;
  resizable: boolean;
}) {
  const handleClass =
    "absolute size-4 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-primary bg-surface shadow-sm sm:size-3.5";
  if (annotation.type === "line") {
    const s = pdfToViewport(viewport, annotation.start);
    const e = pdfToViewport(viewport, annotation.end);
    return (
      <>
        <div
          className="absolute"
          style={{
            left: Math.min(s.x, e.x) - 6,
            top: Math.min(s.y, e.y) - 6,
            width: Math.abs(e.x - s.x) + 12,
            height: Math.abs(e.y - s.y) + 12,
            pointerEvents: "none",
          }}
          data-testid="selection-frame"
        />
        <button
          type="button"
          aria-label={tr("Déplacer le début de la ligne")}
          className={handleClass}
          style={{ left: s.x, top: s.y, cursor: "move" }}
          onPointerDown={(ev) => onEndpointStart(ev, "start")}
          data-testid="handle-start"
        />
        <button
          type="button"
          aria-label={tr("Déplacer la fin de la ligne")}
          className={handleClass}
          style={{ left: e.x, top: e.y, cursor: "move" }}
          onPointerDown={(ev) => onEndpointStart(ev, "end")}
          data-testid="handle-end"
        />
      </>
    );
  }
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
        style={{
          left: box.x - 2,
          top: box.y - 2,
          width: box.width + 4,
          height: box.height + 4,
          pointerEvents: "none",
        }}
        data-testid="selection-frame"
      />
      {resizable
        ? handles.map((h) => (
            <button
              key={h.id}
              type="button"
              aria-label={tr("Redimensionner ({handle})", { handle: h.id })}
              className={handleClass}
              style={{ left: h.x, top: h.y, cursor: h.cursor }}
              onPointerDown={(e) => onResizeStart(e, h.id)}
              data-testid={`handle-${h.id}`}
            />
          ))
        : null}
    </>
  );
}
