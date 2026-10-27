"use client";

import * as React from "react";
import { FileSearch, Search } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { BusyPanel } from "@/components/pdf/shared/processing-panel";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { TextOutputPanel } from "@/components/tools/shared/text-io";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import {
  extractText,
  pagesToMarkdown,
  pagesToPlainText,
  searchPages,
  type ExtractedText,
} from "@/lib/pdf/operations/extract-text";
import { deriveOutputName, stripExtension } from "@/lib/files/filename";
import { getToolById, getToolPath } from "@/lib/tools";
import { track } from "@/lib/analytics/events";
import { tr } from "@/lib/i18n/messages";
import { currentLanguageTag } from "@/lib/i18n";

const TOOL_ID = "pdf-extract-text";

export function ExtractTextTool({ mode = "extract" }: { mode?: "extract" | "search" }) {
  return (
    <SingleFileTool toolId={mode === "search" ? "pdf-search" : TOOL_ID}>
      {({ pdf, reset }) => <ExtractWorkspace pdf={pdf} reset={reset} mode={mode} />}
    </SingleFileTool>
  );
}

function ExtractWorkspace({
  pdf,
  reset,
  mode,
}: {
  pdf: LoadedPdf;
  reset: () => void;
  mode: "extract" | "search";
}) {
  const [result, setResult] = React.useState<ExtractedText | null>(null);
  const [progress, setProgress] = React.useState({ current: 0, total: pdf.pageCount });
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [separators, setSeparators] = React.useState(true);
  const ocr = getToolById("scan-ocr");
  const toolId = mode === "search" ? "pdf-search" : TOOL_ID;

  React.useEffect(() => {
    let cancelled = false;
    extractText(pdf.opened.doc, (current, total) => !cancelled && setProgress({ current, total }))
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        track("tool_success", { tool: toolId, pagesBucket: r.pages.length > 50 ? "gt50" : "le50" });
      })
      .catch(
        (e: unknown) =>
          !cancelled && setError(e instanceof Error ? e.message : tr("Extraction impossible.")),
      );
    return () => {
      cancelled = true;
    };
  }, [pdf.opened.doc, toolId]);

  if (error)
    return (
      <Alert variant="destructive" title={tr("Extraction impossible")}>
        {tr(error)}
      </Alert>
    );
  if (!result)
    return (
      <BusyPanel
        progress={{
          current: progress.current,
          total: progress.total,
          label: tr("Lecture de la page {current} sur {total}…", {
            current: progress.current,
            total: progress.total,
          }),
        }}
      />
    );

  const plain = pagesToPlainText(result.pages, separators);
  const markdown = pagesToMarkdown(result.pages, stripExtension(pdf.file.name));
  const hits = query.trim() ? searchPages(result.pages, query) : [];
  const base = stripExtension(pdf.file.name);

  return (
    <div className="space-y-5">
      <FileSummary
        name={pdf.file.name}
        size={pdf.file.size}
        pageCount={pdf.pageCount}
        onReset={reset}
      />
      {result.emptyPages.length > 0 ? (
        <Alert
          variant="warning"
          title={
            result.emptyPages.length === pdf.pageCount
              ? tr("Aucun texte trouvé dans ce PDF")
              : tr("{n} page(s) sans texte", { n: result.emptyPages.length })
          }
        >
          {tr("Ces pages ne contiennent pas de texte sélectionnable (document scanné ou image).")}{" "}
          {ocr ? (
            <a href={getToolPath(ocr)} className="font-medium underline">
              {tr("Utilisez l'outil OCR pour reconnaître le texte des images.")}
            </a>
          ) : null}
        </Alert>
      ) : null}
      {mode === "search" || result.totalCharacters > 0 ? (
        <ToolPanel className="space-y-3" data-testid="pdf-search">
          <Label htmlFor="pdf-search-input" className="flex items-center gap-2">
            <Search className="size-4" aria-hidden="true" />{" "}
            {tr("Rechercher un mot ou une expression")}
          </Label>
          <Input
            id="pdf-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("ex. facture, article 3, montant")}
          />
          {query.trim() ? (
            <p className="text-sm" aria-live="polite">
              {hits.length === 0
                ? tr("Aucune occurrence.")
                : tr("{hits} occurrence(s) sur {pages} page(s)", {
                    hits: hits.length,
                    pages: new Set(hits.map((h) => h.pageIndex)).size,
                  })}
            </p>
          ) : null}
          {hits.length ? (
            <ul className="max-h-72 space-y-1.5 overflow-auto text-sm">
              {hits.slice(0, 200).map((h, i) => (
                <li key={i} className="rounded-md bg-muted px-3 py-1.5">
                  <span className="mr-2 rounded-full bg-primary-soft px-1.5 text-xs font-medium text-link">
                    {tr("p. {n}", { n: h.pageIndex + 1 })}
                  </span>
                  {h.snippet}
                </li>
              ))}
            </ul>
          ) : null}
        </ToolPanel>
      ) : null}
      <Tabs defaultValue="txt">
        <TabsList>
          <TabsTrigger value="txt">{tr("Texte brut")}</TabsTrigger>
          <TabsTrigger value="md">Markdown</TabsTrigger>
        </TabsList>
        <TabsContent value="txt" className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={separators}
              onChange={(e) => setSeparators(e.target.checked)}
              className="accent-primary"
            />{" "}
            {tr("Séparer les pages")}
          </label>
          <TextOutputPanel
            id="pdf-text"
            label={tr("{n} caractères extraits", {
              n: result.totalCharacters.toLocaleString(currentLanguageTag()),
            })}
            value={plain}
            filename={deriveOutputName(base, "texte", "txt")}
            toolId={toolId}
            rows={16}
          />
        </TabsContent>
        <TabsContent value="md">
          <TextOutputPanel
            id="pdf-markdown"
            label={tr("Markdown (un titre par page)")}
            value={markdown}
            filename={deriveOutputName(base, "texte", "md")}
            mimeType="text/markdown;charset=utf-8"
            toolId={toolId}
            rows={16}
          />
        </TabsContent>
      </Tabs>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileSearch className="size-3.5" aria-hidden="true" />{" "}
        {tr(
          "L'ordre des mots suit la position sur la page : les colonnes ou tableaux complexes peuvent être mélangés.",
        )}
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={reset}>
        {tr("Analyser un autre PDF")}
      </Button>
    </div>
  );
}

export function PdfSearchTool() {
  return <ExtractTextTool mode="search" />;
}
