"use client";

import * as React from "react";
import { toPdfError, type PdfError } from "@/lib/pdf/errors";
import { track } from "@/lib/analytics/events";
import { t } from "@/lib/i18n";

export interface OperationProgress {
  current: number;
  total: number;
  label?: string;
}

export type OperationState<R> =
  | { status: "idle" }
  | { status: "busy"; progress: OperationProgress }
  | { status: "done"; result: R }
  | { status: "error"; error: PdfError };

/**
 * Runs a long operation with progress, maps failures to PdfError and keeps
 * the UI honest: "done" is only reached when the operation resolved.
 * Work is yielded to the event loop before starting so the busy state paints.
 */
export function useOperation<R>(toolId: string) {
  const [state, setState] = React.useState<OperationState<R>>({ status: "idle" });
  const runIdRef = React.useRef(0);

  const run = React.useCallback(
    async (work: (report: (progress: OperationProgress) => void) => Promise<R>): Promise<R | null> => {
      const runId = (runIdRef.current += 1);
      setState({ status: "busy", progress: { current: 0, total: 1, label: t.progress.preparing } });
      await new Promise((resolve) => setTimeout(resolve, 30));
      try {
        const result = await work((progress) => {
          if (runId === runIdRef.current) setState({ status: "busy", progress });
        });
        if (runId !== runIdRef.current) return null;
        setState({ status: "done", result });
        track("tool_success", { tool: toolId });
        return result;
      } catch (error) {
        if (runId !== runIdRef.current) return null;
        const pdfError = toPdfError(error);
        setState({ status: "error", error: pdfError });
        track("tool_error", { tool: toolId, errorCode: pdfError.code });
        return null;
      }
    },
    [toolId],
  );

  const reset = React.useCallback(() => {
    runIdRef.current += 1;
    setState({ status: "idle" });
  }, []);

  return { state, run, reset };
}
