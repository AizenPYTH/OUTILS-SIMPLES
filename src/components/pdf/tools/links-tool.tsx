"use client";

import * as React from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { BusyPanel } from "@/components/pdf/shared/processing-panel";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { CopyButton } from "@/components/tools/shared/copy-button";
import { DownloadTextButton } from "@/components/tools/shared/download-text-button";
import { ToolPanel, StatGrid } from "@/components/tools/shared/tool-panel";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { extractText } from "@/lib/pdf/operations/extract-text";
import {
  extractLinkAnnotations,
  findTextLinks,
  linksToCsv,
  linksToText,
  mergeLinks,
  type PdfLink,
} from "@/lib/pdf/operations/links";
import { stripExtension } from "@/lib/files/filename";
import { track } from "@/lib/analytics/events";

const TOOL_ID = "pdf-links";

export function LinksTool() {
  return (
    <SingleFileTool toolId={TOOL_ID}>
      {({ pdf, reset }) => <Workspace pdf={pdf} reset={reset} />}
    </SingleFileTool>
  );
}

interface Analysis {
  links: PdfLink[];
  internalLinks: number;
  annotationCount: number;
}

function Workspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [includeText, setIncludeText] = React.useState(true);
  const [uniqueOnly, setUniqueOnly] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const annots = await extractLinkAnnotations(pdf.bytes);
      const text = await extractText(pdf.opened.doc);
      const found = findTextLinks(
        text.pages.map((p) => ({ pageIndex: p.pageIndex, text: p.text })),
      );
      if (cancelled) return;
      setAnalysis({
        links: mergeLinks(annots.links, found),
        internalLinks: annots.internalLinks,
        annotationCount: annots.links.length,
      });
      track("tool_success", { tool: TOOL_ID, resultCount: annots.links.length + found.length });
    })().catch(
      (e: unknown) =>
        !cancelled && setError(e instanceof Error ? e.message : "Analyse impossible."),
    );
    return () => {
      cancelled = true;
    };
  }, [pdf.bytes, pdf.opened.doc]);

  if (error)
    return (
      <Alert variant="destructive" title="Analyse impossible">
        {error}
      </Alert>
    );
  if (!analysis)
    return <BusyPanel progress={{ current: 0, total: 0, label: "Recherche des liens…" }} />;

  let links = includeText ? analysis.links : analysis.links.filter((l) => l.kind === "lien");
  if (uniqueOnly) {
    const seen = new Set<string>();
    links = links.filter((l) => (seen.has(l.url) ? false : (seen.add(l.url), true)));
  }
  const base = stripExtension(pdf.file.name);
  const emails = links.filter((l) => l.kind === "e-mail").length;

  return (
    <div className="space-y-5">
      <FileSummary
        name={pdf.file.name}
        size={pdf.file.size}
        pageCount={pdf.pageCount}
        onReset={reset}
      />
      <StatGrid
        items={[
          { label: "Liens cliquables", value: analysis.annotationCount },
          {
            label: "Adresses dans le texte",
            value: analysis.links.length - analysis.annotationCount,
          },
          { label: "E-mails", value: emails },
          { label: "Liens internes (pages)", value: analysis.internalLinks },
        ]}
      />
      <ToolPanel className="space-y-4" data-testid="pdf-links">
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={includeText}
              onCheckedChange={(v) => setIncludeText(v === true)}
              id="links-text"
            />
            <span>Inclure les adresses écrites dans le texte (non cliquables)</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={uniqueOnly}
              onCheckedChange={(v) => setUniqueOnly(v === true)}
              id="links-unique"
            />
            <span>Une seule fois par adresse</span>
          </label>
        </div>
        {links.length === 0 ? (
          <Alert variant="info">
            Aucun lien trouvé. Les liens d&apos;un document scanné ne sont pas détectables sans OCR
            ; les liens internes (vers d&apos;autres pages) sont comptés mais pas listés.
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Liens trouvés dans le document</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Page</th>
                  <th className="py-2 pr-3 font-semibold">Type</th>
                  <th className="py-2 font-semibold">Adresse</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link, i) => (
                  <tr
                    key={`${link.pageIndex}-${link.url}-${i}`}
                    className="border-b border-border/60 align-top"
                    data-testid="pdf-link-row"
                  >
                    <td className="py-2 pr-3 tabular-nums">{link.pageIndex + 1}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {link.kind === "lien" ? "cliquable" : link.kind}
                    </td>
                    <td className="py-2 break-all">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1 text-link hover:underline"
                      >
                        {link.url}
                        <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Label className="sr-only">Exporter</Label>
          <CopyButton text={linksToText(links)} label="Copier les adresses" />
          <DownloadTextButton
            text={linksToText(links)}
            filename={`${base}-liens.txt`}
            label="Télécharger (TXT)"
            toolId={TOOL_ID}
          />
          <DownloadTextButton
            text={linksToCsv(links)}
            filename={`${base}-liens.csv`}
            mimeType="text/csv;charset=utf-8"
            label="Télécharger (CSV)"
            toolId={TOOL_ID}
          />
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Link2 className="size-3.5" aria-hidden="true" /> Les liens s&apos;ouvrent dans un
            nouvel onglet ; vérifiez-les avant de cliquer.
          </span>
        </div>
      </ToolPanel>
    </div>
  );
}
