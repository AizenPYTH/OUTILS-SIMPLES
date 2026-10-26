"use client";

import * as React from "react";
import { Download, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { PageRangeInput } from "@/components/pdf/shared/page-range-input";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { downloadZip } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { renderPageToCanvas, visualSize } from "@/lib/pdf/browser/pdfjs";
import { buildZip } from "@/lib/pdf/browser/zip";
import { encodeCanvas, releaseCanvas } from "@/lib/images/canvas";
import { outputExtensions, type ImageOutputFormat } from "@/lib/images/types";
import { stripExtension } from "@/lib/files/filename";
import { triggerDownload } from "@/lib/files/download";
import { formatBytes } from "@/lib/files/format";
import type { ParsedRanges } from "@/lib/pdf/page-ranges";
import { t } from "@/lib/i18n";

const TOOL_ID = "pdf-to-images";
type Dpi = "72" | "150" | "300";

interface RenderedPage {
  pageIndex: number;
  blob: Blob;
  name: string;
  url: string;
  width: number;
  height: number;
}

export function PdfToImagesTool() {
  return (
    <SingleFileTool toolId={TOOL_ID}>
      {({ pdf, reset }) => <Workspace pdf={pdf} reset={reset} />}
    </SingleFileTool>
  );
}

function Workspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [format, setFormat] = React.useState<ImageOutputFormat>("image/jpeg");
  const [dpi, setDpi] = React.useState<Dpi>("150");
  const [quality, setQuality] = React.useState(0.9);
  const [pageMode, setPageMode] = React.useState<"all" | "range">("all");
  const [rangeText, setRangeText] = React.useState("");
  const [range, setRange] = React.useState<ParsedRanges | null>(null);
  const op = useOperation<RenderedPage[]>(TOOL_ID);
  const resultsRef = React.useRef<RenderedPage[]>([]);

  React.useEffect(() => () => resultsRef.current.forEach((r) => URL.revokeObjectURL(r.url)), []);

  const indices = pageMode === "all" ? pdf.pages.map((p) => p.index) : (range?.indices ?? []);
  const base = stripExtension(pdf.file.name);

  const run = () =>
    void op.run(async (report) => {
      resultsRef.current.forEach((r) => URL.revokeObjectURL(r.url));
      const out: RenderedPage[] = [];
      const scale = Number(dpi) / 72;
      for (let i = 0; i < indices.length; i += 1) {
        const index = indices[i]!;
        report({
          current: i + 1,
          total: indices.length,
          label: t.progress.processingPage(i + 1, indices.length),
        });
        const page = pdf.pages[index]!;
        const size = visualSize(page);
        // Cap very large renders to protect memory (≈ 25 Mpx).
        const maxPixels = 25_000_000;
        const px = size.width * scale * size.height * scale;
        const effective = px > maxPixels ? scale * Math.sqrt(maxPixels / px) : scale;
        const canvas = document.createElement("canvas");
        await renderPageToCanvas(pdf.opened.doc, index, canvas, { scale: effective });
        // renderPageToCanvas applies devicePixelRatio; we want exact DPI → re-draw at target size.
        const target = document.createElement("canvas");
        target.width = Math.round(size.width * effective);
        target.height = Math.round(size.height * effective);
        const ctx = target.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, target.width, target.height);
        ctx.drawImage(canvas, 0, 0, target.width, target.height);
        releaseCanvas(canvas);
        const encoded = await encodeCanvas(target, format, quality);
        releaseCanvas(target);
        out.push({
          pageIndex: index,
          blob: encoded.blob,
          name: `${base}-page-${index + 1}.${outputExtensions[format]}`,
          url: URL.createObjectURL(encoded.blob),
          width: target.width,
          height: target.height,
        });
        await new Promise((r) => setTimeout(r, 0));
      }
      resultsRef.current = out;
      return out;
    });

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const results = op.state.result;
    const total = results.reduce((s, r) => s + r.blob.size, 0);
    return (
      <DonePanel
        title={results.length === 1 ? "Votre image est prête" : `${results.length} images prêtes`}
        summary={`${outputExtensions[format].toUpperCase()} · ${dpi} dpi · ${formatBytes(total)}`}
        onDownload={
          results.length === 1
            ? () => triggerDownload(results[0]!.blob, results[0]!.name)
            : () =>
                void Promise.all(
                  results.map(async (r) => ({
                    name: r.name,
                    bytes: new Uint8Array(await r.blob.arrayBuffer()),
                  })),
                ).then((entries) => downloadZip(buildZip(entries), base, "images", TOOL_ID))
        }
        downloadLabel={results.length === 1 ? "Télécharger l'image" : t.common.downloadAllZip}
        onStartOver={() => {
          op.reset();
          reset();
        }}
      >
        <ul
          className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]"
          data-testid="pdf-images-results"
        >
          {results.map((r) => (
            <li key={r.pageIndex} className="flex flex-col items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview */}
              <img
                src={r.url}
                alt={`Page ${r.pageIndex + 1}`}
                className="max-h-40 rounded-[6px] border border-border"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => triggerDownload(r.blob, r.name)}
              >
                <Download aria-hidden="true" /> p. {r.pageIndex + 1}
              </Button>
            </li>
          ))}
        </ul>
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
      <Segmented
        label="Format"
        value={format}
        onChange={setFormat}
        options={[
          { value: "image/jpeg", label: "JPG", description: "Photos, léger" },
          { value: "image/png", label: "PNG", description: "Sans perte, texte net" },
          { value: "image/webp", label: "WebP", description: "Léger, moderne" },
        ]}
      />
      <Segmented
        label="Résolution"
        value={dpi}
        onChange={setDpi}
        options={[
          { value: "72", label: "72 dpi", description: "Aperçu web" },
          { value: "150", label: "150 dpi", description: "Lecture confortable" },
          { value: "300", label: "300 dpi", description: "Impression" },
        ]}
      />
      {format !== "image/png" ? (
        <div className="max-w-sm space-y-1">
          <Label htmlFor="p2i-quality">Qualité ({Math.round(quality * 100)} %)</Label>
          <input
            id="p2i-quality"
            type="range"
            min={50}
            max={100}
            value={Math.round(quality * 100)}
            onChange={(e) => setQuality(Number(e.target.value) / 100)}
            className="w-full accent-primary"
          />
        </div>
      ) : null}
      <Segmented
        label="Pages"
        value={pageMode}
        onChange={setPageMode}
        className="sm:grid-cols-2"
        options={[
          { value: "all", label: "Toutes les pages", description: `${pdf.pageCount} image(s)` },
          { value: "range", label: "Pages choisies", description: "ex. 1-3, 5" },
        ]}
      />
      {pageMode === "range" ? (
        <PageRangeInput
          pageCount={pdf.pageCount}
          value={rangeText}
          onChange={(v, parsed) => (setRangeText(v), setRange(parsed))}
        />
      ) : null}
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={run}
        disabled={indices.length === 0}
        data-testid="pdf-to-images-run"
      >
        <Images aria-hidden="true" /> Convertir {indices.length} page(s) en images
      </Button>
    </div>
  );
}
