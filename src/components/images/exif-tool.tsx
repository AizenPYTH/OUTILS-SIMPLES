"use client";

import * as React from "react";
import exifr from "exifr";
import { Download, MapPin, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { ToolPanel, StatGrid } from "@/components/tools/shared/tool-panel";
import { describeExif, detectMetadataFormat, stripImageMetadata, type ExifSummary } from "@/lib/images/metadata";
import { decodeImage, drawToCanvas, encodeCanvas, releaseCanvas } from "@/lib/images/canvas";
import { bytesToBlob, triggerDownload } from "@/lib/files/download";
import { deriveOutputName } from "@/lib/files/filename";
import { formatBytes } from "@/lib/files/format";
import { track } from "@/lib/analytics/events";
import { IMAGE_MAX_SIZE, validateImageFile } from "./image-batch-tool";

const TOOL_ID = "image-exif";

interface Analysis {
  file: File;
  bytes: Uint8Array;
  summary: ExifSummary;
  format: "jpeg" | "png" | null;
  url: string;
}

async function readTags(bytes: Uint8Array): Promise<Record<string, unknown> | null> {
  try {
    const parsed = (await exifr.parse(bytes, { tiff: true, exif: true, gps: true, xmp: true, iptc: true, icc: false, mergeOutput: true })) as Record<string, unknown> | undefined;
    return parsed ?? null;
  } catch {
    return null;
  }
}

export function ExifTool() {
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const [cleaned, setCleaned] = React.useState<{ blob: Blob; name: string; remaining: number; lossless: boolean } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const urlRef = React.useRef<string | null>(null);
  React.useEffect(() => () => void (urlRef.current && URL.revokeObjectURL(urlRef.current)), []);

  const load = async (file: File) => {
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const summary = describeExif(await readTags(bytes));
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(file);
      urlRef.current = url;
      setAnalysis({ file, bytes, summary, format: detectMetadataFormat(bytes), url });
      setCleaned(null);
      track("tool_start", { tool: TOOL_ID });
    } catch {
      toast.error("Lecture impossible.");
    } finally {
      setBusy(false);
    }
  };

  const strip = async () => {
    if (!analysis) return;
    setBusy(true);
    try {
      let blob: Blob;
      let lossless = true;
      const result = stripImageMetadata(analysis.bytes);
      if (result) blob = bytesToBlob(result.bytes, analysis.format === "png" ? "image/png" : "image/jpeg");
      else {
        // WebP, AVIF, GIF…: re-encode the pixels (metadata cannot be spliced out generically).
        lossless = false;
        const decoded = await decodeImage(analysis.file);
        const canvas = drawToCanvas(decoded.bitmap, decoded.width, decoded.height);
        decoded.bitmap.close();
        blob = (await encodeCanvas(canvas, "image/png")).blob;
        releaseCanvas(canvas);
      }
      const remaining = describeExif(await readTags(new Uint8Array(await blob.arrayBuffer()))).total;
      const ext = blob.type === "image/png" ? "png" : "jpg";
      setCleaned({ blob, name: deriveOutputName(analysis.file.name, "sans-metadonnees", ext), remaining, lossless });
      track("tool_success", { tool: TOOL_ID });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setAnalysis(null);
    setCleaned(null);
  };

  if (!analysis) {
    return <FileDropzone onFiles={(f) => f[0] && void load(f[0])} accept="image/*" validate={validateImageFile} title="Déposez une photo pour lire ses métadonnées" hint={`JPG, PNG, WebP, HEIC non pris en charge · ${formatBytes(IMAGE_MAX_SIZE)} max`} buttonLabel="Choisir une photo" testId="exif-dropzone" />;
  }

  const { summary } = analysis;
  const sensitive = summary.rows.filter((r) => r.sensitive).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview */}
          <img src={analysis.url} alt="" className="size-14 rounded-[8px] border border-border object-cover" />
          <div>
            <p className="font-medium">{analysis.file.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatBytes(analysis.file.size)} · {analysis.format === "jpeg" ? "JPEG" : analysis.format === "png" ? "PNG" : analysis.file.type || "format inconnu"}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          <RefreshCw aria-hidden="true" /> Autre photo
        </Button>
      </div>
      <StatGrid items={[{ label: "Métadonnées trouvées", value: summary.total }, { label: "Données sensibles", value: sensitive }, { label: "Position GPS", value: summary.gps ? "oui" : "non" }]} className="sm:grid-cols-3 lg:grid-cols-3" />
      <ToolPanel className="space-y-3" data-testid="exif-table">
        {summary.total === 0 ? (
          <Alert variant="success">Cette image ne contient aucune métadonnée EXIF, XMP ou IPTC lisible.</Alert>
        ) : (
          <>
            {summary.gps ? (
              <Alert variant="warning" title="Cette photo contient sa position GPS">
                <span className="tabular-nums">{summary.gps.latitude.toFixed(5)}, {summary.gps.longitude.toFixed(5)}</span>{" "}
                <a href={`https://www.openstreetmap.org/?mlat=${summary.gps.latitude}&mlon=${summary.gps.longitude}#map=16/${summary.gps.latitude}/${summary.gps.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium underline">
                  <MapPin className="size-3.5" aria-hidden="true" /> Voir sur une carte (site externe)
                </a>
              </Alert>
            ) : null}
            <table className="w-full text-sm">
              <caption className="sr-only">Métadonnées de l&apos;image</caption>
              <tbody>
                {summary.rows.map((row) => (
                  <tr key={row.key} className="border-b border-border/60">
                    <th scope="row" className="py-1.5 pr-3 text-left font-medium text-muted-foreground">
                      {row.label}
                    </th>
                    <td className="py-1.5 break-words">
                      {row.value} {row.sensitive ? <Badge variant="outline" className="ml-1 text-[10px]">sensible</Badge> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {summary.total > summary.rows.length ? <p className="text-xs text-muted-foreground">{summary.total - summary.rows.length} autre(s) champ(s) technique(s) non affiché(s) (réglages de l&apos;appareil, miniature, XMP).</p> : null}
          </>
        )}
      </ToolPanel>
      <ToolPanel className="space-y-3">
        {cleaned ? (
          <Alert variant="success" title="Image nettoyée" data-testid="exif-cleaned">
            {cleaned.remaining === 0 ? "Plus aucune métadonnée détectée." : `${cleaned.remaining} champ(s) technique(s) subsistent (profil colorimétrique ou commentaires non standard).`} {cleaned.lossless ? "Les pixels n'ont pas été recompressés." : "L'image a été réencodée en PNG (format d'origine sans suppression directe possible)."} · {formatBytes(cleaned.blob.size)}
          </Alert>
        ) : (
          <p className="text-sm text-muted-foreground">La suppression retire EXIF, XMP, IPTC, commentaires et date : l&apos;orientation EXIF n&apos;étant plus présente, vérifiez que l&apos;image est bien droite (les JPEG de téléphone s&apos;appuient parfois dessus).</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {cleaned ? (
            <Button
              type="button"
              size="lg"
              onClick={() => {
                triggerDownload(cleaned.blob, cleaned.name);
                track("tool_download", { tool: TOOL_ID });
              }}
              data-testid="exif-download"
            >
              <Download aria-hidden="true" /> Télécharger l&apos;image nettoyée
            </Button>
          ) : (
            <Button type="button" size="lg" onClick={() => void strip()} loading={busy} data-testid="exif-strip">
              <ShieldCheck aria-hidden="true" /> Supprimer les métadonnées
            </Button>
          )}
        </div>
      </ToolPanel>
    </div>
  );
}
