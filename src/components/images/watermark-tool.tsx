"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { drawToCanvas, encodeCanvas, flattenOnBackground, releaseCanvas } from "@/lib/images/canvas";
import { outputExtensions, supportsTransparency } from "@/lib/images/types";
import { defaultWatermarkSettings, drawTextWatermark, type WatermarkPosition, type WatermarkSettings } from "@/lib/images/watermark";
import { deriveOutputName } from "@/lib/files/filename";
import { ImageBatchTool } from "./image-batch-tool";
import { FormatOptions, defaultFormatSettings, resolveFormat, type FormatSettings } from "./format-options";
import type { BatchProcessor } from "./use-image-batch";

const TOOL_ID = "image-watermark";

const POSITIONS: { value: WatermarkPosition; label: string }[] = [
  { value: "bottom-right", label: "Bas droite" },
  { value: "bottom-left", label: "Bas gauche" },
  { value: "top-right", label: "Haut droite" },
  { value: "top-left", label: "Haut gauche" },
  { value: "center", label: "Centre" },
  { value: "tile", label: "Mosaïque (toute l'image)" },
];

export function WatermarkImageTool() {
  const [settings, setSettings] = React.useState<WatermarkSettings>({ ...defaultWatermarkSettings, text: "" });
  const [format, setFormat] = React.useState<FormatSettings>({ ...defaultFormatSettings, quality: 0.9 });
  const patch = (p: Partial<WatermarkSettings>) => setSettings((s) => ({ ...s, ...p }));

  const processor: BatchProcessor = React.useCallback(
    async (item, decoded) => {
      const target = resolveFormat(format, decoded.type);
      let canvas = drawToCanvas(decoded.bitmap, decoded.width, decoded.height);
      drawTextWatermark(canvas, settings);
      if (!supportsTransparency(target) && decoded.type !== "image/jpeg") {
        const flat = flattenOnBackground(canvas, format.background);
        releaseCanvas(canvas);
        canvas = flat;
      }
      const encoded = await encodeCanvas(canvas, target, format.quality);
      releaseCanvas(canvas);
      return { blob: encoded.blob, name: deriveOutputName(item.file.name, "filigrane", outputExtensions[target]), width: decoded.width, height: decoded.height };
    },
    [format, settings],
  );

  return (
    <ImageBatchTool
      toolId={TOOL_ID}
      actionLabel="Appliquer le filigrane"
      zipName="images-filigrane"
      processor={processor}
      disabled={!settings.text.trim()}
      options={
        <ToolPanel className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="wm-text">Texte du filigrane</Label>
              <Input id="wm-text" value={settings.text} onChange={(e) => patch({ text: e.target.value })} placeholder="© Votre nom · 2026" maxLength={120} data-testid="wm-text" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wm-position">Position</Label>
              <Select value={settings.position} onValueChange={(v) => patch({ position: v as WatermarkPosition })}>
                <SelectTrigger id="wm-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="wm-font">Police</Label>
              <Select value={settings.font} onValueChange={(v) => patch({ font: v as WatermarkSettings["font"] })}>
                <SelectTrigger id="wm-font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sans">Sans-serif</SelectItem>
                  <SelectItem value="serif">Serif</SelectItem>
                  <SelectItem value="mono">Monospace</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="wm-size">Taille ({settings.sizePercent} % de la largeur)</Label>
              <input id="wm-size" type="range" min={1} max={30} value={settings.sizePercent} onChange={(e) => patch({ sizePercent: Number(e.target.value) })} className="w-full accent-primary" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wm-opacity">Opacité ({Math.round(settings.opacity * 100)} %)</Label>
              <input id="wm-opacity" type="range" min={5} max={100} value={Math.round(settings.opacity * 100)} onChange={(e) => patch({ opacity: Number(e.target.value) / 100 })} className="w-full accent-primary" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wm-rotation">Inclinaison ({settings.rotation}°)</Label>
              <input id="wm-rotation" type="range" min={-90} max={90} value={settings.rotation} onChange={(e) => patch({ rotation: Number(e.target.value) })} className="w-full accent-primary" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wm-color">Couleur</Label>
              <div className="flex items-center gap-2">
                <input id="wm-color" type="color" value={settings.color} onChange={(e) => patch({ color: e.target.value })} className="h-10 w-14 cursor-pointer rounded-md border border-input bg-surface p-1" />
                <span className="font-mono text-sm">{settings.color}</span>
              </div>
            </div>
          </div>
          <FormatOptions value={format} onChange={setFormat} idPrefix="wm" />
        </ToolPanel>
      }
    />
  );
}
