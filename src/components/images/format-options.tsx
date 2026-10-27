"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Segmented } from "@/components/pdf/shared/segmented";
import * as React from "react";
import { supportsWebpEncoding } from "@/lib/images/canvas";
import { tr } from "@/lib/i18n/messages";
import {
  outputFormatLabels,
  supportsTransparency,
  type ImageOutputFormat,
} from "@/lib/images/types";

export interface FormatSettings {
  format: ImageOutputFormat | "same";
  quality: number;
  background: string;
}

export const defaultFormatSettings: FormatSettings = {
  format: "same",
  quality: 0.82,
  background: "#ffffff",
};

interface FormatOptionsProps {
  value: FormatSettings;
  onChange: (next: FormatSettings) => void;
  allowSame?: boolean;
  idPrefix: string;
}

export function FormatOptions({ value, onChange, allowSame = true, idPrefix }: FormatOptionsProps) {
  const lossy =
    value.format === "image/jpeg" || value.format === "image/webp" || value.format === "same";
  const [webp] = React.useState(() =>
    typeof document === "undefined" ? true : supportsWebpEncoding(),
  );
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{tr("Format de sortie")}</Label>
        <Segmented
          label={tr("Format de sortie")}
          value={value.format}
          onChange={(format) => onChange({ ...value, format })}
          className="sm:grid-cols-4"
          options={[
            ...(allowSame
              ? [
                  {
                    value: "same" as const,
                    label: tr("Identique"),
                    description: tr("Conserve le format d'origine"),
                  },
                ]
              : []),
            {
              value: "image/jpeg" as const,
              label: outputFormatLabels["image/jpeg"],
              description: tr("Photos, sans transparence"),
            },
            {
              value: "image/png" as const,
              label: outputFormatLabels["image/png"],
              description: tr("Sans perte, transparence"),
            },
            {
              value: "image/webp" as const,
              label: outputFormatLabels["image/webp"],
              description: webp
                ? tr("Léger, transparence")
                : tr("Non pris en charge par ce navigateur"),
              disabled: !webp,
            },
          ]}
        />
      </div>
      {lossy ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-quality`}>
            {tr("Qualité ({value} %)", { value: Math.round(value.quality * 100) })}
          </Label>
          <Slider
            id={`${idPrefix}-quality`}
            min={30}
            max={100}
            step={1}
            value={[Math.round(value.quality * 100)]}
            onValueChange={([q]) => q !== undefined && onChange({ ...value, quality: q / 100 })}
            aria-label={tr("Qualité")}
          />
          <p className="text-xs text-muted-foreground">
            {tr(
              "S'applique aux formats JPG et WebP (compression avec perte). Le PNG reste sans perte.",
            )}
          </p>
        </div>
      ) : null}
      {value.format !== "same" && !supportsTransparency(value.format) ? (
        <div className="flex items-center gap-3">
          <Label htmlFor={`${idPrefix}-bg`}>{tr("Fond pour les zones transparentes")}</Label>
          <input
            id={`${idPrefix}-bg`}
            type="color"
            value={value.background}
            onChange={(e) => onChange({ ...value, background: e.target.value })}
            className="size-9 cursor-pointer rounded-md border border-input bg-background p-0.5"
          />
          <span className="text-xs text-muted-foreground">
            {tr("Le JPG ne gère pas la transparence : elle est aplatie sur cette couleur.")}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function resolveFormat(settings: FormatSettings, sourceType: string): ImageOutputFormat {
  if (settings.format !== "same") return settings.format;
  // "Same format" for a WebP source needs a WebP encoder; PNG is the lossless fallback.
  if (sourceType === "image/webp") return supportsWebpEncoding() ? "image/webp" : "image/png";
  if (sourceType === "image/png" || sourceType === "image/jpeg") return sourceType;
  // GIF/BMP/SVG/AVIF sources: PNG keeps quality and transparency.
  return "image/png";
}
