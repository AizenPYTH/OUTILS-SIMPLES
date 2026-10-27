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
import { tr } from "@/lib/i18n/messages";
import type { EditorOcrState, OcrLayerInfo } from "./use-editor-ocr";
import { SHORTCUTS, type EditorPanel } from "./types";

const PANEL_TITLES: Record<EditorPanel, string> = {
  ocr: tr("Reconnaissance de texte (OCR)"),
  document: tr("Document"),
  history: tr("Historique"),
  shortcuts: tr("Raccourcis clavier"),
  search: tr("Rechercher dans le document"),
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
          aria-label={tr("Fermer le panneau")}
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
            tr("Ce document est un scan : ses pages sont des images, sans texte sélectionnable.")}
          {diagnosis.kind === "mixed" &&
            tr("{n} page(s) sur {total} sont des images sans texte sélectionnable.", {
              n: scanned.length,
              total: pageCount,
            })}
          {diagnosis.kind === "native" &&
            (diagnosis.ocrLayerPages > 0
              ? tr("Ce document contient déjà une couche de texte reconnu (OCR).")
              : tr(
                  "Ce document contient du texte natif : l'OCR n'est utile que pour des pages images.",
                ))}
          {diagnosis.kind === "empty" &&
            tr("Aucun texte ni image détectés sur les pages analysées.")}
          {diagnosis.sampled
            ? " " + tr("Seul un échantillon de pages a été analysé (document long).")
            : ""}
        </p>
      ) : (
        <p className="text-muted-foreground">
          {tr(
            "Le document n'a pas pu être analysé ; vous pouvez lancer l'OCR sur toutes les pages.",
          )}
        </p>
      )}

      {layer ? (
        <div
          className="rounded-[10px] border border-success/40 bg-success-soft/40 p-3"
          data-testid="ocr-layer-summary"
        >
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4 text-success" aria-hidden="true" /> {tr("OCR terminé")}
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            <li>
              {layer.pages.length > 1
                ? tr("{n} pages reconnues", { n: layer.pages.length })
                : tr("{n} page reconnue", { n: layer.pages.length })}{" "}
              ·{" "}
              {layer.words > 1
                ? tr("{n} mots", { n: layer.words })
                : tr("{n} mot", { n: layer.words })}
            </li>
            <li>
              {tr("Langue : {lang}", {
                lang: tr(
                  ocrLanguages.find((l) => l.id === layer.language)?.label ?? layer.language,
                ),
              })}
            </li>
            <li>
              {tr("Qualité estimée :")}{" "}
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
              {layer.confidence < 80
                ? " — " + tr("vérifiez le texte avec « Modifier le texte »")
                : ""}
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            {tr(
              "Le texte reconnu est une couche invisible alignée sur l'image (recherche, copie, correction). L'image d'origine est conservée ; l'éditeur ne reproduit pas la police du scan.",
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRevert}
            data-testid="ocr-revert"
          >
            {tr("Revenir au document sans OCR")}
          </Button>
        </div>
      ) : null}

      {running ? (
        <div className="space-y-2" role="status" aria-live="polite" data-testid="ocr-progress">
          <p className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-link" aria-hidden="true" />
            {tr("Page {n} sur {total}", {
              n: Math.min(state.current + 1, state.pages.length),
              total: state.pages.length,
            })}
          </p>
          <Progress
            value={Math.round(
              ((state.current + state.pageProgress) / Math.max(1, state.pages.length)) * 100,
            )}
            label={tr("Progression de l'OCR")}
          />
          <p className="text-xs text-muted-foreground">{state.label}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            data-testid="ocr-cancel"
          >
            {tr("Interrompre")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="editor-ocr-lang">{tr("Langue du document")}</Label>
            <Select value={language} onValueChange={(v) => onLanguage(v as OcrLanguage)}>
              <SelectTrigger id="editor-ocr-lang" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ocrLanguages.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {tr(l.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">{tr("Pages à reconnaître")}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="ocr-scope"
                checked={scope === "scanned"}
                onChange={() => onScope("scanned")}
                disabled={scanned.length === 0}
                className="accent-primary"
              />
              {tr("Pages sans texte ({n})", { n: scanned.length })}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="ocr-scope"
                checked={scope === "all"}
                onChange={() => onScope("all")}
                className="accent-primary"
              />
              {tr("Toutes les pages ({n})", { n: pageCount })}
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
              {tr("OCR interrompu : le document est inchangé.")}
            </p>
          ) : null}
          <Button
            type="button"
            onClick={onRun}
            disabled={targetCount === 0}
            className="w-full"
            data-testid="ocr-run"
          >
            <ScanText aria-hidden="true" /> {layer ? tr("Relancer l'OCR") : tr("Lancer l'OCR")} (
            {targetCount > 1
              ? tr("{n} pages", { n: targetCount })
              : tr("{n} page", { n: targetCount })}
            )
          </Button>
          <p className="text-xs text-muted-foreground">
            {tr(
              "Moteur Tesseract exécuté dans votre navigateur (≈ 15 Mo chargés une fois) ; comptez quelques secondes par page. Rien n'est envoyé sur un serveur.",
            )}
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
      {row(tr("Fichier"), <span className="break-all">{fileName}</span>)}
      {row(tr("Taille"), formatBytes(size))}
      {row(tr("Pages"), pageCount)}
      {row(
        tr("Contenu"),
        diagnosis
          ? {
              native: diagnosis.ocrLayerPages > 0 ? tr("Texte reconnu (OCR)") : tr("Texte natif"),
              mixed: tr("Mixte : {text} avec texte, {scanned} image(s)", {
                text: diagnosis.textPages,
                scanned: diagnosis.scannedPages,
              }),
              scanned: tr("Scanné (images)"),
              empty: tr("Pages vides"),
            }[diagnosis.kind]
          : tr("Non analysé"),
      )}
      {unlocked
        ? row(tr("Protection"), tr("Mot de passe retiré pour l'édition (copie locale)"))
        : null}
      {layer
        ? row(
            "OCR",
            tr("{n} page(s), qualité {confidence} %", {
              n: layer.pages.length,
              confidence: layer.confidence,
            }),
          )
        : null}
      {row(tr("Textes modifiés"), textEdits)}
      {row(tr("Éléments ajoutés"), annotations)}
      {planSummary ? row(tr("Pages"), planSummary) : null}
      <p className="pt-3 text-xs text-muted-foreground">
        {tr(
          "Le fichier d'origine n'est jamais modifié : le PDF téléchargé est une nouvelle copie.",
        )}
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
          {tr("{n} étape(s) annulée(s) : Rétablir pour les reprendre.", { n: futureCount })}
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

interface SearchPanelProps {
  query: string;
  onQuery: (q: string) => void;
  replacement: string;
  onReplacement: (r: string) => void;
  searching: boolean;
  progress: { done: number; total: number } | null;
  results: import("@/lib/pdf/browser/search").SearchMatch[];
  current: number | null;
  onSelect: (index: number) => void;
  onReplaceOne: (index: number) => void;
  onReplaceAll: () => void;
  /** Whether the replacement feature is available (editor mode with the text tool). */
  canReplace: boolean;
}

export function SearchPanel({
  query,
  onQuery,
  replacement,
  onReplacement,
  searching,
  progress,
  results,
  current,
  onSelect,
  onReplaceOne,
  onReplaceAll,
  canReplace,
}: SearchPanelProps) {
  const byPage = new Map<number, number[]>();
  results.forEach((r, i) => {
    const list = byPage.get(r.pageIndex) ?? [];
    list.push(i);
    byPage.set(r.pageIndex, list);
  });
  return (
    <div className="space-y-3" data-testid="search-panel">
      <div className="space-y-1.5">
        <Label htmlFor="editor-search">{tr("Rechercher")}</Label>
        <input
          id="editor-search"
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={tr("Mot ou expression")}
          autoFocus
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          data-testid="search-input"
        />
      </div>
      {canReplace ? (
        <div className="space-y-1.5">
          <Label htmlFor="editor-replace">{tr("Remplacer par")}</Label>
          <input
            id="editor-replace"
            type="text"
            value={replacement}
            onChange={(e) => onReplacement(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            data-testid="replace-input"
          />
          <p className="text-xs text-muted-foreground">
            {tr(
              "Le remplacement réécrit le passage dans la page comme « Modifier le texte » (même police quand c'est possible, sans reflux). Les passages scannés ou non modifiables sont signalés.",
            )}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onReplaceAll}
            disabled={results.length === 0 || replacement.length === 0}
            data-testid="replace-all"
          >
            {tr("Remplacer partout ({n})", { n: results.length })}
          </Button>
        </div>
      ) : null}
      <p
        className="text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
        data-testid="search-status"
      >
        {searching
          ? `${tr("Recherche…")} ${progress ? tr("page {done} / {total}", { done: progress.done, total: progress.total }) : ""}`
          : query.trim().length === 0
            ? tr(
                "Saisissez un texte à chercher. La recherche ignore la casse et les accents ; un mot coupé entre deux fragments n'est pas trouvé.",
              )
            : (results.length > 1
                ? tr("{n} résultats", { n: results.length })
                : tr("{n} résultat", { n: results.length })) +
              (results.length >= 500 ? " " + tr("(affichage limité)") : "")}
      </p>
      <ol className="space-y-1" data-testid="search-results">
        {[...byPage.entries()].map(([pageIndex, indices]) => (
          <li key={pageIndex}>
            <p className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {tr("Page {n}", { n: pageIndex + 1 })}
            </p>
            <ul className="space-y-0.5">
              {indices.map((i) => {
                const r = results[i]!;
                const before = r.text.slice(Math.max(0, r.offset - 24), r.offset);
                const hit = r.text.slice(r.offset, r.offset + Math.max(1, query.trim().length));
                const after = r.text.slice(
                  r.offset + Math.max(1, query.trim().length),
                  r.offset + query.trim().length + 32,
                );
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex items-center gap-1 rounded-md",
                      i === current && "bg-primary-soft",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(i)}
                      className="min-w-0 flex-1 truncate px-2 py-1 text-left text-xs hover:bg-muted"
                      aria-current={i === current ? "true" : undefined}
                      data-testid="search-result"
                    >
                      {before}
                      <mark className="rounded bg-warning-soft px-0.5">{hit}</mark>
                      {after}
                    </button>
                    {canReplace ? (
                      <button
                        type="button"
                        onClick={() => onReplaceOne(i)}
                        disabled={replacement.length === 0}
                        className="shrink-0 rounded-md px-1.5 py-1 text-[11px] text-link hover:bg-muted disabled:opacity-40"
                        title={tr("Remplacer ce passage")}
                        data-testid="replace-one"
                      >
                        {tr("Remplacer")}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
