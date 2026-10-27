"use client";

import * as React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderPageToRaster } from "@/lib/pdf/browser/pdfjs";
import { createOcrEngine, type OcrEngine } from "@/lib/ocr/engine";
import { addOcrLayer } from "@/lib/ocr/searchable-pdf";
import type { OcrLanguage, OcrPageResult } from "@/lib/ocr/types";
import type { RgbaImage } from "@/lib/images/pixels";
import { encodeCanvas, putRgba, releaseCanvas } from "@/lib/images/canvas";
import { tr } from "@/lib/i18n/messages";

/** Result of an OCR run on the editor's document: the layer and what it holds. */
export interface OcrLayerInfo {
  bytes: Uint8Array;
  pages: number[];
  language: OcrLanguage;
  /** Character-weighted mean confidence over the recognised pages (0–100). */
  confidence: number;
  words: number;
  results: Record<number, OcrPageResult>;
}

export type EditorOcrState =
  | { status: "idle" }
  | {
      status: "running";
      pages: number[];
      /** Position in `pages` of the page being recognised. */
      current: number;
      /** Progress of the current page (0–1). */
      pageProgress: number;
      label: string;
    }
  | { status: "done"; layer: OcrLayerInfo }
  | { status: "cancelled" }
  | { status: "error"; message: string };

const STATUS_LABELS: Record<string, string> = {
  "pass-0": tr("Lecture à l'endroit"),
  "pass-90": tr("Lecture du texte tourné à 90°"),
  "pass-180": tr("Lecture du texte à l'envers"),
  "pass-270": tr("Lecture du texte tourné à 270°"),
  "recognizing text": tr("Reconnaissance"),
  "loading tesseract core": tr("Chargement du moteur"),
  "initializing tesseract": tr("Initialisation du moteur"),
  "loading language traineddata": tr("Chargement du modèle de langue"),
  "initializing api": tr("Préparation"),
};

async function encodeWorkingImage(img: RgbaImage): Promise<Blob> {
  const canvas = putRgba(img);
  try {
    const { blob } = await encodeCanvas(canvas, "image/png");
    return blob;
  } finally {
    releaseCanvas(canvas);
  }
}

/**
 * Runs the OCR engine on pages of the document open in the editor, one page
 * at a time (one raster in memory), then writes an invisible text layer into
 * a copy of the document. The original bytes are never modified.
 */
export function useEditorOcr() {
  const [state, setState] = React.useState<EditorOcrState>({ status: "idle" });
  const engineRef = React.useRef<{ language: OcrLanguage; engine: OcrEngine } | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(
    () => () => {
      abortRef.current?.abort();
      void engineRef.current?.engine.terminate();
    },
    [],
  );

  const cancel = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const run = React.useCallback(
    async (input: {
      doc: PDFDocumentProxy;
      bytes: Uint8Array;
      pages: number[];
      language: OcrLanguage;
    }) => {
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;
      const { doc, bytes, pages, language } = input;
      const progress = (current: number, pageProgress: number, label: string) => {
        if (!controller.signal.aborted)
          setState({ status: "running", pages, current, pageProgress, label });
      };
      progress(0, 0, tr("Chargement du moteur OCR…"));
      try {
        if (engineRef.current && engineRef.current.language !== language) {
          await engineRef.current.engine.terminate();
          engineRef.current = null;
        }
        if (!engineRef.current) {
          const engine = await createOcrEngine(language, {
            encode: encodeWorkingImage,
            onProgress: (p) => progress(0, p.progress, STATUS_LABELS[p.status] ?? p.status),
          });
          engineRef.current = { language, engine };
        }
        if (controller.signal.aborted) throw new DOMException("cancelled", "AbortError");
        const { engine } = engineRef.current;
        const results: Record<number, OcrPageResult> = {};
        const inputs: {
          pageIndex: number;
          ocr: OcrPageResult;
          imageWidth: number;
          imageHeight: number;
        }[] = [];
        for (let i = 0; i < pages.length; i += 1) {
          const pageIndex = pages[i]!;
          if (controller.signal.aborted) throw new DOMException("cancelled", "AbortError");
          progress(i, 0, tr("Rendu de la page {n}", { n: pageIndex + 1 }));
          const raster = await renderPageToRaster(doc, pageIndex, 2600, controller.signal);
          if (controller.signal.aborted) throw new DOMException("cancelled", "AbortError");
          const ocr = await engine.recognize(
            { width: raster.width, height: raster.height, data: raster.data },
            pageIndex,
            { orientation: "auto", preprocess: "auto", deskew: true },
            (p) =>
              progress(
                i,
                p.progress,
                tr("{label} · page {n}", {
                  label: STATUS_LABELS[p.status] ?? p.status,
                  n: pageIndex + 1,
                }),
              ),
          );
          if (controller.signal.aborted) throw new DOMException("cancelled", "AbortError");
          results[pageIndex] = ocr;
          inputs.push({ pageIndex, ocr, imageWidth: raster.width, imageHeight: raster.height });
        }
        progress(pages.length - 1, 1, tr("Écriture de la couche de texte…"));
        const layer = await addOcrLayer(bytes, inputs);
        if (controller.signal.aborted) throw new DOMException("cancelled", "AbortError");
        let chars = 0;
        let weighted = 0;
        for (const r of Object.values(results)) {
          const n = r.text.replace(/\s/g, "").length;
          chars += n;
          weighted += n * r.confidence;
        }
        const info: OcrLayerInfo = {
          bytes: layer.bytes,
          pages,
          language,
          confidence: chars > 0 ? Math.round(weighted / chars) : 0,
          words: layer.wordsPlaced,
          results,
        };
        setState({ status: "done", layer: info });
        return info;
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          setState({ status: "cancelled" });
          return null;
        }
        setState({
          status: "error",
          message:
            error instanceof Error ? error.message : tr("La reconnaissance du texte a échoué."),
        });
        return null;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [],
  );

  const reset = React.useCallback(() => setState({ status: "idle" }), []);

  return { state, run, cancel, reset };
}
