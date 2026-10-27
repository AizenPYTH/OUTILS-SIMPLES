"use client";

import * as React from "react";
import { Maximize2, RefreshCw, RotateCw, ScanLine, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import { DonePanel } from "@/components/pdf/shared/processing-panel";
import { IMAGE_MAX_SIZE, validateImageFile } from "@/components/images/image-batch-tool";
import { decodeImage, releaseCanvas, type DecodedImage } from "@/lib/images/canvas";
import { imagesToPdf } from "@/lib/pdf/operations/images-to-pdf";
import { defaultQuad, detectQuadFromBitmap } from "@/lib/scan/detect-browser";
import { polygonArea } from "@/lib/scan/detect";
import type { Quad } from "@/lib/scan/geometry";
import {
  encodeScanPage,
  renderScanPage,
  type ScanFilter,
  type ScanPageSettings,
} from "@/lib/scan/page-pipeline";
import { bytesToBlob, triggerDownload } from "@/lib/files/download";
import { deriveOutputName } from "@/lib/files/filename";
import { formatBytes } from "@/lib/files/format";
import { track } from "@/lib/analytics/events";
import { tr } from "@/lib/i18n/messages";
import { QuadEditor } from "./quad-editor";

const TOOL_ID = "scan-perspective";
type ExportFormat = "jpg" | "png" | "pdf";

interface Loaded {
  file: File;
  decoded: DecodedImage;
  url: string;
  detected: number | null;
}

export function PerspectiveTool() {
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [quad, setQuad] = React.useState<Quad | null>(null);
  const [settings, setSettings] = React.useState<Omit<ScanPageSettings, "quad" | "crop">>({
    rotation: 0,
    filter: "document",
    brightness: 0,
    contrast: 10,
  });
  const [format, setFormat] = React.useState<ExportFormat>("jpg");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{
    blob: Blob;
    name: string;
    url: string;
    width: number;
    height: number;
  } | null>(null);
  const loadedRef = React.useRef<Loaded | null>(null);
  React.useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);
  React.useEffect(
    () => () => {
      const current = loadedRef.current;
      if (current) {
        URL.revokeObjectURL(current.url);
        current.decoded.bitmap.close();
      }
    },
    [],
  );

  const release = () => {
    if (loaded) {
      URL.revokeObjectURL(loaded.url);
      loaded.decoded.bitmap.close();
    }
    if (result) URL.revokeObjectURL(result.url);
  };

  const load = async (file: File) => {
    try {
      const decoded = await decodeImage(file);
      release();
      const detection = detectQuadFromBitmap(decoded.bitmap);
      setLoaded({
        file,
        decoded,
        url: URL.createObjectURL(file),
        detected: detection?.confidence ?? null,
      });
      setQuad(detection?.quad ?? defaultQuad(decoded.width, decoded.height));
      setResult(null);
      track("tool_start", { tool: TOOL_ID });
      if (!detection) toast.info(tr("Coins non détectés automatiquement : placez-les à la main."));
    } catch {
      toast.error(tr("Image illisible par ce navigateur."));
    }
  };

  const reset = () => {
    release();
    setLoaded(null);
    setQuad(null);
    setResult(null);
  };

  const redetect = () => {
    if (!loaded) return;
    const detection = detectQuadFromBitmap(loaded.decoded.bitmap);
    if (detection) {
      setQuad(detection.quad);
      toast.success(tr("Coins détectés."));
    } else toast.info(tr("Aucune feuille détectée : le contraste avec le fond est insuffisant."));
  };

  const run = async () => {
    if (!loaded || !quad) return;
    if (polygonArea(quad) < 400) {
      toast.error(tr("La zone sélectionnée est trop petite."));
      return;
    }
    setBusy(true);
    try {
      const full: ScanPageSettings = { ...settings, quad, crop: null };
      const canvas = renderScanPage(loaded.decoded.bitmap, full, 3000);
      const mime = format === "png" ? "image/png" : "image/jpeg";
      const bytes = await encodeScanPage(canvas, mime, 0.9);
      const { width, height } = canvas;
      releaseCanvas(canvas);
      let blob: Blob;
      let name: string;
      if (format === "pdf") {
        const pdf = await imagesToPdf([{ name: "page.jpg", bytes, mimeType: mime }], {
          pageSize: "fit-image",
          margin: 0,
          dpi: 200,
        });
        blob = bytesToBlob(pdf, "application/pdf");
        name = deriveOutputName(loaded.file.name, "redresse", "pdf");
      } else {
        blob = bytesToBlob(bytes, mime);
        name = deriveOutputName(loaded.file.name, "redresse", format);
      }
      if (result) URL.revokeObjectURL(result.url);
      setResult({
        blob,
        name,
        url: URL.createObjectURL(format === "pdf" ? bytesToBlob(bytes, mime) : blob),
        width,
        height,
      });
      track("tool_success", { tool: TOOL_ID });
    } catch (error) {
      toast.error(error instanceof Error ? tr(error.message) : tr("Correction impossible."));
    } finally {
      setBusy(false);
    }
  };

  if (!loaded || !quad) {
    return (
      <div className="space-y-4">
        <FileDropzone
          onFiles={(f) => f[0] && void load(f[0])}
          accept="image/*"
          validate={validateImageFile}
          title={tr("Déposez la photo du document")}
          hint={tr("JPG, PNG, WebP · {max} max · la feuille doit être plus claire que le fond", {
            max: formatBytes(IMAGE_MAX_SIZE),
          })}
          buttonLabel={tr("Choisir ou photographier")}
          capture="environment"
          testId="perspective-dropzone"
        />
        <Alert variant="info">
          {tr(
            "Pour plusieurs pages à la suite, utilisez plutôt « Scanner un document » ; cet outil se concentre sur une page avec un redressement précis.",
          )}
        </Alert>
      </div>
    );
  }

  if (result) {
    return (
      <DonePanel
        title={tr("Document redressé")}
        summary={`${result.width}×${result.height} px · ${formatBytes(result.blob.size)} · ${format.toUpperCase()}`}
        downloadLabel={format === "pdf" ? tr("Télécharger le PDF") : tr("Télécharger l'image")}
        onDownload={() => {
          triggerDownload(result.blob, result.name);
          track("tool_download", { tool: TOOL_ID });
        }}
        onStartOver={reset}
      >
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview */}
          <img
            src={result.url}
            alt={tr("Aperçu du document redressé")}
            className="max-h-96 max-w-full rounded-md border border-border shadow-sm"
            data-testid="perspective-result"
          />
        </div>
        <div className="mt-4 text-center">
          <Button type="button" variant="ghost" size="sm" onClick={() => setResult(null)}>
            {tr("Ajuster les coins")}
          </Button>
        </div>
      </DonePanel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {loaded.file.name} · {loaded.decoded.width}×{loaded.decoded.height} px
          {loaded.detected !== null
            ? " · " +
              tr("coins détectés (confiance {confidence} %)", {
                confidence: Math.round(loaded.detected * 100),
              })
            : " · " + tr("coins à placer manuellement")}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          <RefreshCw aria-hidden="true" /> {tr("Autre photo")}
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <p className="text-sm font-medium">{tr("1. Placez les quatre coins de la feuille")}</p>
          <QuadEditor
            imageUrl={loaded.url}
            imageWidth={loaded.decoded.width}
            imageHeight={loaded.decoded.height}
            quad={quad}
            onChange={setQuad}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={redetect}
              data-testid="perspective-detect"
            >
              <Wand2 aria-hidden="true" /> {tr("Détecter les coins")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setQuad([
                  { x: 0, y: 0 },
                  { x: loaded.decoded.width, y: 0 },
                  { x: loaded.decoded.width, y: loaded.decoded.height },
                  { x: 0, y: loaded.decoded.height },
                ])
              }
            >
              <Maximize2 aria-hidden="true" /> {tr("Toute l'image")}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">{tr("2. Aperçu du résultat")}</p>
          <WarpPreview
            bitmap={loaded.decoded.bitmap}
            settings={{ ...settings, quad, crop: null }}
          />
        </div>
      </div>
      <ToolPanel className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setSettings((s) => ({
                ...s,
                rotation: ((s.rotation + 90) % 360) as 0 | 90 | 180 | 270,
              }))
            }
            data-testid="perspective-rotate"
          >
            <RotateCw aria-hidden="true" /> {tr("Pivoter le résultat")}
          </Button>
        </div>
        <Segmented
          label={tr("Filtre")}
          value={settings.filter}
          onChange={(filter: ScanFilter) => setSettings((s) => ({ ...s, filter }))}
          className="sm:grid-cols-4"
          options={[
            {
              value: "document",
              label: tr("Document"),
              description: tr("Fond blanchi, texte net"),
            },
            { value: "color", label: tr("Couleur"), description: tr("Photo d'origine") },
            { value: "gray", label: tr("Niveaux de gris"), description: "" },
            { value: "bw", label: tr("Noir et blanc"), description: tr("Texte seul") },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="persp-brightness">
              {tr("Luminosité ({value})", { value: settings.brightness })}
            </Label>
            <input
              id="persp-brightness"
              type="range"
              min={-60}
              max={60}
              value={settings.brightness}
              onChange={(e) => setSettings((s) => ({ ...s, brightness: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="persp-contrast">
              {tr("Contraste ({value})", { value: settings.contrast })}
            </Label>
            <input
              id="persp-contrast"
              type="range"
              min={-60}
              max={80}
              value={settings.contrast}
              onChange={(e) => setSettings((s) => ({ ...s, contrast: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
          </div>
        </div>
        <Segmented
          label={tr("Format d'export")}
          value={format}
          onChange={setFormat}
          options={[
            { value: "jpg", label: "JPG", description: tr("Léger, pour partager") },
            { value: "png", label: "PNG", description: tr("Sans perte") },
            { value: "pdf", label: "PDF", description: tr("Une page à la taille de l'image") },
          ]}
        />
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() => void run()}
          loading={busy}
          data-testid="perspective-run"
        >
          <ScanLine aria-hidden="true" /> {tr("Redresser et exporter")}
        </Button>
      </ToolPanel>
    </div>
  );
}

function WarpPreview({ bitmap, settings }: { bitmap: ImageBitmap; settings: ScanPageSettings }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(settings);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const rendered = renderScanPage(bitmap, settings, 700);
        canvas.width = rendered.width;
        canvas.height = rendered.height;
        canvas.getContext("2d")?.drawImage(rendered, 0, 0);
        releaseCanvas(rendered);
      } catch {
        // Degenerate quad while dragging: keep the previous frame.
      }
    }, 90);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bitmap, key, settings]);
  return (
    <div
      className="flex min-h-[240px] items-center justify-center rounded-[6px] border border-border bg-muted/60 p-2"
      data-testid="perspective-preview"
    >
      <canvas
        ref={canvasRef}
        className="max-h-[60vh] max-w-full rounded-[4px] shadow-md"
        aria-label={tr("Aperçu du document redressé")}
      />
    </div>
  );
}
