"use client";

import * as React from "react";
import { PdfDropzone } from "./pdf-dropzone";
import { BusyPanel, ErrorPanel } from "./processing-panel";
import { usePdfDocument, type LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { getToolById, type ToolDefinition } from "@/lib/tools";
import { t } from "@/lib/i18n";

interface SingleFileToolProps {
  toolId: string;
  children: (args: { pdf: LoadedPdf; tool: ToolDefinition; reset: () => void }) => React.ReactNode;
}

/** Shared idle → loading → ready/error flow for every single-document tool. */
export function SingleFileTool({ toolId, children }: SingleFileToolProps) {
  const tool = getToolById(toolId);
  if (!tool) throw new Error(`Unknown tool ${toolId}`);
  return <SingleFileToolInner tool={tool}>{children}</SingleFileToolInner>;
}

function SingleFileToolInner({ tool, children }: { tool: ToolDefinition; children: SingleFileToolProps["children"] }) {
  const { state, load, reset } = usePdfDocument({
    toolId: tool.id,
    maxFileSizeBytes: tool.limits.maxFileSizeBytes,
    maxPageCount: tool.limits.maxPageCount,
  });

  if (state.status === "idle") {
    return <PdfDropzone onFiles={(files) => files[0] && void load(files[0])} maxFileSizeBytes={tool.limits.maxFileSizeBytes} />;
  }
  if (state.status === "loading") {
    return <BusyPanel progress={{ current: 0, total: 0, label: t.upload.reading }} />;
  }
  if (state.status === "error") {
    return <ErrorPanel error={state.error} onReset={reset} />;
  }
  return <>{children({ pdf: state.pdf, tool, reset })}</>;
}
