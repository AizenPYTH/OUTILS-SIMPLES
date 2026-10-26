"use client";

import * as React from "react";
import { FileSpreadsheet, FileType } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import {
  defaultOfficeToPdfOptions,
  docxToPdf,
  type OfficeToPdfOptions,
  type OfficeToPdfResult,
} from "@/lib/conversion/docx";
import { sheetToPdf } from "@/lib/conversion/sheet";
import { standardFontFamilies as fontFamilies, type FontFamily } from "@/lib/pdf/fonts";
import { getToolById } from "@/lib/tools";
import { formatBytes } from "@/lib/files/format";
import { stripExtension } from "@/lib/files/filename";

type Mode = "docx" | "sheet";

const ACCEPT: Record<Mode, string> = {
  docx: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  sheet:
    ".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain",
};

const TOOL_ID: Record<Mode, string> = { docx: "conv-docx-pdf", sheet: "conv-sheet-pdf" };

function kindOf(file: File): "docx" | "xlsx" | "csv" | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".xlsx")) return "xlsx";
  if (name.endsWith(".csv") || name.endsWith(".txt") || file.type === "text/csv") return "csv";
  if (file.type.includes("wordprocessingml")) return "docx";
  if (file.type.includes("spreadsheetml")) return "xlsx";
  return null;
}

export function DocxPdfTool() {
  return <OfficeToPdfTool mode="docx" />;
}

export function SheetPdfTool() {
  return <OfficeToPdfTool mode="sheet" />;
}

/** Word / Excel / CSV → PDF with the simplified layout engine (text-to-pdf); honest warnings after conversion. */
export function OfficeToPdfTool({ mode }: { mode: Mode }) {
  const toolId = TOOL_ID[mode];
  const tool = getToolById(toolId);
  const maxSize = tool?.limits.maxFileSizeBytes ?? 15 * 1024 * 1024;
  const [file, setFile] = React.useState<File | null>(null);
  const [options, setOptions] = React.useState<OfficeToPdfOptions>(() => ({
    ...defaultOfficeToPdfOptions,
    orientation: mode === "sheet" ? "landscape" : "portrait",
    fontSize: mode === "sheet" ? 9 : 11,
  }));
  const [headerRow, setHeaderRow] = React.useState(true);
  const op = useOperation<OfficeToPdfResult>(toolId);
  const patch = (p: Partial<OfficeToPdfOptions>) => setOptions((o) => ({ ...o, ...p }));

  const validate = (candidate: File): string | null => {
    const kind = kindOf(candidate);
    if (!kind || (mode === "docx" && kind !== "docx") || (mode === "sheet" && kind === "docx")) {
      return mode === "docx"
        ? "Seuls les fichiers Word .docx sont acceptés (enregistrez les .doc au format .docx)."
        : "Seuls les classeurs .xlsx et les fichiers .csv sont acceptés (enregistrez les .xls au format .xlsx).";
    }
    if (candidate.size > maxSize)
      return `Fichier trop volumineux (maximum ${formatBytes(maxSize)}).`;
    return null;
  };

  const run = () => {
    if (!file) return;
    void op.run(async (report) => {
      report({ current: 0, total: 1, label: "Lecture du fichier…" });
      const bytes = new Uint8Array(await file.arrayBuffer());
      report({ current: 0, total: 1, label: "Mise en page du PDF…" });
      const kind = kindOf(file);
      if (kind === "docx") return docxToPdf(bytes, options);
      if (kind === "xlsx") return sheetToPdf({ kind: "xlsx", bytes }, options, { headerRow });
      return sheetToPdf(
        { kind: "csv", text: new TextDecoder().decode(bytes), name: stripExtension(file.name) },
        options,
        { headerRow },
      );
    });
  };

  const reset = () => {
    op.reset();
    setFile(null);
  };

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done" && file) {
    const result = op.state.result;
    return (
      <DonePanel
        title="Votre PDF est prêt"
        summary={`${result.pageCount} page${result.pageCount > 1 ? "s" : ""} · ${formatBytes(result.bytes.byteLength)}${result.imageCount ? ` · ${result.imageCount} image${result.imageCount > 1 ? "s" : ""}` : ""}`}
        onDownload={() => downloadPdf(result.bytes, file.name, "", toolId)}
        onStartOver={reset}
      >
        {result.warnings.length > 0 ? (
          <Alert variant="warning" title="Conversion simplifiée : à vérifier">
            <ul className="list-disc space-y-1 pl-4 text-left" data-testid="conversion-warnings">
              {result.warnings.slice(0, 6).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Alert>
        ) : null}
        <div className="mt-3 text-center">
          <Button type="button" variant="ghost" size="sm" onClick={op.reset}>
            Changer les options
          </Button>
        </div>
      </DonePanel>
    );
  }

  const Icon = mode === "docx" ? FileType : FileSpreadsheet;

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone
          onFiles={(files) => files[0] && setFile(files[0])}
          accept={ACCEPT[mode]}
          validate={validate}
          title={
            mode === "docx"
              ? "Déposez votre document Word (.docx)"
              : "Déposez un classeur Excel (.xlsx) ou un fichier CSV"
          }
          hint={`${mode === "docx" ? "Format .docx" : "Formats .xlsx et .csv"} · ${formatBytes(maxSize)} max`}
          buttonLabel="Choisir un fichier"
          testId="office-dropzone"
        />
      ) : (
        <ToolPanel className="flex flex-wrap items-center gap-3">
          <Icon className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium" data-testid="office-file-name">
              {file.name}
            </p>
            <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setFile(null)}>
            Changer de fichier
          </Button>
        </ToolPanel>
      )}
      <ToolPanel className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="office-title">Titre (facultatif, en tête du PDF)</Label>
            <Input
              id="office-title"
              value={options.title ?? ""}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={
                mode === "docx"
                  ? "Laisser vide pour garder le titre du document"
                  : "Nom du relevé, du rapport…"
              }
              maxLength={200}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="office-font">Police</Label>
            <Select
              value={options.fontFamily}
              onValueChange={(v) => patch({ fontFamily: v as FontFamily })}
            >
              <SelectTrigger id="office-font">
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
            <Label htmlFor="office-size">Taille du texte (pt)</Label>
            <Input
              id="office-size"
              type="number"
              min={7}
              max={18}
              value={options.fontSize}
              onChange={(e) => patch({ fontSize: Number(e.target.value) || 11 })}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Segmented
            label="Format de page"
            value={options.pageSize}
            onChange={(v) => patch({ pageSize: v })}
            options={[
              { value: "a4", label: "A4" },
              { value: "letter", label: "Letter" },
            ]}
            className="sm:grid-cols-2"
          />
          <Segmented
            label="Orientation"
            value={options.orientation ?? "portrait"}
            onChange={(v) => patch({ orientation: v })}
            options={[
              { value: "portrait", label: "Portrait" },
              { value: "landscape", label: "Paysage" },
            ]}
            className="sm:grid-cols-2"
          />
        </div>
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={options.pageNumbers}
              onCheckedChange={(v) => patch({ pageNumbers: v === true })}
            />
            Numéroter les pages
          </label>
          {mode === "sheet" ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={headerRow} onCheckedChange={(v) => setHeaderRow(v === true)} />
              La première ligne est un en-tête
            </label>
          ) : null}
        </div>
        <Button type="button" size="lg" onClick={run} disabled={!file} data-testid="office-run">
          Créer le PDF
        </Button>
      </ToolPanel>
    </div>
  );
}
