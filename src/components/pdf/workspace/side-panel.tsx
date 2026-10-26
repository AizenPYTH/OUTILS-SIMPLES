"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Loader2, ScanText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DocumentDiagnosis } from "@/lib/pdf/browser/diagnose";
import { ocrLanguages, type OcrLanguage } from "@/lib/ocr/types";
import { formatBytes } from "@/lib/files/format";
import { cn } from "@/lib/utils";
import type { EditorOcrState, OcrLayerInfo } from "./use-editor-ocr";
import { SHORTCUTS, type EditorPanel } from "./types";

const PANEL_TITLES: Record<EditorPanel, string> = {
  ocr: "Reconnaissance de texte (OCR)",
  document: "Document",
  history: "Historique",
  shortcuts: "Raccourcis clavier",
};

/** Shell of the right-hand panels: one at a time, closable, full width on small screens. */
export function SidePanel({
  panel,
  onClose,
  children,
}: {
  panel: EditorPanel;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside
      className="absolute inset-y-0 right-0 z-20 flex w-full flex-col border-l border-border bg-surface shadow-xl sm:w-[320px] lg:static lg:shadow-none"
      aria-label={PANEL_TITLES[panel]}
      data-testid={`side-panel-${panel}`}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <h2 className="text-sm font-semibold">{PANEL_TITLES[panel]}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le panneau"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          data-testid="side-panel-close"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">{children}</div>
    </aside>
  );
}

interface OcrPanelProps {
  diagnosis: DocumentDiagnosis | null;
  pageCount: number;
  state: EditorOcrState;
  layer: OcrLayerInfo | null;
  language: OcrLanguage;
  onLanguage: (language: OcrLanguage) => void;
  scope: "scanned" | "all";
  onScope: (scope: "scanned" | "all") => void;
  onRun: () => void;
  onCancel: () => void;
  onRevert: () => void;
}

export function OcrPanel({
  diagnosis,
  pageCount,
  state,
  layer,
  language,
  onLanguage,
  scope,
  onScope,
  onRun,
  onCancel,
  onRevert,
}: OcrPanelProps) {
  const scanned = diagnosis
    ? diagnosis.pages.filter((p) => p.kind === "scanned").map((p) => p.index)
    : [];
  const running = state.status === "running";
  const targetCount = scope === "all" ? pageCount : scanned.length;
  return (
    <div className="space-y-4">
      {diagnosis ? (
        <p className="text-muted-foreground">
          {diagnosis.kind === "scanned" &&
            "Ce document est un scan : ses pages sont des images, sans texte sélectionnable."}
          {diagnosis.kind === "mixed" &&
            `${scanned.length} page(s) sur ${pageCount} sont des images sans texte sélectionnable.`}
          {diagnosis.kind === "native" &&
            (diagnosis.ocrLayerPages > 0
              ? "Ce document contient déjà une couche de texte reconnu (OCR)."
              : "Ce document contient du texte natif : l'OCR n'est utile que pour des pages images.")}
          {diagnosis.kind === "empty" && "Aucun texte ni image détectés sur les pages analysées."}
          {diagnosis.sampled ? " Seul un échantillon de pages a été analysé (document long)." : ""}
        </p>
      ) : (
        <p className="text-muted-foreground">
          Le document n&apos;a pas pu être analysé ; vous pouvez lancer l&apos;OCR sur toutes les
          pages.
        </p>
      )}

      {layer ? (
        <div
          className="rounded-[10px] border border-success/40 bg-success-soft/40 p-3"
          data-testid="ocr-layer-summary"
        >
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4 text-success" aria-hidden="true" /> OCR terminé
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            <li>
              {layer.pages.length} page{layer.pages.length > 1 ? "s" : ""} reconnue
              {layer.pages.length > 1 ? "s" : ""} · {layer.words} mot{layer.words > 1 ? "s" : ""}
            </li>
            <li>
              Langue : {ocrLanguages.find((l) => l.id === layer.language)?.label ?? layer.language}
            </li>
            <li>
              Qualité estimée :{" "}
              <span
                className={cn(
                  "font-medium",
                  layer.confidence >= 80
                    ? "text-success"
                    : layer.confidence >= 60
                      ? "text-warning-foreground"
                      : "text-destructive",
                )}
              >
                {layer.confidence} %
              </span>
              {layer.confidence < 80 ? " — vérifiez le texte avec « Modifier le texte »" : ""}
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Le texte reconnu est une couche invisible alignée sur l&apos;image (recherche, copie,
            correction). L&apos;image d&apos;origine est conservée ; l&apos;éditeur ne reproduit pas
            la police du scan.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRevert}
            data-testid="ocr-revert"
          >
            Revenir au document sans OCR
          </Button>
        </div>
      ) : null}

      {running ? (
        <div className="space-y-2" role="status" aria-live="polite" data-testid="ocr-progress">
          <p className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-link" aria-hidden="true" />
            Page {Math.min(state.current + 1, state.pages.length)} sur {state.pages.length}
          </p>
          <Progress
            value={Math.round(
              ((state.current + state.pageProgress) / Math.max(1, state.pages.length)) * 100,
            )}
            label="Progression de l'OCR"
          />
          <p className="text-xs text-muted-foreground">{state.label}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            data-testid="ocr-cancel"
          >
            Interrompre
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="editor-ocr-lang">Langue du document</Label>
            <Select value={language} onValueChange={(v) => onLanguage(v as OcrLanguage)}>
              <SelectTrigger id="editor-ocr-lang" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ocrLanguages.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Pages à reconnaître</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="ocr-scope"
                checked={scope === "scanned"}
                onChange={() => onScope("scanned")}
                disabled={scanned.length === 0}
                className="accent-primary"
              />
              Pages sans texte ({scanned.length})
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="ocr-scope"
                checked={scope === "all"}
                onChange={() => onScope("all")}
                className="accent-primary"
              />
              Toutes les pages ({pageCount})
            </label>
          </fieldset>
          {state.status === "error" ? (
            <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{" "}
              {state.message}
            </p>
          ) : null}
          {state.status === "cancelled" ? (
            <p className="text-sm text-muted-foreground">
              OCR interrompu : le document est inchangé.
            </p>
          ) : null}
          <Button
            type="button"
            onClick={onRun}
            disabled={targetCount === 0}
            className="w-full"
            data-testid="ocr-run"
          >
            <ScanText aria-hidden="true" /> {layer ? "Relancer l'OCR" : "Lancer l'OCR"} (
            {targetCount} page{targetCount > 1 ? "s" : ""})
          </Button>
          <p className="text-xs text-muted-foreground">
            Moteur Tesseract exécuté dans votre navigateur (≈ 15 Mo chargés une fois) ; comptez
            quelques secondes par page. Rien n&apos;est envoyé sur un serveur.
          </p>
        </div>
      )}
    </div>
  );
}

interface DocumentPanelProps {
  fileName: string;
  size: number;
  pageCount: number;
  diagnosis: DocumentDiagnosis | null;
  unlocked: boolean;
  layer: OcrLayerInfo | null;
  planSummary: string | null;
  textEdits: number;
  annotations: number;
}

export function DocumentPanel({
  fileName,
  size,
  pageCount,
  diagnosis,
  unlocked,
  layer,
  planSummary,
  textEdits,
  annotations,
}: DocumentPanelProps) {
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3 border-b border-border py-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
  return (
    <dl data-testid="document-panel">
      {row("Fichier", <span className="break-all">{fileName}</span>)}
      {row("Taille", formatBytes(size))}
      {row("Pages", pageCount)}
      {row(
        "Contenu",
        diagnosis
          ? {
              native: diagnosis.ocrLayerPages > 0 ? "Texte reconnu (OCR)" : "Texte natif",
              mixed: `Mixte : ${diagnosis.textPages} avec texte, ${diagnosis.scannedPages} image(s)`,
              scanned: "Scanné (images)",
              empty: "Pages vides",
            }[diagnosis.kind]
          : "Non analysé",
      )}
      {unlocked ? row("Protection", "Mot de passe retiré pour l'édition (copie locale)") : null}
      {layer ? row("OCR", `${layer.pages.length} page(s), qualité ${layer.confidence} %`) : null}
      {row("Textes modifiés", textEdits)}
      {row("Éléments ajoutés", annotations)}
      {planSummary ? row("Pages", planSummary) : null}
      <p className="pt-3 text-xs text-muted-foreground">
        Le fichier d&apos;origine n&apos;est jamais modifié : le PDF téléchargé est une nouvelle
        copie.
      </p>
    </dl>
  );
}

export function HistoryPanel({ steps, futureCount }: { steps: string[]; futureCount: number }) {
  return (
    <ol className="space-y-1" data-testid="history-panel">
      {steps.map((label, i) => (
        <li
          key={`${i}-${label}`}
          className={cn(
            "rounded-md px-2 py-1",
            i === steps.length - 1
              ? "bg-primary-soft font-medium text-link"
              : "text-muted-foreground",
          )}
        >
          {i + 1}. {label}
        </li>
      ))}
      {futureCount > 0 ? (
        <li className="px-2 pt-2 text-xs text-muted-foreground">
          {futureCount} étape(s) annulée(s) : Rétablir pour les reprendre.
        </li>
      ) : null}
    </ol>
  );
}

export function ShortcutsPanel() {
  return (
    <dl className="space-y-2" data-testid="shortcuts-panel">
      {SHORTCUTS.map((s) => (
        <div
          key={s.keys}
          className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-0"
        >
          <dt>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              {s.keys}
            </kbd>
          </dt>
          <dd className="text-xs text-muted-foreground">{s.action}</dd>
        </div>
      ))}
    </dl>
  );
}
