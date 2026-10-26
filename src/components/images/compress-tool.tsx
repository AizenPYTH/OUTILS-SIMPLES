"use client";

import * as React from "react";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import {
  drawToCanvas,
  encodeCanvas,
  flattenOnBackground,
  releaseCanvas,
  resizeCanvas,
} from "@/lib/images/canvas";
import { fitDimensions, outputExtensions, supportsTransparency } from "@/lib/images/types";
import { deriveOutputName } from "@/lib/files/filename";
import { formatPercent } from "@/lib/files/format";
import { ImageBatchTool } from "./image-batch-tool";
import {
  FormatOptions,
  defaultFormatSettings,
  resolveFormat,
  type FormatSettings,
} from "./format-options";
import type { BatchProcessor } from "./use-image-batch";

const TOOL_ID = "image-compress";

export function CompressImageTool() {
  const [format, setFormat] = React.useState<FormatSettings>(defaultFormatSettings);
  const [limitSize, setLimitSize] = React.useState(true);
  const [maxDimension, setMaxDimension] = React.useState(2048);
  const [keepIfBigger, setKeepIfBigger] = React.useState(true);

  const processor: BatchProcessor = React.useCallback(
    async (item, decoded) => {
      const target = resolveFormat(format, decoded.type);
      const dims = limitSize
        ? fitDimensions(
            { width: decoded.width, height: decoded.height },
            { maxWidth: maxDimension, maxHeight: maxDimension },
          )
        : { width: decoded.width, height: decoded.height };
      let canvas =
        dims.width !== decoded.width
          ? resizeCanvas(decoded.bitmap, dims.width, dims.height)
          : drawToCanvas(decoded.bitmap, decoded.width, decoded.height);
      let note: string | undefined;
      if (
        !supportsTransparency(target) &&
        (decoded.type === "image/png" ||
          decoded.type === "image/webp" ||
          decoded.type === "image/gif")
      ) {
        const flat = flattenOnBackground(canvas, format.background);
        releaseCanvas(canvas);
        canvas = flat;
        note = "transparence aplatie";
      }
      const encoded = await encodeCanvas(canvas, target, format.quality);
      releaseCanvas(canvas);
      if (
        keepIfBigger &&
        encoded.bytes >= item.file.size &&
        target === decoded.type &&
        dims.width === decoded.width
      ) {
        return {
          blob: item.file,
          name: item.file.name,
          width: decoded.width,
          height: decoded.height,
          note: "déjà optimisée : original conservé",
        };
      }
      return {
        blob: encoded.blob,
        name: deriveOutputName(item.file.name, "compresse", outputExtensions[target]),
        width: dims.width,
        height: dims.height,
        note,
      };
    },
    [format, limitSize, maxDimension, keepIfBigger],
  );

  return (
    <ImageBatchTool
      toolId={TOOL_ID}
      actionLabel="Compresser"
      zipName="images-compressees"
      processor={processor}
      summary={(item) => {
        const delta = item.file.size - item.result!.blob.size;
        return delta > 0 ? (
          <span className="text-success-foreground">−{formatPercent(delta / item.file.size)}</span>
        ) : (
          <span className="text-muted-foreground">sans gain</span>
        );
      }}
      options={
        <ToolPanel className="space-y-4">
          <FormatOptions value={format} onChange={setFormat} idPrefix="compress" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Checkbox
                id="compress-limit"
                checked={limitSize}
                onCheckedChange={(c) => setLimitSize(c === true)}
                className="mt-0.5"
              />
              <Label htmlFor="compress-limit" className="flex-col items-start gap-1 font-normal">
                <span>Limiter la taille en pixels</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  Côté max&nbsp;
                  <Input
                    type="number"
                    min={100}
                    max={10000}
                    step={100}
                    value={maxDimension}
                    onChange={(e) => setMaxDimension(Number(e.target.value) || 2048)}
                    className="h-8 w-24"
                    disabled={!limitSize}
                    aria-label="Dimension maximale en pixels"
                  />
                  px
                </span>
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="compress-keep"
                checked={keepIfBigger}
                onCheckedChange={(c) => setKeepIfBigger(c === true)}
                className="mt-0.5"
              />
              <Label htmlFor="compress-keep" className="font-normal">
                Conserver l&apos;original si la version compressée est plus lourde
              </Label>
            </div>
          </div>
          <Alert variant="info">
            La compression JPG/WebP est avec perte : baissez la qualité pour gagner du poids,
            vérifiez le rendu avant d&apos;utiliser l&apos;image. Le PNG reste sans perte (gain
            limité).
          </Alert>
        </ToolPanel>
      }
    />
  );
}
