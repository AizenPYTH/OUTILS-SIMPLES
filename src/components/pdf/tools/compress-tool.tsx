"use client";

import * as React from "react";
import { Minimize2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { formatBytes, formatPercent } from "@/lib/files/format";
import { canvasImageReencoder } from "@/lib/pdf/browser/image-reencoder";
import {
  compressPdf,
  compressionProfiles,
  type CompressResult,
  type CompressionLevel,
} from "@/lib/pdf/operations/compress";
import { t } from "@/lib/i18n";

const TOOL_ID = "pdf-compress";

export function CompressTool() {
  return (
    <SingleFileTool toolId={TOOL_ID}>
      {({ pdf, reset }) => <CompressWorkspace pdf={pdf} reset={reset} />}
    </SingleFileTool>
  );
}

function CompressWorkspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [level, setLevel] = React.useState<CompressionLevel>("balanced");
  const op = useOperation<CompressResult>(TOOL_ID);
  const profile = compressionProfiles[level];

  const run = () =>
    void op.run((report) =>
      compressPdf(pdf.bytes, level, profile.recompressImages ? canvasImageReencoder : null, report),
    );

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const { bytes, stats } = op.state.result;
    const delta = stats.resultSize - stats.originalSize;
    const pct = stats.originalSize ? Math.abs(delta) / stats.originalSize : 0;
    const verdict =
      delta < 0
        ? t.result.saved(formatPercent(pct))
        : delta > 0
          ? t.result.grew(formatPercent(pct))
          : t.result.unchanged;
    return (
      <DonePanel
        title={delta < 0 ? t.result.title : "Compression terminée, sans gain notable"}
        onDownload={() => downloadPdf(bytes, pdf.file.name, "compresse", TOOL_ID)}
        onStartOver={() => {
          op.reset();
          reset();
        }}
      >
        <div className="mx-auto max-w-md space-y-4">
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md bg-muted p-3">
              <dt className="text-xs text-muted-foreground">{t.result.before}</dt>
              <dd className="font-heading text-lg font-bold tabular-nums">
                {formatBytes(stats.originalSize)}
              </dd>
            </div>
            <div className="rounded-md bg-muted p-3">
              <dt className="text-xs text-muted-foreground">{t.result.after}</dt>
              <dd
                className="font-heading text-lg font-bold tabular-nums"
                data-testid="compress-after"
              >
                {formatBytes(stats.resultSize)}
              </dd>
            </div>
            <div
              className={`rounded-md p-3 ${delta < 0 ? "bg-success-soft text-success-foreground" : "bg-warning-soft text-warning-foreground"}`}
            >
              <dt className="text-xs opacity-80">Bilan</dt>
              <dd
                className="font-heading text-lg font-bold tabular-nums"
                data-testid="compress-verdict"
              >
                {verdict}
              </dd>
            </div>
          </dl>
          {profile.recompressImages ? (
            <p className="text-center text-sm text-muted-foreground">
              {stats.imagesFound} image(s) analysée(s) · {stats.imagesRecompressed} recompressée(s)
              · {stats.imagesKeptOriginal} conservée(s) (recompression inutile) ·{" "}
              {stats.imagesSkipped} ignorée(s) (transparence, masque ou format spécial)
            </p>
          ) : null}
          {delta >= 0 ? (
            <Alert variant="warning">
              Ce document était déjà compact. Essayez un niveau plus fort s&apos;il contient des
              images, ou conservez l&apos;original : aucune transformation n&apos;est imposée.
            </Alert>
          ) : null}
          <Button type="button" variant="ghost" size="sm" className="w-full" onClick={op.reset}>
            Essayer un autre niveau
          </Button>
        </div>
      </DonePanel>
    );
  }

  return (
    <div className="space-y-6">
      <FileSummary
        name={pdf.file.name}
        size={pdf.file.size}
        pageCount={pdf.pageCount}
        onReset={reset}
      />
      <Segmented
        label="Niveau de compression"
        value={level}
        onChange={setLevel}
        options={[
          {
            value: "structure",
            label: "Structure seule",
            description: "Sans perte : nettoyage du fichier",
          },
          {
            value: "balanced",
            label: "Équilibré",
            description: "Images JPEG qualité 75 %, 1 600 px max",
          },
          {
            value: "strong",
            label: "Maximal",
            description: "Images JPEG qualité 50 %, 1 200 px max",
          },
        ]}
      />
      {profile.lossy ? (
        <Alert variant="warning" title="Ce niveau réduit la qualité des images">
          Les images JPEG et non compressées sont réencodées avec perte. Le texte et les dessins
          vectoriels ne sont jamais modifiés, et toute image dont la recompression serait
          contre-productive est conservée telle quelle.
        </Alert>
      ) : (
        <Alert variant="info">
          Aucune image n&apos;est modifiée : seuls les objets inutilisés sont supprimés et la
          structure réécrite. Le gain dépend du fichier et peut être nul.
        </Alert>
      )}
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={run}
        data-testid="compress-button"
      >
        <Minimize2 aria-hidden="true" />
        Compresser le PDF
      </Button>
    </div>
  );
}
