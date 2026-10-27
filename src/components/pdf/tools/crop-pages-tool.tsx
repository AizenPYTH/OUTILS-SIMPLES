"use client";

import * as React from "react";
import { Crop } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { PageRangeInput } from "@/components/pdf/shared/page-range-input";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { fitScale, renderPageToCanvas, visualSize } from "@/lib/pdf/browser/pdfjs";
import { cropPages, uncropPages, type CropMargins } from "@/lib/pdf/operations/crop";
import type { ParsedRanges } from "@/lib/pdf/page-ranges";
import { formatBytes } from "@/lib/files/format";
import { t } from "@/lib/i18n";
import { tr } from "@/lib/i18n/messages";

const TOOL_ID = "pdf-crop";
const MM = 72 / 25.4;

export function CropPagesTool() {
  return (
    <SingleFileTool toolId={TOOL_ID}>
      {({ pdf, reset }) => <Workspace pdf={pdf} reset={reset} />}
    </SingleFileTool>
  );
}

function Workspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [mm, setMm] = React.useState<CropMargins>({ top: 10, right: 10, bottom: 10, left: 10 });
  const [pageMode, setPageMode] = React.useState<"all" | "range">("all");
  const [rangeText, setRangeText] = React.useState("");
  const [range, setRange] = React.useState<ParsedRanges | null>(null);
  const [previewPage, setPreviewPage] = React.useState(0);
  const op = useOperation<Uint8Array>(TOOL_ID);
  const margins: CropMargins = {
    top: mm.top * MM,
    right: mm.right * MM,
    bottom: mm.bottom * MM,
    left: mm.left * MM,
  };
  const indices = pageMode === "all" ? [] : (range?.indices ?? []);

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const bytes = op.state.result;
    return (
      <DonePanel
        summary={formatBytes(bytes.byteLength)}
        onDownload={() => downloadPdf(bytes, pdf.file.name, "recadre", TOOL_ID)}
        onStartOver={() => (op.reset(), reset())}
      />
    );
  }

  const field = (key: keyof CropMargins, label: string) => (
    <div className="space-y-1">
      <Label htmlFor={`crop-${key}`}>{label} (mm)</Label>
      <Input
        id={`crop-${key}`}
        type="number"
        min={0}
        max={200}
        step={1}
        value={mm[key]}
        onChange={(e) => setMm((m) => ({ ...m, [key]: Math.max(0, Number(e.target.value) || 0) }))}
        className="w-24"
        data-testid={`crop-${key}`}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <FileSummary
        name={pdf.file.name}
        size={pdf.file.size}
        pageCount={pdf.pageCount}
        onReset={reset}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {field("top", tr("Haut"))}
            {field("bottom", tr("Bas"))}
            {field("left", tr("Gauche"))}
            {field("right", tr("Droite"))}
          </div>
          <Segmented
            label={tr("Pages")}
            value={pageMode}
            onChange={setPageMode}
            className="sm:grid-cols-2"
            options={[
              {
                value: "all",
                label: tr("Toutes les pages"),
                description: tr("{n} pages", { n: pdf.pageCount }),
              },
              { value: "range", label: tr("Pages choisies"), description: tr("ex. 1-3, 5") },
            ]}
          />
          {pageMode === "range" ? (
            <PageRangeInput
              pageCount={pdf.pageCount}
              value={rangeText}
              onChange={(v, parsed) => (
                setRangeText(v),
                setRange(parsed),
                parsed?.indices[0] !== undefined && setPreviewPage(parsed.indices[0])
              )}
            />
          ) : null}
          <Alert variant="info">
            {tr(
              "Le recadrage définit la zone visible et imprimée (CropBox) sans supprimer le contenu masqué : il reste présent dans le fichier et peut être rétabli. Pour supprimer réellement une zone, utilisez le caviardage.",
            )}
          </Alert>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              size="lg"
              className="flex-1"
              onClick={() => void op.run(() => cropPages(pdf.bytes, margins, indices))}
              disabled={pageMode === "range" && indices.length === 0}
              data-testid="crop-run"
            >
              <Crop aria-hidden="true" /> {tr("Recadrer")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => void op.run(() => uncropPages(pdf.bytes))}
            >
              {tr("Rétablir la page entière")}
            </Button>
          </div>
        </div>
        <aside className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {tr("Aperçu")} · {t.common.pageOf(previewPage + 1, pdf.pageCount)}
            </p>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={previewPage === 0}
                onClick={() => setPreviewPage((p) => p - 1)}
              >
                {t.common.previous}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={previewPage >= pdf.pageCount - 1}
                onClick={() => setPreviewPage((p) => p + 1)}
              >
                {t.common.next}
              </Button>
            </div>
          </div>
          <CropPreview
            pdf={pdf}
            pageIndex={previewPage}
            margins={margins}
            applies={pageMode === "all" || indices.includes(previewPage)}
          />
        </aside>
      </div>
    </div>
  );
}

function CropPreview({
  pdf,
  pageIndex,
  margins,
  applies,
}: {
  pdf: LoadedPdf;
  pageIndex: number;
  margins: CropMargins;
  applies: boolean;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = React.useState(1);
  const page = pdf.pages[pageIndex] ?? pdf.pages[0]!;
  const size = visualSize(page);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    const s = fitScale(size.width, size.height, 300, 420);
    setScale(s);
    renderPageToCanvas(pdf.opened.doc, page.index, canvas, {
      scale: s,
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [pdf.opened.doc, page, size.width, size.height]);
  return (
    <div
      className="relative inline-block overflow-hidden rounded-[6px] border border-border bg-muted"
      data-testid="crop-preview"
    >
      <canvas ref={canvasRef} aria-label={tr("Aperçu de la page recadrée")} />
      {applies ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div
            className="absolute border-2 border-primary shadow-[0_0_0_9999px_rgba(13,15,27,.45)]"
            style={{
              left: margins.left * scale,
              top: margins.top * scale,
              right: margins.right * scale,
              bottom: margins.bottom * scale,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
