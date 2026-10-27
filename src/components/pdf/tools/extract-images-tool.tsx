"use client";

import * as React from "react";
import { Download, Images } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { downloadZip } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import {
  extractImages,
  type ExtractImagesResult,
  type ExtractedImage,
} from "@/lib/pdf/operations/extract-images";
import { buildZip } from "@/lib/pdf/browser/zip";
import { bytesToBlob, triggerDownload } from "@/lib/files/download";
import { stripExtension } from "@/lib/files/filename";
import { formatBytes } from "@/lib/files/format";
import { getToolById, getToolPath } from "@/lib/tools";
import { tr } from "@/lib/i18n/messages";

const TOOL_ID = "pdf-extract-images";

export function ExtractImagesTool() {
  return (
    <SingleFileTool toolId={TOOL_ID}>
      {({ pdf, reset }) => <Workspace pdf={pdf} reset={reset} />}
    </SingleFileTool>
  );
}

interface Preview extends ExtractedImage {
  url: string | null;
}

function Workspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [minDimension, setMinDimension] = React.useState<"8" | "64" | "200">("64");
  const op = useOperation<{ result: ExtractImagesResult; previews: Preview[] }>(TOOL_ID);
  const previewsRef = React.useRef<Preview[]>([]);
  React.useEffect(
    () => () => previewsRef.current.forEach((p) => p.url && URL.revokeObjectURL(p.url)),
    [],
  );
  const toImages = getToolById("pdf-to-images");
  const base = stripExtension(pdf.file.name);

  const run = () =>
    void op.run(async (report) => {
      previewsRef.current.forEach((p) => p.url && URL.revokeObjectURL(p.url));
      const result = await extractImages(pdf.bytes, {
        minDimension: Number(minDimension),
        onProgress: (current, total) =>
          report({
            current,
            total,
            label: tr("Analyse de la page {current} sur {total}…", { current, total }),
          }),
      });
      const previews: Preview[] = result.images.map((img) => ({
        ...img,
        name: `${base}-${img.name}`,
        url:
          img.mimeType === "image/jp2"
            ? null
            : URL.createObjectURL(bytesToBlob(img.bytes, img.mimeType)),
      }));
      previewsRef.current = previews;
      return { result, previews };
    });

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const { result, previews } = op.state.result;
    const total = previews.reduce((s, p) => s + p.bytes.length, 0);
    return (
      <DonePanel
        title={
          previews.length === 0
            ? tr("Aucune image intégrée trouvée")
            : tr(previews.length > 1 ? "{n} images extraites" : "{n} image extraite", {
                n: previews.length,
              })
        }
        summary={
          previews.length
            ? tr("{size} au total · formats d'origine conservés", { size: formatBytes(total) })
            : tr(
                "Le document ne contient pas d'images matricielles (ou seulement des dessins vectoriels).",
              )
        }
        onDownload={
          previews.length
            ? () =>
                downloadZip(
                  buildZip(previews.map((p) => ({ name: p.name, bytes: p.bytes }))),
                  base,
                  "images",
                  TOOL_ID,
                )
            : undefined
        }
        downloadLabel={tr("Tout télécharger (ZIP)")}
        onStartOver={() => (op.reset(), reset())}
      >
        {result.skipped.length ? (
          <Alert
            variant="warning"
            title={tr("{n} image(s) non extraite(s)", { n: result.skipped.length })}
            className="mb-4"
          >
            {Array.from(new Set(result.skipped.map((s) => tr(s.reason)))).join(" · ")}
            {toImages ? (
              <>
                {" "}
                <a href={getToolPath(toImages)} className="font-medium underline">
                  {tr("Convertissez plutôt les pages en images.")}
                </a>
              </>
            ) : null}
          </Alert>
        ) : null}
        {previews.length ? (
          <ul
            className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]"
            data-testid="pdf-extracted-images"
          >
            {previews.map((p) => (
              <li
                key={p.name}
                className="flex flex-col gap-1.5 rounded-[10px] border border-border p-2 text-center"
              >
                <span className="flex h-28 items-center justify-center overflow-hidden rounded-[6px] bg-muted checkerboard">
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- object URL preview
                    <img
                      src={p.url}
                      alt={tr("Image page {n}", { n: p.pageIndex + 1 })}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">JPEG 2000</span>
                  )}
                </span>
                <span className="truncate text-xs" title={p.name}>
                  {tr("p. {n}", { n: p.pageIndex + 1 })} · {p.width}×{p.height} ·{" "}
                  {formatBytes(p.bytes.length)}
                </span>
                {p.note ? (
                  <span className="text-[11px] text-muted-foreground">{tr(p.note)}</span>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => triggerDownload(bytesToBlob(p.bytes, p.mimeType), p.name)}
                  aria-label={tr("Télécharger {name}", { name: p.name })}
                >
                  <Download aria-hidden="true" />{" "}
                  {p.mimeType === "image/jpeg" ? "JPG" : p.mimeType === "image/png" ? "PNG" : "JP2"}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </DonePanel>
    );
  }

  return (
    <div className="space-y-5">
      <FileSummary
        name={pdf.file.name}
        size={pdf.file.size}
        pageCount={pdf.pageCount}
        onReset={reset}
      />
      <div className="max-w-sm space-y-1">
        <Label htmlFor="extract-min">{tr("Ignorer les images plus petites que")}</Label>
        <select
          id="extract-min"
          value={minDimension}
          onChange={(e) => setMinDimension(e.target.value as typeof minDimension)}
          className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
        >
          <option value="8">{tr("8 px (tout extraire)")}</option>
          <option value="64">{tr("64 px (ignorer puces et séparateurs)")}</option>
          <option value="200">{tr("200 px (photos et illustrations seulement)")}</option>
        </select>
      </div>
      <Alert variant="info">
        {tr(
          "Les images sont récupérées telles qu'elles sont stockées dans le PDF : les JPEG ne sont pas recompressés, les autres formats sont convertis en PNG sans perte. Les dessins vectoriels et le texte ne sont pas des images.",
        )}
      </Alert>
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={run}
        data-testid="extract-images-run"
      >
        <Images aria-hidden="true" /> {tr("Extraire les images")}
      </Button>
    </div>
  );
}
