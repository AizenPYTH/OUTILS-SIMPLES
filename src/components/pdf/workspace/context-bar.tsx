"use client";

import { AlignCenter, AlignLeft, AlignRight, Bold, Italic } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fontFamilies, type FontFamily } from "@/lib/pdf/fonts";
import { hexToRgb, rgbToHex } from "@/lib/pdf/annotations/types";
import { cn } from "@/lib/utils";
import { toolHints, type ToolSettings, type WorkspaceTool } from "./types";

interface ContextBarProps {
  tool: WorkspaceTool;
  settings: ToolSettings;
  onChange: (patch: Partial<ToolSettings>) => void;
  /** True when a text annotation is selected: show text controls even in select mode. */
  textSelected: boolean;
  hasSelection: boolean;
}

const sizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

export function ContextBar({
  tool,
  settings,
  onChange,
  textSelected,
  hasSelection,
}: ContextBarProps) {
  const showText = tool === "text" || tool === "comment" || textSelected;
  const showStroke =
    tool === "pen" ||
    tool === "rect" ||
    tool === "ellipse" ||
    tool === "arrow" ||
    tool === "underline";
  const showFill = tool === "rect" || tool === "ellipse";
  const showColor =
    tool !== "select" || hasSelection ? tool !== "image" && tool !== "signature" : false;
  const showOpacity =
    tool === "pen" || tool === "highlight" || tool === "rect" || tool === "ellipse";

  return (
    <div
      className="flex min-h-12 items-center gap-3 overflow-x-auto border-b border-border bg-surface px-3 py-1.5 text-sm"
      data-testid="context-bar"
    >
      {showColor ? (
        <label className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Couleur</span>
          <input
            type="color"
            value={rgbToHex(settings.color)}
            onChange={(e) => onChange({ color: hexToRgb(e.target.value) })}
            className="size-8 cursor-pointer rounded-md border border-input bg-background p-0.5"
            aria-label="Couleur"
            data-testid="color-input"
          />
        </label>
      ) : null}
      {showText ? (
        <>
          <div className="flex shrink-0 items-center gap-1.5">
            <Label htmlFor="ctx-font" className="text-xs text-muted-foreground">
              Police
            </Label>
            <Select
              value={settings.fontFamily}
              onValueChange={(v) => onChange({ fontFamily: v as FontFamily })}
            >
              <SelectTrigger id="ctx-font" className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontFamilies.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Label htmlFor="ctx-size" className="text-xs text-muted-foreground">
              Taille
            </Label>
            <Select
              value={String(settings.fontSize)}
              onValueChange={(v) => onChange({ fontSize: Number(v) })}
            >
              <SelectTrigger
                id="ctx-size"
                className="h-8 w-20 text-xs"
                data-testid="font-size-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sizes.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s} pt
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Toggle
              pressed={settings.bold}
              onClick={() => onChange({ bold: !settings.bold })}
              label="Gras"
            >
              <Bold className="size-4" />
            </Toggle>
            <Toggle
              pressed={settings.italic}
              onClick={() => onChange({ italic: !settings.italic })}
              label="Italique"
            >
              <Italic className="size-4" />
            </Toggle>
          </div>
          <div
            className="flex shrink-0 items-center gap-0.5"
            role="radiogroup"
            aria-label="Alignement"
          >
            <Toggle
              pressed={settings.align === "left"}
              onClick={() => onChange({ align: "left" })}
              label="Aligner à gauche"
            >
              <AlignLeft className="size-4" />
            </Toggle>
            <Toggle
              pressed={settings.align === "center"}
              onClick={() => onChange({ align: "center" })}
              label="Centrer"
            >
              <AlignCenter className="size-4" />
            </Toggle>
            <Toggle
              pressed={settings.align === "right"}
              onClick={() => onChange({ align: "right" })}
              label="Aligner à droite"
            >
              <AlignRight className="size-4" />
            </Toggle>
          </div>
        </>
      ) : null}
      {showStroke ? (
        <label className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Épaisseur</span>
          <input
            type="range"
            min={1}
            max={16}
            step={1}
            value={settings.strokeWidth}
            onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })}
            className="w-24 accent-primary"
            aria-label="Épaisseur du trait"
          />
          <span className="w-6 text-xs tabular-nums text-muted-foreground">
            {settings.strokeWidth}
          </span>
        </label>
      ) : null}
      {showOpacity ? (
        <label className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Opacité</span>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={Math.round(settings.opacity * 100)}
            onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 })}
            className="w-24 accent-primary"
            aria-label="Opacité"
          />
          <span className="w-8 text-xs tabular-nums text-muted-foreground">
            {Math.round(settings.opacity * 100)}%
          </span>
        </label>
      ) : null}
      {showFill ? (
        <Toggle
          pressed={settings.fill}
          onClick={() => onChange({ fill: !settings.fill })}
          label="Remplir la forme"
        >
          <span className="px-1 text-xs">Remplissage</span>
        </Toggle>
      ) : null}
      <p className="ml-auto hidden shrink-0 text-xs text-muted-foreground lg:block">
        {toolHints[tool]}
      </p>
    </div>
  );
}

function Toggle({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-md px-1 transition-colors",
        pressed ? "bg-primary-soft text-link" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
