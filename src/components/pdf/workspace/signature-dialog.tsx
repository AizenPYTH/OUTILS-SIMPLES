"use client";

import * as React from "react";
import { Eraser, ImageIcon, PenLine, Type } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { measureImage, readImageFile } from "@/lib/pdf/browser/read-file";
import { isPdfError } from "@/lib/pdf/errors";
import { t } from "@/lib/i18n";
import { tr } from "@/lib/i18n/messages";

export interface SignatureAsset {
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg";
  width: number;
  height: number;
}

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (asset: SignatureAsset) => void;
}

/** Draw / type / import a signature. Nothing leaves the browser; nothing is stored. */
export function SignatureDialog({ open, onOpenChange, onConfirm }: SignatureDialogProps) {
  const [tab, setTab] = React.useState("draw");
  const [typed, setTyped] = React.useState("");
  const [color, setColor] = React.useState("#15172b");
  const padRef = React.useRef<SignaturePadHandle>(null);
  const [busy, setBusy] = React.useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      let asset: SignatureAsset | null = null;
      if (tab === "draw") asset = (await padRef.current?.export()) ?? null;
      else if (tab === "type") asset = await renderTypedSignature(typed.trim(), color);
      if (!asset) {
        toast.error(
          tab === "draw"
            ? tr("Tracez votre signature avant de valider.")
            : tr("Saisissez votre nom."),
        );
        return;
      }
      onConfirm(asset);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { bytes, mimeType } = await readImageFile(file);
      const { width, height } = await measureImage(bytes, mimeType);
      onConfirm({ bytes, mimeType, width, height });
      onOpenChange(false);
    } catch (error) {
      toast.error(isPdfError(error) ? error.message : t.errors.notImage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="rounded-[20px]">
        <DialogHeader>
          <DialogTitle>{tr("Ajouter une signature")}</DialogTitle>
          <DialogDescription>
            {tr(
              "Signature visuelle : elle est dessinée sur la page et n'a pas la valeur d'une signature électronique qualifiée.",
            )}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="draw">
              <PenLine aria-hidden="true" /> {tr("Dessiner")}
            </TabsTrigger>
            <TabsTrigger value="type">
              <Type aria-hidden="true" /> {tr("Taper")}
            </TabsTrigger>
            <TabsTrigger value="import">
              <ImageIcon aria-hidden="true" /> {tr("Importer")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="draw" className="space-y-3">
            <SignaturePad ref={padRef} color={color} />
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                {tr("Couleur")}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="size-9 cursor-pointer rounded-md border border-input bg-background p-0.5"
                  aria-label={tr("Couleur du trait")}
                />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => padRef.current?.clear()}
              >
                <Eraser aria-hidden="true" /> {tr("Effacer")}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="type" className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="typed-signature">{tr("Votre nom")}</Label>
              <Input
                id="typed-signature"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                maxLength={60}
                autoComplete="name"
              />
            </div>
            <div className="flex h-28 items-center justify-center rounded-[12px] border border-dashed border-border bg-muted">
              <span
                className="font-[family-name:var(--font-signature)] text-4xl"
                style={{ color }}
                aria-live="polite"
              >
                {typed || tr("Aperçu")}
              </span>
            </div>
          </TabsContent>
          <TabsContent value="import" className="space-y-3">
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-border bg-muted text-sm hover:border-primary">
              <ImageIcon className="size-6 text-link" aria-hidden="true" />
              {t.upload.imageDropTitle}
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
                onChange={(e) => void onImport(e.target.files?.[0])}
                data-testid="signature-import"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              {tr("Un PNG à fond transparent donne le meilleur résultat.")}
            </p>
          </TabsContent>
        </Tabs>
        {tab !== "import" ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              onClick={() => void confirm()}
              loading={busy}
              data-testid="signature-confirm"
            >
              {tr("Utiliser cette signature")}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface SignaturePadHandle {
  export: () => Promise<SignatureAsset | null>;
  clear: () => void;
}

const SignaturePad = React.forwardRef<SignaturePadHandle, { color: string }>(function SignaturePad(
  { color },
  ref,
) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);
  const hasInk = React.useRef(false);
  const last = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext("2d");
    ctx?.scale(ratio, ratio);
  }, []);

  const pos = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, 3 * (e.pressure || 0.6));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    hasInk.current = true;
  };
  const onUp = () => {
    drawing.current = false;
    last.current = null;
  };

  React.useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasInk.current = false;
    },
    export: async () => {
      const canvas = canvasRef.current;
      if (!canvas || !hasInk.current) return null;
      return canvasToAsset(trimCanvas(canvas));
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      className="h-40 w-full touch-none rounded-[12px] border border-border bg-white"
      style={{ touchAction: "none" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
      aria-label={tr("Zone de signature : dessinez avec la souris ou le doigt")}
      role="img"
      data-testid="signature-pad"
    />
  );
});

/** Crops transparent margins so the signature box hugs the ink. */
function trimCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = source.getContext("2d");
  if (!ctx) return source;
  const { width, height } = source;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3]! > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return source;
  const pad = 8;
  const out = document.createElement("canvas");
  out.width = Math.min(width, maxX - minX + 1 + pad * 2);
  out.height = Math.min(height, maxY - minY + 1 + pad * 2);
  out
    .getContext("2d")
    ?.drawImage(source, minX - pad, minY - pad, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

async function canvasToAsset(canvas: HTMLCanvasElement): Promise<SignatureAsset | null> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return null;
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    mimeType: "image/png",
    width: canvas.width,
    height: canvas.height,
  };
}

async function renderTypedSignature(text: string, color: string): Promise<SignatureAsset | null> {
  if (!text) return null;
  const family =
    getComputedStyle(document.documentElement).getPropertyValue("--font-signature").trim() ||
    "cursive";
  try {
    await document.fonts.load(`600 96px ${family}`);
  } catch {
    // Fallback font is acceptable.
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.font = `600 96px ${family}`;
  const metrics = ctx.measureText(text);
  canvas.width = Math.ceil(metrics.width + 48);
  canvas.height = 150;
  const ctx2 = canvas.getContext("2d")!;
  ctx2.font = `600 96px ${family}`;
  ctx2.fillStyle = color;
  ctx2.textBaseline = "middle";
  ctx2.fillText(text, 24, 75);
  return canvasToAsset(trimCanvas(canvas));
}
