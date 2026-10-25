"use client";

import * as React from "react";
import { Camera, SwitchCamera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (blob: Blob) => void;
}

export function cameraSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && (typeof window === "undefined" || window.isSecureContext);
}

/**
 * Live camera view (getUserMedia, rear camera preferred) with a shutter.
 * The stream is stopped as soon as the dialog closes. Falls back to the
 * file input with `capture` when getUserMedia is unavailable (handled by the caller).
 */
export function CameraCapture({ open, onOpenChange, onCapture }: CameraCaptureProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [facing, setFacingState] = React.useState<"environment" | "user">("environment");
  const setFacing = (next: "environment" | "user") => {
    setReady(false);
    setError(null);
    setFacingState(next);
  };
  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 2560 }, height: { ideal: 1920 } }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setReady(true);
        }
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        setError(name === "NotAllowedError" ? "Accès à la caméra refusé. Autorisez la caméra dans les réglages du navigateur ou importez une photo." : "Caméra indisponible sur cet appareil. Importez une photo à la place.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, facing]);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
        canvas.width = 0;
        canvas.height = 0;
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" showCloseButton={false} className="gap-3 bg-black p-2 text-white sm:rounded-[20px]">
        <DialogTitle className="sr-only">Prendre une photo</DialogTitle>
        <DialogDescription className="sr-only">Cadrez la feuille puis appuyez sur le déclencheur.</DialogDescription>
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[12px] bg-black sm:aspect-[4/3]">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" aria-label="Aperçu de la caméra" />
          <div className="pointer-events-none absolute inset-6 rounded-md border-2 border-dashed border-white/60" aria-hidden="true" />
          {error ? <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-md bg-black/70 p-3 text-center text-sm">{error}</p> : null}
        </div>
        <div className="flex items-center justify-between px-2 pb-1">
          <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Fermer la caméra" className="text-white hover:bg-white/10 hover:text-white">
            <X aria-hidden="true" />
          </Button>
          <button type="button" onClick={shoot} disabled={!ready} aria-label="Prendre la photo" className="flex size-16 items-center justify-center rounded-full border-4 border-white bg-white/20 disabled:opacity-40" data-testid="camera-shutter">
            <Camera className="size-7" aria-hidden="true" />
          </button>
          <Button type="button" variant="ghost" size="icon" onClick={() => setFacing(facing === "environment" ? "user" : "environment")} aria-label="Changer de caméra" className="text-white hover:bg-white/10 hover:text-white">
            <SwitchCamera aria-hidden="true" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
