"use client";

import * as React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { EyeOff, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { renderPageToCanvas, visualSize } from "@/lib/pdf/browser/pdfjs";
import {
  normalizeRect,
  padRect,
  replacePagesWithImages,
  type RasterizedPage,
  type RedactionRect,
} from "@/lib/pdf/operations/redact";
import { encodeCanvas, releaseCanvas } from "@/lib/images/canvas";
import { formatBytes } from "@/lib/files/format";
import { uid } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { tr } from "@/lib/i18n/messages";

const TOOL_ID = "pdf-redact";
const PREVIEW_MAX_WIDTH = 760;

interface Box extends RedactionRect {
  id: string;
}

/** Rectangles are stored in visual points (scale 1, rotation applied, origin top-left). */
type Boxes = Record<number, Box[]>;

export function RedactTool() {
  return (
    <SingleFileTool toolId={TOOL_ID}>
      {({ pdf, reset }) => <Workspace pdf={pdf} reset={reset} />}
    </SingleFileTool>
  );
}

function Workspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [boxes, setBoxes] = React.useState<Boxes>({});
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [dpi, setDpi] = React.useState<"150" | "200" | "300">("200");
  const [quality, setQuality] = React.useState<"image/jpeg" | "image/png">("image/jpeg");
  const op = useOperation<Uint8Array>(TOOL_ID);

  const total = Object.values(boxes).reduce((s, list) => s + list.length, 0);
  const pagesTouched = Object.values(boxes).filter((l) => l.length > 0).length;

  const addBox = (pageIndex: number, rect: RedactionRect) =>
    setBoxes((b) => ({
      ...b,
      [pageIndex]: [...(b[pageIndex] ?? []), { ...rect, id: uid("box") }],
    }));
  const removeBox = (pageIndex: number, id: string) =>
    setBoxes((b) => ({ ...b, [pageIndex]: (b[pageIndex] ?? []).filter((x) => x.id !== id) }));

  const search = async () => {
    const needle = normalize(query);
    if (!needle) return;
    setSearching(true);
    try {
      const found = await findTextRects(pdf.opened.doc, pdf.pageCount, needle);
      if (found.length === 0)
        toast.info(tr("Aucune occurrence trouvée dans le texte du document."));
      else {
        setBoxes((b) => {
          const next = { ...b };
          for (const hit of found) {
            const page = pdf.pages[hit.pageIndex]!;
            const size = visualSize(page);
            next[hit.pageIndex] = [
              ...(next[hit.pageIndex] ?? []),
              { ...padRect(hit.rect, 1.5, size), id: uid("box") },
            ];
          }
          return next;
        });
        toast.success(
          tr("{hits} occurrence(s) marquée(s) sur {pages} page(s).", {
            hits: found.length,
            pages: new Set(found.map((f) => f.pageIndex)).size,
          }),
        );
      }
    } catch {
      toast.error(tr("Recherche impossible dans ce document."));
    } finally {
      setSearching(false);
    }
  };

  const run = () =>
    void op.run(async (report) => {
      const scale = Number(dpi) / 72;
      const rasterized: RasterizedPage[] = [];
      const touched = Object.entries(boxes).filter(([, list]) => list.length > 0);
      for (let i = 0; i < touched.length; i += 1) {
        const [key, list] = touched[i]!;
        const pageIndex = Number(key);
        report({
          current: i + 1,
          total: touched.length,
          label: t.progress.processingPage(i + 1, touched.length),
        });
        const page = pdf.pages[pageIndex]!;
        const size = visualSize(page);
        const px = size.width * scale * size.height * scale;
        const effective = px > 25_000_000 ? scale * Math.sqrt(25_000_000 / px) : scale;
        const canvas = document.createElement("canvas");
        const { viewport } = await renderPageToCanvas(pdf.opened.doc, pageIndex, canvas, {
          scale: effective,
        });
        const factor = canvas.width / viewport.width;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#000000";
        for (const box of list)
          ctx.fillRect(
            Math.floor(box.x * effective * factor),
            Math.floor(box.y * effective * factor),
            Math.ceil(box.width * effective * factor),
            Math.ceil(box.height * effective * factor),
          );
        const encoded = await encodeCanvas(canvas, quality, 0.85);
        releaseCanvas(canvas);
        rasterized.push({
          pageIndex,
          bytes: new Uint8Array(await encoded.blob.arrayBuffer()),
          mimeType: quality,
        });
        await new Promise((r) => setTimeout(r, 0));
      }
      report({
        current: touched.length,
        total: touched.length,
        label: tr("Reconstruction du PDF…"),
      });
      return replacePagesWithImages(pdf.bytes, rasterized);
    });

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const bytes = op.state.result;
    return (
      <DonePanel
        title={tr("PDF caviardé")}
        summary={tr("{zones} zone(s) sur {pages} page(s) · {size} · métadonnées supprimées", {
          zones: total,
          pages: pagesTouched,
          size: formatBytes(bytes.byteLength),
        })}
        onDownload={() => downloadPdf(bytes, pdf.file.name, "caviarde", TOOL_ID)}
        onStartOver={() => (op.reset(), reset())}
      >
        <Alert variant="info">
          {tr(
            "Les pages caviardées ont été converties en images : leur texte d'origine n'existe plus dans le fichier (il n'est plus sélectionnable ni recherchable). Les autres pages sont inchangées. Ouvrez le résultat et vérifiez chaque zone avant de le partager.",
          )}
        </Alert>
      </DonePanel>
    );
  }

  return (
    <div className="space-y-5">
      <FileSummary
        name={pdf.file.name}
        size={pdf.file.size}
        pageCount={pdf.pageCount}
        onReset={reset}
      />
      <ToolPanel className="space-y-3">
        <Label htmlFor="redact-search" className="flex items-center gap-2">
          <Search className="size-4" aria-hidden="true" />{" "}
          {tr("Marquer automatiquement un mot, un nom ou un numéro")}
        </Label>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <Input
            id="redact-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("ex. Dupont, 1 85 03 75 123 456 78, IBAN")}
            data-testid="redact-search"
          />
          <Button
            type="submit"
            variant="outline"
            loading={searching}
            disabled={!query.trim()}
            data-testid="redact-search-run"
          >
            {tr("Rechercher et marquer")}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          {tr(
            "Dessinez aussi des rectangles directement sur les pages (souris ou doigt). Un clic sur une zone la supprime. Les documents scannés n'ont pas de texte : dessinez les zones à la main.",
          )}
        </p>
      </ToolPanel>
      <ol className="space-y-6" aria-label={tr("Pages du document")} data-testid="redact-pages">
        {pdf.pages.map((page) => (
          <RedactPage
            key={page.index}
            doc={pdf.opened.doc}
            pageIndex={page.index}
            size={visualSize(page)}
            boxes={boxes[page.index] ?? []}
            onAdd={(rect) => addBox(page.index, rect)}
            onRemove={(id) => removeBox(page.index, id)}
          />
        ))}
      </ol>
      <ToolPanel className="space-y-4">
        <Segmented
          label={tr("Qualité des pages caviardées")}
          value={dpi}
          onChange={setDpi}
          options={[
            { value: "150", label: "150 dpi", description: tr("Léger") },
            { value: "200", label: "200 dpi", description: tr("Lecture et impression") },
            { value: "300", label: "300 dpi", description: tr("Impression fine, plus lourd") },
          ]}
        />
        <Segmented
          label={tr("Encodage")}
          value={quality}
          onChange={setQuality}
          className="sm:grid-cols-2"
          options={[
            { value: "image/jpeg", label: "JPEG", description: tr("Fichier plus léger") },
            {
              value: "image/png",
              label: "PNG",
              description: tr("Texte très net, fichier plus lourd"),
            },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" data-testid="redact-summary">
            {total === 0
              ? tr("Aucune zone marquée.")
              : tr("{zones} zone(s) sur {pages} page(s).", { zones: total, pages: pagesTouched })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setBoxes({})}
              disabled={total === 0}
            >
              <Trash2 aria-hidden="true" /> {tr("Tout effacer")}
            </Button>
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              onClick={run}
              disabled={total === 0}
              data-testid="redact-run"
            >
              <EyeOff aria-hidden="true" /> {tr("Caviarder et créer le PDF")}
            </Button>
          </div>
        </div>
      </ToolPanel>
    </div>
  );
}

interface RedactPageProps {
  doc: PDFDocumentProxy;
  pageIndex: number;
  size: { width: number; height: number };
  boxes: Box[];
  onAdd: (rect: RedactionRect) => void;
  onRemove: (id: string) => void;
}

function RedactPage({ doc, pageIndex, size, boxes, onAdd, onRemove }: RedactPageProps) {
  const wrapperRef = React.useRef<HTMLLIElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = React.useState(false);
  const [scale, setScale] = React.useState(1);
  const [draft, setDraft] = React.useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const draftRef = React.useRef<typeof draft>(null);

  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && setVisible(true),
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    const ro = new ResizeObserver((entries) => {
      const width = Math.min(entries[0]?.contentRect.width ?? PREVIEW_MAX_WIDTH, PREVIEW_MAX_WIDTH);
      setScale(Math.max(0.2, width / size.width));
    });
    ro.observe(el);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, [size.width]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!visible || !canvas) return;
    const controller = new AbortController();
    void renderPageToCanvas(doc, pageIndex, canvas, { scale, signal: controller.signal }).catch(
      () => undefined,
    );
    return () => controller.abort();
  }, [doc, pageIndex, scale, visible]);

  const toPoints = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: Math.min(size.width, Math.max(0, (e.clientX - rect.left) / scale)),
      y: Math.min(size.height, Math.max(0, (e.clientY - rect.top) / scale)),
    };
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = toPoints(e);
    const next = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    draftRef.current = next;
    setDraft(next);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!draftRef.current) return;
    const p = toPoints(e);
    const next = { ...draftRef.current, x2: p.x, y2: p.y };
    draftRef.current = next;
    setDraft(next);
  };
  const onUp = () => {
    const d = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    if (!d) return;
    const rect = normalizeRect(d.x1, d.y1, d.x2, d.y2, 3);
    if (rect) onAdd(rect);
  };

  const cssWidth = size.width * scale;
  const cssHeight = size.height * scale;

  return (
    <li ref={wrapperRef} className="space-y-1.5" data-testid="redact-page">
      <p className="text-sm font-medium">
        {tr("Page {n}", { n: pageIndex + 1 })}{" "}
        {boxes.length ? (
          <span className="text-xs font-normal text-muted-foreground">
            · {tr("{n} zone(s)", { n: boxes.length })}
          </span>
        ) : null}
      </p>
      <div
        className="relative mx-auto select-none overflow-hidden rounded-[6px] border border-border bg-white shadow-sm"
        style={{ width: cssWidth, height: cssHeight, touchAction: "none", cursor: "crosshair" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        data-testid="redact-surface"
      >
        <canvas
          ref={canvasRef}
          className="block"
          aria-label={tr("Aperçu de la page {n}", { n: pageIndex + 1 })}
        />
        {boxes.map((box) => (
          <button
            key={box.id}
            type="button"
            aria-label={tr("Supprimer la zone caviardée {w}×{h} points", {
              w: Math.round(box.width),
              h: Math.round(box.height),
            })}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRemove(box.id)}
            className="group absolute bg-black outline-2 outline-offset-0 outline-transparent hover:outline-destructive focus-visible:outline-primary"
            style={{
              left: box.x * scale,
              top: box.y * scale,
              width: Math.max(4, box.width * scale),
              height: Math.max(4, box.height * scale),
            }}
            data-testid="redact-rect"
          >
            <X
              className="absolute right-0 top-0 size-3 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden="true"
            />
          </button>
        ))}
        {draft ? (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-destructive bg-black/60"
            style={{
              left: Math.min(draft.x1, draft.x2) * scale,
              top: Math.min(draft.y1, draft.y2) * scale,
              width: Math.abs(draft.x2 - draft.x1) * scale,
              height: Math.abs(draft.y2 - draft.y1) * scale,
            }}
          />
        ) : null}
      </div>
    </li>
  );
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

interface TextHit {
  pageIndex: number;
  rect: RedactionRect;
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/** Applies pdf.js' viewport matrix [a b c d e f] to a user-space point. */
function toViewport(matrix: number[], x: number, y: number): { x: number; y: number } {
  return {
    x: matrix[0]! * x + matrix[2]! * y + matrix[4]!,
    y: matrix[1]! * x + matrix[3]! * y + matrix[5]!,
  };
}

/**
 * Finds every occurrence of `needle` in the page text and returns the
 * bounding boxes of the text items covering it (in visual points).
 */
async function findTextRects(
  doc: PDFDocumentProxy,
  pageCount: number,
  needle: string,
): Promise<TextHit[]> {
  const hits: TextHit[] = [];
  for (let i = 0; i < pageCount; i += 1) {
    const page = await doc.getPage(i + 1);
    const viewport = page.getViewport({ scale: 1, rotation: page.rotate });
    const content = await page.getTextContent();
    const items = content.items.filter(
      (it) => "str" in it && typeof (it as { str: unknown }).str === "string",
    ) as unknown as PdfTextItem[];
    // Group into lines by baseline so that matches spanning several items are found.
    const lines: { y: number; items: typeof items }[] = [];
    for (const item of items) {
      const y = item.transform[5] ?? 0;
      const h = Math.abs(item.transform[3] ?? item.height) || item.height || 10;
      const line = lines.find((l) => Math.abs(l.y - y) <= Math.max(2, h * 0.5));
      if (line) line.items.push(item);
      else lines.push({ y, items: [item] });
    }
    for (const line of lines) {
      line.items.sort((a, b) => (a.transform[4] ?? 0) - (b.transform[4] ?? 0));
      let text = "";
      const spans: { start: number; end: number; item: (typeof items)[number] }[] = [];
      for (const item of line.items) {
        const start = text.length;
        text += normalize(item.str) + " ";
        spans.push({ start, end: text.length - 1, item });
      }
      let from = 0;
      while (true) {
        const index = text.indexOf(needle, from);
        if (index === -1) break;
        const end = index + needle.length;
        for (const span of spans) {
          if (span.end <= index || span.start >= end) continue;
          const { item } = span;
          const x = item.transform[4] ?? 0;
          const y = item.transform[5] ?? 0;
          const h = Math.abs(item.transform[3] ?? item.height) || item.height;
          const p1 = toViewport(viewport.transform, x, y - h * 0.25);
          const p2 = toViewport(viewport.transform, x + item.width, y + h);
          hits.push({
            pageIndex: i,
            rect: {
              x: Math.min(p1.x, p2.x),
              y: Math.min(p1.y, p2.y),
              width: Math.abs(p2.x - p1.x),
              height: Math.abs(p2.y - p1.y),
            },
          });
        }
        from = end;
      }
    }
    page.cleanup();
  }
  return hits;
}
