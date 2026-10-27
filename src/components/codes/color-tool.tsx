"use client";

import * as React from "react";
import { CheckCircle2, Pipette, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { CopyButton } from "@/components/tools/shared/copy-button";
import { TextOutputPanel } from "@/components/tools/shared/text-io";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { IMAGE_MAX_SIZE, validateImageFile } from "@/components/images/image-batch-tool";
import {
  colorVariants,
  formatCmyk,
  formatHsl,
  formatRgb,
  parseColor,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  wcagContrast,
  type Rgb,
} from "@/lib/codes/color";
import { decodeImage, getRgba, releaseCanvas, resizeCanvas } from "@/lib/images/canvas";
import { extractPalette, type PaletteColor } from "@/lib/images/pixels";
import { formatBytes } from "@/lib/files/format";
import { track } from "@/lib/analytics/events";
import { tr } from "@/lib/i18n/messages";
import { currentLanguageTag } from "@/lib/i18n";

function Swatch({ rgb, label }: { rgb: Rgb; label?: string }) {
  const hex = rgbToHex(rgb);
  return (
    <div className="flex items-center gap-2">
      <span
        className="size-9 shrink-0 rounded-md border border-border shadow-sm"
        style={{ backgroundColor: hex }}
        aria-hidden="true"
      />
      <div className="min-w-0 text-sm">
        {label ? <p className="truncate text-xs text-muted-foreground">{label}</p> : null}
        <p className="font-mono">{hex}</p>
      </div>
      <CopyButton text={hex} label={tr("Copier")} />
    </div>
  );
}

export function ColorTool() {
  const [input, setInput] = React.useState("#5146E5");
  const [background, setBackground] = React.useState("#ffffff");
  const rgb = parseColor(input);
  const bg = parseColor(background);
  const hsl = rgb ? rgbToHsl(rgb) : null;
  const formats: [string, string][] =
    rgb && hsl
      ? [
          ["HEX", rgbToHex(rgb, true)],
          ["RGB", formatRgb(rgb)],
          ["HSL", formatHsl(hsl, rgb.a)],
          ["CMYK", formatCmyk(rgbToCmyk(rgb))],
        ]
      : [];
  const contrast = rgb && bg ? wcagContrast(rgb, bg) : null;

  return (
    <div className="space-y-4">
      <ToolPanel className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <div className="space-y-1">
            <Label htmlFor="color-picker">{tr("Pipette")}</Label>
            <input
              id="color-picker"
              type="color"
              value={rgb ? rgbToHex(rgb) : "#000000"}
              onChange={(e) => setInput(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded-md border border-input bg-surface p-1"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="color-input">{tr("Couleur (HEX, rgb(), hsl() ou nom CSS)")}</Label>
            <Input
              id="color-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="font-mono"
              spellCheck={false}
              data-testid="color-input"
            />
          </div>
        </div>
        {!rgb && input.trim() ? (
          <Alert variant="destructive">
            {tr(
              "Couleur non reconnue. Exemples : #5146e5, rgb(81, 70, 229), hsl(244, 75%, 59%), tomato.",
            )}
          </Alert>
        ) : null}
      </ToolPanel>
      {rgb ? (
        <>
          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <div
              className="rounded-[16px] border border-border"
              style={{ backgroundColor: rgbToHex(rgb) }}
              aria-hidden="true"
            />
            <ToolPanel>
              <dl className="divide-y divide-border/60" data-testid="color-formats">
                {formats.map(([label, value]) => (
                  <div key={label} className="flex items-center gap-3 py-2">
                    <dt className="w-14 text-xs font-semibold uppercase text-muted-foreground">
                      {label}
                    </dt>
                    <dd
                      className="min-w-0 flex-1 font-mono text-sm"
                      data-testid={`color-${label.toLowerCase()}`}
                    >
                      {value}
                    </dd>
                    <CopyButton text={value} label={tr("Copier")} />
                  </div>
                ))}
              </dl>
            </ToolPanel>
          </div>
          <ToolPanel className="space-y-3">
            <p className="text-sm font-medium">{tr("Nuances et complémentaire")}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {colorVariants(rgb).map((v) => (
                <Swatch key={v.label} rgb={v.rgb} label={tr(v.label)} />
              ))}
            </div>
          </ToolPanel>
          <ToolPanel className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1">
                <Label htmlFor="color-bg">{tr("Contraste avec un fond (WCAG 2.1)")}</Label>
                <Input
                  id="color-bg"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="font-mono"
                  data-testid="color-bg"
                />
              </div>
              <input
                type="color"
                aria-label={tr("Choisir la couleur de fond")}
                value={bg ? rgbToHex(bg) : "#ffffff"}
                onChange={(e) => setBackground(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-md border border-input bg-surface p-1"
              />
            </div>
            {contrast && bg ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div
                  className="flex items-center justify-center rounded-md p-4 text-lg font-semibold"
                  style={{ backgroundColor: rgbToHex(bg), color: rgbToHex(rgb) }}
                >
                  {tr("Exemple de texte · ratio {ratio}:1", {
                    ratio: contrast.ratio.toLocaleString(currentLanguageTag()),
                  })}
                </div>
                <ul className="space-y-1 text-sm" data-testid="color-contrast">
                  {[
                    [tr("AA texte normal (≥ 4,5)"), contrast.aaNormal],
                    [tr("AA grand texte (≥ 3)"), contrast.aaLarge],
                    [tr("AAA texte normal (≥ 7)"), contrast.aaaNormal],
                    [tr("AAA grand texte (≥ 4,5)"), contrast.aaaLarge],
                    [tr("Composants d'interface (≥ 3)"), contrast.uiComponents],
                  ].map(([label, ok]) => (
                    <li key={label as string} className="flex items-center gap-2">
                      {ok ? (
                        <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                      ) : (
                        <XCircle className="size-4 text-destructive" aria-hidden="true" />
                      )}
                      <span>
                        {tr("{label} : {status}", {
                          label: label as string,
                          status: tr(ok ? "conforme" : "insuffisant"),
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </ToolPanel>
        </>
      ) : null}
    </div>
  );
}

export function ImagePaletteTool() {
  const [palette, setPalette] = React.useState<PaletteColor[] | null>(null);
  const [count, setCount] = React.useState(6);
  const [file, setFile] = React.useState<{ name: string; url: string } | null>(null);
  const bitmapRef = React.useRef<ImageBitmap | null>(null);
  React.useEffect(
    () => () => {
      bitmapRef.current?.close();
    },
    [],
  );

  const compute = React.useCallback((bitmap: ImageBitmap, n: number) => {
    const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
    const canvas = resizeCanvas(
      bitmap,
      Math.max(1, Math.round(bitmap.width * scale)),
      Math.max(1, Math.round(bitmap.height * scale)),
    );
    const palette = extractPalette(getRgba(canvas), n, 2);
    releaseCanvas(canvas);
    return palette;
  }, []);

  const load = async (f: File) => {
    try {
      const decoded = await decodeImage(f);
      bitmapRef.current?.close();
      bitmapRef.current = decoded.bitmap;
      if (file) URL.revokeObjectURL(file.url);
      setFile({ name: f.name, url: URL.createObjectURL(f) });
      setPalette(compute(decoded.bitmap, count));
      track("tool_success", { tool: "image-palette" });
    } catch {
      toast.error(tr("Image illisible."));
    }
  };

  const changeCount = (n: number) => {
    setCount(n);
    if (bitmapRef.current) setPalette(compute(bitmapRef.current, n));
  };

  const css = palette ? palette.map((c, i) => `--couleur-${i + 1}: ${c.hex};`).join("\n") : "";

  return (
    <div className="space-y-4">
      <FileDropzone
        onFiles={(f) => f[0] && void load(f[0])}
        accept="image/*"
        validate={validateImageFile}
        compact={!!file}
        title={tr("Déposez une image pour en extraire les couleurs")}
        hint={tr("JPG, PNG, WebP · {size} max", { size: formatBytes(IMAGE_MAX_SIZE) })}
        buttonLabel={tr("Choisir une image")}
        testId="palette-dropzone"
      />
      {file && palette ? (
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview */}
          <img
            src={file.url}
            alt={file.name}
            className="max-h-60 w-full rounded-[12px] border border-border object-cover"
          />
          <ToolPanel className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Label htmlFor="palette-count" className="flex items-center gap-2">
                <Pipette className="size-4" aria-hidden="true" />{" "}
                {tr("Nombre de couleurs : {n}", { n: count })}
              </Label>
              <input
                id="palette-count"
                type="range"
                min={2}
                max={12}
                value={count}
                onChange={(e) => changeCount(Number(e.target.value))}
                className="w-48 accent-primary"
              />
            </div>
            <ul className="grid gap-3 sm:grid-cols-2" data-testid="palette-list">
              {palette.map((c) => (
                <li key={c.hex} className="flex items-center gap-3">
                  <span
                    className="size-12 shrink-0 rounded-md border border-border shadow-sm"
                    style={{ backgroundColor: c.hex }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-mono">{c.hex}</p>
                    <p className="text-xs text-muted-foreground">
                      rgb({c.r}, {c.g}, {c.b}) · {Math.round(c.share * 100)} %
                    </p>
                  </div>
                  <CopyButton text={c.hex} label={tr("Copier")} />
                </li>
              ))}
            </ul>
            <TextOutputPanel
              id="palette-css"
              label={tr("Variables CSS")}
              value={css}
              filename="palette.css"
              mimeType="text/css"
              rows={Math.min(8, count + 1)}
              toolId="image-palette"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => bitmapRef.current && setPalette(compute(bitmapRef.current, count))}
            >
              {tr("Recalculer")}
            </Button>
          </ToolPanel>
        </div>
      ) : null}
    </div>
  );
}
