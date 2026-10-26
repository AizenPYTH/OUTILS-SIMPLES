"use client";

import { AlertTriangle, CheckCircle2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OperationState } from "@/components/pdf/hooks/use-operation";
import type { DrawReport } from "@/lib/pdf/annotations/draw";
import { formatBytes } from "@/lib/files/format";
import { t } from "@/lib/i18n";

export interface ExportResult {
  bytes: Uint8Array;
  report: DrawReport;
  /** Read back from the produced file with pdf.js. */
  verified: { pageCount: number };
}

export interface ExportSummary {
  annotations: number;
  textEdits: number;
  pagesChanged: boolean;
  ocr: boolean;
  expectedPages: number;
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: OperationState<ExportResult>;
  summary: ExportSummary;
  onDownload: () => void;
}

/** Export: what will be written, honest progress, verification of the result, download. */
export function ExportDialog({
  open,
  onOpenChange,
  state,
  summary,
  onDownload,
}: ExportDialogProps) {
  const parts: string[] = [];
  if (summary.textEdits)
    parts.push(
      `${summary.textEdits} texte${summary.textEdits > 1 ? "s" : ""} modifié${summary.textEdits > 1 ? "s" : ""}`,
    );
  if (summary.annotations)
    parts.push(
      `${summary.annotations} élément${summary.annotations > 1 ? "s" : ""} ajouté${summary.annotations > 1 ? "s" : ""}`,
    );
  if (summary.ocr) parts.push("couche de texte OCR");
  if (summary.pagesChanged) parts.push("pages réorganisées");
  const done = state.status === "done";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" className="rounded-[20px]" data-testid="export-dialog">
        <DialogHeader>
          <DialogTitle>
            {done
              ? "PDF modifié prêt"
              : state.status === "error"
                ? "Export impossible"
                : "Préparation du PDF modifié…"}
          </DialogTitle>
          <DialogDescription>
            {parts.length
              ? parts.join(" · ")
              : "Aucune modification : le document sera réenregistré tel quel."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-2 py-3 text-center text-sm">
          {state.status === "busy" ? (
            <>
              <Loader2 className="size-10 animate-spin text-link" aria-hidden="true" />
              <p className="text-muted-foreground">
                {state.progress.label ?? t.progress.processing}
              </p>
            </>
          ) : null}
          {done ? (
            <>
              <CheckCircle2 className="size-10 text-success" aria-hidden="true" />
              <p data-testid="export-verified">
                Fichier vérifié : {state.result.verified.pageCount} page
                {state.result.verified.pageCount > 1 ? "s" : ""},{" "}
                {formatBytes(state.result.bytes.byteLength)}, réouvert sans erreur.
              </p>
              {state.result.verified.pageCount !== summary.expectedPages ? (
                <p role="alert" className="text-destructive">
                  Le fichier produit compte {state.result.verified.pageCount} pages au lieu de{" "}
                  {summary.expectedPages}.
                </p>
              ) : null}
            </>
          ) : null}
          {state.status === "error" ? (
            <p role="alert" className="text-destructive">
              {state.error.message}
            </p>
          ) : null}
        </div>
        {summary.annotations > 0 ? (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Les éléments ajoutés (texte, dessins, images, signature) sont dessinés dans les pages :
            ils ne seront plus déplaçables dans un autre lecteur.
          </p>
        ) : null}
        {done && state.result.report.replacedCharacters > 0 ? (
          <p className="text-xs text-warning-foreground">
            Certains caractères non pris en charge par les polices standard ont été remplacés par «
            ? ».
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.close}
          </Button>
          {done ? (
            <Button type="button" onClick={onDownload} data-testid="export-download">
              <Download aria-hidden="true" /> Télécharger le PDF modifié
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
