"use client";

import * as React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { fitScale, renderPageToCanvas, visualSize, type PageInfo } from "@/lib/pdf/browser/pdfjs";
import { cn } from "@/lib/utils";

interface PageThumbnailProps {
  doc: PDFDocumentProxy;
  page: PageInfo;
  /** Box the thumbnail must fit in (CSS px). */
  width: number;
  height: number;
  extraRotation?: number;
  className?: string;
}

/**
 * Lazily renders a page preview when it scrolls into view. Re-renders when
 * the extra rotation changes so rotate/organize previews stay truthful.
 */
export function PageThumbnail({
  doc,
  page,
  width,
  height,
  extraRotation = 0,
  className,
}: PageThumbnailProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  // Without IntersectionObserver (old browsers, tests) render immediately.
  const [visible, setVisible] = React.useState(() => typeof IntersectionObserver === "undefined");
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  React.useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    const size = visualSize(page, extraRotation);
    const scale = fitScale(size.width, size.height, width, height);
    renderPageToCanvas(doc, page.index, canvas, {
      scale,
      extraRotation,
      signal: controller.signal,
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [doc, page, width, height, extraRotation, visible]);

  return (
    <div
      ref={containerRef}
      className={cn("flex items-center justify-center overflow-hidden bg-muted", className)}
      style={{ width, height }}
      aria-hidden="true"
    >
      {failed ? (
        <span className="text-xs text-muted-foreground">—</span>
      ) : (
        <canvas ref={canvasRef} className="max-h-full max-w-full shadow-sm" />
      )}
    </div>
  );
}
