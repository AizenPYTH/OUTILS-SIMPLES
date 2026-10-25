"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, RotateCcw } from "lucide-react";
import { pdfToViewport, viewportScale, type ViewportLike } from "@/lib/pdf/coordinates";
import { fontFamilies } from "@/lib/pdf/fonts";
import type { PageTextStatus, TextEdit, TextRun } from "@/lib/pdf/text-edit/types";
import { cn } from "@/lib/utils";

interface TextEditLayerProps {
  viewport: ViewportLike;
  pageRotation: number;
  /** `null` while the page is being analysed. */
  status: PageTextStatus | null;
  /** The preview document is being rebuilt. */
  busy: boolean;
  edits: TextEdit[];
  onCommit: (run: TextRun, text: string) => void;
  onRevert: (run: TextRun) => void;
}

/**
 * "Modifier le texte" layer: one clickable box per text run of the page; a
 * click opens an inline field at the run's position. What is committed is
 * applied to the real content stream and the page is re-rendered from the
 * result, so the editor never shows an approximation.
 */
export function TextEditLayer({
  viewport,
  pageRotation,
  status,
  busy,
  edits,
  onCommit,
  onRevert,
}: TextEditLayerProps) {
  const [active, setActive] = React.useState<{ run: TextRun; value: string } | null>(null);
  const editedOps = React.useMemo(() => new Set(edits.map((e) => e.opIndex)), [edits]);
  const scale = viewportScale(viewport);

  // Glyph box of a run in PDF space follows its baseline direction (rotated
  // text included): 0.25 × height below the baseline, 0.95 × height above.
  const geometryFor = (run: TextRun) => {
    const rad = (run.angle * Math.PI) / 180;
    const d = { x: Math.cos(rad), y: Math.sin(rad) };
    const n = { x: -Math.sin(rad), y: Math.cos(rad) };
    const below = 0.25 * run.height;
    const above = 0.95 * run.height;
    const corner = (along: number, across: number) =>
      pdfToViewport(viewport, {
        x: run.x + d.x * along + n.x * across,
        y: run.y + d.y * along + n.y * across,
      });
    const corners = [
      corner(0, -below),
      corner(run.width, -below),
      corner(0, above),
      corner(run.width, above),
    ];
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
      topLeft: corner(0, above),
      screenAngle,
      along: run.width * scale,
      across: run.height * 1.2 * scale,
    };
  };
  const boxFor = (run: TextRun) => geometryFor(run).box;

  const commit = () => {
    if (!active) return;
    const { run, value } = active;
    setActive(null);
    if (value !== run.text) onCommit(run, value);
  };

  const runs = status?.kind === "ok" ? status.runs : [];
  const editableCount = runs.filter((r) => r.editable).length;

  return (
    <div
      className="absolute left-0 top-0"
      style={{ width: viewport.width, height: viewport.height }}
      data-testid="text-edit-layer"
      aria-busy={busy || status === null}
    >
      {runs.map((run) => {
        const box = boxFor(run);
        const edited = editedOps.has(run.opIndex);
        const isActive = active?.run.id === run.id;
        if (isActive) return null;
        return (
          <button
            key={run.id}
            type="button"
            disabled={!run.editable}
            title={run.editable ? run.text : run.reason}
            aria-label={
              run.editable
                ? `Modifier « ${run.text} »`
                : `${run.text} : ${run.reason ?? "non modifiable"}`
            }
            onClick={() => setActive({ run, value: run.text })}
            className={cn(
              "absolute rounded-[3px] border transition-colors",
              run.editable
                ? "cursor-text border-primary/35 hover:border-primary hover:bg-primary/10"
                : "cursor-not-allowed border-dashed border-muted-foreground/40",
              edited && "border-primary bg-primary/10",
            )}
            style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
            data-testid="text-run"
            data-op-index={run.opIndex}
            data-editable={run.editable ? "true" : "false"}
            data-edited={edited ? "true" : undefined}
          />
        );
      })}

      {active ? (
        <ActiveEditor
          run={active.run}
          value={active.value}
          geometry={geometryFor(active.run)}
          scale={scale}
          pageRotation={pageRotation}
          edited={editedOps.has(active.run.opIndex)}
          onChange={(value) => setActive({ run: active.run, value })}
          onCommit={commit}
          onCancel={() => setActive(null)}
          onRevert={() => {
            const run = active.run;
            setActive(null);
            onRevert(run);
          }}
        />
      ) : null}

      <Banner status={status} busy={busy} editableCount={editableCount} />
    </div>
  );
}

function ActiveEditor({
  run,
  value,
  geometry,
  scale,
  pageRotation,
  edited,
  onChange,
  onCommit,
  onCancel,
  onRevert,
}: {
  run: TextRun;
  value: string;
  geometry: {
    box: { x: number; y: number; width: number; height: number };
    topLeft: { x: number; y: number };
    screenAngle: number;
    along: number;
    across: number;
  };
  scale: number;
  pageRotation: number;
  edited: boolean;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onRevert: () => void;
}) {
  const family = fontFamilies.find((f) => f.id === run.fallback.family)?.css ?? "sans-serif";
  const fontPx = run.fontSize * scale;
  const { box, topLeft, screenAngle, along, across } = geometry;
  const width = Math.max(along + 24, 160);
  void pageRotation; // the viewport transform already carries the page rotation
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
        aria-label="Nouveau texte"
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
        className="absolute left-0 flex items-center gap-2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted-foreground shadow-md"
        style={{ top: box.height + 6 }}
        data-text-edit-toolbar=""
      >
        <span>
          Entrée : valider · Échap : annuler · le texte qui suit sur la ligne n&apos;est pas décalé
        </span>
        {edited ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 font-medium text-link hover:underline"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onRevert}
            data-testid="text-run-revert"
          >
            <RotateCcw className="size-3" aria-hidden="true" /> Texte d&apos;origine
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
}: {
  status: PageTextStatus | null;
  busy: boolean;
  editableCount: number;
}) {
  let body: React.ReactNode = null;
  if (busy)
    body = (
      <span className="inline-flex items-center gap-2">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Application de la
        modification…
      </span>
    );
  else if (status === null)
    body = (
      <span className="inline-flex items-center gap-2">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Analyse du texte de la
        page…
      </span>
    );
  else if (status.kind === "scanned")
    body = (
      <span>
        Cette page ne contient pas de texte, seulement une image (document scanné). Pour modifier
        son contenu, reconnaissez d&apos;abord le texte avec l&apos;outil{" "}
        <Link
          href="/numerisation/ocr/"
          className="font-medium text-link underline"
          target="_blank"
          rel="noopener"
        >
          OCR
        </Link>
        , ou ajoutez du texte par-dessus avec l&apos;outil « Texte ».
      </span>
    );
  else if (status.kind === "empty")
    body = (
      <span>Aucun texte sur cette page. Utilisez l&apos;outil « Texte » pour en ajouter.</span>
    );
  else if (status.kind === "mismatch")
    body = (
      <span>
        Le texte de cette page ne peut pas être modifié en toute sécurité (structure inhabituelle :{" "}
        {status.detail}). Vous pouvez toujours ajouter du texte par-dessus.
      </span>
    );
  else if (editableCount === 0)
    body = (
      <span>Aucun passage modifiable sur cette page (texte invisible ou police particulière).</span>
    );
  if (!body) return null;
  return (
    <p
      role="status"
      className="pointer-events-auto absolute inset-x-2 top-2 rounded-md border border-border bg-surface/95 px-3 py-2 text-xs text-foreground shadow-md"
      data-testid="text-edit-status"
    >
      {body}
    </p>
  );
}
