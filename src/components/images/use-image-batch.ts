"use client";

import * as React from "react";
import { decodeImage, type DecodedImage } from "@/lib/images/canvas";
import { track } from "@/lib/analytics/events";
import { uid } from "@/lib/utils";

export interface BatchResult {
  blob: Blob;
  name: string;
  width: number;
  height: number;
  /** Optional free-form note (e.g. "transparence aplatie"). */
  note?: string;
}

export interface BatchItem {
  id: string;
  file: File;
  previewUrl: string;
  width: number | null;
  height: number | null;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
  result?: BatchResult;
  resultUrl?: string;
}

export type BatchProcessor = (
  item: BatchItem,
  decoded: DecodedImage,
  signal: AbortSignal,
) => Promise<BatchResult>;

export interface UseImageBatchOptions {
  toolId: string;
  maxFiles: number;
}

/**
 * Manages a list of images (previews, dimensions) and runs a processor on
 * each one sequentially with progress and cancellation. Object URLs are
 * revoked when items are removed or the component unmounts.
 */
export function useImageBatch({ toolId, maxFiles }: UseImageBatchOptions) {
  const [items, setItems] = React.useState<BatchItem[]>([]);
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState({ current: 0, total: 0 });
  const controllerRef = React.useRef<AbortController | null>(null);
  const itemsRef = React.useRef(items);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  React.useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      }
    };
  }, []);

  const add = React.useCallback(
    async (files: File[]) => {
      const room = Math.max(0, maxFiles - itemsRef.current.length);
      const accepted = files.slice(0, room);
      const created: BatchItem[] = accepted.map((file) => ({
        id: uid("img"),
        file,
        previewUrl: URL.createObjectURL(file),
        width: null,
        height: null,
        status: "pending",
      }));
      setItems((list) => [...list, ...created]);
      track("tool_start", { tool: toolId, resultCount: accepted.length });
      // Read dimensions lazily (one decode per file).
      for (const item of created) {
        try {
          const decoded = await decodeImage(item.file);
          decoded.bitmap.close();
          setItems((list) =>
            list.map((i) =>
              i.id === item.id ? { ...i, width: decoded.width, height: decoded.height } : i,
            ),
          );
        } catch {
          setItems((list) =>
            list.map((i) =>
              i.id === item.id
                ? { ...i, status: "error", error: "Image illisible par ce navigateur." }
                : i,
            ),
          );
        }
      }
      return files.length - accepted.length;
    },
    [maxFiles, toolId],
  );

  const remove = React.useCallback((id: string) => {
    setItems((list) => {
      const item = list.find((i) => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      }
      return list.filter((i) => i.id !== id);
    });
  }, []);

  const clear = React.useCallback(() => {
    for (const item of itemsRef.current) {
      URL.revokeObjectURL(item.previewUrl);
      if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
    }
    setItems([]);
    setProgress({ current: 0, total: 0 });
  }, []);

  const resetResults = React.useCallback(() => {
    setItems((list) =>
      list.map((i) => {
        if (i.resultUrl) URL.revokeObjectURL(i.resultUrl);
        return {
          ...i,
          status: i.error && !i.result ? i.status : "pending",
          result: undefined,
          resultUrl: undefined,
          error: i.result ? undefined : i.error,
        };
      }),
    );
  }, []);

  const cancel = React.useCallback(() => controllerRef.current?.abort(), []);

  const run = React.useCallback(
    async (processor: BatchProcessor) => {
      const controller = new AbortController();
      controllerRef.current = controller;
      setRunning(true);
      const pending = itemsRef.current.filter((i) => i.status !== "error" || i.result);
      setProgress({ current: 0, total: pending.length });
      let done = 0;
      let errors = 0;
      for (const item of pending) {
        if (controller.signal.aborted) break;
        setItems((list) =>
          list.map((i) =>
            i.id === item.id ? { ...i, status: "processing", error: undefined } : i,
          ),
        );
        // Yield so the UI paints between files.
        await new Promise((r) => setTimeout(r, 0));
        let decoded: DecodedImage | null = null;
        try {
          decoded = await decodeImage(item.file);
          const result = await processor(item, decoded, controller.signal);
          const resultUrl = URL.createObjectURL(result.blob);
          setItems((list) =>
            list.map((i) => {
              if (i.id !== item.id) return i;
              if (i.resultUrl) URL.revokeObjectURL(i.resultUrl);
              return { ...i, status: "done", result, resultUrl };
            }),
          );
          done += 1;
        } catch (error) {
          errors += 1;
          const message = error instanceof Error ? error.message : "Traitement impossible.";
          setItems((list) =>
            list.map((i) => (i.id === item.id ? { ...i, status: "error", error: message } : i)),
          );
        } finally {
          decoded?.bitmap.close();
        }
        setProgress({ current: done + errors, total: pending.length });
      }
      setRunning(false);
      controllerRef.current = null;
      if (done > 0) track("tool_success", { tool: toolId, resultCount: done });
      if (errors > 0) track("tool_error", { tool: toolId, errorCode: "BATCH_ITEM" });
    },
    [toolId],
  );

  return { items, add, remove, clear, run, cancel, running, progress, resetResults };
}
