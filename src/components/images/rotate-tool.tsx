"use client";

import * as React from "react";
import { FlipHorizontal, FlipVertical, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { encodeCanvas, releaseCanvas, rotateFlipCanvas } from "@/lib/images/canvas";
import { outputExtensions } from "@/lib/images/types";
import { deriveOutputName } from "@/lib/files/filename";
import { ImageBatchTool } from "./image-batch-tool";
import {
  FormatOptions,
  defaultFormatSettings,
  resolveFormat,
  type FormatSettings,
} from "./format-options";
import type { BatchProcessor } from "./use-image-batch";

const TOOL_ID = "image-rotate";

export function RotateImageTool() {
  const [rotation, setRotation] = React.useState<0 | 90 | 180 | 270>(90);
  const [flipH, setFlipH] = React.useState(false);
  const [flipV, setFlipV] = React.useState(false);
  const [format, setFormat] = React.useState<FormatSettings>({
    ...defaultFormatSettings,
    quality: 0.92,
  });

  const processor: BatchProcessor = React.useCallback(
    async (item, decoded) => {
      const target = resolveFormat(format, decoded.type);
      const canvas = rotateFlipCanvas(decoded.bitmap, rotation, flipH, flipV);
      const encoded = await encodeCanvas(canvas, target, format.quality);
      const result = {
        blob: encoded.blob,
        name: deriveOutputName(item.file.name, "pivote", outputExtensions[target]),
        width: canvas.width,
        height: canvas.height,
      };
      releaseCanvas(canvas);
      return result;
    },
    [rotation, flipH, flipV, format],
  );

  const rotateBtn = (value: 0 | 90 | 180 | 270, label: string, Icon?: typeof RotateCw) => (
    <Button
      type="button"
      variant={rotation === value ? "default" : "outline"}
      onClick={() => setRotation(value)}
      aria-pressed={rotation === value}
      data-testid={`rotate-${value}`}
    >
      {Icon ? <Icon aria-hidden="true" /> : null}
      {label}
    </Button>
  );

  return (
    <ImageBatchTool
      toolId={TOOL_ID}
      actionLabel="Appliquer"
      zipName="images-pivotees"
      processor={processor}
      options={
        <ToolPanel className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Rotation">
            {rotateBtn(0, "Aucune rotation")}
            {rotateBtn(90, "90° à droite", RotateCw)}
            {rotateBtn(180, "180°")}
            {rotateBtn(270, "90° à gauche", RotateCcw)}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Retournement">
            <Button
              type="button"
              variant={flipH ? "default" : "outline"}
              onClick={() => setFlipH((v) => !v)}
              aria-pressed={flipH}
            >
              <FlipHorizontal aria-hidden="true" /> Miroir horizontal
            </Button>
            <Button
              type="button"
              variant={flipV ? "default" : "outline"}
              onClick={() => setFlipV((v) => !v)}
              aria-pressed={flipV}
            >
              <FlipVertical aria-hidden="true" /> Miroir vertical
            </Button>
          </div>
          <FormatOptions value={format} onChange={setFormat} idPrefix="rotate" />
        </ToolPanel>
      }
    />
  );
}
