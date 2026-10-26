"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import {
  BARCODE_TYPES,
  barcodeToSvg,
  defaultBarcodeRender,
  encodeBarcode,
  type BarcodeRenderOptions,
  type BarcodeType,
} from "@/lib/codes/barcode";
import { triggerDownload } from "@/lib/files/download";
import { track } from "@/lib/analytics/events";

const TOOL_ID = "barcode-generate";
const SAMPLES: Record<BarcodeType, string> = {
  ean13: "400638133393",
  ean8: "9638507",
  upca: "03600029145",
  code128: "OUTILIA-2026",
  code39: "REF 1234",
};

/** Rasterises an SVG string into a PNG blob through an <img> and a canvas (browser only). */
export async function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Rendu PNG impossible."));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Export PNG impossible."))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function BarcodeTool() {
  const [type, setType] = React.useState<BarcodeType>("ean13");
  const [value, setValue] = React.useState(SAMPLES.ean13);
  const [render, setRender] = React.useState<BarcodeRenderOptions>(defaultBarcodeRender);
  const result = React.useMemo(() => encodeBarcode(type, value), [type, value]);
  const svg = result.ok ? barcodeToSvg(result.barcode, render) : "";
  const info = BARCODE_TYPES.find((t) => t.id === type)!;

  const downloadSvg = () => {
    triggerDownload(new Blob([svg], { type: "image/svg+xml" }), `code-barres-${type}.svg`);
    track("tool_download", { tool: TOOL_ID, option: "svg" });
  };
  const downloadPng = async () => {
    triggerDownload(await svgToPngBlob(svg, 3), `code-barres-${type}.png`);
    track("tool_download", { tool: TOOL_ID, option: "png" });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <ToolPanel className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
            <div className="space-y-1">
              <Label htmlFor="bc-type">Type de code</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  const next = v as BarcodeType;
                  setType(next);
                  if (!value || value === SAMPLES[type]) setValue(SAMPLES[next]);
                }}
              >
                <SelectTrigger id="bc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BARCODE_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bc-value">Contenu — {info.hint}</Label>
              <Input
                id="bc-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="font-mono"
                spellCheck={false}
                data-testid="bc-value"
              />
            </div>
          </div>
          {!result.ok ? (
            <Alert variant="destructive" data-testid="bc-error">
              {result.error}
            </Alert>
          ) : null}
          {result.ok &&
          (type === "ean13" || type === "ean8" || type === "upca") &&
          result.barcode.text !== value.replace(/\s/g, "") ? (
            <p className="text-sm text-muted-foreground">
              Clé de contrôle calculée : le code complet est {result.barcode.text}.
            </p>
          ) : null}
        </ToolPanel>
        <div
          className="flex min-h-[200px] items-center justify-center overflow-x-auto rounded-[16px] border border-border bg-white p-6"
          data-testid="bc-preview"
        >
          {svg ? (
            <div
              dangerouslySetInnerHTML={{ __html: svg }}
              aria-label={`Code-barres ${info.label} : ${result.ok ? result.barcode.text : ""}`}
              role="img"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Saisissez un contenu valide pour afficher le code-barres.
            </p>
          )}
        </div>
      </div>
      <ToolPanel className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="bc-width">Largeur d&apos;un module : {render.moduleWidth} px</Label>
          <input
            id="bc-width"
            type="range"
            min={1}
            max={6}
            value={render.moduleWidth}
            onChange={(e) => setRender({ ...render, moduleWidth: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bc-height">Hauteur des barres : {render.height} px</Label>
          <input
            id="bc-height"
            type="range"
            min={30}
            max={200}
            step={5}
            value={render.height}
            onChange={(e) => setRender({ ...render, height: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={render.showText}
            onCheckedChange={(v) => setRender({ ...render, showText: v === true })}
          />{" "}
          Afficher le texte sous les barres
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="bc-fg">Barres</Label>
            <input
              id="bc-fg"
              type="color"
              value={render.foreground}
              onChange={(e) => setRender({ ...render, foreground: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-md border border-input bg-surface p-1"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bc-bg">Fond</Label>
            <input
              id="bc-bg"
              type="color"
              value={render.background}
              onChange={(e) => setRender({ ...render, background: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-md border border-input bg-surface p-1"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => void downloadPng()}
            disabled={!svg}
            data-testid="bc-download-png"
          >
            <Download aria-hidden="true" /> Télécharger en PNG
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={downloadSvg}
            disabled={!svg}
            data-testid="bc-download-svg"
          >
            <Download aria-hidden="true" /> Télécharger en SVG
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Pour l&apos;impression, gardez un fort contraste (barres sombres sur fond clair) et une
          zone blanche autour du code. Testez toujours le code avec une douchette ou
          l&apos;application du destinataire.
        </p>
      </ToolPanel>
    </div>
  );
}
