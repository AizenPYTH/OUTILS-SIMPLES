"use client";

import * as React from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { formatBytes } from "@/lib/files/format";
import {
  openPdf,
  renderPageToCanvas,
  fitScale,
  visualSize,
  type OpenedPdf,
} from "@/lib/pdf/browser/pdfjs";
import {
  fillForm,
  inspectForm,
  type FormFieldInfo,
  type FormValues,
} from "@/lib/pdf/operations/forms";
import { getToolById, getToolPath } from "@/lib/tools";
import { t } from "@/lib/i18n";
import { tr } from "@/lib/i18n/messages";

const TOOL_ID = "pdf-fill-form";

export function FillFormTool() {
  return (
    <SingleFileTool toolId={TOOL_ID}>
      {({ pdf, reset }) => <FormWorkspace pdf={pdf} reset={reset} />}
    </SingleFileTool>
  );
}

function FormWorkspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [fields, setFields] = React.useState<FormFieldInfo[] | null>(null);
  const [hasXfa, setHasXfa] = React.useState(false);
  const [values, setValues] = React.useState<FormValues>({});
  const [flatten, setFlatten] = React.useState(false);
  const [previewBytes, setPreviewBytes] = React.useState<Uint8Array | null>(null);
  const [previewBusy, setPreviewBusy] = React.useState(false);
  const [activePage, setActivePage] = React.useState(0);
  const op = useOperation<Uint8Array>(TOOL_ID);
  const addText = getToolById("pdf-add-text");

  React.useEffect(() => {
    let cancelled = false;
    inspectForm(pdf.bytes)
      .then((inspection) => {
        if (cancelled) return;
        setFields(inspection.fields);
        setHasXfa(inspection.hasXfa);
        const initial: FormValues = {};
        for (const f of inspection.fields) if (f.value !== null) initial[f.name] = f.value;
        setValues(initial);
      })
      .catch(() => {
        if (!cancelled) setFields([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pdf.bytes]);

  const setValue = (name: string, value: string | boolean | string[]) =>
    setValues((v) => ({ ...v, [name]: value }));

  const refreshPreview = async () => {
    setPreviewBusy(true);
    try {
      setPreviewBytes(await fillForm(pdf.bytes, values, { flatten: false }));
    } finally {
      setPreviewBusy(false);
    }
  };

  const run = () => void op.run(() => fillForm(pdf.bytes, values, { flatten }));

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const bytes = op.state.result;
    return (
      <DonePanel
        summary={`${flatten ? tr("Formulaire aplati") : tr("Champs modifiables conservés")} · ${formatBytes(bytes.byteLength)}`}
        onDownload={() => downloadPdf(bytes, pdf.file.name, "rempli", TOOL_ID)}
        onStartOver={() => {
          op.reset();
          reset();
        }}
      />
    );
  }

  if (fields === null)
    return <BusyPanel progress={{ current: 0, total: 0, label: tr("Analyse des champs…") }} />;

  const editable = fields.filter(
    (f) => f.kind !== "button" && f.kind !== "signature" && f.kind !== "unknown",
  );
  const byPage = new Map<number | null, FormFieldInfo[]>();
  for (const f of editable) {
    const list = byPage.get(f.pageIndex) ?? [];
    list.push(f);
    byPage.set(f.pageIndex, list);
  }
  const pageKeys = Array.from(byPage.keys()).sort((a, b) => (a ?? 1e9) - (b ?? 1e9));

  return (
    <div className="space-y-6">
      <FileSummary
        name={pdf.file.name}
        size={pdf.file.size}
        pageCount={pdf.pageCount}
        onReset={reset}
      />
      {hasXfa ? (
        <Alert variant="warning" title={tr("Formulaire XFA détecté")}>
          {tr(
            "Les formulaires XFA (technologie Adobe) ne sont pas pris en charge ; seuls les champs AcroForm éventuels sont listés.",
          )}
        </Alert>
      ) : null}
      {editable.length === 0 ? (
        <Alert variant="warning" title={tr("Aucun champ interactif détecté")}>
          {tr(
            "Ce PDF ne contient pas de champs de formulaire remplissables : il s'agit probablement d'un formulaire scanné ou aplati.",
          )}{" "}
          {addText ? (
            <a href={getToolPath(addText)} className="font-medium underline">
              {tr("Utilisez « Ajouter du texte » pour le compléter.")}
            </a>
          ) : null}
        </Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              run();
            }}
          >
            {pageKeys.map((key) => (
              <fieldset
                key={String(key)}
                className="space-y-4 rounded-[14px] border border-border bg-surface p-4"
              >
                <legend className="px-1 text-sm font-semibold">
                  {key === null ? tr("Champs sans page identifiée") : `${t.common.page} ${key + 1}`}
                </legend>
                {byPage.get(key)!.map((field) => (
                  <FormFieldControl
                    key={field.name}
                    field={field}
                    value={values[field.name]}
                    onChange={(v) => setValue(field.name, v)}
                    onFocus={() => key !== null && setActivePage(key)}
                  />
                ))}
              </fieldset>
            ))}
            <div className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-surface p-4">
              <div>
                <Label htmlFor="flatten" className="text-sm font-medium">
                  {tr("Aplatir le formulaire")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {tr("Les valeurs deviennent fixes et ne sont plus modifiables.")}
                </p>
              </div>
              <Switch id="flatten" checked={flatten} onCheckedChange={setFlatten} />
            </div>
            <Button type="submit" size="lg" className="w-full" data-testid="fill-form-export">
              <ClipboardList aria-hidden="true" /> {tr("Exporter le formulaire rempli")}
            </Button>
          </form>
          <aside className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {tr("Aperçu")} · {t.common.pageOf(activePage + 1, pdf.pageCount)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refreshPreview()}
                loading={previewBusy}
              >
                <RefreshCw aria-hidden="true" /> {tr("Mettre à jour l'aperçu")}
              </Button>
            </div>
            <FormPreview bytes={previewBytes} fallback={pdf.opened} pageIndex={activePage} />
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={activePage === 0}
                onClick={() => setActivePage((p) => p - 1)}
              >
                {t.common.previous}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={activePage >= pdf.pageCount - 1}
                onClick={() => setActivePage((p) => p + 1)}
              >
                {t.common.next}
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function FormFieldControl({
  field,
  value,
  onChange,
  onFocus,
}: {
  field: FormFieldInfo;
  value: string | boolean | string[] | undefined;
  onChange: (v: string | boolean | string[]) => void;
  onFocus: () => void;
}) {
  const id = `field-${field.name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const label = (
    <Label htmlFor={id} className="text-sm">
      {field.name}
      {field.required ? <span className="text-destructive"> *</span> : null}
      {field.readOnly ? (
        <span className="text-xs font-normal text-muted-foreground"> {tr("(lecture seule)")}</span>
      ) : null}
    </Label>
  );
  switch (field.kind) {
    case "text":
      return (
        <div className="space-y-1.5">
          {label}
          {field.multiline ? (
            <Textarea
              id={id}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
              onFocus={onFocus}
              disabled={field.readOnly}
              maxLength={field.maxLength ?? undefined}
            />
          ) : (
            <Input
              id={id}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
              onFocus={onFocus}
              disabled={field.readOnly}
              maxLength={field.maxLength ?? undefined}
            />
          )}
        </div>
      );
    case "checkbox":
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={value === true}
            onCheckedChange={(c) => onChange(c === true)}
            disabled={field.readOnly}
            onFocus={onFocus}
          />
          {label}
        </div>
      );
    case "radio":
    case "dropdown":
      return (
        <div className="space-y-1.5">
          {label}
          <Select
            value={typeof value === "string" && value ? value : undefined}
            onValueChange={onChange}
            disabled={field.readOnly}
          >
            <SelectTrigger id={id} onFocus={onFocus}>
              <SelectValue placeholder={tr("Choisir…")} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case "optionlist": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">{field.name}</legend>
          {field.options.map((o) => (
            <div key={o} className="flex items-center gap-2">
              <Checkbox
                id={`${id}-${o}`}
                checked={selected.includes(o)}
                disabled={field.readOnly}
                onCheckedChange={(c) =>
                  onChange(c === true ? [...selected, o] : selected.filter((s) => s !== o))
                }
              />
              <Label htmlFor={`${id}-${o}`} className="text-sm font-normal">
                {o}
              </Label>
            </div>
          ))}
        </fieldset>
      );
    }
    default:
      return null;
  }
}

function FormPreview({
  bytes,
  fallback,
  pageIndex,
}: {
  bytes: Uint8Array | null;
  fallback: OpenedPdf;
  pageIndex: number;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    let opened: OpenedPdf | null = null;
    (async () => {
      try {
        const source = bytes ? await openPdf(bytes) : null;
        opened = source;
        if (controller.signal.aborted) return;
        const target = source ?? fallback;
        const page = target.pages[pageIndex] ?? target.pages[0]!;
        const size = visualSize(page);
        const scale = fitScale(size.width, size.height, 340, 480);
        await renderPageToCanvas(target.doc, page.index, canvas, {
          scale,
          signal: controller.signal,
        });
        setError(false);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    })();
    return () => {
      controller.abort();
      if (opened) void opened.destroy();
    };
  }, [bytes, fallback, pageIndex]);

  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-[6px] border border-border bg-muted p-2">
      {error ? (
        <p className="text-sm text-muted-foreground">{t.errors.renderFailed}</p>
      ) : (
        <canvas
          ref={canvasRef}
          className="max-w-full shadow-sm"
          aria-label={tr("Aperçu de la page")}
        />
      )}
    </div>
  );
}
