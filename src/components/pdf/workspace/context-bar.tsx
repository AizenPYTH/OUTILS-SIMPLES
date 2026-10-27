"use client";

import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline } from "lucide-react";
import { fontFamilies, hasStyle, type FontFamily } from "@/lib/pdf/fonts";
import { ensureFontFace } from "@/lib/pdf/fonts-embed";
import { hexToRgb, rgbToHex, type DashStyle } from "@/lib/pdf/annotations/types";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n/messages";
import { toolHints, type ToolSettings, type WorkspaceTool } from "./types";

interface ContextBarProps {
  tool: WorkspaceTool;
  settings: ToolSettings;
  onChange: (patch: Partial<ToolSettings>) => void;
  hasSelection: boolean;
  /** "Modifier le texte": show every editable zone instead of only on hover. */
  showRuns?: boolean;
  onToggleRuns?: () => void;
  /** Short state of the page for the text tool ("12 passages modifiables", "page scannée"). */
  textInfo?: string | null;
}

const sizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

/**
 * Top row: the style new objects will get with the active tool, and the
 * tool's hint. A selected object is edited in the floating bar next to it.
 * Always rendered at the same height so the page never jumps.
 */
export function ContextBar({
  tool,
  settings,
  onChange,
  hasSelection,
  showRuns = false,
  onToggleRuns,
  textInfo = null,
}: ContextBarProps) {
  const showText = tool === "text" || tool === "comment";
  const showStroke =
    tool === "pen" ||
    tool === "rect" ||
    tool === "ellipse" ||
    tool === "line" ||
    tool === "arrow" ||
    tool === "underline";
  const showFill = tool === "rect" || tool === "ellipse";
  const showColor = showStroke || tool === "highlight" || tool === "mask" || showText;
  const showOpacity =
    tool === "pen" ||
    tool === "highlight" ||
    tool === "rect" ||
    tool === "ellipse" ||
    tool === "line" ||
    tool === "arrow";
  const showDefaults = showColor || showStroke;

  return (
    <div
      className="flex h-12 items-center gap-3 overflow-x-auto border-b border-border bg-surface px-3 text-sm"
      data-testid="context-bar"
    >
      {tool === "editText" ? (
        <>
          <Toggle
            pressed={showRuns}
            onClick={() => onToggleRuns?.()}
            label={tr("Afficher toutes les zones de texte modifiables")}
          >
            <span className="px-1 text-xs">{tr("Zones de texte")}</span>
          </Toggle>
          {textInfo ? (
            <span className="shrink-0 text-xs text-muted-foreground" data-testid="text-info">
              {textInfo}
            </span>
          ) : null}
        </>
      ) : null}
      {showDefaults && !hasSelection ? (
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {tr("Style par défaut")}
        </span>
      ) : null}
      {showColor && !hasSelection ? (
        <label className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {tool === "mask" ? tr("Masque") : showText ? tr("Texte") : tr("Couleur")}
          </span>
          <input
            type="color"
            value={rgbToHex(settings.color)}
            onChange={(e) => onChange({ color: hexToRgb(e.target.value) })}
            className="size-8 cursor-pointer rounded-md border border-input bg-background p-0.5"
            aria-label={tr("Couleur")}
            data-testid="color-input"
          />
        </label>
      ) : null}
      {showText && !hasSelection ? (
        <>
          <label className="flex shrink-0 items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{tr("Police")}</span>
            <select
              value={settings.fontFamily}
              onChange={(e) => {
                const family = e.target.value as FontFamily;
                void ensureFontFace(family);
                onChange({ fontFamily: family });
              }}
              className="h-8 max-w-48 rounded-md border border-input bg-background px-1.5 text-xs"
              aria-label={tr("Police")}
              data-testid="font-family-select"
            >
              {(["sans", "serif", "mono"] as const).map((category) => (
                <optgroup
                  key={category}
                  label={
                    category === "sans"
                      ? "Sans-serif"
                      : category === "serif"
                        ? "Serif"
                        : "Monospace"
                  }
                >
                  {fontFamilies
                    .filter((f) => f.category === category)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                        {f.note ? ` — ${tr(f.note)}` : ""}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="flex shrink-0 items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{tr("Taille")}</span>
            <select
              value={String(settings.fontSize)}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
              className="h-8 w-20 rounded-md border border-input bg-background px-1.5 text-xs"
              aria-label={tr("Taille")}
              data-testid="font-size-select"
            >
              {sizes.map((s) => (
                <option key={s} value={String(s)}>
                  {s} pt
                </option>
              ))}
            </select>
          </label>
          <div className="flex shrink-0 items-center gap-0.5">
            <Toggle
              pressed={settings.bold}
              disabled={!hasStyle(settings.fontFamily, { bold: true, italic: settings.italic })}
              onClick={() => onChange({ bold: !settings.bold })}
              label={tr("Gras")}
            >
              <Bold className="size-4" />
            </Toggle>
            <Toggle
              pressed={settings.italic}
              disabled={!hasStyle(settings.fontFamily, { bold: settings.bold, italic: true })}
              onClick={() => onChange({ italic: !settings.italic })}
              label={tr("Italique")}
            >
              <Italic className="size-4" />
            </Toggle>
            <Toggle
              pressed={settings.underline}
              onClick={() => onChange({ underline: !settings.underline })}
              label={tr("Souligné")}
            >
              <Underline className="size-4" />
            </Toggle>
          </div>
          <div
            className="flex shrink-0 items-center gap-0.5"
            role="radiogroup"
            aria-label={tr("Alignement")}
          >
            <Toggle
              pressed={settings.align === "left"}
              onClick={() => onChange({ align: "left" })}
              label={tr("Aligner à gauche")}
            >
              <AlignLeft className="size-4" />
            </Toggle>
            <Toggle
              pressed={settings.align === "center"}
              onClick={() => onChange({ align: "center" })}
              label={tr("Centrer")}
            >
              <AlignCenter className="size-4" />
            </Toggle>
            <Toggle
              pressed={settings.align === "right"}
              onClick={() => onChange({ align: "right" })}
              label={tr("Aligner à droite")}
            >
              <AlignRight className="size-4" />
            </Toggle>
          </div>
          <label className="flex shrink-0 items-center gap-1.5">
            <Toggle
              pressed={!!settings.background}
              onClick={() =>
                onChange({ background: settings.background ? null : { r: 1, g: 0.97, b: 0.75 } })
              }
              label={tr("Fond du texte")}
            >
              <span className="px-1 text-xs">{tr("Fond")}</span>
            </Toggle>
            {settings.background ? (
              <input
                type="color"
                value={rgbToHex(settings.background)}
                onChange={(e) => onChange({ background: hexToRgb(e.target.value) })}
                className="size-8 cursor-pointer rounded-md border border-input bg-background p-0.5"
                aria-label={tr("Couleur de fond")}
              />
            ) : null}
          </label>
        </>
      ) : null}
      {showStroke && !hasSelection ? (
        <>
          <label className="flex shrink-0 items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{tr("Épaisseur")}</span>
            <input
              type="range"
              min={0.5}
              max={16}
              step={0.5}
              value={settings.strokeWidth}
              onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })}
              className="w-24 accent-primary"
              aria-label={tr("Épaisseur du trait")}
            />
            <span className="w-7 text-xs tabular-nums text-muted-foreground">
              {settings.strokeWidth}
            </span>
          </label>
          <label className="flex shrink-0 items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{tr("Trait")}</span>
            <select
              value={settings.dash}
              onChange={(e) => onChange({ dash: e.target.value as DashStyle })}
              className="h-8 rounded-md border border-input bg-background px-1.5 text-xs"
              aria-label={tr("Style du trait")}
            >
              <option value="solid">{tr("Continu")}</option>
              <option value="dashed">{tr("Tireté")}</option>
              <option value="dotted">{tr("Pointillé")}</option>
            </select>
          </label>
        </>
      ) : null}
      {showFill && !hasSelection ? (
        <div className="flex shrink-0 items-center gap-1">
          <Toggle
            pressed={settings.fill}
            onClick={() => onChange({ fill: !settings.fill })}
            label={tr("Remplir la forme")}
          >
            <span className="px-1 text-xs">{tr("Remplissage")}</span>
          </Toggle>
          {settings.fill ? (
            <input
              type="color"
              value={rgbToHex(settings.fillColor)}
              onChange={(e) => onChange({ fillColor: hexToRgb(e.target.value) })}
              className="size-8 cursor-pointer rounded-md border border-input bg-background p-0.5"
              aria-label={tr("Couleur de remplissage")}
            />
          ) : null}
        </div>
      ) : null}
      {showOpacity && !hasSelection ? (
        <label className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{tr("Opacité")}</span>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={Math.round(settings.opacity * 100)}
            onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 })}
            className="w-20 accent-primary"
            aria-label={tr("Opacité")}
          />
          <span className="w-8 text-xs tabular-nums text-muted-foreground">
            {Math.round(settings.opacity * 100)}%
          </span>
        </label>
      ) : null}
      <p
        className="ml-auto hidden shrink-0 text-xs text-muted-foreground lg:block"
        data-testid="tool-hint"
      >
        {hasSelection
          ? tr(
              "Élément sélectionné : propriétés dans la barre flottante · glisser pour déplacer · Suppr pour supprimer · Ctrl + D pour dupliquer.",
            )
          : toolHints[tool]}
      </p>
    </div>
  );
}

function Toggle({
  pressed,
  onClick,
  label,
  disabled,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-md px-1 transition-colors disabled:opacity-40",
        pressed ? "bg-primary-soft text-link" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
