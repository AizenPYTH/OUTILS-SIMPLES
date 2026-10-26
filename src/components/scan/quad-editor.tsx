"use client";

import * as React from "react";
import type { Point, Quad } from "@/lib/scan/geometry";

interface QuadEditorProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  quad: Quad;
  onChange: (quad: Quad) => void;
}

const LABELS = ["haut gauche", "haut droit", "bas droit", "bas gauche"];

/**
 * Four draggable corners over an image (pointer + keyboard), in image pixel
 * coordinates. The polygon and a dimmed outside area give immediate feedback.
 */
export function QuadEditor({ imageUrl, imageWidth, imageHeight, quad, onChange }: QuadEditorProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const dragRef = React.useRef<{ index: number; offset: Point } | null>(null);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? imageWidth;
      setScale(width / imageWidth);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [imageWidth]);

  const toImage = (e: React.PointerEvent): Point => {
    const rect = rootRef.current!.getBoundingClientRect();
    return {
      x: clamp((e.clientX - rect.left) / scale, 0, imageWidth),
      y: clamp((e.clientY - rect.top) / scale, 0, imageHeight),
    };
  };

  const startDrag = (index: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = toImage(e);
    dragRef.current = { index, offset: { x: quad[index]!.x - p.x, y: quad[index]!.y - p.y } };
  };

  const onMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toImage(e);
    const next = quad.map((pt, i) =>
      i === drag.index
        ? {
            x: clamp(p.x + drag.offset.x, 0, imageWidth),
            y: clamp(p.y + drag.offset.y, 0, imageHeight),
          }
        : pt,
    ) as Quad;
    onChange(next);
  };

  const onUp = () => {
    dragRef.current = null;
  };

  const onKey = (index: number, e: React.KeyboardEvent) => {
    const step = (e.shiftKey ? 10 : 1) / scale;
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    onChange(
      quad.map((pt, i) =>
        i === index
          ? { x: clamp(pt.x + d.x, 0, imageWidth), y: clamp(pt.y + d.y, 0, imageHeight) }
          : pt,
      ) as Quad,
    );
  };

  const points = quad.map((p) => `${p.x * scale},${p.y * scale}`).join(" ");

  return (
    <div
      ref={rootRef}
      className="relative mx-auto w-full max-w-3xl select-none overflow-hidden rounded-[6px] bg-muted"
      style={{ aspectRatio: `${imageWidth} / ${imageHeight}`, touchAction: "none" }}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      data-testid="quad-editor"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview */}
      <img
        src={imageUrl}
        alt="Document à redresser"
        className="block h-full w-full"
        draggable={false}
      />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <mask id="quad-mask">
            <rect width="100%" height="100%" fill="white" />
            <polygon points={points} fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.45)" mask="url(#quad-mask)" />
        <polygon
          points={points}
          fill="none"
          stroke="var(--color-primary, #5146e5)"
          strokeWidth={2}
        />
        <line
          x1={quad[0]!.x * scale}
          y1={quad[0]!.y * scale}
          x2={quad[2]!.x * scale}
          y2={quad[2]!.y * scale}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <line
          x1={quad[1]!.x * scale}
          y1={quad[1]!.y * scale}
          x2={quad[3]!.x * scale}
          y2={quad[3]!.y * scale}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      </svg>
      {quad.map((p, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Coin ${LABELS[i]} : ${Math.round(p.x)}, ${Math.round(p.y)}. Flèches pour déplacer.`}
          onPointerDown={(e) => startDrag(i, e)}
          onKeyDown={(e) => onKey(i, e)}
          className="absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-primary bg-white/90 shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:size-7"
          style={{ left: p.x * scale, top: p.y * scale, touchAction: "none", cursor: "grab" }}
          data-testid={`quad-corner-${i}`}
        />
      ))}
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
