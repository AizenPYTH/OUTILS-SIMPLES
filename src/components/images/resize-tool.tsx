"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/pdf/shared/segmented";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import {
  encodeCanvas,
  flattenOnBackground,
  releaseCanvas,
  resizeCanvas,
} from "@/lib/images/canvas";
import { fitDimensions, outputExtensions, supportsTransparency } from "@/lib/images/types";
import { deriveOutputName } from "@/lib/files/filename";
import { ImageBatchTool } from "./image-batch-tool";
import {
  FormatOptions,
  defaultFormatSettings,
  resolveFormat,
  type FormatSettings,
} from "./format-options";
import type { BatchProcessor } from "./use-image-batch";

const TOOL_ID = "image-resize";
type Mode = "percent" | "width" | "height" | "exact" | "max";

export function ResizeImageTool() {
  const [mode, setMode] = React.useState<Mode>("width");
  const [percent, setPercent] = React.useState(50);
  const [width, setWidth] = React.useState(1200);
  const [height, setHeight] = React.useState(800);
  const [allowUpscale, setAllowUpscale] = React.useState(false);
  const [format, setFormat] = React.useState<FormatSettings>(defaultFormatSettings);

  const processor: BatchProcessor = React.useCallback(
    async (item, decoded) => {
      const source = { width: decoded.width, height: decoded.height };
      const dims =
        mode === "percent"
          ? fitDimensions(source, { percent })
          : mode === "width"
            ? fitDimensions(source, { width, allowUpscale })
            : mode === "height"
              ? fitDimensions(source, { height, allowUpscale })
              : mode === "exact"
                ? { width: Math.max(1, width), height: Math.max(1, height) }
                : fitDimensions(source, { maxWidth: width, maxHeight: height });
      const target = resolveFormat(format, decoded.type);
      let canvas = resizeCanvas(decoded.bitmap, dims.width, dims.height);
      let note: string | undefined;
      if (!supportsTransparency(target) && decoded.type !== "image/jpeg") {
        const flat = flattenOnBackground(canvas, format.background);
        releaseCanvas(canvas);
        canvas = flat;
        note = "transparence aplatie";
      }
      if (
        mode === "exact" &&
        Math.abs(dims.width / dims.height - source.width / source.height) > 0.01
      )
        note = (note ? `${note} · ` : "") + "proportions modifiées";
      const encoded = await encodeCanvas(canvas, target, format.quality);
      releaseCanvas(canvas);
      return {
        blob: encoded.blob,
        name: deriveOutputName(
          item.file.name,
          `${dims.width}x${dims.height}`,
          outputExtensions[target],
        ),
        width: dims.width,
        height: dims.height,
        note,
      };
    },
    [mode, percent, width, height, allowUpscale, format],
  );

  const numberField = (id: string, label: string, value: number, set: (v: number) => void) => (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={1}
        max={20000}
        value={value}
        onChange={(e) => set(Number(e.target.value) || 1)}
        className="w-32"
      />
    </div>
  );

  return (
    <ImageBatchTool
      toolId={TOOL_ID}
      actionLabel="Redimensionner"
      zipName="images-redimensionnees"
      processor={processor}
      options={
        <ToolPanel className="space-y-4">
          <Segmented
            label="Méthode"
            value={mode}
            onChange={setMode}
            className="sm:grid-cols-5"
            options={[
              { value: "width", label: "Largeur", description: "Hauteur proportionnelle" },
              { value: "height", label: "Hauteur", description: "Largeur proportionnelle" },
              { value: "max", label: "Tenir dans", description: "Largeur × hauteur max" },
              { value: "percent", label: "Pourcentage", description: "Échelle" },
              { value: "exact", label: "Exact", description: "Peut déformer" },
            ]}
          />
          <div className="flex flex-wrap items-end gap-4">
            {mode === "percent"
              ? numberField("resize-percent", "Échelle (%)", percent, setPercent)
              : null}
            {mode !== "percent" && mode !== "height"
              ? numberField("resize-width", "Largeur (px)", width, setWidth)
              : null}
            {mode !== "percent" && mode !== "width"
              ? numberField("resize-height", "Hauteur (px)", height, setHeight)
              : null}
            {mode === "width" || mode === "height" ? (
              <div className="flex items-center gap-2 pb-2">
                <Checkbox
                  id="resize-upscale"
                  checked={allowUpscale}
                  onCheckedChange={(c) => setAllowUpscale(c === true)}
                />
                <Label htmlFor="resize-upscale" className="font-normal">
                  Autoriser l&apos;agrandissement (perte de netteté)
                </Label>
              </div>
            ) : null}
          </div>
          <FormatOptions value={format} onChange={setFormat} idPrefix="resize" />
        </ToolPanel>
      }
    />
  );
}
