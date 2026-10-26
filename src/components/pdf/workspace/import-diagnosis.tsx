"use client";

import { FileText, ImageIcon, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DocumentDiagnosis } from "@/lib/pdf/browser/diagnose";

interface ImportDiagnosisProps {
  diagnosis: DocumentDiagnosis;
  pageCount: number;
  onRunOcr: () => void;
  onContinue: () => void;
}

/**
 * Shown once after import when the document is not plain native text: says
 * what was found and offers OCR as an option, never as a rejection.
 */
export function ImportDiagnosis({
  diagnosis,
  pageCount,
  onRunOcr,
  onContinue,
}: ImportDiagnosisProps) {
  const scanned = diagnosis.scannedPages;
  const title =
    diagnosis.kind === "scanned"
      ? `Document scanné — ${pageCount} page${pageCount > 1 ? "s" : ""} sans texte sélectionnable`
      : diagnosis.kind === "mixed"
        ? `PDF ouvert — ${pageCount} pages, dont ${scanned} sans texte sélectionnable`
        : `PDF ouvert — ${pageCount} page${pageCount > 1 ? "s" : ""} sans texte ni image`;
  const body =
    diagnosis.kind === "empty"
      ? "Les pages analysées ne contiennent ni texte ni image. Vous pouvez ajouter du texte, des formes, des images ou une signature."
      : "Ces pages sont des images : leur texte ne peut pas être modifié directement. Lancez l'OCR pour reconnaître le texte (recherche, copie, correction), ou continuez pour annoter, ajouter du texte par-dessus, insérer une signature ou réorganiser les pages.";
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="import-diagnosis-title"
      className="absolute inset-x-3 top-3 z-30 mx-auto max-w-xl rounded-[16px] border border-border bg-surface p-4 shadow-xl sm:inset-x-6 sm:p-5"
      data-testid="import-diagnosis"
      data-kind={diagnosis.kind}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-link">
          {diagnosis.kind === "empty" ? (
            <FileText className="size-5" aria-hidden="true" />
          ) : (
            <ImageIcon className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="import-diagnosis-title" className="font-heading text-base font-bold">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          {diagnosis.sampled ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Document long : un échantillon de pages a été analysé.
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onContinue}
          data-testid="diagnosis-continue"
        >
          Continuer sans OCR
        </Button>
        {diagnosis.kind !== "empty" ? (
          <Button type="button" onClick={onRunOcr} data-testid="diagnosis-run-ocr">
            <ScanText aria-hidden="true" /> Lancer l&apos;OCR
          </Button>
        ) : null}
      </div>
    </div>
  );
}
