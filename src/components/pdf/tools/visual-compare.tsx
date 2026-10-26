"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openPdf, type OpenedPdf } from "@/lib/pdf/browser/pdfjs";
import {
  comparePageVisually,
  summarizeVisually,
  type PageVisualComparison,
  type VisualSummaryEntry,
} from "@/lib/pdf/browser/visual-compare";
import { formatChangedRatio } from "@/lib/pdf/operations/visual-diff";
import type { RasterLike } from "@/lib/pdf/operations/visual-diff";
import { cn } from "@/lib/utils";

interface VisualCompareProps {
  bytesA: Uint8Array;
  bytesB: Uint8Array;
  pageCount: number;
}

function Raster({
  raster,
  label,
  className,
}: {
  raster: RasterLike | null;
  label: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !raster) return;
    canvas.width = raster.width;
    canvas.height = raster.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(raster.data), raster.width, raster.height),
      0,
      0,
    );
  }, [raster]);
  return (
    <figure className={cn("min-w-0", className)}>
      <figcaption className="mb-1 text-xs font-medium text-muted-foreground">{label}</figcaption>
      {raster ? (
        <canvas
          ref={ref}
          className="h-auto w-full rounded-md border border-border bg-surface"
          aria-label={label}
        />
      ) : (
        <div className="flex aspect-[1/1.4] items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
          Page absente
        </div>
      )}
    </figure>
  );
}

/**
 * Pixel-level comparison of the two documents: one page at a time at ~1 100 px,
 * plus an optional pass over every page to list the differences.
 */
export function VisualCompare({ bytesA, bytesB, pageCount }: VisualCompareProps) {
  const [docs, setDocs] = React.useState<{ a: OpenedPdf; b: OpenedPdf } | null>(null);
  const [page, setPage] = React.useState(0);
  const [result, setResult] = React.useState<PageVisualComparison | null>(null);
  const [summary, setSummary] = React.useState<VisualSummaryEntry[] | null>(null);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // Derived: the page shown is being rendered until a result for it exists.
  const busy = docs !== null && (result === null || result.pageIndex !== page);

  React.useEffect(() => {
    let cancelled = false;
    let opened: { a: OpenedPdf; b: OpenedPdf } | null = null;
    void (async () => {
      try {
        const [a, b] = await Promise.all([openPdf(bytesA), openPdf(bytesB)]);
        opened = { a, b };
        if (cancelled) {
          void a.destroy();
          void b.destroy();
          return;
        }
        setDocs(opened);
      } catch {
        if (!cancelled) setError("Impossible d'ouvrir les documents pour la comparaison visuelle.");
      }
    })();
    return () => {
      cancelled = true;
      if (opened) {
        void opened.a.destroy();
        void opened.b.destroy();
      }
    };
  }, [bytesA, bytesB]);

  React.useEffect(() => {
    if (!docs) return;
    const controller = new AbortController();
    comparePageVisually(docs.a.doc, docs.b.doc, page, 1100, controller.signal)
      .then((r) => {
        if (!controller.signal.aborted) setResult(r);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Le rendu de cette page a échoué.");
      });
    return () => controller.abort();
  }, [docs, page]);

  const runSummary = async () => {
    if (!docs) return;
    setProgress({ done: 0, total: pageCount });
    try {
      setSummary(
        await summarizeVisually(docs.a.doc, docs.b.doc, (done, total) =>
          setProgress({ done, total }),
        ),
      );
    } finally {
      setProgress(null);
    }
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4" data-testid="visual-compare">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Page
          <select
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-surface px-2 text-sm"
            aria-label="Page comparée"
            data-testid="visual-page"
          >
            {Array.from({ length: pageCount }, (_, i) => (
              <option key={i} value={i}>
                {i + 1} / {pageCount}
              </option>
            ))}
          </select>
        </label>
        {result ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              result.changedRatio === 0
                ? "bg-success-soft text-success-foreground"
                : "bg-warning-soft text-warning-foreground",
            )}
            data-testid="visual-ratio"
          >
            {result.status === "compared"
              ? `Pixels différents : ${formatChangedRatio(result.changedRatio)}${result.sizeDiffers ? " · formats de page différents" : ""}`
              : result.status === "added"
                ? "Page ajoutée dans le document modifié"
                : "Page absente du document modifié"}
          </span>
        ) : null}
        {busy ? (
          <Loader2
            className="size-4 animate-spin text-muted-foreground"
            aria-label="Rendu en cours"
          />
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={runSummary}
          disabled={!docs || progress !== null}
          data-testid="visual-summary-run"
        >
          {progress ? `Analyse ${progress.done}/${progress.total}…` : "Analyser toutes les pages"}
        </Button>
      </div>
      {summary ? (
        <ol className="flex flex-wrap gap-1.5" data-testid="visual-summary">
          {summary.map((entry) => (
            <li key={entry.pageIndex}>
              <button
                type="button"
                onClick={() => setPage(entry.pageIndex)}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs",
                  entry.changedRatio === 0
                    ? "border-border text-muted-foreground"
                    : "border-warning/60 bg-warning-soft text-warning-foreground",
                  entry.pageIndex === page && "ring-2 ring-ring",
                )}
              >
                p. {entry.pageIndex + 1} ·{" "}
                {entry.status === "compared"
                  ? formatChangedRatio(entry.changedRatio)
                  : entry.status === "added"
                    ? "ajoutée"
                    : "absente"}
              </button>
            </li>
          ))}
        </ol>
      ) : null}
      {result ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Raster raster={result.a} label="Original" />
          <Raster raster={result.b} label="Modifié" />
          <Raster
            raster={
              result.status === "compared"
                ? { width: result.width, height: result.height, data: result.overlay }
                : null
            }
            label="Différences (en rouge)"
          />
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Rendu des deux pages à la même taille (~1 100 px) et comparaison pixel par pixel avec une
        tolérance de couleur : un décalage d&apos;un pixel ou un anticrénelage différent apparaît
        comme une différence. Les pages sont comparées par numéro.
      </p>
    </div>
  );
}
