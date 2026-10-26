"use client";

import * as React from "react";
import { Crop, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { DonePanel } from "@/components/pdf/shared/processing-panel";
import {
  cropCanvas,
  decodeImage,
  encodeCanvas,
  flattenOnBackground,
  releaseCanvas,
  type DecodedImage,
} from "@/lib/images/canvas";
import {
  aspectPresets,
  clampCrop,
  outputExtensions,
  supportsTransparency,
  type CropRect,
} from "@/lib/images/types";
import { deriveOutputName } from "@/lib/files/filename";
import { triggerDownload } from "@/lib/files/download";
import { formatBytes } from "@/lib/files/format";
import { track } from "@/lib/analytics/events";
import { IMAGE_MAX_SIZE, validateImageFile } from "./image-batch-tool";
import {
  FormatOptions,
  defaultFormatSettings,
  resolveFormat,
  type FormatSettings,
} from "./format-options";
import { CropBox } from "./crop-box";

const TOOL_ID = "image-crop";

export function CropImageTool() {
  const [file, setFile] = React.useState<File | null>(null);
  const [decoded, setDecoded] = React.useState<DecodedImage | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState<CropRect | null>(null);
  const [ratioIndex, setRatioIndex] = React.useState(0);
  const [format, setFormat] = React.useState<FormatSettings>({
    ...defaultFormatSettings,
    quality: 0.92,
  });
  const [result, setResult] = React.useState<{
    blob: Blob;
    name: string;
    width: number;
    height: number;
    url: string;
  } | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (result) URL.revokeObjectURL(result.url);
      decoded?.bitmap.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

  const load = async (f: File) => {
    try {
      const d = await decodeImage(f);
      decoded?.bitmap.close();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(f);
      setDecoded(d);
      setPreviewUrl(URL.createObjectURL(f));
      const inset = Math.round(Math.min(d.width, d.height) * 0.1);
      setCrop({ x: inset, y: inset, width: d.width - inset * 2, height: d.height - inset * 2 });
      setResult(null);
      track("tool_start", { tool: TOOL_ID });
    } catch {
      toast.error("Image illisible par ce navigateur.");
    }
  };

  const reset = () => {
    decoded?.bitmap.close();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result) URL.revokeObjectURL(result.url);
    setFile(null);
    setDecoded(null);
    setPreviewUrl(null);
    setCrop(null);
    setResult(null);
  };

  const applyRatio = (index: number) => {
    setRatioIndex(index);
    const ratio = aspectPresets[index]?.ratio;
    if (!ratio || !crop || !decoded) return;
    let width = crop.width;
    let height = Math.round(width / ratio);
    if (height > decoded.height) {
      height = decoded.height;
      width = Math.round(height * ratio);
    }
    setCrop(clampCrop({ ...crop, width, height }, decoded));
  };

  const run = async () => {
    if (!decoded || !crop || !file) return;
    setBusy(true);
    try {
      const target = resolveFormat(format, decoded.type);
      let canvas = cropCanvas(decoded.bitmap, crop);
      if (!supportsTransparency(target) && decoded.type !== "image/jpeg") {
        const flat = flattenOnBackground(canvas, format.background);
        releaseCanvas(canvas);
        canvas = flat;
      }
      const encoded = await encodeCanvas(canvas, target, format.quality);
      releaseCanvas(canvas);
      if (result) URL.revokeObjectURL(result.url);
      setResult({
        blob: encoded.blob,
        name: deriveOutputName(file.name, "recadre", outputExtensions[target]),
        width: crop.width,
        height: crop.height,
        url: URL.createObjectURL(encoded.blob),
      });
      track("tool_success", { tool: TOOL_ID });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Recadrage impossible.");
    } finally {
      setBusy(false);
    }
  };

  if (!file || !decoded || !crop || !previewUrl) {
    return (
      <FileDropzone
        onFiles={(f) => f[0] && void load(f[0])}
        accept="image/*"
        validate={validateImageFile}
        title="Déposez une image à recadrer"
        hint={`JPG, PNG, WebP, GIF, BMP, AVIF, SVG · ${formatBytes(IMAGE_MAX_SIZE)} max`}
        buttonLabel="Choisir une image"
        testId="image-dropzone"
      />
    );
  }

  if (result) {
    return (
      <DonePanel
        summary={`${result.width}×${result.height} px · ${formatBytes(result.blob.size)}`}
        onDownload={() => {
          triggerDownload(result.blob, result.name);
          track("tool_download", { tool: TOOL_ID });
        }}
        downloadLabel="Télécharger l'image"
        onStartOver={reset}
      >
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview */}
          <img
            src={result.url}
            alt="Aperçu de l'image recadrée"
            className="max-h-80 max-w-full rounded-md border border-border checkerboard"
          />
        </div>
        <div className="mt-4 text-center">
          <Button type="button" variant="ghost" size="sm" onClick={() => setResult(null)}>
            Ajuster le recadrage
          </Button>
        </div>
      </DonePanel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {file.name} · {decoded.width}×{decoded.height} px
        </p>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          <RefreshCw aria-hidden="true" /> Autre image
        </Button>
      </div>
      <CropBox
        imageUrl={previewUrl}
        imageWidth={decoded.width}
        imageHeight={decoded.height}
        crop={crop}
        onChange={(c) => setCrop(clampCrop(c, decoded))}
        ratio={aspectPresets[ratioIndex]?.ratio ?? null}
      />
      <ToolPanel className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="space-y-1">
            <Label htmlFor="crop-ratio">Proportions</Label>
            <Select value={String(ratioIndex)} onValueChange={(v) => applyRatio(Number(v))}>
              <SelectTrigger id="crop-ratio">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aspectPresets.map((p, i) => (
                  <SelectItem key={p.label} value={String(i)}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(["x", "y", "width", "height"] as const).map((key) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`crop-${key}`}>
                {{ x: "X", y: "Y", width: "Largeur", height: "Hauteur" }[key]}
              </Label>
              <Input
                id={`crop-${key}`}
                type="number"
                min={0}
                value={crop[key]}
                onChange={(e) =>
                  setCrop(clampCrop({ ...crop, [key]: Number(e.target.value) || 0 }, decoded))
                }
                className="w-24"
                data-testid={`crop-${key}`}
              />
            </div>
          ))}
        </div>
        <FormatOptions value={format} onChange={setFormat} idPrefix="crop" />
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() => void run()}
          loading={busy}
          data-testid="crop-run"
        >
          <Crop aria-hidden="true" /> Recadrer ({crop.width}×{crop.height} px)
        </Button>
      </ToolPanel>
    </div>
  );
}
