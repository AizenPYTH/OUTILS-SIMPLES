"use client";

import * as React from "react";
import { Eraser, ShieldAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { formatBytes } from "@/lib/files/format";
import { formatPageIndices } from "@/lib/pdf/page-ranges";
import {
  analyzeWatermarks,
  removeWatermarks,
  type RemoveWatermarkResult,
  type WatermarkDiagnostic,
} from "@/lib/pdf/operations/watermark";
import { getToolById, getToolPath } from "@/lib/tools";
import { tr } from "@/lib/i18n/messages";

const TOOL_ID = "pdf-manage-watermark";

export function ManageWatermarkTool() {
  return (
    <SingleFileTool toolId={TOOL_ID}>
      {({ pdf, reset }) => <ManageWorkspace pdf={pdf} reset={reset} />}
    </SingleFileTool>
  );
}

function ManageWorkspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [diagnostic, setDiagnostic] = React.useState<WatermarkDiagnostic | null>(null);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [removeAveropdf, setRemoveAveropdf] = React.useState(true);
  const [removeAnnots, setRemoveAnnots] = React.useState(true);
  const [authorized, setAuthorized] = React.useState(false);
  const op = useOperation<RemoveWatermarkResult>(TOOL_ID);
  const watermarkTool = getToolById("pdf-watermark");

  React.useEffect(() => {
    let cancelled = false;
    analyzeWatermarks(pdf.bytes)
      .then((d) => !cancelled && setDiagnostic(d))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setAnalysisError(e instanceof Error ? e.message : tr("Analyse impossible.")),
      );
    return () => {
      cancelled = true;
    };
  }, [pdf.bytes]);

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const { bytes, removedBlocks, removedAnnotations } = op.state.result;
    return (
      <DonePanel
        summary={tr("{blocks} filigrane(s) AVEROPDF et {annots} annotation(s) retiré(s) · {size}", {
          blocks: removedBlocks,
          annots: removedAnnotations,
          size: formatBytes(bytes.byteLength),
        })}
        onDownload={() => downloadPdf(bytes, pdf.file.name, "sans-filigrane", TOOL_ID)}
        onStartOver={() => {
          op.reset();
          reset();
        }}
      />
    );
  }

  if (analysisError)
    return (
      <Alert variant="destructive" title={tr("Analyse impossible")}>
        {tr(analysisError)}
      </Alert>
    );
  if (!diagnostic)
    return <BusyPanel progress={{ current: 0, total: 0, label: tr("Analyse du document…") }} />;

  const hasAveropdf = diagnostic.averopdfPages.length > 0;
  const hasAnnots = diagnostic.watermarkAnnotations.length > 0;
  const nothing = !hasAveropdf && !hasAnnots;
  const canRemove = authorized && ((hasAveropdf && removeAveropdf) || (hasAnnots && removeAnnots));

  return (
    <div className="space-y-6">
      <FileSummary
        name={pdf.file.name}
        size={pdf.file.size}
        pageCount={pdf.pageCount}
        onReset={reset}
      />
      <section
        className="space-y-3 rounded-[14px] border border-border bg-surface p-5"
        aria-labelledby="diag-heading"
        data-testid="watermark-diagnostic"
      >
        <h2 id="diag-heading" className="text-lg">
          {tr("Diagnostic")}
        </h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-3">
            <Checkbox
              id="rm-averopdf"
              checked={hasAveropdf && removeAveropdf}
              onCheckedChange={(c) => setRemoveAveropdf(c === true)}
              disabled={!hasAveropdf}
              className="mt-0.5"
            />
            <Label htmlFor="rm-averopdf" className="flex-col items-start gap-0.5 font-normal">
              <span className="font-medium">{tr("Filigranes ajoutés avec AVEROPDF")}</span>
              <span className="text-muted-foreground">
                {hasAveropdf
                  ? tr(
                      "Détectés sur les pages {pages} — retrait fiable grâce au marqueur technique.",
                      { pages: formatPageIndices(diagnostic.averopdfPages) },
                    )
                  : tr("Aucun marqueur AVEROPDF trouvé.")}
              </span>
            </Label>
          </li>
          <li className="flex items-start gap-3">
            <Checkbox
              id="rm-annots"
              checked={hasAnnots && removeAnnots}
              onCheckedChange={(c) => setRemoveAnnots(c === true)}
              disabled={!hasAnnots}
              className="mt-0.5"
            />
            <Label htmlFor="rm-annots" className="flex-col items-start gap-0.5 font-normal">
              <span className="font-medium">{tr("Annotations PDF de type « Watermark »")}</span>
              <span className="text-muted-foreground">
                {hasAnnots
                  ? tr("{n} annotation(s) sur les pages {pages}.", {
                      n: diagnostic.watermarkAnnotations.reduce((s, a) => s + a.count, 0),
                      pages: formatPageIndices(
                        diagnostic.watermarkAnnotations.map((a) => a.pageIndex),
                      ),
                    })
                  : tr("Aucune annotation de ce type.")}
              </span>
            </Label>
          </li>
        </ul>
        {diagnostic.recordedButMissing.length ? (
          <p className="text-sm text-muted-foreground">
            {tr(
              "Le document indique un filigrane AVEROPDF sur les pages {pages} mais le marqueur n'y est plus : le fichier a probablement été modifié par un autre logiciel.",
              { pages: formatPageIndices(diagnostic.recordedButMissing) },
            )}
          </p>
        ) : null}
      </section>

      {nothing ? (
        <Alert variant="warning" title={tr("Aucun filigrane retirable de manière fiable")}>
          {tr(
            "Si ce document comporte un filigrane visible, il est fondu dans le contenu de la page ou incrusté dans une image. Le retirer supposerait de deviner et de réécrire le contenu, avec un risque réel d'endommager le document : AVEROPDF ne le fait pas.",
          )}
          {watermarkTool ? (
            <>
              {" "}
              {tr("Les filigranes ajoutés avec")}{" "}
              <a href={getToolPath(watermarkTool)} className="font-medium underline">
                {tr("notre outil")}
              </a>{" "}
              {tr("restent retirables.")}
            </>
          ) : null}
        </Alert>
      ) : (
        <>
          <div className="flex items-start gap-3 rounded-[14px] border border-warning/40 bg-warning-soft p-4">
            <ShieldAlert
              className="mt-0.5 size-5 shrink-0 text-warning-foreground"
              aria-hidden="true"
            />
            <div className="flex items-start gap-3">
              <Checkbox
                id="authorized"
                checked={authorized}
                onCheckedChange={(c) => setAuthorized(c === true)}
                className="mt-0.5"
                data-testid="authorized-checkbox"
              />
              <Label
                htmlFor="authorized"
                className="font-normal leading-relaxed text-warning-foreground"
              >
                {tr(
                  "Je confirme être l'auteur de ce document ou être autorisé à le modifier. Cet outil n'est pas destiné à retirer des mentions de droits d'auteur, de propriété ou des protections de documents.",
                )}
              </Label>
            </div>
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!canRemove}
            onClick={() =>
              void op.run(() =>
                removeWatermarks(pdf.bytes, {
                  removeAveropdf: hasAveropdf && removeAveropdf,
                  removeWatermarkAnnotations: hasAnnots && removeAnnots,
                }),
              )
            }
            data-testid="remove-watermark-button"
          >
            <Eraser aria-hidden="true" /> {tr("Retirer les éléments sélectionnés")}
          </Button>
        </>
      )}
    </div>
  );
}
