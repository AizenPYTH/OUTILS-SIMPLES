"use client";

import * as React from "react";
import { Camera, Check, RotateCcw, SwitchCamera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the user has reviewed and kept a photo. */
  onCapture: (blob: Blob) => void;
  /** Pages already in the document (shown so the user sees each shot land). */
  pageCount?: number;
}

export function cameraSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    (typeof window === "undefined" || window.isSecureContext)
  );
}

const ERRORS = {
  denied:
    "Accès à la caméra refusé. Autorisez la caméra dans les réglages du navigateur ou importez une photo.",
  unavailable: "Caméra indisponible sur cet appareil. Importez une photo à la place.",
  noFrame:
    "La caméra n'a pas encore fourni d'image. Patientez une seconde puis réessayez, ou importez une photo.",
  encode:
    "La photo n'a pas pu être enregistrée par le navigateur. Réessayez ou importez une photo.",
};

/**
 * Live camera view (getUserMedia, rear camera preferred) with a shutter and a
 * review step: the photo is shown full frame, exactly as captured, with
 * « Reprendre » / « Garder ». Only a kept photo reaches `onCapture`. The
 * preview is letterboxed (object-contain) so what is seen is what is captured.
 * The stream is stopped as soon as the dialog closes.
 */
export function CameraCapture({
  open,
  onOpenChange,
  onCapture,
  pageCount = 0,
}: CameraCaptureProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [facing, setFacingState] = React.useState<"environment" | "user">("environment");
  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [capturing, setCapturing] = React.useState(false);
  const [review, setReview] = React.useState<{
    blob: Blob;
    url: string;
    width: number;
    height: number;
  } | null>(null);
  const [kept, setKept] = React.useState(0);
  // Pages present when the dialog opened: kept photos are added to the parent
  // asynchronously (decoding), so the badge counts them itself meanwhile.
  const [baseline] = React.useState(pageCount);

  const setFacing = (next: "environment" | "user") => {
    setReady(false);
    setError(null);
    setFacingState(next);
  };

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 2560 }, height: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          if (!cancelled) setReady(true);
        }
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        if (!cancelled)
          setError(
            name === "NotAllowedError" || name === "SecurityError"
              ? ERRORS.denied
              : ERRORS.unavailable,
          );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, facing]);

  // Release the review image when the dialog closes or unmounts.
  const reviewUrl = review?.url ?? null;
  React.useEffect(
    () => () => {
      if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    },
    [reviewUrl],
  );

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !ready || capturing) return;
    // On some phones the first frames arrive after play() resolved: say so instead of producing an empty canvas.
    if (!video.videoWidth || !video.videoHeight) {
      setError(ERRORS.noFrame);
      return;
    }
    setError(null);
    setCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        canvas.width = 0;
        canvas.height = 0;
        if (!blob || blob.size === 0) {
          setError(ERRORS.encode);
          return;
        }
        setReview({
          blob,
          url: URL.createObjectURL(blob),
          width: video.videoWidth,
          height: video.videoHeight,
        });
      },
      "image/jpeg",
      0.92,
    );
  };

  const keep = () => {
    if (!review) return;
    onCapture(review.blob);
    setKept((n) => n + 1);
    setReview(null);
  };

  const retake = () => setReview(null);

  const total = Math.max(pageCount, baseline + kept);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        showCloseButton={false}
        className="gap-2 bg-black p-2 text-white sm:rounded-[20px] max-sm:inset-0 max-sm:left-0 max-sm:top-0 max-sm:flex max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:flex-col max-sm:rounded-none max-sm:border-0"
      >
        <DialogTitle className="sr-only">Prendre une photo</DialogTitle>
        <DialogDescription className="sr-only">
          Cadrez la feuille, appuyez sur le déclencheur, puis gardez ou reprenez la photo.
        </DialogDescription>
        <div className="flex h-9 items-center justify-between px-1 text-sm">
          <span
            className="rounded-full bg-white/15 px-2.5 py-0.5 tabular-nums"
            aria-live="polite"
            data-testid="camera-page-count"
          >
            {total === 0 ? "Aucune page" : total === 1 ? "1 page" : `${total} pages`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/10 hover:text-white"
            data-testid="camera-done"
          >
            {total > 0 ? "Terminer" : "Fermer"}
          </Button>
        </div>
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[12px] bg-black max-sm:aspect-auto max-sm:min-h-0 max-sm:flex-1 sm:aspect-[4/3]">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full object-contain ${review ? "invisible" : ""}`}
            aria-label="Aperçu de la caméra"
          />
          {review ? (
            // eslint-disable-next-line @next/next/no-img-element -- object URL preview, never optimised
            <img
              src={review.url}
              alt="Photo prise, à vérifier"
              className="absolute inset-0 h-full w-full object-contain"
              data-testid="camera-review"
            />
          ) : null}
          {error ? (
            <p
              role="alert"
              className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-md bg-black/75 p-3 text-center text-sm"
              data-testid="camera-error"
            >
              {error}
            </p>
          ) : null}
          {!ready && !error && !review ? (
            <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-sm text-white/80">
              Ouverture de la caméra…
            </p>
          ) : null}
        </div>
        {review ? (
          <div className="flex items-center justify-between gap-2 px-1 pb-1">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={retake}
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              data-testid="camera-retake"
            >
              <RotateCcw aria-hidden="true" /> Reprendre
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={keep}
              className="flex-1"
              data-testid="camera-keep"
            >
              <Check aria-hidden="true" /> Garder cette page
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2 pb-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Fermer la caméra"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <X aria-hidden="true" />
            </Button>
            <button
              type="button"
              onClick={shoot}
              disabled={!ready || capturing}
              aria-label="Prendre la photo"
              className="flex size-[72px] items-center justify-center rounded-full border-4 border-white bg-white/20 transition-transform active:scale-95 disabled:opacity-40"
              data-testid="camera-shutter"
            >
              <Camera className="size-7" aria-hidden="true" />
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setFacing(facing === "environment" ? "user" : "environment")}
              aria-label="Changer de caméra"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <SwitchCamera aria-hidden="true" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
