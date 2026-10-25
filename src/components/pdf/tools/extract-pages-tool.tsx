"use client";

import * as React from "react";
import { FileOutput } from "lucide-react";
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
import { formatPageIndices, type ParsedRanges } from "@/lib/pdf/page-ranges";
import { extractPages } from "@/lib/pdf/operations/pages";
import { t } from "@/lib/i18n";

const TOOL_ID = "pdf-extract-pages";

export function ExtractPagesTool() {
  return (
    <SingleFileTool toolId={TOOL_ID}>
      {({ pdf, reset }) => <ExtractWorkspace pdf={pdf} reset={reset} />}
    </SingleFileTool>
  );
}

function ExtractWorkspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [selected, setSelected] = React.useState<Set<number>>(() => new Set());
  const [rangeText, setRangeText] = React.useState("");
  const op = useOperation<Uint8Array>(TOOL_ID);

  const toggle = (index: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const onRange = (value: string, parsed: ParsedRanges | null) => {
    setRangeText(value);
    if (parsed) setSelected(new Set(parsed.indices));
  };

  const indices = Array.from(selected).sort((a, b) => a - b);
  const run = () => void op.run(() => extractPages(pdf.bytes, indices));

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const bytes = op.state.result;
    return (
      <DonePanel
        summary={`${t.result.pages(indices.length)} · ${formatBytes(bytes.byteLength)}`}
        onDownload={() =>
          downloadPdf(
            bytes,
            pdf.file.name,
            `pages-${formatPageIndices(indices).replace(/[,\s]+/g, "_")}`,
            TOOL_ID,
          )
        }
        onStartOver={() => {
          op.reset();
          reset();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <FileSummary
        name={pdf.file.name}
        size={pdf.file.size}
        pageCount={pdf.pageCount}
        onReset={reset}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <PageRangeInput
            pageCount={pdf.pageCount}
            value={rangeText}
            onChange={onRange}
            label="Pages à extraire (ou cliquez sur les vignettes)"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelected(new Set(pdf.pages.map((p) => p.index)))}
          >
            {t.common.selectAll}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set())}>
            {t.common.selectNone}
          </Button>
        </div>
      </div>
      <ul
        className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(112px,1fr))]"
        aria-label="Pages du document"
        data-testid="page-grid"
      >
        {pdf.pages.map((page) => (
          <li key={page.index} className="flex justify-center">
            <PageTile
              pageNumber={page.index + 1}
              selected={selected.has(page.index)}
              onClick={() => toggle(page.index)}
              ariaLabel={`${t.common.page} ${page.index + 1}${selected.has(page.index) ? " (sélectionnée)" : ""}`}
            >
              <PageThumbnail doc={pdf.opened.doc} page={page} width={96} height={136} />
            </PageTile>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" data-testid="extract-summary">
          {indices.length > 0
            ? `${t.ranges.preview(indices.length, pdf.pageCount)} : ${formatPageIndices(indices)}`
            : t.errors.noSelection}
        </p>
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          onClick={run}
          disabled={indices.length === 0}
          data-testid="extract-button"
        >
          <FileOutput aria-hidden="true" />
          Extraire {indices.length > 0 ? t.result.pages(indices.length) : ""}
        </Button>
      </div>
    </div>
  );
}
