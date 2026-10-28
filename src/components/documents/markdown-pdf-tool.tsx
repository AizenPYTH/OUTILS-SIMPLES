"use client";

import * as React from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { FileText } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextInputPanel } from "@/components/tools/shared/text-io";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import {
  defaultTextToPdfOptions,
  textToPdf,
  type TextToPdfOptions,
  type TextToPdfResult,
} from "@/lib/pdf/operations/text-to-pdf";
import { standardFontFamilies as fontFamilies, type FontFamily } from "@/lib/pdf/fonts";
import { formatBytes } from "@/lib/files/format";
import { sanitizeFilename } from "@/lib/files/filename";
import { tr } from "@/lib/i18n/messages";

const SAMPLE_MD = tr(`# Compte rendu de réunion

**Date :** 12 mars 2026 · **Participants :** équipe produit

## Décisions

1. Lancer la version 2 le *15 avril*.
2. Garder le traitement **100 % local** des fichiers.

## Actions

- [x] Rédiger la documentation
- [ ] Préparer la communication

> Les outils simples sont ceux qu'on utilise vraiment.

| Sujet | Responsable | Échéance |
| --- | --- | --- |
| Tests | Claire | 1er avril |
| Design | Karim | 8 avril |

Plus d'informations : [example.org](https://example.org/)
`);

export function TextPdfTool() {
  return <MarkdownPdfTool mode="text" />;
}

export function MarkdownPdfTool({ mode = "markdown" }: { mode?: "markdown" | "text" }) {
  const toolId = mode === "markdown" ? "doc-markdown-pdf" : "doc-text-pdf";
  const [source, setSource] = React.useState("");
  const [options, setOptions] = React.useState<TextToPdfOptions>({
    ...defaultTextToPdfOptions,
    markdown: mode === "markdown",
    fontFamily: mode === "text" ? "courier" : "helvetica",
  });
  const [filename, setFilename] = React.useState("");
  const op = useOperation<TextToPdfResult>(toolId);
  const patch = (p: Partial<TextToPdfOptions>) => setOptions((o) => ({ ...o, ...p }));

  const preview = React.useMemo(() => {
    if (mode !== "markdown" || !source.trim()) return "";
    try {
      return DOMPurify.sanitize(marked.parse(source, { async: false, gfm: true }) as string);
    } catch {
      return "";
    }
  }, [source, mode]);

  const run = () => void op.run(async () => textToPdf(source, options));

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={op.reset} />;
  if (op.state.status === "done") {
    const result = op.state.result;
    const name = `${sanitizeFilename(filename || options.title || "document")}.pdf`;
    return (
      <DonePanel
        title={tr("Votre PDF est prêt")}
        summary={`${tr(result.pageCount > 1 ? "{n} pages" : "{n} page", { n: result.pageCount })} · ${formatBytes(result.bytes.byteLength)}`}
        onDownload={() => downloadPdf(result.bytes, name, "", toolId)}
        onStartOver={op.reset}
      >
        {result.replacedCharacters || result.skipped.length ? (
          <Alert variant="warning" title={tr("À vérifier")}>
            {result.replacedCharacters
              ? tr(
                  "Certains caractères (emoji, alphabets non latins, symboles) ne sont pas disponibles dans les polices PDF standard et ont été remplacés par « ? ».",
                ) + " "
              : ""}
            {result.skipped.length
              ? result.skipped
                  .slice(0, 5)
                  .map((s) => tr(s))
                  .join(" · ")
              : ""}
          </Alert>
        ) : null}
        <div className="mt-3 text-center">
          <Button type="button" variant="ghost" size="sm" onClick={op.reset}>
            {tr("Modifier le texte")}
          </Button>
        </div>
      </DonePanel>
    );
  }

  return (
    <div className="space-y-4">
      {mode === "markdown" ? (
        <Tabs defaultValue="edit">
          <TabsList>
            <TabsTrigger value="edit">Markdown</TabsTrigger>
            <TabsTrigger value="preview" disabled={!preview}>
              {tr("Aperçu")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="space-y-2">
            <TextInputPanel
              id="md-input"
              label={tr("Texte Markdown")}
              value={source}
              onChange={setSource}
              rows={14}
              acceptFile=".md,.markdown,.txt,text/markdown,text/plain"
              placeholder={[
                tr("# Titre"),
                "",
                tr("Votre texte avec **gras**, listes, tableaux…"),
              ].join("\n")}
            />
            {!source ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="px-0"
                onClick={() => setSource(SAMPLE_MD)}
                data-testid="md-sample"
              >
                {tr("Insérer un exemple")}
              </Button>
            ) : null}
          </TabsContent>
          <TabsContent value="preview">
            <div
              className="space-y-3 rounded-[12px] border border-border bg-surface p-5 text-sm leading-relaxed [&_a]:text-link [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[12px] [&_h1]:font-heading [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_hr]:border-border [&_li]:ml-5 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: preview }}
              data-testid="md-preview"
            />
          </TabsContent>
        </Tabs>
      ) : (
        <TextInputPanel
          id="txt-input"
          label={tr("Texte")}
          value={source}
          onChange={setSource}
          rows={14}
          acceptFile=".txt,.log,.csv,text/plain"
          placeholder={tr(
            "Collez votre texte : les sauts de ligne sont conservés, les lignes vides séparent les paragraphes.",
          )}
        />
      )}
      <ToolPanel className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="doc-title">{tr("Titre (facultatif, en tête du document)")}</Label>
            <Input
              id="doc-title"
              value={options.title ?? ""}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={tr("Compte rendu")}
              maxLength={200}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="doc-filename">{tr("Nom du fichier")}</Label>
            <Input
              id="doc-filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="document"
              maxLength={120}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="doc-font">{tr("Police")}</Label>
            <Select
              value={options.fontFamily}
              onValueChange={(v) => patch({ fontFamily: v as FontFamily })}
            >
              <SelectTrigger id="doc-font">
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
            <Label htmlFor="doc-size">{tr("Taille du texte")}</Label>
            <Select
              value={String(options.fontSize)}
              onValueChange={(v) => patch({ fontSize: Number(v) })}
            >
              <SelectTrigger id="doc-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[9, 10, 11, 12, 13, 14].map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s} pt
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="doc-margin">{tr("Marges")}</Label>
            <Select
              value={String(options.margin)}
              onValueChange={(v) => patch({ margin: Number(v) })}
            >
              <SelectTrigger id="doc-margin">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="36">{tr("Étroites (1,3 cm)")}</SelectItem>
                <SelectItem value="56">{tr("Normales (2 cm)")}</SelectItem>
                <SelectItem value="72">{tr("Larges (2,5 cm)")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Segmented
              label={tr("Format de page")}
              value={options.pageSize}
              onChange={(v) => patch({ pageSize: v })}
              className="sm:grid-cols-2"
              options={[
                { value: "a4", label: "A4" },
                { value: "letter", label: "Letter" },
              ]}
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <Checkbox
              checked={options.pageNumbers}
              onCheckedChange={(v) => patch({ pageNumbers: v === true })}
            />{" "}
            {tr("Numéroter les pages")}
          </label>
        </div>
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={run}
          disabled={!source.trim() && !options.title?.trim()}
          data-testid="doc-run"
        >
          <FileText aria-hidden="true" /> {tr("Créer le PDF")}
        </Button>
      </ToolPanel>
    </div>
  );
}
