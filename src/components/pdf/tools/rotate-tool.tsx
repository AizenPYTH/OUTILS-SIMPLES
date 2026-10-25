"use client";

import * as React from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { PageRangeInput } from "@/components/pdf/shared/page-range-input";
import { PageThumbnail } from "@/components/pdf/shared/page-thumbnail";
import { PageTile } from "@/components/pdf/shared/page-tile";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { formatBytes } from "@/lib/files/format";
import type { ParsedRanges } from "@/lib/pdf/page-ranges";
import { normalizeRotation, rotatePages } from "@/lib/pdf/operations/pages";
import { t } from "@/lib/i18n";

const TOOL_ID = "pdf-rotate";

export function RotateTool() {
  return <SingleFileTool toolId={TOOL_ID}>{({ pdf, reset }) => <RotateWorkspace pdf={pdf} reset={reset} />}</SingleFileTool>;
}

function RotateWorkspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [rotations, setRotations] = React.useState<Record<number, number>>({});
  const [rangeText, setRangeText] = React.useState("");
  const [rangeParsed, setRangeParsed] = React.useState<ParsedRanges | null>(null);
  const op = useOperation<Uint8Array>(TOOL_ID);

  const rotate = (indices: number[], delta: number) =>
    setRotations((r) => {
      const next = { ...r };
      for (const i of indices) next[i] = normalizeRotation((next[i] ?? 0) + delta);
      return next;
    });

  const changed = Object.entries(rotations).filter(([, v]) => normalizeRotation(v) !== 0);
  const all = pdf.pages.map((p) => p.index);
  const run = () => void op.run(() => rotatePages(pdf.bytes, Object.fromEntries(changed.map(([k, v]) => [k, v]))));

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error") return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const bytes = op.state.result;
    return (
      <DonePanel
        summary={`${changed.length} page(s) pivotée(s) · ${formatBytes(bytes.byteLength)}`}
        onDownload={() => downloadPdf(bytes, pdf.file.name, "pivote", TOOL_ID)}
        onStartOver={() => {
          op.reset();
          reset();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <FileSummary name={pdf.file.name} size={pdf.file.size} pageCount={pdf.pageCount} onReset={reset} />
      <div className="flex flex-col gap-4 rounded-[14px] border border-border bg-surface p-4 lg:flex-row lg:items-end">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => rotate(all, 90)} data-testid="rotate-all-cw">
            <RotateCw aria-hidden="true" /> Tout pivoter à droite
          </Button>
          <Button type="button" variant="outline" onClick={() => rotate(all, -90)}>
            <RotateCcw aria-hidden="true" /> Tout pivoter à gauche
          </Button>
          <Button type="button" variant="ghost" onClick={() => setRotations({})} disabled={changed.length === 0}>
            {t.common.reset}
          </Button>
        </div>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <PageRangeInput
              pageCount={pdf.pageCount}
              value={rangeText}
              onChange={(v, parsed) => {
                setRangeText(v);
                setRangeParsed(parsed);
              }}
              label="Pivoter une plage de pages"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={!rangeParsed} onClick={() => rangeParsed && rotate(rangeParsed.indices, 90)} aria-label="Pivoter la plage à droite">
              <RotateCw aria-hidden="true" /> 90°
            </Button>
            <Button type="button" variant="secondary" disabled={!rangeParsed} onClick={() => rangeParsed && rotate(rangeParsed.indices, 180)} aria-label="Pivoter la plage de 180 degrés">
              180°
            </Button>
          </div>
        </div>
      </div>
      <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(112px,1fr))]" aria-label="Pages du document" data-testid="page-grid">
        {pdf.pages.map((page) => {
          const extra = rotations[page.index] ?? 0;
          return (
            <li key={page.index} className="flex justify-center">
              <PageTile
                pageNumber={page.index + 1}
                selected={normalizeRotation(extra) !== 0}
                actions={
                  <>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => rotate([page.index], -90)} aria-label={`Pivoter la page ${page.index + 1} à gauche`}>
                      <RotateCcw aria-hidden="true" />
                    </Button>
                    <span className="w-8 text-center text-xs tabular-nums text-muted-foreground">{normalizeRotation(extra)}°</span>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => rotate([page.index], 90)} aria-label={`Pivoter la page ${page.index + 1} à droite`} data-testid={`rotate-page-${page.index}`}>
                      <RotateCw aria-hidden="true" />
                    </Button>
                  </>
                }
              >
                <PageThumbnail doc={pdf.opened.doc} page={page} width={96} height={136} extraRotation={extra} />
              </PageTile>
            </li>
          );
        })}
      </ul>
      <Button type="button" size="lg" className="w-full" onClick={run} disabled={changed.length === 0} data-testid="rotate-export">
        {t.common.export} ({changed.length} page{changed.length > 1 ? "s" : ""} modifiée{changed.length > 1 ? "s" : ""})
      </Button>
    </div>
  );
}
