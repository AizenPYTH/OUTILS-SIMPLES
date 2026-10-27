"use client";

import * as React from "react";
import { Printer } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/pdf/shared/segmented";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import {
  calendarPdf,
  coverPagePdf,
  defaultCalendarOptions,
  defaultCoverOptions,
  defaultPaperOptions,
  paperPdf,
  type CalendarOptions,
  type CoverPageOptions,
  type PageFormat,
  type PaperKind,
  type PaperOptions,
} from "@/lib/pdf/operations/printables";
import { FRENCH_MONTHS } from "@/lib/calc/dates";
import { formatBytes } from "@/lib/files/format";
import { tr } from "@/lib/i18n/messages";

const PAGE_FORMATS: { value: PageFormat; label: string }[] = [
  { value: "a4", label: "A4 portrait" },
  { value: "a4-landscape", label: tr("A4 paysage") },
  { value: "a5", label: "A5" },
  { value: "letter", label: "Letter (US)" },
];

const PAPER_KINDS: { value: PaperKind; label: string; description: string; spacing: boolean }[] = [
  { value: "grid", label: tr("Quadrillé"), description: tr("Petits carreaux"), spacing: true },
  { value: "lines", label: tr("Ligné"), description: tr("Lignes horizontales"), spacing: true },
  {
    value: "dots",
    label: tr("Pointillé"),
    description: tr("Grille de points (bullet journal)"),
    spacing: true,
  },
  {
    value: "seyes",
    label: tr("Seyès"),
    description: tr("Grands carreaux français"),
    spacing: false,
  },
  { value: "millimeter", label: tr("Millimétré"), description: "1 / 5 / 10 mm", spacing: false },
  { value: "isometric", label: tr("Isométrique"), description: "Triangles 60°", spacing: true },
  { value: "music", label: tr("Musique"), description: tr("Portées"), spacing: false },
];

function PageFormatField({
  value,
  onChange,
  id,
}: {
  value: PageFormat;
  onChange: (v: PageFormat) => void;
  id: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>Format</Label>
      <Select value={value} onValueChange={(v) => onChange(v as PageFormat)}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_FORMATS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Done({
  bytes,
  name,
  toolId,
  onBack,
  note,
}: {
  bytes: Uint8Array;
  name: string;
  toolId: string;
  onBack: () => void;
  note?: string;
}) {
  return (
    <DonePanel
      title={tr("Votre PDF est prêt")}
      summary={formatBytes(bytes.byteLength)}
      onDownload={() => downloadPdf(bytes, name, "", toolId)}
      onStartOver={onBack}
    >
      {note ? <Alert variant="warning">{note}</Alert> : null}
    </DonePanel>
  );
}

export function PaperTool() {
  const [options, setOptions] = React.useState<PaperOptions>(defaultPaperOptions);
  const op = useOperation<Uint8Array>("doc-paper");
  const patch = (p: Partial<PaperOptions>) => setOptions((o) => ({ ...o, ...p }));
  const kind = PAPER_KINDS.find((k) => k.value === options.kind)!;

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={op.reset} />;
  if (op.state.status === "done")
    return (
      <Done
        bytes={op.state.result}
        name={`feuille-${options.kind}.pdf`}
        toolId="doc-paper"
        onBack={op.reset}
      />
    );

  return (
    <div className="space-y-4">
      <Segmented
        label={tr("Type de feuille")}
        value={options.kind}
        onChange={(kind) => patch({ kind })}
        className="sm:grid-cols-4"
        options={PAPER_KINDS.map((k) => ({
          value: k.value,
          label: k.label,
          description: k.description,
        }))}
      />
      <ToolPanel className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PageFormatField
            id="paper-format"
            value={options.page}
            onChange={(page) => patch({ page })}
          />
          {kind.spacing ? (
            <div className="space-y-1">
              <Label htmlFor="paper-spacing">
                {tr("Espacement : {n} mm", { n: options.spacingMm })}
              </Label>
              <input
                id="paper-spacing"
                type="range"
                min={2}
                max={25}
                step={0.5}
                value={options.spacingMm}
                onChange={(e) => patch({ spacingMm: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="paper-margin">{tr("Marge : {n} mm", { n: options.marginMm })}</Label>
            <input
              id="paper-margin"
              type="range"
              min={0}
              max={30}
              value={options.marginMm}
              onChange={(e) => patch({ marginMm: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="paper-pages">{tr("Nombre de pages")}</Label>
            <Input
              id="paper-pages"
              type="number"
              min={1}
              max={50}
              value={options.pages}
              onChange={(e) => patch({ pages: Number(e.target.value) || 1 })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="paper-color">{tr("Couleur des traits")}</Label>
            <div className="flex items-center gap-2">
              <input
                id="paper-color"
                type="color"
                value={options.color}
                onChange={(e) => patch({ color: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-md border border-input bg-surface p-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => patch({ color: "#9aa3b2" })}
              >
                {tr("Gris clair")}
              </Button>
            </div>
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="paper-title">{tr("Titre en haut de page (facultatif)")}</Label>
            <Input
              id="paper-title"
              value={options.title ?? ""}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={tr("Nom, matière, date…")}
              maxLength={120}
            />
          </div>
        </div>
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() => void op.run(async () => paperPdf(options))}
          data-testid="paper-run"
        >
          <Printer aria-hidden="true" /> {tr("Créer le PDF")}
        </Button>
      </ToolPanel>
      <p className="text-xs text-muted-foreground">
        {tr(
          "Imprimez à l'échelle 100 % (sans « ajuster à la page ») pour conserver les dimensions exactes des carreaux.",
        )}
      </p>
    </div>
  );
}

export function CalendarTool() {
  const [options, setOptions] = React.useState<CalendarOptions>(defaultCalendarOptions);
  const [view, setView] = React.useState<"month" | "year">("month");
  const op = useOperation<Uint8Array>("doc-calendar");
  const patch = (p: Partial<CalendarOptions>) => setOptions((o) => ({ ...o, ...p }));

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={op.reset} />;
  if (op.state.status === "done")
    return (
      <Done
        bytes={op.state.result}
        name={
          view === "month"
            ? `calendrier-${options.year}-${String(options.month).padStart(2, "0")}.pdf`
            : `calendrier-${options.year}.pdf`
        }
        toolId="doc-calendar"
        onBack={op.reset}
      />
    );

  return (
    <div className="space-y-4">
      <Segmented
        label={tr("Vue")}
        value={view}
        onChange={(v) => {
          setView(v);
          patch({
            month: v === "month" ? (options.month ?? new Date().getMonth() + 1) : null,
            page: v === "month" ? "a4-landscape" : "a4",
          });
        }}
        className="sm:grid-cols-2"
        options={[
          {
            value: "month",
            label: tr("Un mois par page"),
            description: tr("Cases larges, zone de notes"),
          },
          { value: "year", label: tr("Année complète"), description: tr("12 mois sur une page") },
        ]}
      />
      <ToolPanel className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="cal-year">{tr("Année")}</Label>
            <Input
              id="cal-year"
              type="number"
              min={1900}
              max={2199}
              value={options.year}
              onChange={(e) => patch({ year: Number(e.target.value) || new Date().getFullYear() })}
              data-testid="cal-year"
            />
          </div>
          {view === "month" ? (
            <div className="space-y-1">
              <Label htmlFor="cal-month">{tr("Mois")}</Label>
              <Select
                value={String(options.month ?? 1)}
                onValueChange={(v) => patch({ month: Number(v) })}
              >
                <SelectTrigger id="cal-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FRENCH_MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <PageFormatField
            id="cal-format"
            value={options.page}
            onChange={(page) => patch({ page })}
          />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={options.holidays}
              onCheckedChange={(v) => patch({ holidays: v === true })}
            />{" "}
            {tr("Marquer les jours fériés français")}
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={options.alsaceMoselle ?? false}
              onCheckedChange={(v) => patch({ alsaceMoselle: v === true })}
            />{" "}
            Alsace-Moselle
          </label>
          {view === "month" ? (
            <label className="flex items-center gap-2">
              <Checkbox
                checked={options.notes}
                onCheckedChange={(v) => patch({ notes: v === true })}
              />{" "}
              {tr("Colonne de notes")}
            </label>
          ) : null}
        </div>
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() =>
            void op.run(async () =>
              calendarPdf({ ...options, month: view === "month" ? (options.month ?? 1) : null }),
            )
          }
          data-testid="cal-run"
        >
          <Printer aria-hidden="true" /> {tr("Créer le calendrier")}
        </Button>
      </ToolPanel>
    </div>
  );
}

export function CoverPageTool() {
  const [options, setOptions] = React.useState<CoverPageOptions>(defaultCoverOptions);
  const op = useOperation<{ bytes: Uint8Array; replaced: boolean }>("doc-cover");
  const patch = (p: Partial<CoverPageOptions>) => setOptions((o) => ({ ...o, ...p }));

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={op.reset} />;
  if (op.state.status === "done")
    return (
      <Done
        bytes={op.state.result.bytes}
        name="page-de-garde.pdf"
        toolId="doc-cover"
        onBack={op.reset}
        note={
          op.state.result.replaced
            ? tr("Certains caractères (emoji, alphabets non latins) ont été remplacés par « ? ».")
            : undefined
        }
      />
    );

  return (
    <div className="space-y-4">
      <ToolPanel className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="cover-title">{tr("Titre")}</Label>
            <Textarea
              id="cover-title"
              value={options.title}
              onChange={(e) => patch({ title: e.target.value })}
              rows={2}
              maxLength={200}
              placeholder={tr("Rapport de stage")}
              data-testid="cover-title"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="cover-subtitle">{tr("Sous-titre")}</Label>
            <Input
              id="cover-subtitle"
              value={options.subtitle ?? ""}
              onChange={(e) => patch({ subtitle: e.target.value })}
              maxLength={200}
              placeholder={tr("Développement d'une plateforme d'outils en ligne")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cover-author">{tr("Auteur")}</Label>
            <Input
              id="cover-author"
              value={options.author ?? ""}
              onChange={(e) => patch({ author: e.target.value })}
              maxLength={120}
              placeholder={tr("Prénom Nom")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cover-institution">{tr("Organisation / établissement")}</Label>
            <Input
              id="cover-institution"
              value={options.institution ?? ""}
              onChange={(e) => patch({ institution: e.target.value })}
              maxLength={120}
              placeholder={tr("Université, entreprise, classe…")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cover-date">Date</Label>
            <Input
              id="cover-date"
              value={options.date ?? ""}
              onChange={(e) => patch({ date: e.target.value })}
              maxLength={60}
              placeholder={tr("Juin 2026")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cover-footer">{tr("Pied de page")}</Label>
            <Input
              id="cover-footer"
              value={options.footer ?? ""}
              onChange={(e) => patch({ footer: e.target.value })}
              maxLength={160}
              placeholder={tr("Confidentiel · Version 1.0")}
            />
          </div>
          <PageFormatField
            id="cover-format"
            value={options.page}
            onChange={(page) => patch({ page })}
          />
          <div className="space-y-1">
            <Label htmlFor="cover-accent">{tr("Couleur d'accent")}</Label>
            <input
              id="cover-accent"
              type="color"
              value={options.accent}
              onChange={(e) => patch({ accent: e.target.value })}
              className="h-10 w-16 cursor-pointer rounded-md border border-input bg-surface p-1"
            />
          </div>
        </div>
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() => void op.run(async () => coverPagePdf(options))}
          disabled={!options.title.trim()}
          data-testid="cover-run"
        >
          <Printer aria-hidden="true" /> {tr("Créer la page de garde")}
        </Button>
      </ToolPanel>
      <p className="text-xs text-muted-foreground">
        {tr(
          "Fusionnez ensuite la page de garde avec votre document grâce à l'outil « Fusionner des PDF ».",
        )}
      </p>
    </div>
  );
}
