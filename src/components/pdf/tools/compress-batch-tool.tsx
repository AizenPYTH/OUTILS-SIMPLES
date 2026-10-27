"use client";

import * as React from "react";
import { zipSync } from "fflate";
import { Download, Minimize2, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PdfDropzone } from "@/components/pdf/shared/pdf-dropzone";
import { BusyPanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import { downloadPdf, downloadZip } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { pdfLimits } from "@/config/limits";
import { formatBytes, formatPercent } from "@/lib/files/format";
import { deriveOutputName } from "@/lib/files/filename";
import { validateFileBatch } from "@/lib/files/validation";
import { readPdfFile } from "@/lib/pdf/browser/read-file";
import { canvasImageReencoder } from "@/lib/pdf/browser/image-reencoder";
import { toPdfError, type PdfError } from "@/lib/pdf/errors";
import {
  compressPdf,
  compressionProfiles,
  type CompressionLevel,
} from "@/lib/pdf/operations/compress";
import { compressionLevelOptions } from "./compress-levels";
import { tr } from "@/lib/i18n/messages";

const TOOL_ID = "pdf-compress";
const MAX_FILES = pdfLimits.maxFileCount;

interface BatchEntry {
  file: File;
  bytes?: Uint8Array;
  originalSize: number;
  resultSize?: number;
  error?: string;
}

/** Several PDFs compressed one after the other, downloaded together as a ZIP (or one by one). */
export function CompressBatchTool() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [level, setLevel] = React.useState<CompressionLevel>("balanced");
  const [error, setError] = React.useState<PdfError | null>(null);
  const op = useOperation<BatchEntry[]>(TOOL_ID);
  const profile = compressionProfiles[level];

  const add = (incoming: File[]) => {
    setError(null);
    const next = [...files];
    for (const file of incoming) {
      if (!next.some((f) => f.name === file.name && f.size === file.size)) next.push(file);
    }
    try {
      validateFileBatch(next, { maxFileCount: MAX_FILES });
      setFiles(next);
    } catch (e) {
      setError(toPdfError(e, "TOO_MANY_FILES"));
    }
  };

  const run = () =>
    void op.run(async (report) => {
      const results: BatchEntry[] = [];
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]!;
        report({
          current: i,
          total: files.length,
          label: tr("Fichier {n} sur {total} : {name}", {
            n: i + 1,
            total: files.length,
            name: file.name,
          }),
        });
        try {
          const bytes = await readPdfFile(file, pdfLimits.maxFileSizeBytes);
          const result = await compressPdf(
            bytes,
            level,
            profile.recompressImages ? canvasImageReencoder : null,
          );
          results.push({
            file,
            bytes: result.bytes,
            originalSize: file.size,
            resultSize: result.bytes.byteLength,
          });
        } catch (e) {
          results.push({
            file,
            originalSize: file.size,
            error: toPdfError(e, "PROCESSING_FAILED").message,
          });
        }
      }
      return results;
    });

  const reset = () => {
    op.reset();
    setFiles([]);
    setError(null);
  };

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const results = op.state.result;
    const done = results.filter(
      (r): r is BatchEntry & { bytes: Uint8Array; resultSize: number } => !!r.bytes,
    );
    const before = done.reduce((s, r) => s + r.originalSize, 0);
    const after = done.reduce((s, r) => s + r.resultSize, 0);
    const downloadAll = () => {
      const entries: Record<string, Uint8Array> = {};
      for (const r of done) {
        let name = deriveOutputName(r.file.name, "compresse");
        let n = 2;
        while (entries[name]) name = deriveOutputName(r.file.name, `compresse-${n++}`);
        entries[name] = r.bytes;
      }
      downloadZip(zipSync(entries, { level: 0 }), "pdf-compresses", "", TOOL_ID);
    };
    return (
      <div className="space-y-4" data-testid="pdf-batch-done">
        <ToolPanel className="space-y-3">
          <p className="font-semibold">
            {tr(done.length > 1 ? "{n} fichiers compressés" : "{n} fichier compressé", {
              n: done.length,
            })}{" "}
            · {formatBytes(before)} → {formatBytes(after)}
            {before > 0
              ? ` (${after < before ? "−" : "+"}${formatPercent(Math.abs(after - before) / before)})`
              : ""}
          </p>
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {results.map((r) => (
              <li
                key={r.file.name}
                className="flex flex-wrap items-center gap-3 px-3 py-2"
                data-testid="pdf-batch-row"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{r.file.name}</span>
                {r.bytes ? (
                  <>
                    <span className="tabular-nums text-muted-foreground">
                      {formatBytes(r.originalSize)} → {formatBytes(r.resultSize ?? 0)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadPdf(r.bytes!, r.file.name, "compresse", TOOL_ID)}
                    >
                      <Download aria-hidden="true" /> PDF
                    </Button>
                  </>
                ) : (
                  <span className="text-destructive">{r.error}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              onClick={downloadAll}
              disabled={done.length === 0}
              data-testid="pdf-batch-download-zip"
            >
              <Download aria-hidden="true" /> {tr("Télécharger tout (ZIP)")}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={reset}>
              {tr("Autres fichiers")}
            </Button>
          </div>
        </ToolPanel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <Alert variant="destructive">{error.message}</Alert> : null}
      <PdfDropzone
        onFiles={add}
        multiple
        maxFileSizeBytes={pdfLimits.maxFileSizeBytes}
        maxFileCount={MAX_FILES}
        compact={files.length > 0}
        title={files.length > 0 ? tr("Ajouter d'autres PDF") : undefined}
      />
      {files.length > 0 ? (
        <ToolPanel className="space-y-4">
          <ul
            className="divide-y divide-border rounded-md border border-border text-sm"
            data-testid="pdf-batch-list"
          >
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
                <span className="tabular-nums text-muted-foreground">{formatBytes(file.size)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={tr("Retirer {name}", { name: file.name })}
                  onClick={() => setFiles((list) => list.filter((f) => f !== file))}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
          <Segmented
            label={tr("Niveau de compression")}
            value={level}
            onChange={setLevel}
            options={compressionLevelOptions}
          />
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={run}
            data-testid="pdf-batch-run"
          >
            <Minimize2 aria-hidden="true" />
            {tr(files.length > 1 ? "Compresser {n} fichiers" : "Compresser {n} fichier", {
              n: files.length,
            })}
          </Button>
        </ToolPanel>
      ) : null}
    </div>
  );
}
