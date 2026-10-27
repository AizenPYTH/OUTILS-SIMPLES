"use client";

import * as React from "react";
import { Alert } from "@/components/ui/alert";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import {
  drawToCanvas,
  encodeCanvas,
  flattenOnBackground,
  releaseCanvas,
} from "@/lib/images/canvas";
import { outputExtensions, supportsTransparency, type ImageOutputFormat } from "@/lib/images/types";
import { deriveOutputName, stripExtension } from "@/lib/files/filename";
import { tr } from "@/lib/i18n/messages";
import { ImageBatchTool } from "./image-batch-tool";
import { FormatOptions, type FormatSettings } from "./format-options";
import type { BatchProcessor } from "./use-image-batch";

export function ConvertImageTool({
  defaultFormat = "image/png",
  toolId = "image-convert",
}: {
  defaultFormat?: ImageOutputFormat;
  toolId?: string;
}) {
  const [format, setFormat] = React.useState<FormatSettings>({
    format: defaultFormat,
    quality: 0.9,
    background: "#ffffff",
  });

  const processor: BatchProcessor = React.useCallback(
    async (item, decoded) => {
      const target = format.format === "same" ? "image/png" : format.format;
      let canvas = drawToCanvas(decoded.bitmap, decoded.width, decoded.height);
      let note: string | undefined;
      if (!supportsTransparency(target) && decoded.type !== "image/jpeg") {
        const flat = flattenOnBackground(canvas, format.background);
        releaseCanvas(canvas);
        canvas = flat;
        note = tr("transparence aplatie");
      }
      if (decoded.type === "image/gif")
        note = (note ? `${note} · ` : "") + tr("première image du GIF");
      const encoded = await encodeCanvas(canvas, target, format.quality);
      releaseCanvas(canvas);
      return {
        blob: encoded.blob,
        name: `${stripExtension(deriveOutputName(item.file.name, ""))}.${outputExtensions[target]}`,
        width: decoded.width,
        height: decoded.height,
        note,
      };
    },
    [format],
  );

  return (
    <ImageBatchTool
      toolId={toolId}
      actionLabel={tr("Convertir")}
      zipName="images-converties"
      processor={processor}
      options={
        <ToolPanel className="space-y-4">
          <FormatOptions value={format} onChange={setFormat} allowSame={false} idPrefix="convert" />
          <Alert variant="info">
            {tr(
              "Formats lus par le navigateur : JPG, PNG, WebP, GIF (première image), BMP, AVIF et SVG (rendu en pixels). HEIC et TIFF ne sont pas pris en charge.",
            )}
          </Alert>
        </ToolPanel>
      }
    />
  );
}
