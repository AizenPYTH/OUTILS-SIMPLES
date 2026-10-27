"use client";

import * as React from "react";
import { PdfDropzone } from "./pdf-dropzone";
import { PasswordPanel } from "./password-panel";
import { BusyPanel, ErrorPanel } from "./processing-panel";
import {
  usePdfDocument,
  type LoadedPdf,
  type LoadPhase,
} from "@/components/pdf/hooks/use-pdf-document";
import { getToolById, type ToolDefinition } from "@/lib/tools";
import { t } from "@/lib/i18n";
import { tr } from "@/lib/i18n/messages";

interface SingleFileToolProps {
  toolId: string;
  /** Analyse the content after opening (editor: native text, scanned, mixed). */
  analyse?: boolean;
  children: (args: { pdf: LoadedPdf; tool: ToolDefinition; reset: () => void }) => React.ReactNode;
}

const PHASE_LABELS: Record<LoadPhase, string> = {
  reading: t.upload.reading,
  opening: tr("Ouverture du document…"),
  unlocking: tr("Déverrouillage du document…"),
  analysing: tr("Analyse de votre document…"),
};

/** Shared idle → loading → password? → ready/error flow for every single-document tool. */
export function SingleFileTool({ toolId, analyse, children }: SingleFileToolProps) {
  const tool = getToolById(toolId);
  if (!tool) throw new Error(`Unknown tool ${toolId}`);
  return (
    <SingleFileToolInner tool={tool} analyse={analyse}>
      {children}
    </SingleFileToolInner>
  );
}

function SingleFileToolInner({
  tool,
  analyse,
  children,
}: {
  tool: ToolDefinition;
  analyse?: boolean;
  children: SingleFileToolProps["children"];
}) {
  const { state, load, submitPassword, reset } = usePdfDocument({
    toolId: tool.id,
    maxFileSizeBytes: tool.limits.maxFileSizeBytes,
    maxPageCount: tool.limits.maxPageCount,
    analyse,
  });

  if (state.status === "idle") {
    return (
      <PdfDropzone
        onFiles={(files) => files[0] && void load(files[0])}
        maxFileSizeBytes={tool.limits.maxFileSizeBytes}
      />
    );
  }
  if (state.status === "loading") {
    const progress = state.progress;
    const label =
      progress && progress.total > 0
        ? tr(
            state.phase === "analysing"
              ? "{label} page {done} / {total}"
              : "{label} pages {done} / {total}",
            {
              label: PHASE_LABELS[state.phase],
              done: progress.done,
              total: progress.total,
            },
          )
        : PHASE_LABELS[state.phase];
    return (
      <BusyPanel
        progress={{ current: progress?.done ?? 0, total: progress?.total ?? 0, label }}
        data-phase={state.phase}
      />
    );
  }
  if (state.status === "password") {
    return (
      <PasswordPanel
        fileName={state.fileName}
        incorrect={state.incorrect}
        busy={state.busy}
        onSubmit={(password) => void submitPassword(password)}
        onCancel={reset}
      />
    );
  }
  if (state.status === "error") {
    return <ErrorPanel error={state.error} onReset={reset} />;
  }
  return <>{children({ pdf: state.pdf, tool, reset })}</>;
}
