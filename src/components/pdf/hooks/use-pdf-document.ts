"use client";

import * as React from "react";
import { pdfLimits } from "@/config/limits";
import { openPdf, PdfPasswordError, type OpenedPdf, type PageInfo } from "@/lib/pdf/browser/pdfjs";
import { diagnoseDocument, type DocumentDiagnosis } from "@/lib/pdf/browser/diagnose";
import { readPdfFile } from "@/lib/pdf/browser/read-file";
import { assertPageCount } from "@/lib/files/validation";
import { PdfError, toPdfError } from "@/lib/pdf/errors";
import { track, pagesBucket, sizeBucket } from "@/lib/analytics/events";

export interface LoadedPdf {
  file: File;
  /** Bytes every operation works on: decrypted here when the file had a password. */
  bytes: Uint8Array;
  pageCount: number;
  pages: PageInfo[];
  opened: OpenedPdf;
  /** What the document really contains (only when the tool asked for the analysis). */
  diagnosis: DocumentDiagnosis | null;
  /** The file was password-protected and unlocked with the password given. */
  unlocked: boolean;
}

export type LoadPhase = "reading" | "opening" | "unlocking" | "analysing";

export type PdfDocumentState =
  | { status: "idle" }
  | {
      status: "loading";
      fileName: string;
      phase: LoadPhase;
      progress: { done: number; total: number } | null;
    }
  | { status: "password"; fileName: string; attempts: number; incorrect: boolean; busy: boolean }
  | { status: "ready"; pdf: LoadedPdf }
  | { status: "error"; error: PdfError };

interface Options {
  toolId: string;
  maxFileSizeBytes?: number;
  maxPageCount?: number;
  /** Analyse the content (native text / scanned / mixed) after opening. */
  analyse?: boolean;
}

/**
 * Loads a single PDF for a tool: validation, bytes, pdf.js document for
 * rendering, password prompt for protected files (decrypted locally with
 * qpdf so every operation can work on the bytes), optional content
 * diagnosis. Releases the pdf.js document when replaced or unmounted.
 */
export function usePdfDocument({
  toolId,
  maxFileSizeBytes,
  maxPageCount,
  analyse = false,
}: Options) {
  const [state, setState] = React.useState<PdfDocumentState>({ status: "idle" });
  const openedRef = React.useRef<OpenedPdf | null>(null);
  const requestRef = React.useRef(0);
  const pendingRef = React.useRef<{ file: File; bytes: Uint8Array; attempts: number } | null>(null);

  const release = React.useCallback(() => {
    const current = openedRef.current;
    openedRef.current = null;
    if (current) void current.destroy();
  }, []);

  React.useEffect(() => release, [release]);

  const fail = React.useCallback(
    (error: unknown) => {
      const pdfError = toPdfError(error, "CORRUPTED");
      setState({ status: "error", error: pdfError });
      track("tool_error", { tool: toolId, errorCode: pdfError.code });
    },
    [toolId],
  );

  const finish = React.useCallback(
    async (
      request: number,
      file: File,
      bytes: Uint8Array,
      opened: OpenedPdf,
      unlocked: boolean,
    ) => {
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
      let diagnosis: DocumentDiagnosis | null = null;
      if (analyse) {
        setState({
          status: "loading",
          fileName: file.name,
          phase: "analysing",
          progress: { done: 0, total: opened.pageCount },
        });
        try {
          diagnosis = await diagnoseDocument(opened.doc, (done, total) => {
            if (request === requestRef.current)
              setState({
                status: "loading",
                fileName: file.name,
                phase: "analysing",
                progress: { done, total },
              });
          });
        } catch {
          // The analysis is advisory: the editor still opens, without a diagnosis.
          diagnosis = null;
        }
        if (request !== requestRef.current) {
          void opened.destroy();
          return;
        }
      }
      openedRef.current = opened;
      pendingRef.current = null;
      setState({
        status: "ready",
        pdf: {
          file,
          bytes,
          pageCount: opened.pageCount,
          pages: opened.pages,
          opened,
          diagnosis,
          unlocked,
        },
      });
      track("tool_start", {
        tool: toolId,
        sizeBucket: sizeBucket(file.size),
        pagesBucket: pagesBucket(opened.pageCount),
      });
    },
    [analyse, maxPageCount, toolId],
  );

  const load = React.useCallback(
    async (file: File) => {
      const request = (requestRef.current += 1);
      release();
      pendingRef.current = null;
      setState({ status: "loading", fileName: file.name, phase: "reading", progress: null });
      try {
        const bytes = await readPdfFile(file, maxFileSizeBytes);
        if (request !== requestRef.current) return;
        setState({ status: "loading", fileName: file.name, phase: "opening", progress: null });
        let opened: OpenedPdf;
        try {
          opened = await openPdf(bytes, {
            onProgress: (done, total) => {
              if (request === requestRef.current)
                setState({
                  status: "loading",
                  fileName: file.name,
                  phase: "opening",
                  progress: { done, total },
                });
            },
          });
        } catch (error) {
          if (error instanceof PdfPasswordError) {
            if (request !== requestRef.current) return;
            pendingRef.current = { file, bytes, attempts: 0 };
            setState({
              status: "password",
              fileName: file.name,
              attempts: 0,
              incorrect: false,
              busy: false,
            });
            return;
          }
          throw error;
        }
        await finish(request, file, bytes, opened, false);
      } catch (error) {
        if (request !== requestRef.current) return;
        fail(error);
      }
    },
    [fail, finish, maxFileSizeBytes, release],
  );

  /** Opens the pending protected file with the password: pdf.js checks it, qpdf decrypts. */
  const submitPassword = React.useCallback(
    async (password: string) => {
      const pending = pendingRef.current;
      if (!pending) return;
      const request = (requestRef.current += 1);
      const { file, bytes } = pending;
      setState({
        status: "password",
        fileName: file.name,
        attempts: pending.attempts,
        incorrect: false,
        busy: true,
      });
      try {
        let opened: OpenedPdf;
        try {
          opened = await openPdf(bytes, { password });
        } catch (error) {
          if (error instanceof PdfPasswordError) {
            if (request !== requestRef.current) return;
            pending.attempts += 1;
            setState({
              status: "password",
              fileName: file.name,
              attempts: pending.attempts,
              incorrect: true,
              busy: false,
            });
            return;
          }
          throw error;
        }
        void opened.destroy();
        if (request !== requestRef.current) return;
        setState({ status: "loading", fileName: file.name, phase: "unlocking", progress: null });
        const { getBrowserQpdf, unlockPdf } = await import("@/lib/pdf/qpdf");
        const decrypted = await unlockPdf(await getBrowserQpdf(), bytes, password);
        if (request !== requestRef.current) return;
        setState({ status: "loading", fileName: file.name, phase: "opening", progress: null });
        const reopened = await openPdf(decrypted);
        await finish(request, file, decrypted, reopened, true);
      } catch (error) {
        if (request !== requestRef.current) return;
        fail(error);
      }
    },
    [fail, finish],
  );

  const reset = React.useCallback(() => {
    requestRef.current += 1;
    pendingRef.current = null;
    release();
    setState({ status: "idle" });
  }, [release]);

  return { state, load, submitPassword, reset };
}
