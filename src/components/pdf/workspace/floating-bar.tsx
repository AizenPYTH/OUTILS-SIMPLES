"use client";

import * as React from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Copy,
  Italic,
  PenLine,
  Trash2,
  Underline,
} from "lucide-react";
import { fontFamilies, hasStyle, type FontFamily } from "@/lib/pdf/fonts";
import { ensureFontFace } from "@/lib/pdf/fonts-embed";
import {
  hexToRgb,
  rgbToHex,
  type Annotation,
  type DashStyle,
  type PdfRect,
  type TextAnnotation,
} from "@/lib/pdf/annotations/types";
import { cn } from "@/lib/utils";

export interface FloatingBarProps {
  annotation: Annotation;
  /** Selection box in the coordinates of the bar's positioned parent (px). */
  anchor: PdfRect;
  /** Size of that parent: the bar never leaves it. */
  bounds: { width: number; height: number };
  onChange: (next: Annotation, label: string, coalesce?: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onEditText: () => void;
  /** Recomputes a text box from its content and style (fonts loaded first by the caller). */
  autosize: (a: TextAnnotation) => TextAnnotation;
}

const GAP = 8;

/**
 * Properties of the selected object, floating above it (below when there is
 * no room), clamped inside the workspace. Every control changes the object
 * immediately; continuous controls (sliders, colours) coalesce into one undo
 * step per control.
 */
export function FloatingBar({
  annotation,
  anchor,
  bounds,
  onChange,
  onDuplicate,
  onDelete,
  onEditText,
  autosize,
}: FloatingBarProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ width: 320, height: 40 });
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ width: el.offsetWidth, height: el.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [annotation.type]);
  const position = placeBar(anchor, size, bounds);

  const key = (prop: string) => `${annotation.id}:${prop}`;
  const update = <T extends Annotation>(next: T, label: string, prop?: string) =>
    onChange(next, label, prop ? key(prop) : undefined);

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Propriétés de l'élément sélectionné"
      className="absolute z-30 flex max-w-[calc(100%-16px)] flex-wrap items-center gap-1 rounded-[10px] border border-border bg-surface px-1.5 py-1 text-xs shadow-lg"
      style={{ left: position.x, top: position.y }}
      onPointerDown={(e) => e.stopPropagation()}
      data-testid="floating-bar"
      data-type={annotation.type}
      data-placement={position.placement}
    >
      {annotation.type === "rect" || annotation.type === "ellipse" ? (
        <>
          {!(annotation.type === "rect" && annotation.mask) ? (
            <>
              <ColorField
                label="Contour"
                value={annotation.strokeColor ?? { r: 0, g: 0, b: 0 }}
                onChange={(c) =>
                  update({ ...annotation, strokeColor: c }, "Couleur du contour", "stroke")
                }
                testId="prop-stroke-color"
              />
              <NumberField
                label="Épaisseur"
                value={annotation.strokeWidth}
                min={0}
                max={20}
                step={0.5}
                unit="pt"
                onChange={(v) =>
                  update(
                    {
                      ...annotation,
                      strokeWidth: v,
                      strokeColor:
                        v > 0
                          ? (annotation.strokeColor ?? { r: 0, g: 0, b: 0 })
                          : annotation.strokeColor,
                    },
                    "Épaisseur du contour",
                    "width",
                  )
                }
                testId="prop-stroke-width"
              />
              <DashField
                value={annotation.dash ?? "solid"}
                onChange={(d) => update({ ...annotation, dash: d }, "Style du trait")}
              />
              <Divider />
              <FillField
                fill={annotation.fillColor}
                onChange={(c) =>
                  update(
                    { ...annotation, fillColor: c },
                    c ? "Remplissage" : "Remplissage retiré",
                    "fill",
                  )
                }
              />
              <OpacityField
                value={annotation.opacity}
                onChange={(v) => update({ ...annotation, opacity: v }, "Opacité", "opacity")}
              />
            </>
          ) : (
            <>
              <ColorField
                label="Couleur du masque"
                value={annotation.fillColor ?? { r: 0, g: 0, b: 0 }}
                onChange={(c) =>
                  update({ ...annotation, fillColor: c }, "Couleur du masque", "fill")
                }
                testId="prop-fill-color"
              />
              <span className="max-w-56 px-1 text-[11px] leading-tight text-muted-foreground">
                Masque visuel : le contenu reste dans le fichier. Suppression réelle : outil
                Caviarder.
              </span>
            </>
          )}
          <Divider />
          <NumberField
            label="L"
            value={annotation.width}
            min={2}
            max={5000}
            step={1}
            unit="pt"
            onChange={(v) => update({ ...annotation, width: v }, "Largeur", "w")}
            testId="prop-width"
          />
          <NumberField
            label="H"
            value={annotation.height}
            min={2}
            max={5000}
            step={1}
            unit="pt"
            onChange={(v) => update({ ...annotation, height: v }, "Hauteur", "h")}
            testId="prop-height"
          />
        </>
      ) : null}

      {annotation.type === "line" ? (
        <>
          <ColorField
            label="Couleur"
            value={annotation.color}
            onChange={(c) => update({ ...annotation, color: c }, "Couleur", "stroke")}
            testId="prop-stroke-color"
          />
          <NumberField
            label="Épaisseur"
            value={annotation.strokeWidth}
            min={0.5}
            max={20}
            step={0.5}
            unit="pt"
            onChange={(v) => update({ ...annotation, strokeWidth: v }, "Épaisseur", "width")}
            testId="prop-stroke-width"
          />
          <DashField
            value={annotation.dash ?? "solid"}
            onChange={(d) => update({ ...annotation, dash: d }, "Style du trait")}
          />
          <Toggle
            pressed={annotation.arrow}
            label="Pointe de flèche"
            onClick={() =>
              update(
                { ...annotation, arrow: !annotation.arrow },
                annotation.arrow ? "Pointe retirée" : "Pointe ajoutée",
              )
            }
          >
            <span className="px-1">Flèche</span>
          </Toggle>
          <OpacityField
            value={annotation.opacity}
            onChange={(v) => update({ ...annotation, opacity: v }, "Opacité", "opacity")}
          />
        </>
      ) : null}

      {annotation.type === "path" ? (
        <>
          <ColorField
            label="Couleur"
            value={annotation.color}
            onChange={(c) => update({ ...annotation, color: c }, "Couleur", "stroke")}
            testId="prop-stroke-color"
          />
          <NumberField
            label="Épaisseur"
            value={annotation.strokeWidth}
            min={0.5}
            max={20}
            step={0.5}
            unit="pt"
            onChange={(v) => update({ ...annotation, strokeWidth: v }, "Épaisseur", "width")}
            testId="prop-stroke-width"
          />
          <DashField
            value={annotation.dash ?? "solid"}
            onChange={(d) => update({ ...annotation, dash: d }, "Style du trait")}
          />
          <OpacityField
            value={annotation.opacity}
            onChange={(v) => update({ ...annotation, opacity: v }, "Opacité", "opacity")}
          />
        </>
      ) : null}

      {annotation.type === "highlight" ? (
        <>
          <ColorField
            label="Couleur"
            value={annotation.color}
            onChange={(c) => update({ ...annotation, color: c }, "Couleur", "stroke")}
            testId="prop-stroke-color"
          />
          <OpacityField
            value={annotation.opacity}
            max={0.8}
            onChange={(v) => update({ ...annotation, opacity: v }, "Opacité", "opacity")}
          />
        </>
      ) : null}

      {annotation.type === "text" ? (
        <TextControls
          annotation={annotation}
          update={update}
          autosize={autosize}
          onEditText={onEditText}
        />
      ) : null}

      {annotation.type === "image" ? (
        <>
          <NumberField
            label="L"
            value={annotation.width}
            min={4}
            max={5000}
            step={1}
            unit="pt"
            onChange={(v) =>
              update(
                {
                  ...annotation,
                  width: v,
                  height: (v * annotation.height) / Math.max(1, annotation.width),
                },
                "Taille de l'image",
                "w",
              )
            }
            testId="prop-width"
          />
          <NumberField
            label="H"
            value={annotation.height}
            min={4}
            max={5000}
            step={1}
            unit="pt"
            onChange={(v) =>
              update(
                {
                  ...annotation,
                  height: v,
                  width: (v * annotation.width) / Math.max(1, annotation.height),
                },
                "Taille de l'image",
                "h",
              )
            }
            testId="prop-height"
          />
          <span className="px-1 text-[11px] text-muted-foreground">
            {annotation.role === "signature" ? "Signature" : "Image"} · proportions conservées ·
            rotation : celle de la page
          </span>
        </>
      ) : null}

      <Divider />
      <IconButton label="Dupliquer (Ctrl + D)" onClick={onDuplicate} testId="duplicate-annotation">
        <Copy className="size-3.5" />
      </IconButton>
      <IconButton
        label="Supprimer (Suppr)"
        onClick={onDelete}
        destructive
        testId="delete-annotation"
      >
        <Trash2 className="size-3.5" />
      </IconButton>
    </div>
  );
}

/** Position of the bar: above the selection, else below, clamped inside the bounds. */
export function placeBar(
  anchor: PdfRect,
  size: { width: number; height: number },
  bounds: { width: number; height: number },
): { x: number; y: number; placement: "above" | "below" } {
  const x = Math.min(
    Math.max(GAP, anchor.x + anchor.width / 2 - size.width / 2),
    Math.max(GAP, bounds.width - size.width - GAP),
  );
  const above = anchor.y - size.height - GAP;
  if (above >= GAP) return { x, y: above, placement: "above" };
  const below = anchor.y + anchor.height + GAP;
  return {
    x,
    y: Math.min(below, Math.max(GAP, bounds.height - size.height - GAP)),
    placement: "below",
  };
}

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 64, 72];

function TextControls({
  annotation: a,
  update,
  autosize,
  onEditText,
}: {
  annotation: TextAnnotation;
  update: <T extends Annotation>(next: T, label: string, prop?: string) => void;
  autosize: (a: TextAnnotation) => TextAnnotation;
  onEditText: () => void;
}) {
  // Style changes wait for the face to load before measuring; several changes in a row
  // (font then size) must each build on the latest state, not on a stale snapshot.
  const latest = React.useRef(a);
  React.useEffect(() => {
    latest.current = a;
  }, [a]);
  const restyle = (patch: Partial<TextAnnotation>, label: string, prop?: string) => {
    const family = patch.fontFamily ?? latest.current.fontFamily;
    void ensureFontFace(family).then(() => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      update(autosize(next), label, prop);
    });
  };
  const family = fontFamilies.find((f) => f.id === a.fontFamily);
  return (
    <>
      <label className="flex items-center gap-1">
        <span className="sr-only">Police</span>
        <select
          value={a.fontFamily}
          onChange={(e) => restyle({ fontFamily: e.target.value as FontFamily }, "Police")}
          className="h-8 max-w-44 rounded-md border border-input bg-background px-1.5 text-xs"
          aria-label="Police"
          data-testid="prop-font-family"
        >
          {(["sans", "serif", "mono"] as const).map((category) => (
            <optgroup
              key={category}
              label={
                category === "sans" ? "Sans-serif" : category === "serif" ? "Serif" : "Monospace"
              }
            >
              {fontFamilies
                .filter((f) => f.category === category)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                    {f.note ? ` — ${f.note}` : ""}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        <span className="sr-only">Taille</span>
        <input
          type="number"
          min={4}
          max={200}
          step={1}
          value={Math.round(a.fontSize * 10) / 10}
          list="editor-font-sizes"
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v >= 4 && v <= 200)
              restyle({ fontSize: v }, "Taille du texte", "size");
          }}
          className="h-8 w-16 rounded-md border border-input bg-background px-1.5 text-xs tabular-nums"
          aria-label="Taille (pt)"
          data-testid="prop-font-size"
        />
        <datalist id="editor-font-sizes">
          {FONT_SIZES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <Toggle
        pressed={a.bold}
        label="Gras"
        disabled={!hasStyle(a.fontFamily, { bold: true, italic: a.italic })}
        onClick={() => restyle({ bold: !a.bold }, "Gras")}
        testId="prop-bold"
      >
        <Bold className="size-3.5" />
      </Toggle>
      <Toggle
        pressed={a.italic}
        label={
          hasStyle(a.fontFamily, { bold: a.bold, italic: true })
            ? "Italique"
            : `Italique : non disponible pour ${family?.label ?? "cette police"}`
        }
        disabled={!hasStyle(a.fontFamily, { bold: a.bold, italic: true })}
        onClick={() => restyle({ italic: !a.italic }, "Italique")}
        testId="prop-italic"
      >
        <Italic className="size-3.5" />
      </Toggle>
      <Toggle
        pressed={!!a.underline}
        label="Souligné"
        onClick={() => restyle({ underline: !a.underline }, "Souligné")}
        testId="prop-underline"
      >
        <Underline className="size-3.5" />
      </Toggle>
      <div className="flex items-center" role="radiogroup" aria-label="Alignement">
        <Toggle
          pressed={a.align === "left"}
          label="Aligner à gauche"
          onClick={() => restyle({ align: "left" }, "Alignement")}
        >
          <AlignLeft className="size-3.5" />
        </Toggle>
        <Toggle
          pressed={a.align === "center"}
          label="Centrer"
          onClick={() => restyle({ align: "center" }, "Alignement")}
        >
          <AlignCenter className="size-3.5" />
        </Toggle>
        <Toggle
          pressed={a.align === "right"}
          label="Aligner à droite"
          onClick={() => restyle({ align: "right" }, "Alignement")}
        >
          <AlignRight className="size-3.5" />
        </Toggle>
      </div>
      <ColorField
        label="Texte"
        value={a.color}
        onChange={(c) => update({ ...a, color: c }, "Couleur du texte", "color")}
        testId="prop-text-color"
      />
      <FillField
        label="Fond"
        fill={a.background ?? null}
        defaultColor={{ r: 1, g: 0.97, b: 0.75 }}
        onChange={(c) =>
          restyle({ background: c ?? undefined }, c ? "Fond du texte" : "Fond retiré", "bg")
        }
      />
      <Divider />
      <IconButton
        label="Modifier le texte (double-clic)"
        onClick={onEditText}
        testId="edit-annotation-text"
      >
        <PenLine className="size-3.5" />
      </IconButton>
    </>
  );
}

function ColorField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: { r: number; g: number; b: number };
  onChange: (c: { r: number; g: number; b: number }) => void;
  testId?: string;
}) {
  return (
    <label className="flex items-center gap-1" title={label}>
      <span className="sr-only">{label}</span>
      <input
        type="color"
        value={rgbToHex(value)}
        onChange={(e) => onChange(hexToRgb(e.target.value))}
        className="size-7 cursor-pointer rounded-md border border-input bg-background p-0.5"
        aria-label={label}
        data-testid={testId}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  testId?: string;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const shown = draft ?? String(Math.round(value * 10) / 10);
  const commit = (raw: string) => {
    const v = Number(raw.replace(",", "."));
    if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
  };
  return (
    <label className="flex items-center gap-1" title={`${label} (${unit})`}>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={shown}
        onChange={(e) => {
          setDraft(e.target.value);
          commit(e.target.value);
        }}
        onBlur={() => setDraft(null)}
        className="h-8 w-16 rounded-md border border-input bg-background px-1.5 text-xs tabular-nums"
        aria-label={`${label} (${unit})`}
        data-testid={testId}
      />
    </label>
  );
}

function DashField({ value, onChange }: { value: DashStyle; onChange: (d: DashStyle) => void }) {
  return (
    <label className="flex items-center gap-1" title="Style du trait">
      <span className="sr-only">Style du trait</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DashStyle)}
        className="h-8 rounded-md border border-input bg-background px-1.5 text-xs"
        aria-label="Style du trait"
        data-testid="prop-dash"
      >
        <option value="solid">Continu</option>
        <option value="dashed">Tireté</option>
        <option value="dotted">Pointillé</option>
      </select>
    </label>
  );
}

function FillField({
  label = "Remplissage",
  fill,
  defaultColor = { r: 0.93, g: 0.94, b: 1 },
  onChange,
}: {
  label?: string;
  fill: { r: number; g: number; b: number } | null;
  defaultColor?: { r: number; g: number; b: number };
  onChange: (c: { r: number; g: number; b: number } | null) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Toggle
        pressed={!!fill}
        label={
          fill
            ? `${label} : opaque (cliquer pour transparent)`
            : `${label} : transparent (cliquer pour remplir)`
        }
        onClick={() => onChange(fill ? null : defaultColor)}
        testId="prop-fill-toggle"
      >
        <span className="px-1">{label}</span>
      </Toggle>
      {fill ? (
        <ColorField
          label={`Couleur de ${label.toLowerCase()}`}
          value={fill}
          onChange={onChange}
          testId="prop-fill-color"
        />
      ) : null}
    </div>
  );
}

function OpacityField({
  value,
  max = 1,
  onChange,
}: {
  value: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1" title="Opacité">
      <span className="text-[11px] text-muted-foreground">Opacité</span>
      <input
        type="range"
        min={10}
        max={Math.round(max * 100)}
        step={5}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-16 accent-primary"
        aria-label="Opacité"
        data-testid="prop-opacity"
      />
      <span className="w-8 tabular-nums text-muted-foreground">{Math.round(value * 100)}%</span>
    </label>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />;
}

function Toggle({
  pressed,
  onClick,
  label,
  disabled,
  testId,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  testId?: string;
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
        "flex h-8 min-w-8 items-center justify-center rounded-md px-1 text-xs transition-colors disabled:opacity-40",
        pressed
          ? "bg-primary-soft text-link"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  destructive,
  testId,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors",
        destructive
          ? "text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      data-testid={testId}
    >
      {children}
    </button>
  );
}
