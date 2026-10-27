"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, RotateCcw, ScanText } from "lucide-react";
import { pdfToViewport, viewportScale, type ViewportLike } from "@/lib/pdf/coordinates";
import { fontFamilies } from "@/lib/pdf/fonts";
import type { PageTextStatus, TextEdit, TextRun } from "@/lib/pdf/text-edit/types";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n/messages";

export type RunVisual = NonNullable<TextEdit["visual"]>;

interface RunGeometry {
  /** Axis-aligned screen box of the run (viewport px). */
  box: { x: number; y: number; width: number; height: number };
  /** The run's four corners in PDF user space, then on screen. */
  polygon: { x: number; y: number }[];
  corners: { x: number; y: number }[];
  topLeft: { x: number; y: number };
  screenAngle: number;
  along: number;
  across: number;
}

interface TextEditLayerProps {
  viewport: ViewportLike;
  pageRotation: number;
  /** `null` while the page is being analysed. */
  status: PageTextStatus | null;
  /** The preview document is being rebuilt. */
  busy: boolean;
  edits: TextEdit[];
  /** Outline every editable zone (otherwise zones appear when the pointer is over the page). */
  showRuns: boolean;
  /** Estimated OCR quality of the page's recognised text (0–100), when it comes from OCR. */
  ocrQuality: number | null;
  /** OCR is running (the layer is not yet available). */
  ocrRunning: boolean;
  /** Background colour under a box (viewport points), used to repaint an OCR run visibly. */
  sampleFill: (points: { x: number; y: number }[]) => { r: number; g: number; b: number };
  onCommit: (run: TextRun, text: string, visual?: RunVisual) => void;
  onRevert: (run: TextRun) => void;
  onRequestOcr: () => void;
}

/**
 * "Modifier le texte" layer: one clickable box per text run of the page; a
 * click opens an inline field at the run's position. What is committed is
 * applied to the real content stream and the page is re-rendered from the
 * result, so the editor never shows an approximation. Runs of an OCR layer
 * are corrections of the invisible text, unless the user asks for a visible
 * rewrite (box repainted with the sampled background, standard font).
 */
export function TextEditLayer({
  viewport,
  pageRotation,
  status,
  busy,
  edits,
  showRuns,
  ocrQuality,
  ocrRunning,
  sampleFill,
  onCommit,
  onRevert,
  onRequestOcr,
}: TextEditLayerProps) {
  const [active, setActive] = React.useState<{
    run: TextRun;
    value: string;
    visual: boolean;
  } | null>(null);
  const editedOps = React.useMemo(() => new Set(edits.map((e) => e.opIndex)), [edits]);
  const scale = viewportScale(viewport);

  // Glyph box of a run in PDF space follows its baseline direction (rotated
  // text included): 0.25 × height below the baseline, 0.95 × height above.
  const geometryFor = (run: TextRun): RunGeometry => {
    const rad = (run.angle * Math.PI) / 180;
    const d = { x: Math.cos(rad), y: Math.sin(rad) };
    const n = { x: -Math.sin(rad), y: Math.cos(rad) };
    const below = 0.25 * run.height;
    const above = 0.95 * run.height;
    const pdfCorner = (along: number, across: number) => ({
      x: run.x + d.x * along + n.x * across,
      y: run.y + d.y * along + n.y * across,
    });
    const corner = (along: number, across: number) =>
      pdfToViewport(viewport, pdfCorner(along, across));
    const polygon = [
      pdfCorner(0, -below),
      pdfCorner(run.width, -below),
      pdfCorner(run.width, above),
      pdfCorner(0, above),
    ];
    const corners = polygon.map((p) => pdfToViewport(viewport, p));
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    const box = {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
    // Screen direction of the baseline (CSS rotate is clockwise, y down).
    const [a, b, c, dd] = viewport.transform as number[];
    const sx = a! * d.x + c! * d.y;
    const sy = b! * d.x + dd! * d.y;
    const screenAngle = (Math.atan2(sy, sx) * 180) / Math.PI;
    return {
      box,
      polygon,
      corners,
      topLeft: corner(0, above),
      screenAngle,
      along: run.width * scale,
      across: run.height * 1.2 * scale,
    };
  };
  const boxFor = (run: TextRun) => geometryFor(run).box;

  const commit = () => {
    if (!active) return;
    const { run, value, visual } = active;
    setActive(null);
    if (value === run.text && !visual) return;
    if (run.kind === "ocr" && visual) {
      const geometry = geometryFor(run);
      onCommit(run, value, { polygon: geometry.polygon, fill: sampleFill(geometry.corners) });
    } else onCommit(run, value);
  };

  const runs = status?.kind === "ok" ? status.runs : [];
  const editableCount = runs.filter((r) => r.editable).length;
  const ocrCount = runs.filter((r) => r.kind === "ocr").length;

  return (
    <div
      className="group absolute left-0 top-0"
      style={{ width: viewport.width, height: viewport.height }}
      data-testid="text-edit-layer"
      data-show-runs={showRuns ? "true" : undefined}
      aria-busy={busy || status === null}
    >
      {runs.map((run) => {
        const box = boxFor(run);
        const edited = editedOps.has(run.opIndex);
        const isActive = active?.run.id === run.id;
        if (isActive) return null;
        const ocr = run.kind === "ocr";
        return (
          <button
            key={run.id}
            type="button"
            disabled={!run.editable}
            title={
              run.editable
                ? ocr
                  ? tr("Texte reconnu : {text}", { text: run.text })
                  : run.text
                : run.reason && tr(run.reason)
            }
            aria-label={
              run.editable
                ? tr("Modifier « {text} »", { text: run.text })
                : `${run.text} : ${tr(run.reason ?? "non modifiable")}`
            }
            onClick={() => setActive({ run, value: run.text, visual: false })}
            className={cn(
              "absolute rounded-[3px] border transition-colors",
              run.editable
                ? cn(
                    "cursor-text hover:border-primary hover:bg-primary/10",
                    showRuns
                      ? ocr
                        ? "border-dashed border-warning-foreground/60"
                        : "border-primary/40"
                      : "border-transparent group-hover:border-primary/25",
                    ocr &&
                      !showRuns &&
                      "group-hover:border-dashed group-hover:border-warning-foreground/50",
                  )
                : cn(
                    "cursor-not-allowed border-dashed",
                    showRuns
                      ? "border-muted-foreground/40"
                      : "border-transparent group-hover:border-muted-foreground/30",
                  ),
              edited && "border-primary bg-primary/10",
            )}
            style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
            data-testid="text-run"
            data-op-index={run.opIndex}
            data-kind={run.kind}
            data-editable={run.editable ? "true" : "false"}
            data-edited={edited ? "true" : undefined}
          />
        );
      })}

      {active ? (
        <ActiveEditor
          run={active.run}
          value={active.value}
          visual={active.visual}
          geometry={geometryFor(active.run)}
          scale={scale}
          pageRotation={pageRotation}
          edited={editedOps.has(active.run.opIndex)}
          onChange={(value) => setActive({ ...active, value })}
          onVisual={(visual) => setActive({ ...active, visual })}
          onCommit={commit}
          onCancel={() => setActive(null)}
          onRevert={() => {
            const run = active.run;
            setActive(null);
            onRevert(run);
          }}
        />
      ) : null}

      <Banner
        status={status}
        busy={busy}
        editableCount={editableCount}
        ocrCount={ocrCount}
        ocrQuality={ocrQuality}
        ocrRunning={ocrRunning}
        onRequestOcr={onRequestOcr}
      />
    </div>
  );
}

function ActiveEditor({
  run,
  value,
  visual,
  geometry,
  scale,
  pageRotation,
  edited,
  onChange,
  onVisual,
  onCommit,
  onCancel,
  onRevert,
}: {
  run: TextRun;
  value: string;
  visual: boolean;
  geometry: RunGeometry;
  scale: number;
  pageRotation: number;
  edited: boolean;
  onChange: (value: string) => void;
  onVisual: (visual: boolean) => void;
  onCommit: () => void;
  onCancel: () => void;
  onRevert: () => void;
}) {
  const family = fontFamilies.find((f) => f.id === run.fallback.family)?.css ?? "sans-serif";
  const fontPx = run.fontSize * scale;
  const { box, topLeft, screenAngle, along, across } = geometry;
  const width = Math.max(along + 24, 160);
  void pageRotation; // the viewport transform already carries the page rotation
  const ocr = run.kind === "ocr";
  return (
    <div
      className="absolute"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
    >
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={(e) => {
          // Keep the field open when focus moves to the small toolbar below it.
          if (
            e.relatedTarget instanceof HTMLElement &&
            e.relatedTarget.closest("[data-text-edit-toolbar]")
          )
            return;
          onCommit();
        }}
        aria-label={tr("Nouveau texte")}
        className="block rounded-[3px] border-2 border-primary bg-white px-1 text-black shadow-md outline-none"
        style={{
          position: "absolute",
          left: topLeft.x - box.x,
          top: topLeft.y - box.y,
          width,
          height: Math.max(across, fontPx * 1.3),
          fontSize: fontPx,
          fontFamily: family,
          fontWeight: run.fallback.bold ? 700 : 400,
          fontStyle: run.fallback.italic ? "italic" : "normal",
          transform: `rotate(${screenAngle}deg)`,
          transformOrigin: "top left",
        }}
        data-testid="text-run-editor"
      />
      <div
        className="absolute left-0 flex max-w-[min(90vw,420px)] flex-col gap-1 whitespace-normal rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-muted-foreground shadow-md"
        style={{ top: box.height + 6 }}
        data-text-edit-toolbar=""
      >
        <span>
          {ocr
            ? tr(
                "Texte reconnu par OCR : Entrée corrige la couche de texte (recherche, copie) ; l'image reste telle quelle.",
              )
            : tr(
                "Entrée : valider · Échap : annuler · le texte qui suit sur la ligne n'est pas décalé",
              )}
        </span>
        {ocr ? (
          <label className="inline-flex items-center gap-1.5 text-foreground">
            <input
              type="checkbox"
              checked={visual}
              onChange={(e) => onVisual(e.target.checked)}
              className="accent-primary"
              data-testid="text-run-visual"
            />
            {tr("Réécrire visiblement (fond uni, police standard)")}
          </label>
        ) : null}
        {!run.fontUsable && !ocr ? (
          <span>{tr("Police d'origine non réutilisable : police standard proche.")}</span>
        ) : null}
        {edited ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 self-start font-medium text-link hover:underline"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onRevert}
            data-testid="text-run-revert"
          >
            <RotateCcw className="size-3" aria-hidden="true" /> {tr("Texte d'origine")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Banner({
  status,
  busy,
  editableCount,
  ocrCount,
  ocrQuality,
  ocrRunning,
  onRequestOcr,
}: {
  status: PageTextStatus | null;
  busy: boolean;
  editableCount: number;
  ocrCount: number;
  ocrQuality: number | null;
  ocrRunning: boolean;
  onRequestOcr: () => void;
}) {
  let body: React.ReactNode = null;
  if (busy)
    body = (
      <span className="inline-flex items-center gap-2">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />{" "}
        {tr("Application de la modification…")}
      </span>
    );
  else if (ocrRunning)
    body = (
      <span className="inline-flex items-center gap-2">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />{" "}
        {tr(
          "Reconnaissance du texte en cours : les passages seront modifiables une fois l'OCR terminé.",
        )}
      </span>
    );
  else if (status === null)
    body = (
      <span className="inline-flex items-center gap-2">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />{" "}
        {tr("Analyse du texte de la page…")}
      </span>
    );
  else if (status.kind === "scanned")
    body = (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>
          {tr(
            "Cette page est une image (document scanné) : son texte ne peut pas être modifié directement. Reconnaissez-le ici, ou ajoutez du texte par-dessus avec « Ajouter du texte ».",
          )}
        </span>
        <button
          type="button"
          onClick={onRequestOcr}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 font-medium text-primary-foreground"
          data-testid="text-edit-run-ocr"
        >
          <ScanText className="size-3.5" aria-hidden="true" /> {tr("Lancer l'OCR")}
        </button>
        <Link
          href="/numerisation/ocr/"
          className="text-link underline"
          target="_blank"
          rel="noopener"
        >
          {tr("outil OCR complet")}
        </Link>
      </span>
    );
  else if (status.kind === "empty")
    body = (
      <span>
        {tr("Aucun texte sur cette page. Utilisez « Ajouter du texte » pour en ajouter.")}
      </span>
    );
  else if (status.kind === "mismatch")
    body = (
      <span>
        {tr(
          "Le texte de cette page ne peut pas être modifié en toute sécurité (structure inhabituelle : {detail}). Vous pouvez toujours ajouter du texte par-dessus.",
          { detail: status.detail },
        )}
      </span>
    );
  else if (editableCount === 0)
    body = (
      <span>
        {tr("Aucun passage modifiable sur cette page (police particulière ou écriture verticale).")}
      </span>
    );
  else if (ocrCount > 0)
    body = (
      <span>
        {tr("Texte reconnu par OCR")}
        {ocrQuality !== null ? " " + tr("(qualité estimée {q} %)", { q: ocrQuality }) : ""} :{" "}
        {ocrCount > 1 ? tr("{n} passages", { n: ocrCount }) : tr("{n} passage", { n: ocrCount })}.{" "}
        {tr(
          "Cliquez pour corriger la couche de texte ; cochez « réécrire visiblement » pour changer l'image.",
        )}
      </span>
    );
  if (!body) return null;
  return (
    <p
      role="status"
      className="pointer-events-none absolute inset-x-2 top-2 rounded-md border border-border bg-surface/95 px-3 py-2 text-xs text-foreground shadow-md [&_a]:pointer-events-auto [&_button]:pointer-events-auto"
      data-testid="text-edit-status"
    >
      {body}
    </p>
  );
}
