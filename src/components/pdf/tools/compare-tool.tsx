"use client";

import * as React from "react";
import { ArrowLeftRight, RefreshCw } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PdfDropzone } from "@/components/pdf/shared/pdf-dropzone";
import { BusyPanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import { DownloadTextButton } from "@/components/tools/shared/download-text-button";
import { ToolPanel, StatGrid } from "@/components/tools/shared/tool-panel";
import { readPdfFile } from "@/lib/pdf/browser/read-file";
import { assertPageCount } from "@/lib/files/validation";
import { openPdf } from "@/lib/pdf/browser/pdfjs";
import { extractText } from "@/lib/pdf/operations/extract-text";
import { comparePageTexts, compareReport, type CompareResult } from "@/lib/pdf/operations/compare";
import { readMetadata } from "@/lib/pdf/operations/metadata";
import { toPdfError, type PdfError } from "@/lib/pdf/errors";
import { VisualCompare } from "./visual-compare";
import type { DiffMode } from "@/lib/text/diff";
import { formatBytes } from "@/lib/files/format";
import { getToolById } from "@/lib/tools";
import { track } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n/messages";

const TOOL_ID = "pdf-compare";

interface Loaded {
  file: File;
  bytes: Uint8Array;
  pageCount: number;
  texts: string[];
  producer: string;
  modified: string;
}

async function loadForCompare(file: File, maxBytes: number, maxPages: number): Promise<Loaded> {
  const bytes = await readPdfFile(file, maxBytes);
  const opened = await openPdf(bytes);
  try {
    assertPageCount(opened.pageCount, maxPages);
    const text = await extractText(opened.doc);
    const meta = await readMetadata(bytes).catch(() => null);
    return {
      file,
      bytes,
      pageCount: opened.pageCount,
      texts: text.pages.map((p) => p.text),
      producer: meta?.producer ?? "",
      modified: meta?.modificationDate ?? "",
    };
  } finally {
    void opened.destroy();
  }
}

export function ComparePdfTool() {
  const tool = getToolById(TOOL_ID);
  const maxBytes = tool?.limits.maxFileSizeBytes ?? 100 * 1024 * 1024;
  const maxPages = tool?.limits.maxPageCount ?? 500;
  const [a, setA] = React.useState<Loaded | null>(null);
  const [b, setB] = React.useState<Loaded | null>(null);
  const [loading, setLoading] = React.useState<"a" | "b" | null>(null);
  const [error, setError] = React.useState<PdfError | null>(null);
  const [mode, setMode] = React.useState<DiffMode>("words");
  const [onlyChanged, setOnlyChanged] = React.useState(true);
  const [view, setView] = React.useState<"text" | "visual">("text");

  const load = async (slot: "a" | "b", file: File) => {
    setLoading(slot);
    setError(null);
    try {
      const loaded = await loadForCompare(file, maxBytes, maxPages);
      if (slot === "a") setA(loaded);
      else setB(loaded);
      track("tool_start", { tool: TOOL_ID });
    } catch (e) {
      setError(toPdfError(e, "CORRUPTED"));
    } finally {
      setLoading(null);
    }
  };

  const result = React.useMemo<CompareResult | null>(
    () => (a && b ? comparePageTexts(a.texts, b.texts, { mode }) : null),
    [a, b, mode],
  );
  React.useEffect(() => {
    if (result) track("tool_success", { tool: TOOL_ID, resultCount: result.changedPages });
  }, [result]);

  const reset = () => {
    setA(null);
    setB(null);
    setError(null);
  };

  if (error) return <ErrorPanel error={error} onReset={reset} />;
  if (loading)
    return (
      <BusyPanel
        progress={{
          current: 0,
          total: 0,
          label:
            loading === "a"
              ? tr("Lecture du document original…")
              : tr("Lecture du document modifié…"),
        }}
      />
    );

  if (!a || !b || !result) {
    return (
      <div className="grid gap-4 md:grid-cols-2" data-testid="compare-dropzones">
        <Slot
          label={tr("Document original")}
          loaded={a}
          onFile={(f) => void load("a", f)}
          maxBytes={maxBytes}
          testId="compare-a"
        />
        <Slot
          label={tr("Document modifié")}
          loaded={b}
          onFile={(f) => void load("b", f)}
          maxBytes={maxBytes}
          testId="compare-b"
        />
      </div>
    );
  }

  const shown = onlyChanged ? result.pages.filter((p) => p.status !== "identical") : result.pages;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        {[a, b].map((doc, i) => (
          <div key={i} className="rounded-[14px] border border-border bg-surface px-4 py-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {i === 0 ? tr("Original") : tr("Modifié")}
            </p>
            <p className="truncate font-medium" title={doc.file.name}>
              {doc.file.name}
            </p>
            <p className="text-muted-foreground">
              {tr("{n} page(s)", { n: doc.pageCount })} · {formatBytes(doc.file.size)}
              {doc.modified
                ? ` · ${tr("modifié le {date}", { date: doc.modified.slice(0, 10) })}`
                : ""}
            </p>
          </div>
        ))}
      </div>
      {result.noText ? (
        <Alert variant="warning" title={tr("Aucun texte à comparer")}>
          {tr(
            "Les deux documents ne contiennent pas de texte sélectionnable (scans). Passez-les d'abord dans l'outil OCR, ou comparez-les visuellement.",
          )}
        </Alert>
      ) : null}
      <StatGrid
        items={[
          { label: tr("Pages comparées"), value: result.pages.length },
          { label: tr("Pages modifiées"), value: result.changedPages },
          {
            label: tr("Ajouts"),
            value: <span className="text-success-foreground">+{result.totalAdded}</span>,
            hint:
              mode === "lines"
                ? tr("lignes")
                : mode === "words"
                  ? tr("caractères (mots ajoutés)")
                  : tr("caractères"),
          },
          {
            label: tr("Suppressions"),
            value: <span className="text-destructive">−{result.totalRemoved}</span>,
          },
        ]}
      />
      {result.identical ? (
        <Alert variant="success" data-testid="compare-identical">
          {a.pageCount !== b.pageCount
            ? tr("Le texte des deux documents est identique, mais le nombre de pages diffère.")
            : tr("Le texte des deux documents est identique.")}{" "}
          {tr("Les images, la mise en page et les polices ne sont pas comparées.")}
        </Alert>
      ) : null}
      <Segmented
        label={tr("Mode de comparaison")}
        value={view}
        onChange={setView}
        className="sm:grid-cols-2 sm:w-[420px]"
        options={[
          { value: "text", label: tr("Texte"), description: tr("Mots, lignes ou caractères") },
          {
            value: "visual",
            label: tr("Visuel"),
            description: tr("Rendu des pages pixel par pixel"),
          },
        ]}
      />
      {view === "visual" ? (
        <ToolPanel>
          <VisualCompare
            bytesA={a.bytes}
            bytesB={b.bytes}
            pageCount={Math.max(a.pageCount, b.pageCount)}
          />
        </ToolPanel>
      ) : null}
      <ToolPanel className={cn("space-y-4", view !== "text" && "hidden")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Segmented
            label={tr("Granularité")}
            value={mode}
            onChange={setMode}
            className="sm:grid-cols-3 sm:w-[420px]"
            options={[
              { value: "words", label: tr("Mots") },
              { value: "lines", label: tr("Lignes") },
              { value: "chars", label: tr("Caractères") },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={onlyChanged} onCheckedChange={(v) => setOnlyChanged(v === true)} />{" "}
              {tr("Pages modifiées seulement")}
            </label>
            <DownloadTextButton
              text={compareReport(result, a.file.name, b.file.name)}
              filename="comparaison.txt"
              label={tr("Rapport (TXT)")}
              toolId={TOOL_ID}
            />
            <Button type="button" variant="outline" size="sm" onClick={reset}>
              <RefreshCw aria-hidden="true" /> {tr("Autres documents")}
            </Button>
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr("Aucune page modifiée.")}</p>
        ) : null}
        <ol className="space-y-3" data-testid="compare-pages">
          {shown.map((page) => (
            <li
              key={page.pageIndex}
              className={cn(
                "rounded-[12px] border p-3",
                page.status === "identical" ? "border-border" : "border-warning/50",
              )}
              data-testid="compare-page"
              data-status={page.status}
            >
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden="true" />
                {tr("Page {n}", { n: page.pageIndex + 1 })}
                <span className="text-xs font-normal text-muted-foreground">
                  {page.status === "identical"
                    ? tr("identique")
                    : page.status === "added"
                      ? tr("ajoutée dans le document modifié")
                      : page.status === "removed"
                        ? tr("absente du document modifié")
                        : `+${page.added} / −${page.removed}`}
                </span>
              </p>
              {page.status === "identical" ? null : (
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 font-sans text-[13px] leading-relaxed">
                  {page.changes.map((change, i) => (
                    <span
                      key={i}
                      className={cn(
                        change.added && "bg-success-soft text-success-foreground",
                        change.removed &&
                          "bg-destructive-soft text-destructive line-through decoration-destructive/60",
                      )}
                    >
                      {change.value}
                    </span>
                  ))}
                </pre>
              )}
            </li>
          ))}
        </ol>
      </ToolPanel>
    </div>
  );
}

function Slot({
  label,
  loaded,
  onFile,
  maxBytes,
  testId,
}: {
  label: string;
  loaded: Loaded | null;
  onFile: (file: File) => void;
  maxBytes: number;
  testId: string;
}) {
  return (
    <div className="space-y-2" data-testid={testId}>
      <p className="text-sm font-medium">{label}</p>
      {loaded ? (
        <div className="rounded-[14px] border border-success/50 bg-surface px-4 py-3 text-sm">
          <p className="truncate font-medium" title={loaded.file.name}>
            {loaded.file.name}
          </p>
          <p className="text-muted-foreground">
            {tr("{n} page(s)", { n: loaded.pageCount })} · {formatBytes(loaded.file.size)} ·{" "}
            {tr("texte lu")}
          </p>
        </div>
      ) : (
        <PdfDropzone
          onFiles={(files) => files[0] && onFile(files[0])}
          maxFileSizeBytes={maxBytes}
          compact
          title={label}
        />
      )}
    </div>
  );
}
