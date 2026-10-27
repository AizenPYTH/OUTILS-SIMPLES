"use client";

import * as React from "react";
import { previewCanvas } from "@/lib/scan/page-pipeline";
import { tr } from "@/lib/i18n/messages";
import type { ScanPage } from "./scanner-tool";

/** Renders the page with its current settings (debounced) into a canvas. */
export function ScanPagePreview({
  page,
  thumbnail = false,
}: {
  page: ScanPage;
  thumbnail?: boolean;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = React.useState(false);
  const settingsKey = JSON.stringify(page.settings);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    setBusy(true);
    const timer = window.setTimeout(
      () => {
        try {
          const rendered = previewCanvas(page.bitmap, page.settings, thumbnail ? 220 : 1100);
          if (cancelled) return;
          canvas.width = rendered.width;
          canvas.height = rendered.height;
          canvas.getContext("2d")?.drawImage(rendered, 0, 0);
          rendered.width = 0;
          rendered.height = 0;
        } finally {
          if (!cancelled) setBusy(false);
        }
      },
      thumbnail ? 60 : 120,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [page.bitmap, settingsKey, thumbnail, page.settings]);

  if (thumbnail)
    return (
      <canvas ref={canvasRef} className="aspect-[3/4] w-full object-contain" aria-hidden="true" />
    );
  return (
    <div
      className="relative flex min-h-[320px] items-center justify-center rounded-[12px] border border-border bg-muted/60 p-2"
      data-testid="scan-preview"
      aria-busy={busy}
    >
      <canvas
        ref={canvasRef}
        className="max-h-[70vh] max-w-full rounded-[4px] shadow-md"
        aria-label={tr("Aperçu de la page scannée")}
      />
    </div>
  );
}
