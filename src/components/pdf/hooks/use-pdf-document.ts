"use client";

import * as React from "react";
import { pdfLimits } from "@/config/limits";
import { openPdf, type OpenedPdf, type PageInfo } from "@/lib/pdf/browser/pdfjs";
import { readPdfFile } from "@/lib/pdf/browser/read-file";
import { assertPageCount } from "@/lib/files/validation";
import { PdfError, toPdfError } from "@/lib/pdf/errors";
import { track, pagesBucket, sizeBucket } from "@/lib/analytics/events";

export interface LoadedPdf {
  file: File;
  bytes: Uint8Array;
  pageCount: number;
  pages: PageInfo[];
  opened: OpenedPdf;
}

export type PdfDocumentState =
  | { status: "idle" }
  | { status: "loading"; fileName: string }
  | { status: "ready"; pdf: LoadedPdf }
  | { status: "error"; error: PdfError };

interface Options {
  toolId: string;
  maxFileSizeBytes?: number;
  maxPageCount?: number;
}

/**
 * Loads a single PDF for a tool: validation, bytes, pdf.js document for
 * rendering. Releases the pdf.js document when replaced or unmounted.
 */
export function usePdfDocument({ toolId, maxFileSizeBytes, maxPageCount }: Options) {
  const [state, setState] = React.useState<PdfDocumentState>({ status: "idle" });
  const openedRef = React.useRef<OpenedPdf | null>(null);
  const requestRef = React.useRef(0);

  const release = React.useCallback(() => {
    const current = openedRef.current;
    openedRef.current = null;
    if (current) void current.destroy();
  }, []);

  React.useEffect(() => release, [release]);

  const load = React.useCallback(
    async (file: File) => {
      const request = (requestRef.current += 1);
      release();
      setState({ status: "loading", fileName: file.name });
      try {
        const bytes = await readPdfFile(file, maxFileSizeBytes);
        const opened = await openPdf(bytes);
        if (request !== requestRef.current) {
          void opened.destroy();
          return;
        }
        try {
          assertPageCount(opened.pageCount, maxPageCount ?? pdfLimits.maxPageCount);
        } catch (error) {
          void opened.destroy();
          throw error;
        }
        openedRef.current = opened;
        setState({ status: "ready", pdf: { file, bytes, pageCount: opened.pageCount, pages: opened.pages, opened } });
        track("tool_start", { tool: toolId, sizeBucket: sizeBucket(file.size), pagesBucket: pagesBucket(opened.pageCount) });
      } catch (error) {
        if (request !== requestRef.current) return;
        const pdfError = toPdfError(error, "CORRUPTED");
        setState({ status: "error", error: pdfError });
        track("tool_error", { tool: toolId, errorCode: pdfError.code });
      }
    },
    [maxFileSizeBytes, maxPageCount, release, toolId],
  );

  const reset = React.useCallback(() => {
    requestRef.current += 1;
    release();
    setState({ status: "idle" });
  }, [release]);

  return { state, load, reset };
}
