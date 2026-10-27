"use client";

import * as React from "react";
import type { CropRect } from "@/lib/images/types";
import { tr } from "@/lib/i18n/messages";

interface CropBoxProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  crop: CropRect;
  onChange: (crop: CropRect) => void;
  ratio: number | null;
}

type Handle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/**
 * Interactive crop rectangle over an image, in image pixel coordinates.
 * Pointer events (mouse + touch), keyboard nudging, optional fixed ratio.
 */
export function CropBox({
  imageUrl,
  imageWidth,
  imageHeight,
  crop,
  onChange,
  ratio,
}: CropBoxProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const dragRef = React.useRef<{
    kind: "move" | Handle;
    start: { x: number; y: number };
    origin: CropRect;
  } | null>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? imageWidth;
      setScale(width / imageWidth);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [imageWidth]);

  const toImage = (e: React.PointerEvent) => {
    const root = (e.currentTarget as HTMLElement).closest("[data-crop-root]") as HTMLElement;
    const rect = root.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };

  const startDrag = (kind: "move" | Handle, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { kind, start: toImage(e), origin: crop };
  };

  const onMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toImage(e);
    const dx = p.x - drag.start.x;
    const dy = p.y - drag.start.y;
    const o = drag.origin;
    if (drag.kind === "move") {
      onChange({ ...o, x: o.x + dx, y: o.y + dy });
      return;
    }
    let { x, y, width, height } = o;
    const right = o.x + o.width;
    const bottom = o.y + o.height;
    if (drag.kind.includes("w")) {
      x = Math.min(o.x + dx, right - 8);
      width = right - x;
    }
    if (drag.kind.includes("e")) width = Math.max(8, o.width + dx);
    if (drag.kind.includes("n")) {
      y = Math.min(o.y + dy, bottom - 8);
      height = bottom - y;
    }
    if (drag.kind.includes("s")) height = Math.max(8, o.height + dy);
    if (ratio) {
      const horizontal = drag.kind === "e" || drag.kind === "w";
      if (horizontal || (drag.kind.length === 2 && Math.abs(dx) >= Math.abs(dy)))
        height = width / ratio;
      else width = height * ratio;
      if (drag.kind.includes("n")) y = bottom - height;
      if (drag.kind.includes("w")) x = right - width;
    }
    onChange({ x, y, width, height });
  };

  const onUp = () => {
    dragRef.current = null;
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    const map: Record<string, Partial<CropRect>> = {
      ArrowLeft: { x: crop.x - step },
      ArrowRight: { x: crop.x + step },
      ArrowUp: { y: crop.y - step },
      ArrowDown: { y: crop.y + step },
    };
    const patch = map[e.key];
    if (patch) {
      e.preventDefault();
      onChange({ ...crop, ...patch });
    }
  };

  const box = {
    left: crop.x * scale,
    top: crop.y * scale,
    width: crop.width * scale,
    height: crop.height * scale,
  };
  const handlePos: Record<Handle, React.CSSProperties> = {
    nw: { left: 0, top: 0, cursor: "nwse-resize" },
    n: { left: "50%", top: 0, cursor: "ns-resize" },
    ne: { left: "100%", top: 0, cursor: "nesw-resize" },
    e: { left: "100%", top: "50%", cursor: "ew-resize" },
    se: { left: "100%", top: "100%", cursor: "nwse-resize" },
    s: { left: "50%", top: "100%", cursor: "ns-resize" },
    sw: { left: 0, top: "100%", cursor: "nesw-resize" },
    w: { left: 0, top: "50%", cursor: "ew-resize" },
  };

  return (
    <div
      ref={containerRef}
      data-crop-root
      className="relative mx-auto w-full max-w-3xl select-none overflow-hidden rounded-[6px] bg-muted checkerboard"
      style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      data-testid="crop-box"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview */}
      <img
        src={imageUrl}
        alt={tr("Image à recadrer")}
        className="block h-full w-full"
        draggable={false}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-black/45"
        style={{
          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${box.top}px, ${box.left}px ${box.top}px, ${box.left}px ${box.top + box.height}px, ${box.left + box.width}px ${box.top + box.height}px, ${box.left + box.width}px ${box.top}px, 0 ${box.top}px)`,
        }}
      />
      <div
        role="application"
        aria-label={tr(
          "Zone de recadrage : {width} × {height} pixels. Utilisez les flèches pour déplacer.",
          { width: Math.round(crop.width), height: Math.round(crop.height) },
        )}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={(e) => startDrag("move", e)}
        className="absolute cursor-move border-2 border-primary shadow-[0_0_0_1px_rgba(255,255,255,.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        style={{ ...box, touchAction: "none" }}
      >
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40 [&>div]:border-white/70 [&>div]:border-r [&>div]:border-b [&>div:nth-child(3n)]:border-r-0 [&>div:nth-child(n+7)]:border-b-0">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} />
          ))}
        </div>
        {HANDLES.map((h) => (
          <button
            key={h}
            type="button"
            aria-label={tr("Redimensionner ({handle})", { handle: h })}
            onPointerDown={(e) => startDrag(h, e)}
            className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-white shadow-sm sm:size-4"
            style={{ ...handlePos[h], touchAction: "none" }}
          />
        ))}
      </div>
    </div>
  );
}
