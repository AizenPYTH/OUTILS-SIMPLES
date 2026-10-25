"use client";

import * as React from "react";
import { ListOrdered } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { defaultStampOptions, renderTemplate, stampPages, type StampOptions, type StampPosition } from "@/lib/pdf/operations/stamps";
import { fontFamilies, type FontFamily } from "@/lib/pdf/fonts";
import { hexToRgb, rgbToHex } from "@/lib/pdf/annotations/types";
import { formatBytes } from "@/lib/files/format";

const TOOL_ID = "pdf-stamp";

const templates = [
  { label: "1 / 3", value: "{page} / {total}" },
  { label: "Page 1 sur 3", value: "Page {page} sur {total}" },
  { label: "1", value: "{page}" },
  { label: "- 1 -", value: "- {page} -" },
  { label: "Date", value: "{date}" },
  { label: "Nom du fichier", value: "{file}" },
  { label: "Personnalisé", value: "" },
];

export function StampTool() {
  return <SingleFileTool toolId={TOOL_ID}>{({ pdf, reset }) => <Workspace pdf={pdf} reset={reset} />}</SingleFileTool>;
}

function Workspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const today = new Intl.DateTimeFormat("fr-FR").format(new Date());
  const [footerOn, setFooterOn] = React.useState(true);
  const [footer, setFooter] = React.useState("{page} / {total}");
  const [footerPos, setFooterPos] = React.useState<StampPosition>("center");
  const [headerOn, setHeaderOn] = React.useState(false);
  const [header, setHeader] = React.useState("{file}");
  const [headerPos, setHeaderPos] = React.useState<StampPosition>("right");
  const [fontFamily, setFontFamily] = React.useState<FontFamily>("helvetica");
  const [fontSize, setFontSize] = React.useState(10);
  const [color, setColor] = React.useState("#333333");
  const [margin, setMargin] = React.useState(10);
  const [startNumber, setStartNumber] = React.useState(1);
  const [startPage, setStartPage] = React.useState(1);
  const [date, setDate] = React.useState(today);
  const op = useOperation<{ bytes: Uint8Array; replaced: boolean }>(TOOL_ID);

  const options: StampOptions = {
    ...defaultStampOptions,
    header: headerOn ? { template: header, position: headerPos } : null,
    footer: footerOn ? { template: footer, position: footerPos } : null,
    fontFamily,
    fontSize,
    color: hexToRgb(color),
    margin: margin * (72 / 25.4),
    startNumber,
    startPageIndex: Math.max(0, Math.min(pdf.pageCount - 1, startPage - 1)),
    date,
    fileName: pdf.file.name,
  };
  const preview = (template: string) => renderTemplate(template, { page: startNumber, total: pdf.pageCount - options.startPageIndex, date, file: pdf.file.name });

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error") return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const { bytes, replaced } = op.state.result;
    return (
      <DonePanel summary={formatBytes(bytes.byteLength)} onDownload={() => downloadPdf(bytes, pdf.file.name, "numerote", TOOL_ID)} onStartOver={() => (op.reset(), reset())}>
        {replaced ? <Alert variant="warning">Certains caractères non pris en charge par les polices standard ont été remplacés par « ? ».</Alert> : null}
      </DonePanel>
    );
  }

  const stampEditor = (id: string, title: string, on: boolean, setOn: (v: boolean) => void, value: string, setValue: (v: string) => void, pos: StampPosition, setPos: (p: StampPosition) => void) => (
    <ToolPanel className="space-y-3">
      <div className="flex items-center gap-2">
        <Checkbox id={`${id}-on`} checked={on} onCheckedChange={(c) => setOn(c === true)} />
        <Label htmlFor={`${id}-on`} className="text-base font-semibold">
          {title}
        </Label>
      </div>
      {on ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1">
            <Label htmlFor={`${id}-model`}>Modèle</Label>
            <Select value={templates.some((t) => t.value === value) ? value : ""} onValueChange={(v) => v && setValue(v)}>
              <SelectTrigger id={`${id}-model`}>
                <SelectValue placeholder="Personnalisé" />
              </SelectTrigger>
              <SelectContent>
                {templates.filter((t) => t.value).map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-text`}>Texte</Label>
            <Input id={`${id}-text`} value={value} onChange={(e) => setValue(e.target.value)} data-testid={`${id}-text`} />
            <p className="text-xs text-muted-foreground">Aperçu : {preview(value) || "—"}</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-pos`}>Position</Label>
            <Select value={pos} onValueChange={(v) => setPos(v as StampPosition)}>
              <SelectTrigger id={`${id}-pos`} className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Gauche</SelectItem>
                <SelectItem value="center">Centre</SelectItem>
                <SelectItem value="right">Droite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </ToolPanel>
  );

  return (
    <div className="space-y-5">
      <FileSummary name={pdf.file.name} size={pdf.file.size} pageCount={pdf.pageCount} onReset={reset} />
      <p className="text-sm text-muted-foreground">
        Variables disponibles : <code>{"{page}"}</code> numéro, <code>{"{total}"}</code> nombre de pages, <code>{"{date}"}</code>, <code>{"{file}"}</code> nom du fichier.
      </p>
      {stampEditor("footer", "Pied de page", footerOn, setFooterOn, footer, setFooter, footerPos, setFooterPos)}
      {stampEditor("header", "En-tête", headerOn, setHeaderOn, header, setHeader, headerPos, setHeaderPos)}
      <ToolPanel className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="space-y-1">
          <Label htmlFor="stamp-font">Police</Label>
          <Select value={fontFamily} onValueChange={(v) => setFontFamily(v as FontFamily)}>
            <SelectTrigger id="stamp-font">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontFamilies.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="stamp-size">Taille (pt)</Label>
          <Input id="stamp-size" type="number" min={6} max={36} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value) || 10)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stamp-color">Couleur</Label>
          <input id="stamp-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-full cursor-pointer rounded-md border border-input bg-background p-1" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stamp-margin">Marge (mm)</Label>
          <Input id="stamp-margin" type="number" min={3} max={50} value={margin} onChange={(e) => setMargin(Number(e.target.value) || 10)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stamp-start">Premier numéro</Label>
          <Input id="stamp-start" type="number" min={0} value={startNumber} onChange={(e) => setStartNumber(Number(e.target.value) || 1)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stamp-from">À partir de la page</Label>
          <Input id="stamp-from" type="number" min={1} max={pdf.pageCount} value={startPage} onChange={(e) => setStartPage(Number(e.target.value) || 1)} />
        </div>
        <div className="space-y-1 sm:col-span-3">
          <Label htmlFor="stamp-date">Valeur de {"{date}"}</Label>
          <Input id="stamp-date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </ToolPanel>
      <Button type="button" size="lg" className="w-full" onClick={() => void op.run(() => stampPages(pdf.bytes, options))} disabled={!footerOn && !headerOn} data-testid="stamp-run">
        <ListOrdered aria-hidden="true" /> Appliquer
      </Button>
      <span className="sr-only">{rgbToHex(hexToRgb(color))}</span>
    </div>
  );
}
