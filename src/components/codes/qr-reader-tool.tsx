"use client";

import * as React from "react";
import { Camera, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { CopyButton } from "@/components/tools/shared/copy-button";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { IMAGE_MAX_SIZE, validateImageFile } from "@/components/images/image-batch-tool";
import { CameraCapture, cameraSupported } from "@/components/scan/camera-capture";
import { decodeQrFromRgba, parseWifiPayload, type QrDecoded } from "@/lib/codes/qr-read";
import { decodeImage, getRgba, releaseCanvas, resizeCanvas } from "@/lib/images/canvas";
import { formatBytes } from "@/lib/files/format";
import { track } from "@/lib/analytics/events";

const TOOL_ID = "qr-read";
const KIND_LABEL: Record<QrDecoded["kind"], string> = { url: "Lien web", wifi: "Réseau Wi-Fi", vcard: "Carte de visite (vCard)", email: "Adresse e-mail", phone: "Numéro de téléphone", sms: "SMS", geo: "Position géographique", text: "Texte" };

/** Tries several sizes: jsQR works best around 300–1200 px. */
async function decodeFile(file: Blob): Promise<QrDecoded | null> {
  const decoded = await decodeImage(file);
  try {
    for (const target of [800, 1200, 500, 1600]) {
      const scale = Math.min(1, target / Math.max(decoded.width, decoded.height));
      const canvas = resizeCanvas(decoded.bitmap, Math.max(1, Math.round(decoded.width * scale)), Math.max(1, Math.round(decoded.height * scale)));
      const rgba = getRgba(canvas);
      releaseCanvas(canvas);
      const result = decodeQrFromRgba(rgba.data, rgba.width, rgba.height);
      if (result) return result;
      if (scale === 1) break;
    }
    return null;
  } finally {
    decoded.bitmap.close();
  }
}

export function QrReaderTool() {
  const [result, setResult] = React.useState<QrDecoded | null | "none">(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [cameraOpen, setCameraOpenState] = React.useState(false);
  const [cameraSession, setCameraSession] = React.useState(0);
  const hasCamera = React.useMemo(() => cameraSupported(), []);
  const previewRef = React.useRef<string | null>(null);
  React.useEffect(() => () => void (previewRef.current && URL.revokeObjectURL(previewRef.current)), []);

  const setCameraOpen = (open: boolean) => {
    if (open) setCameraSession((n) => n + 1);
    setCameraOpenState(open);
  };

  const read = async (file: Blob) => {
    setBusy(true);
    try {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      const url = URL.createObjectURL(file);
      previewRef.current = url;
      setPreview(url);
      const decoded = await decodeFile(file);
      setResult(decoded ?? "none");
      track(decoded ? "tool_success" : "tool_error", { tool: TOOL_ID });
    } catch {
      toast.error("Image illisible.");
    } finally {
      setBusy(false);
    }
  };

  const wifi = result && result !== "none" && result.kind === "wifi" ? parseWifiPayload(result.text) : null;

  return (
    <div className="space-y-4">
      <FileDropzone onFiles={(f) => f[0] && void read(f[0])} accept="image/*" validate={validateImageFile} compact={!!preview} title="Déposez une image contenant un QR code" hint={`Photo ou capture d'écran · JPG, PNG, WebP · ${formatBytes(IMAGE_MAX_SIZE)} max`} buttonLabel="Choisir une image" capture={hasCamera ? undefined : "environment"} disabled={busy} testId="qr-dropzone" />
      {hasCamera ? (
        <div className="text-center">
          <Button type="button" variant="outline" onClick={() => setCameraOpen(true)}>
            <Camera aria-hidden="true" /> Photographier un QR code
          </Button>
        </div>
      ) : null}
      {preview ? (
        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview */}
          <img src={preview} alt="Image analysée" className="max-h-52 w-full rounded-[12px] border border-border object-contain checkerboard" />
          <ToolPanel className="space-y-3" data-testid="qr-result">
            {busy ? <p className="text-sm text-muted-foreground">Lecture en cours…</p> : null}
            {result === "none" ? <Alert variant="warning" title="Aucun QR code lisible">Essayez une photo plus nette, mieux éclairée et cadrée sur le code (le QR code doit occuper au moins un quart de l&apos;image). Les codes-barres linéaires ne sont pas pris en charge.</Alert> : null}
            {result && result !== "none" ? (
              <>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <QrCode className="size-4" aria-hidden="true" /> {KIND_LABEL[result.kind]}
                </p>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-3 font-mono text-[13px]" data-testid="qr-text">
                  {result.text}
                </pre>
                {wifi ? (
                  <dl className="grid gap-1 text-sm sm:grid-cols-[8rem_1fr]">
                    <dt className="text-muted-foreground">Réseau</dt>
                    <dd className="font-mono">{wifi.ssid}</dd>
                    <dt className="text-muted-foreground">Mot de passe</dt>
                    <dd className="font-mono">{wifi.password || "(aucun)"}</dd>
                    <dt className="text-muted-foreground">Sécurité</dt>
                    <dd>{wifi.security}</dd>
                  </dl>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <CopyButton text={result.text} label="Copier le contenu" />
                  {result.kind === "url" ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={result.text.startsWith("www.") ? `https://${result.text}` : result.text} target="_blank" rel="noopener noreferrer nofollow">
                        <ExternalLink aria-hidden="true" /> Ouvrir le lien (nouvel onglet)
                      </a>
                    </Button>
                  ) : null}
                </div>
                {result.kind === "url" ? <p className="text-xs text-muted-foreground">Vérifiez l&apos;adresse avant d&apos;ouvrir : un QR code peut mener vers un site frauduleux.</p> : null}
              </>
            ) : null}
          </ToolPanel>
        </div>
      ) : null}
      <CameraCapture key={cameraSession} open={cameraOpen} onOpenChange={setCameraOpen} onCapture={(blob) => void read(blob)} />
    </div>
  );
}
