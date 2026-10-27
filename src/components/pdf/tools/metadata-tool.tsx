"use client";

import * as React from "react";
import { Eraser, Save } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import {
  readMetadata,
  stripMetadata,
  updateMetadata,
  type PdfMetadata,
} from "@/lib/pdf/operations/metadata";
import { formatBytes } from "@/lib/files/format";
import { tr } from "@/lib/i18n/messages";

const TOOL_ID = "pdf-metadata";

export function MetadataTool() {
  return (
    <SingleFileTool toolId={TOOL_ID}>
      {({ pdf, reset }) => <Workspace pdf={pdf} reset={reset} />}
    </SingleFileTool>
  );
}

function Workspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [meta, setMeta] = React.useState<PdfMetadata | null>(null);
  const [edit, setEdit] = React.useState({ title: "", author: "", subject: "", keywords: "" });
  const [suffix, setSuffix] = React.useState("metadonnees");
  const op = useOperation<Uint8Array>(TOOL_ID);

  React.useEffect(() => {
    let cancelled = false;
    readMetadata(pdf.bytes).then((m) => {
      if (cancelled) return;
      setMeta(m);
      setEdit({ title: m.title, author: m.author, subject: m.subject, keywords: m.keywords });
    });
    return () => {
      cancelled = true;
    };
  }, [pdf.bytes]);

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const bytes = op.state.result;
    return (
      <DonePanel
        summary={formatBytes(bytes.byteLength)}
        onDownload={() => downloadPdf(bytes, pdf.file.name, suffix, TOOL_ID)}
        onStartOver={() => (op.reset(), reset())}
      />
    );
  }
  if (!meta)
    return <BusyPanel progress={{ current: 0, total: 0, label: tr("Lecture des métadonnées…") }} />;

  const rows: [string, string][] = [
    [tr("Titre"), meta.title],
    [tr("Auteur"), meta.author],
    [tr("Sujet"), meta.subject],
    [tr("Mots-clés"), meta.keywords],
    [tr("Créé avec"), meta.creator],
    [tr("Producteur"), meta.producer],
    [tr("Date de création"), meta.creationDate],
    [tr("Date de modification"), meta.modificationDate],
    [tr("Version PDF"), meta.pdfVersion],
    [tr("Métadonnées XMP"), meta.hasXmp ? tr("présentes") : tr("absentes")],
    ...Object.entries(meta.custom),
  ];

  return (
    <div className="space-y-5">
      <FileSummary
        name={pdf.file.name}
        size={pdf.file.size}
        pageCount={pdf.pageCount}
        onReset={reset}
      />
      <ToolPanel>
        <h3 className="text-base font-semibold">{tr("Métadonnées actuelles")}</h3>
        <dl
          className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]"
          data-testid="metadata-list"
        >
          {rows.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-words font-medium">
                {value || <span className="text-muted-foreground">—</span>}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      </ToolPanel>
      <ToolPanel className="space-y-3">
        <h3 className="text-base font-semibold">{tr("Modifier")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["title", "author", "subject", "keywords"] as const).map((key) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`meta-${key}`}>
                {
                  {
                    title: tr("Titre"),
                    author: tr("Auteur"),
                    subject: tr("Sujet"),
                    keywords: tr("Mots-clés (séparés par des virgules)"),
                  }[key]
                }
              </Label>
              <Input
                id={`meta-${key}`}
                value={edit[key]}
                onChange={(e) => setEdit((v) => ({ ...v, [key]: e.target.value }))}
                data-testid={`meta-${key}`}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={() => (
              setSuffix("metadonnees"),
              void op.run(() => updateMetadata(pdf.bytes, edit))
            )}
            data-testid="meta-save"
          >
            <Save aria-hidden="true" /> {tr("Enregistrer les champs")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => (
              setSuffix("sans-metadonnees"),
              void op.run(() => stripMetadata(pdf.bytes))
            )}
            data-testid="meta-strip"
          >
            <Eraser aria-hidden="true" /> {tr("Supprimer toutes les métadonnées")}
          </Button>
        </div>
        <Alert variant="info">
          {tr(
            "La suppression efface le dictionnaire d'informations (titre, auteur, logiciel, dates…) et les métadonnées XMP. Elle ne modifie pas le contenu des pages, ni les métadonnées éventuellement incrustées dans les images (EXIF) ou le texte lui-même.",
          )}
        </Alert>
      </ToolPanel>
    </div>
  );
}
