"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Download, Loader2, RefreshCw, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { OperationProgress } from "@/components/pdf/hooks/use-operation";
import type { PdfError } from "@/lib/pdf/errors";
import { t } from "@/lib/i18n";

export function BusyPanel({
  progress,
  onCancel,
}: {
  progress: OperationProgress;
  onCancel?: () => void;
}) {
  const percent =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : undefined;
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-[24px] border border-border bg-surface px-6 py-12 text-center"
      role="status"
      aria-live="polite"
      data-testid="busy-panel"
    >
      <Loader2 className="size-11 animate-spin text-link" aria-hidden="true" />
      <div>
        <p className="font-heading text-lg font-bold">{progress.label ?? t.progress.processing}</p>
        {typeof percent === "number" ? (
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">{percent} %</p>
        ) : null}
      </div>
      <Progress value={percent} label={t.progress.processing} className="max-w-sm" />
      {onCancel ? (
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t.progress.cancel}
        </Button>
      ) : null}
    </div>
  );
}

interface DonePanelProps {
  title?: string;
  summary?: React.ReactNode;
  children?: React.ReactNode;
  onDownload?: () => void;
  downloadLabel?: string;
  onStartOver: () => void;
  editorPath?: string | null;
}

export function DonePanel({
  title,
  summary,
  children,
  onDownload,
  downloadLabel,
  onStartOver,
  editorPath,
}: DonePanelProps) {
  return (
    <div
      className="rounded-[24px] border border-success/40 bg-surface p-6 sm:p-8"
      role="status"
      aria-live="polite"
      data-testid="done-panel"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>
        <h2 className="font-heading text-xl font-bold">{title ?? t.result.title}</h2>
        {summary ? <div className="text-sm text-muted-foreground">{summary}</div> : null}
        <p className="sr-only">{t.result.successAnnouncement}</p>
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {onDownload ? (
          <Button type="button" size="lg" onClick={onDownload} data-testid="download-button">
            <Download aria-hidden="true" />
            {downloadLabel ?? t.common.downloadPdf}
          </Button>
        ) : null}
        <Button type="button" size="lg" variant="outline" onClick={onStartOver}>
          <RefreshCw aria-hidden="true" />
          {t.result.startOver}
        </Button>
      </div>
      {editorPath ? (
        <p className="mt-4 text-center text-sm">
          <Link
            href={editorPath}
            className="inline-flex items-center gap-1.5 font-medium text-link hover:underline"
          >
            <SquarePen className="size-4" aria-hidden="true" />
            Continuer dans l&apos;éditeur PDF
          </Link>
        </p>
      ) : null}
    </div>
  );
}

interface ErrorPanelProps {
  error: PdfError;
  onRetry?: () => void;
  onReset: () => void;
}

export function ErrorPanel({ error, onRetry, onReset }: ErrorPanelProps) {
  return (
    <div
      className="rounded-[24px] border-2 border-destructive/60 bg-surface p-6 sm:p-8"
      role="alert"
      data-testid="error-panel"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-destructive-soft text-destructive">
          <AlertCircle className="size-7" aria-hidden="true" />
        </span>
        <h2 className="font-heading text-xl font-bold">{t.errors.title}</h2>
        <p className="max-w-md text-sm text-foreground/90">{error.message}</p>
        {!error.recoverable ? (
          <p className="text-xs text-muted-foreground">{t.errors.needsReload}</p>
        ) : null}
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {error.recoverable && onRetry ? (
          <Button type="button" onClick={onRetry}>
            {t.errors.retry}
          </Button>
        ) : null}
        <Button
          type="button"
          variant={error.recoverable && onRetry ? "outline" : "default"}
          onClick={onReset}
        >
          {t.errors.tryAgainWithNewFile}
        </Button>
      </div>
    </div>
  );
}
