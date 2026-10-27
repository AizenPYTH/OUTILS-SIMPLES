"use client";

import * as React from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import {
  DOCX_MIME,
  defaultPdfToDocxOptions,
  pdfToDocx,
  type PdfToDocxOptions,
  type PdfToDocxResult,
} from "@/lib/conversion/pdf-to-docx";
import { track } from "@/lib/analytics/events";
import { bytesToBlob, triggerDownload } from "@/lib/files/download";
import { deriveOutputName } from "@/lib/files/filename";
import { formatBytes } from "@/lib/files/format";
import { tr } from "@/lib/i18n/messages";

const TOOL_ID = "conv-pdf-docx";

export function PdfToDocxTool() {
  return (
    <SingleFileTool toolId={TOOL_ID}>
      {({ pdf, reset }) => (
        <PdfToDocxInner
          bytes={pdf.bytes}
          fileName={pdf.file.name}
          pageCount={pdf.pageCount}
          onReset={reset}
        />
      )}
    </SingleFileTool>
  );
}

function PdfToDocxInner({
  bytes,
  fileName,
  pageCount,
  onReset,
}: {
  bytes: Uint8Array;
  fileName: string;
  pageCount: number;
  onReset: () => void;
}) {
  const [options, setOptions] = React.useState<PdfToDocxOptions>(defaultPdfToDocxOptions);
  const op = useOperation<PdfToDocxResult>(TOOL_ID);

  const run = () =>
    void op.run((report) =>
      pdfToDocx(bytes, {
        ...options,
        onProgress: (current, total) =>
          report({ current, total, label: tr("Page {n} sur {total}", { n: current, total }) }),
      }),
    );

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={onReset} />;
  if (op.state.status === "done") {
    const result = op.state.result;
    const name = deriveOutputName(fileName, "", "docx");
    return (
      <DonePanel
        title={tr("Votre document Word est prêt")}
        summary={`${tr(result.paragraphCount > 1 ? "{n} paragraphes" : "{n} paragraphe", { n: result.paragraphCount })}${result.imageCount ? ` · ${tr(result.imageCount > 1 ? "{n} images" : "{n} image", { n: result.imageCount })}` : ""} · ${formatBytes(result.bytes.byteLength)}`}
        downloadLabel={tr("Télécharger le .docx")}
        onDownload={() => {
          triggerDownload(bytesToBlob(result.bytes, DOCX_MIME), name);
          track("tool_download", { tool: TOOL_ID });
        }}
        onStartOver={onReset}
      >
        {result.warnings.length > 0 ? (
          <Alert variant="warning" title={tr("Conversion simplifiée : à vérifier")}>
            <ul className="list-disc space-y-1 pl-4 text-left" data-testid="conversion-warnings">
              {result.warnings.slice(0, 6).map((w) => (
                <li key={w}>{tr(w)}</li>
              ))}
            </ul>
          </Alert>
        ) : null}
        <div className="mt-3 text-center">
          <Button type="button" variant="ghost" size="sm" onClick={op.reset}>
            {tr("Changer les options")}
          </Button>
        </div>
      </DonePanel>
    );
  }

  return (
    <ToolPanel className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {tr(pageCount > 1 ? "{n} pages" : "{n} page", { n: pageCount })} ·{" "}
        {tr(
          "le texte devient des paragraphes modifiables ; la mise en page exacte n'est pas reproduite.",
        )}
      </p>
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={options.pageBreaks}
            onCheckedChange={(v) => setOptions((o) => ({ ...o, pageBreaks: v === true }))}
          />
          {tr("Une page Word par page du PDF")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={options.images}
            onCheckedChange={(v) => setOptions((o) => ({ ...o, images: v === true }))}
          />
          {tr("Reprendre les images")}
        </label>
      </div>
      <Button type="button" size="lg" onClick={run} data-testid="docx-run">
        {tr("Créer le document Word")}
      </Button>
    </ToolPanel>
  );
}
