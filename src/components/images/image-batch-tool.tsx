"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Download, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { formatBytes, formatPercent } from "@/lib/files/format";
import { bytesToBlob, triggerDownload } from "@/lib/files/download";
import { deriveOutputName } from "@/lib/files/filename";
import { buildZip } from "@/lib/pdf/browser/zip";
import { acceptedInputMimeTypes } from "@/lib/images/types";
import { track } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";
import { useImageBatch, type BatchItem, type BatchProcessor } from "./use-image-batch";

export const IMAGE_MAX_SIZE = 50 * 1024 * 1024;
export const IMAGE_MAX_FILES = 50;

export function validateImageFile(file: File): string | null {
  if (file.size === 0) return "fichier vide";
  if (file.size > IMAGE_MAX_SIZE)
    return `fichier trop volumineux (max ${formatBytes(IMAGE_MAX_SIZE)})`;
  const type = file.type.toLowerCase();
  if (type && !(acceptedInputMimeTypes as readonly string[]).includes(type))
    return "format non pris en charge (JPG, PNG, WebP, GIF, BMP, AVIF, SVG)";
  return null;
}

interface ImageBatchToolProps {
  toolId: string;
  /** Options panel rendered above the list once files are added. */
  options: React.ReactNode;
  processor: BatchProcessor;
  actionLabel: string;
  single?: boolean;
  /** Called after a successful run; receives the done items. */
  zipName?: string;
  /** Shown in the list for each finished item (e.g. "−42 %"). */
  summary?: (item: BatchItem) => React.ReactNode;
  disabled?: boolean;
  capture?: "environment";
}

/**
 * Shared list-based workflow for image tools: add files (drag, browse, camera
 * on mobile), see previews and dimensions, run the processor with progress,
 * download each result or a ZIP. Errors stay per item.
 */
export function ImageBatchTool({
  toolId,
  options,
  processor,
  actionLabel,
  single = false,
  zipName = "images",
  summary,
  disabled,
  capture,
}: ImageBatchToolProps) {
  const batch = useImageBatch({ toolId, maxFiles: single ? 1 : IMAGE_MAX_FILES });
  const { items } = batch;
  const doneItems = items.filter((i) => i.status === "done" && i.result);
  const hasResults = doneItems.length > 0;

  const onFiles = async (files: File[]) => {
    if (single) batch.clear();
    const dropped = await batch.add(files);
    if (dropped > 0)
      toast.info(`${dropped} fichier(s) ignoré(s) : ${IMAGE_MAX_FILES} fichiers maximum.`);
  };

  const downloadAll = () => {
    if (doneItems.length === 1) {
      const item = doneItems[0]!;
      triggerDownload(item.result!.blob, item.result!.name);
    } else {
      void Promise.all(
        doneItems.map(async (i) => ({
          name: i.result!.name,
          bytes: new Uint8Array(await i.result!.blob.arrayBuffer()),
        })),
      ).then((entries) => {
        triggerDownload(
          bytesToBlob(buildZip(entries), "application/zip"),
          deriveOutputName(zipName, "", "zip"),
        );
      });
    }
    track("tool_download", { tool: toolId, resultCount: doneItems.length });
  };

  const totalBefore = items.reduce((s, i) => s + i.file.size, 0);
  const totalAfter = doneItems.reduce((s, i) => s + i.result!.blob.size, 0);

  return (
    <div className="space-y-5">
      {items.length === 0 ? (
        <FileDropzone
          onFiles={(f) => void onFiles(f)}
          accept="image/*"
          validate={validateImageFile}
          multiple={!single}
          title={single ? "Déposez une image ici" : "Déposez vos images ici"}
          hint={`JPG, PNG, WebP, GIF, BMP, AVIF, SVG · ${formatBytes(IMAGE_MAX_SIZE)} max par fichier${single ? "" : ` · jusqu'à ${IMAGE_MAX_FILES} fichiers`}`}
          buttonLabel={single ? "Choisir une image" : "Choisir des images"}
          capture={capture}
          testId="image-dropzone"
        />
      ) : (
        <>
          <div data-testid="batch-options">{options}</div>
          <ul className="space-y-2" aria-label="Images à traiter" data-testid="batch-list">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-[14px] border bg-surface px-3 py-2.5",
                  item.status === "error" ? "border-destructive/50" : "border-border",
                )}
                data-testid="batch-item"
                data-status={item.status}
              >
                <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-muted checkerboard">
                  {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview */}
                  <img
                    src={item.resultUrl ?? item.previewUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={item.file.name}>
                    {item.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(item.file.size)}
                    {item.width ? ` · ${item.width}×${item.height} px` : ""}
                    {item.result ? (
                      <>
                        {" → "}
                        <span className="font-medium text-foreground">
                          {formatBytes(item.result.blob.size)}
                        </span>
                        {` · ${item.result.width}×${item.result.height} px`}
                        {summary ? <> · {summary(item)}</> : null}
                        {item.result.note ? ` · ${item.result.note}` : ""}
                      </>
                    ) : null}
                  </p>
                  {item.error ? (
                    <p className="text-xs text-destructive" role="alert">
                      {item.error}
                    </p>
                  ) : null}
                </div>
                {item.status === "processing" ? (
                  <Loader2 className="size-4 animate-spin text-link" aria-label="Traitement" />
                ) : null}
                {item.status === "done" ? (
                  <CheckCircle2 className="size-4 text-success" aria-label="Terminé" />
                ) : null}
                {item.status === "error" ? (
                  <AlertCircle className="size-4 text-destructive" aria-label="Erreur" />
                ) : null}
                {item.result ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => triggerDownload(item.result!.blob, item.result!.name)}
                    aria-label={`Télécharger ${item.result.name}`}
                  >
                    <Download aria-hidden="true" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => batch.remove(item.id)}
                  aria-label={`Retirer ${item.file.name}`}
                  disabled={batch.running}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
          {!single ? (
            <FileDropzone
              onFiles={(f) => void onFiles(f)}
              accept="image/*"
              validate={validateImageFile}
              multiple
              compact
              title="Ajouter des images"
              hint="Glissez d'autres fichiers ou cliquez"
              buttonLabel="Ajouter des images"
              disabled={batch.running}
              testId="image-dropzone-more"
            />
          ) : null}
          {batch.running ? (
            <ToolPanel className="space-y-2" role="status" aria-live="polite">
              <div className="flex items-center justify-between text-sm">
                <span>
                  Traitement {batch.progress.current} / {batch.progress.total}…
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={batch.cancel}>
                  <X aria-hidden="true" /> Interrompre
                </Button>
              </div>
              <Progress
                value={
                  batch.progress.total
                    ? (batch.progress.current / batch.progress.total) * 100
                    : undefined
                }
                label="Progression"
              />
            </ToolPanel>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p
              className="text-sm text-muted-foreground"
              aria-live="polite"
              data-testid="batch-summary"
            >
              {items.length} image{items.length > 1 ? "s" : ""} · {formatBytes(totalBefore)}
              {hasResults ? (
                <>
                  {" → "}
                  {formatBytes(totalAfter)}
                  {totalBefore > 0 && totalAfter < totalBefore
                    ? ` (${formatPercent((totalBefore - totalAfter) / totalBefore)} de moins)`
                    : ""}
                </>
              ) : null}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={batch.clear}
                disabled={batch.running}
              >
                Tout retirer
              </Button>
              {hasResults ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadAll}
                  data-testid="batch-download-all"
                >
                  <Download aria-hidden="true" />{" "}
                  {doneItems.length > 1 ? "Tout télécharger (ZIP)" : "Télécharger"}
                </Button>
              ) : null}
              <Button
                type="button"
                size="lg"
                onClick={() => void batch.run(processor)}
                disabled={batch.running || disabled || items.length === 0}
                loading={batch.running}
                data-testid="batch-run"
              >
                {actionLabel}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
