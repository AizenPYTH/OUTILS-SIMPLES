"use client";

import * as React from "react";
import { Download, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { PageRangeInput } from "@/components/pdf/shared/page-range-input";
import { PageThumbnail } from "@/components/pdf/shared/page-thumbnail";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { downloadPdf, downloadZip } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { buildZip } from "@/lib/pdf/browser/zip";
import { formatBytes } from "@/lib/files/format";
import { deriveOutputName, stripExtension } from "@/lib/files/filename";
import { chunkRanges, formatPageIndices, type PageRange, type ParsedRanges } from "@/lib/pdf/page-ranges";
import { splitPdf, type SplitMode, type SplitOutput } from "@/lib/pdf/operations/pages";
import { t } from "@/lib/i18n";

const TOOL_ID = "pdf-split";
type Strategy = "custom" | "every-n" | "each-page";

export function SplitTool() {
  return <SingleFileTool toolId={TOOL_ID}>{({ pdf, reset }) => <SplitWorkspace pdf={pdf} reset={reset} />}</SingleFileTool>;
}

function SplitWorkspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [strategy, setStrategy] = React.useState<Strategy>("custom");
  const [rangeText, setRangeText] = React.useState("");
  const [parsed, setParsed] = React.useState<ParsedRanges | null>(null);
  const [rangeError, setRangeError] = React.useState<string | null>(null);
  const [chunk, setChunk] = React.useState(2);
  const [mode, setMode] = React.useState<SplitMode>("one-file-per-range");
  const op = useOperation<SplitOutput[]>(TOOL_ID);

  const ranges: PageRange[] = React.useMemo(() => {
    if (strategy === "each-page") return chunkRanges(pdf.pageCount, 1);
    if (strategy === "every-n") return chunkRanges(pdf.pageCount, Math.max(1, Math.min(pdf.pageCount, chunk)));
    return parsed?.ranges ?? [];
  }, [strategy, parsed, chunk, pdf.pageCount]);

  const effectiveMode: SplitMode = strategy === "custom" ? mode : "one-file-per-range";
  const canRun = ranges.length > 0 && !rangeError;

  const run = () => void op.run((report) => splitPdf(pdf.bytes, ranges, effectiveMode, report));

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error") return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const outputs = op.state.result;
    const base = stripExtension(pdf.file.name);
    const names = outputs.map((o, i) =>
      o.range ? deriveOutputName(pdf.file.name, `pages-${o.range.from}-${o.range.to}`) : deriveOutputName(pdf.file.name, `extrait-${i + 1}`),
    );
    return (
      <DonePanel
        title={outputs.length === 1 ? t.result.title : t.result.titleMultiple(outputs.length)}
        onDownload={outputs.length === 1 ? () => downloadPdf(outputs[0]!.bytes, pdf.file.name, outputs[0]!.range ? `pages-${outputs[0]!.range.from}-${outputs[0]!.range.to}` : "extrait", TOOL_ID) : undefined}
        onStartOver={() => {
          op.reset();
          reset();
        }}
      >
        {outputs.length > 1 ? (
          <div className="space-y-3">
            <ul className="divide-y divide-border rounded-[14px] border border-border" data-testid="split-results">
              {outputs.map((o, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{names[i]}</span>
                    <span className="text-muted-foreground"> · {t.result.pages(o.indices.length)} · {formatBytes(o.bytes.byteLength)}</span>
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={() => downloadPdf(o.bytes, pdf.file.name, o.range ? `pages-${o.range.from}-${o.range.to}` : `extrait-${i + 1}`, TOOL_ID)}>
                    <Download aria-hidden="true" /> {t.common.download}
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex justify-center">
              <Button type="button" size="lg" onClick={() => downloadZip(buildZip(outputs.map((o, i) => ({ name: names[i]!, bytes: o.bytes }))), base, "divise", TOOL_ID)} data-testid="download-zip">
                <Download aria-hidden="true" />
                {t.common.downloadAllZip}
              </Button>
            </div>
          </div>
        ) : null}
      </DonePanel>
    );
  }

  return (
    <div className="space-y-6">
      <FileSummary name={pdf.file.name} size={pdf.file.size} pageCount={pdf.pageCount} onReset={reset} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-5">
          <Segmented
            label="Mode de découpage"
            value={strategy}
            onChange={setStrategy}
            options={[
              { value: "custom", label: "Plages personnalisées", description: "ex. 1-3, 5, 8-10" },
              { value: "every-n", label: "Toutes les N pages", description: "Découpage régulier" },
              { value: "each-page", label: "Une page par fichier", description: `${pdf.pageCount} fichiers` },
            ]}
          />
          {strategy === "custom" ? (
            <>
              <PageRangeInput
                pageCount={pdf.pageCount}
                value={rangeText}
                onChange={(value, next, error) => {
                  setRangeText(value);
                  setParsed(next);
                  setRangeError(error);
                }}
              />
              <Segmented
                label="Fichiers produits"
                value={mode}
                onChange={setMode}
                className="sm:grid-cols-2"
                options={[
                  { value: "one-file-per-range", label: "Un fichier par plage", description: "Chaque plage devient un PDF" },
                  { value: "single-file", label: "Un seul fichier", description: "Pages retenues, sans doublon" },
                ]}
              />
            </>
          ) : null}
          {strategy === "every-n" ? (
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="chunk-size">Pages par fichier</Label>
              <Input id="chunk-size" type="number" min={1} max={pdf.pageCount} value={chunk} onChange={(e) => setChunk(Number(e.target.value) || 1)} />
            </div>
          ) : null}

          <OutputPreview ranges={ranges} mode={effectiveMode} pageCount={pdf.pageCount} />

          <Button type="button" size="lg" className="w-full" onClick={run} disabled={!canRun} data-testid="split-button">
            <Scissors aria-hidden="true" />
            Diviser le PDF
          </Button>
        </div>
        <aside className="hidden lg:block">
          <p className="mb-2 text-sm font-medium">Aperçu</p>
          <div className="grid grid-cols-2 gap-2">
            {pdf.pages.slice(0, 6).map((page) => (
              <div key={page.index} className="relative overflow-hidden rounded-[6px] border border-border">
                <PageThumbnail doc={pdf.opened.doc} page={page} width={118} height={160} />
                <span className="absolute bottom-1 left-1 rounded-full bg-foreground/80 px-1.5 text-[11px] text-background">{page.index + 1}</span>
              </div>
            ))}
          </div>
          {pdf.pageCount > 6 ? <p className="mt-2 text-xs text-muted-foreground">… et {pdf.pageCount - 6} autres pages</p> : null}
        </aside>
      </div>
    </div>
  );
}

function OutputPreview({ ranges, mode, pageCount }: { ranges: PageRange[]; mode: SplitMode; pageCount: number }) {
  if (ranges.length === 0) return null;
  if (mode === "single-file") {
    const indices = Array.from(new Set(ranges.flatMap((r) => Array.from({ length: r.to - r.from + 1 }, (_, i) => r.from - 1 + i)))).sort((a, b) => a - b);
    return (
      <p className="rounded-md bg-muted px-3 py-2 text-sm" data-testid="split-preview">
        1 fichier contenant {t.result.pages(indices.length)} sur {pageCount} : pages {formatPageIndices(indices)}
      </p>
    );
  }
  const shown = ranges.slice(0, 12);
  return (
    <div className="rounded-md bg-muted px-3 py-2 text-sm" data-testid="split-preview">
      <p className="font-medium">{ranges.length} fichier(s) à produire</p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {shown.map((r, i) => (
          <li key={i} className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs tabular-nums">
            {r.from === r.to ? `p. ${r.from}` : `p. ${r.from}-${r.to}`}
          </li>
        ))}
        {ranges.length > shown.length ? <li className="px-2 py-0.5 text-xs text-muted-foreground">+{ranges.length - shown.length}</li> : null}
      </ul>
    </div>
  );
}
