"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Camera,
  Crop,
  Download,
  FileText,
  ImagePlus,
  RotateCw,
  Scan,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { downloadPdf, downloadZip } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import { IMAGE_MAX_SIZE, validateImageFile } from "@/components/images/image-batch-tool";
import { CropBox } from "@/components/images/crop-box";
import { decodeImage, releaseCanvas } from "@/lib/images/canvas";
import { clampCrop, type CropRect } from "@/lib/images/types";
import { buildZip } from "@/lib/pdf/browser/zip";
import { imagesToPdf } from "@/lib/pdf/operations/images-to-pdf";
import {
  encodeScanPage,
  renderScanPage,
  defaultScanSettings,
  type ScanFilter,
  type ScanPageSettings,
} from "@/lib/scan/page-pipeline";
import { track } from "@/lib/analytics/events";
import { uid } from "@/lib/utils";
import { defaultQuad, detectQuadFromBitmap } from "@/lib/scan/detect-browser";
import { polygonArea } from "@/lib/scan/detect";
import type { Quad } from "@/lib/scan/geometry";
import { CameraCapture, cameraSupported } from "./camera-capture";
import { QuadEditor } from "./quad-editor";
import { ScanPagePreview } from "./scan-page-preview";

const TOOL_ID = "scan-document";
const MAX_PAGES = 100;

export interface ScanPage {
  id: string;
  file: Blob;
  name: string;
  bitmap: ImageBitmap;
  width: number;
  height: number;
  settings: ScanPageSettings;
}

export function ScannerTool() {
  const [pages, setPages] = React.useState<ScanPage[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [cameraOpen, setCameraOpenState] = React.useState(false);
  const [cameraSession, setCameraSession] = React.useState(0);
  const setCameraOpen = (open: boolean) => {
    if (open) setCameraSession((n) => n + 1);
    setCameraOpenState(open);
  };
  const [cropOpen, setCropOpen] = React.useState(false);
  const [cropUrl, setCropUrl] = React.useState<string | null>(null);
  const [cropDraft, setCropDraft] = React.useState<CropRect | null>(null);
  const [quadOpen, setQuadOpen] = React.useState(false);
  const [quadUrl, setQuadUrl] = React.useState<string | null>(null);
  const [quadDraft, setQuadDraft] = React.useState<Quad | null>(null);
  const [exportFormat, setExportFormat] = React.useState<"pdf" | "jpg" | "png">("pdf");
  const op = useOperation<{ kind: "pdf" | "zip" | "image"; bytes: Uint8Array; name: string }>(
    TOOL_ID,
  );
  const hasCamera = React.useMemo(() => cameraSupported(), []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const pagesRef = React.useRef(pages);
  React.useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);
  React.useEffect(() => () => pagesRef.current.forEach((p) => p.bitmap.close()), []);

  const selected = pages.find((p) => p.id === selectedId) ?? pages[0] ?? null;

  const addFiles = async (files: (File | Blob)[]) => {
    const room = MAX_PAGES - pages.length;
    const list = files.slice(0, room);
    if (files.length > room) toast.info(`${MAX_PAGES} pages maximum par document.`);
    const created: ScanPage[] = [];
    for (const file of list) {
      try {
        const decoded = await decodeImage(file);
        created.push({
          id: uid("scan"),
          file,
          name: file instanceof File ? file.name : `photo-${pages.length + created.length + 1}.jpg`,
          bitmap: decoded.bitmap,
          width: decoded.width,
          height: decoded.height,
          settings: { ...defaultScanSettings },
        });
      } catch {
        toast.error(`${file instanceof File ? file.name : "Photo"} : image illisible.`);
      }
    }
    if (created.length) {
      setPages((p) => [...p, ...created]);
      setSelectedId(created[created.length - 1]!.id);
      track("tool_start", { tool: TOOL_ID, resultCount: created.length });
    }
  };

  const updateSettings = (id: string, patch: Partial<ScanPageSettings>) =>
    setPages((list) =>
      list.map((p) => (p.id === id ? { ...p, settings: { ...p.settings, ...patch } } : p)),
    );
  const removePage = (id: string) =>
    setPages((list) => {
      const page = list.find((p) => p.id === id);
      page?.bitmap.close();
      const next = list.filter((p) => p.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  const clearAll = () => {
    pages.forEach((p) => p.bitmap.close());
    setPages([]);
    setSelectedId(null);
    op.reset();
  };

  /** JPEG preview of the original photo for the crop / straighten dialogs. */
  const snapshotUrl = (page: ScanPage, cb: (url: string) => void) => {
    const canvas = document.createElement("canvas");
    canvas.width = page.width;
    canvas.height = page.height;
    canvas.getContext("2d")?.drawImage(page.bitmap, 0, 0);
    canvas.toBlob(
      (blob) => {
        releaseCanvas(canvas);
        if (!blob) {
          toast.error("Aperçu impossible pour cette page.");
          return;
        }
        cb(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.8,
    );
  };

  const openCrop = () => {
    if (!selected) return;
    snapshotUrl(selected, (url) => {
      if (cropUrl) URL.revokeObjectURL(cropUrl);
      setCropUrl(url);
      setCropDraft(
        selected.settings.crop ?? { x: 0, y: 0, width: selected.width, height: selected.height },
      );
      setCropOpen(true);
    });
  };

  const openQuad = () => {
    if (!selected) return;
    snapshotUrl(selected, (url) => {
      if (quadUrl) URL.revokeObjectURL(quadUrl);
      setQuadUrl(url);
      const detected =
        selected.settings.quad ??
        detectQuadFromBitmap(selected.bitmap)?.quad ??
        defaultQuad(selected.width, selected.height);
      setQuadDraft(detected);
      setQuadOpen(true);
    });
  };

  const exportAll = () =>
    void op.run(async (report) => {
      const images: { name: string; bytes: Uint8Array; mimeType: "image/jpeg" | "image/png" }[] =
        [];
      for (let i = 0; i < pages.length; i += 1) {
        const page = pages[i]!;
        report({
          current: i + 1,
          total: pages.length,
          label: `Traitement de la page ${i + 1} sur ${pages.length}…`,
        });
        await new Promise((r) => setTimeout(r, 0));
        const canvas = renderScanPage(page.bitmap, page.settings);
        const mime = exportFormat === "png" ? "image/png" : "image/jpeg";
        const bytes = await encodeScanPage(canvas, mime, 0.88);
        releaseCanvas(canvas);
        images.push({
          name: `page-${i + 1}.${exportFormat === "png" ? "png" : "jpg"}`,
          bytes,
          mimeType: mime,
        });
      }
      if (exportFormat === "pdf") {
        report({ current: pages.length, total: pages.length, label: "Assemblage du PDF…" });
        const bytes = await imagesToPdf(images, { pageSize: "a4-portrait", margin: 0, dpi: 150 });
        return { kind: "pdf", bytes, name: "document-scanne.pdf" };
      }
      if (images.length === 1)
        return { kind: "image", bytes: images[0]!.bytes, name: `document-scanne.${exportFormat}` };
      return { kind: "zip", bytes: buildZip(images), name: "document-scanne.zip" };
    });

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={clearAll} />;
  if (op.state.status === "done") {
    const result = op.state.result;
    return (
      <DonePanel
        title={result.kind === "pdf" ? "Votre PDF scanné est prêt" : "Vos images sont prêtes"}
        summary={`${pages.length} page(s)`}
        downloadLabel={
          result.kind === "pdf"
            ? "Télécharger le PDF"
            : result.kind === "zip"
              ? "Tout télécharger (ZIP)"
              : "Télécharger l'image"
        }
        onDownload={() => {
          if (result.kind === "pdf") downloadPdf(result.bytes, result.name, "", TOOL_ID);
          else if (result.kind === "zip") downloadZip(result.bytes, "document-scanne", "", TOOL_ID);
          else {
            const blob = new Blob([result.bytes as Uint8Array<ArrayBuffer>], {
              type: exportFormat === "png" ? "image/png" : "image/jpeg",
            });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = result.name;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1500);
            track("tool_download", { tool: TOOL_ID });
          }
        }}
        onStartOver={clearAll}
      >
        <div className="text-center">
          <Button type="button" variant="ghost" size="sm" onClick={op.reset}>
            Revenir aux pages
          </Button>
        </div>
      </DonePanel>
    );
  }

  const captureButtons = (
    <div className="flex flex-wrap justify-center gap-2">
      {hasCamera ? (
        <Button
          type="button"
          size="lg"
          onClick={() => setCameraOpen(true)}
          data-testid="scan-camera"
        >
          <Camera aria-hidden="true" /> Prendre une photo
        </Button>
      ) : null}
      <label className="inline-flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-surface px-6 text-base font-medium shadow-sm hover:bg-muted">
        <ImagePlus className="size-4" aria-hidden="true" />{" "}
        {hasCamera ? "Importer des photos" : "Photographier ou importer"}
        <input
          type="file"
          accept="image/*"
          multiple
          capture={hasCamera ? undefined : "environment"}
          className="sr-only"
          onChange={(e) =>
            e.target.files &&
            void addFiles(Array.from(e.target.files).filter((f) => !validateImageFile(f)))
          }
          data-testid="scan-input"
        />
      </label>
    </div>
  );

  return (
    <div className="space-y-5">
      {pages.length === 0 ? (
        <div className="space-y-4">
          <FileDropzone
            onFiles={(f) => void addFiles(f)}
            accept="image/*"
            validate={validateImageFile}
            multiple
            title="Photographiez ou déposez vos pages"
            hint={`JPG, PNG, WebP · ${Math.round(IMAGE_MAX_SIZE / 1024 / 1024)} Mo max par photo · ${MAX_PAGES} pages max`}
            buttonLabel="Importer des photos"
            capture={hasCamera ? undefined : "environment"}
            testId="scan-dropzone"
          />
          {hasCamera ? (
            <div className="text-center">
              <Button
                type="button"
                size="lg"
                onClick={() => setCameraOpen(true)}
                data-testid="scan-camera"
              >
                <Camera aria-hidden="true" /> Prendre une photo avec la caméra
              </Button>
            </div>
          ) : (
            <Alert variant="info">
              La capture directe nécessite un navigateur récent en HTTPS. Sur mobile, le bouton «
              Importer » ouvre l&apos;appareil photo.
            </Alert>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              {selected ? <ScanPagePreview key={selected.id} page={selected} /> : null}
              {selected ? (
                <ToolPanel className="space-y-4" data-testid="scan-controls">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openCrop}
                      data-testid="scan-crop"
                    >
                      <Crop aria-hidden="true" /> Recadrer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openQuad}
                      data-testid="scan-straighten"
                    >
                      <Scan aria-hidden="true" /> Redresser
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateSettings(selected.id, {
                          rotation: ((selected.settings.rotation + 90) % 360) as 0 | 90 | 180 | 270,
                        })
                      }
                      data-testid="scan-rotate"
                    >
                      <RotateCw aria-hidden="true" /> Pivoter
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateSettings(selected.id, { ...defaultScanSettings })}
                    >
                      <Wand2 aria-hidden="true" /> Réinitialiser
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-destructive hover:text-destructive"
                      onClick={() => removePage(selected.id)}
                    >
                      <Trash2 aria-hidden="true" /> Supprimer la page
                    </Button>
                  </div>
                  <Segmented
                    label="Filtre"
                    value={selected.settings.filter}
                    onChange={(filter: ScanFilter) => updateSettings(selected.id, { filter })}
                    className="sm:grid-cols-4"
                    options={[
                      { value: "color", label: "Couleur", description: "Photo d'origine" },
                      { value: "gray", label: "Niveaux de gris", description: "Sans couleur" },
                      {
                        value: "bw",
                        label: "Noir et blanc",
                        description: "Texte seul, seuil auto",
                      },
                      { value: "document", label: "Document", description: "Fond blanchi (gris)" },
                    ]}
                  />
                  <p className="text-xs text-muted-foreground">
                    La photo d&apos;origine est conservée : chaque filtre se calcule à partir
                    d&apos;elle et peut être changé à tout moment.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="scan-brightness">
                        Luminosité ({selected.settings.brightness})
                      </Label>
                      <input
                        id="scan-brightness"
                        type="range"
                        min={-60}
                        max={60}
                        value={selected.settings.brightness}
                        onChange={(e) =>
                          updateSettings(selected.id, { brightness: Number(e.target.value) })
                        }
                        className="w-full accent-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="scan-contrast">
                        Contraste ({selected.settings.contrast})
                      </Label>
                      <input
                        id="scan-contrast"
                        type="range"
                        min={-60}
                        max={80}
                        value={selected.settings.contrast}
                        onChange={(e) =>
                          updateSettings(selected.id, { contrast: Number(e.target.value) })
                        }
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>
                </ToolPanel>
              ) : null}
            </div>
            <aside className="space-y-3">
              <p className="text-sm font-medium">
                {pages.length} page{pages.length > 1 ? "s" : ""} · glissez pour réordonner
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e: DragEndEvent) =>
                  e.over &&
                  e.active.id !== e.over.id &&
                  setPages((l) =>
                    arrayMove(
                      l,
                      l.findIndex((p) => p.id === e.active.id),
                      l.findIndex((p) => p.id === e.over!.id),
                    ),
                  )
                }
              >
                <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
                  <ol
                    className="grid grid-cols-3 gap-2 lg:grid-cols-2"
                    aria-label="Pages scannées"
                    data-testid="scan-pages"
                  >
                    {pages.map((page, index) => (
                      <SortableThumb
                        key={page.id}
                        page={page}
                        index={index}
                        active={page.id === selected?.id}
                        onSelect={() => setSelectedId(page.id)}
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
              {captureButtons}
            </aside>
          </div>
          <ToolPanel className="space-y-3">
            <Segmented
              label="Format d'export"
              value={exportFormat}
              onChange={setExportFormat}
              options={[
                { value: "pdf", label: "PDF multipage", description: "Une page A4 par photo" },
                {
                  value: "jpg",
                  label: "Images JPG",
                  description: pages.length > 1 ? "Archive ZIP" : "Une image",
                },
                { value: "png", label: "Images PNG", description: "Sans perte, plus lourd" },
              ]}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={clearAll}>
                Tout supprimer
              </Button>
              <Button type="button" size="lg" onClick={exportAll} data-testid="scan-export">
                {exportFormat === "pdf" ? (
                  <FileText aria-hidden="true" />
                ) : (
                  <Download aria-hidden="true" />
                )}{" "}
                {exportFormat === "pdf"
                  ? `Créer le PDF (${pages.length} page${pages.length > 1 ? "s" : ""})`
                  : "Télécharger les images"}
              </Button>
            </div>
          </ToolPanel>
        </>
      )}
      <CameraCapture
        key={cameraSession}
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={(blob) => void addFiles([blob])}
        pageCount={pages.length}
      />
      <Dialog
        open={cropOpen}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open && cropUrl) {
            URL.revokeObjectURL(cropUrl);
            setCropUrl(null);
          }
        }}
      >
        <DialogContent size="xl" className="rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Recadrer la page</DialogTitle>
            <DialogDescription>
              Ajustez le cadre autour de la feuille. Pour une photo prise de biais, utilisez plutôt
              « Redresser » (quatre coins).
            </DialogDescription>
          </DialogHeader>
          {selected && cropUrl && cropDraft ? (
            <CropBox
              imageUrl={cropUrl}
              imageWidth={selected.width}
              imageHeight={selected.height}
              crop={cropDraft}
              onChange={(c) => setCropDraft(clampCrop(c, selected))}
              ratio={null}
            />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                selected && (updateSettings(selected.id, { crop: null }), setCropOpen(false))
              }
            >
              Sans recadrage
            </Button>
            <Button
              type="button"
              onClick={() =>
                selected &&
                cropDraft &&
                (updateSettings(selected.id, { crop: cropDraft, quad: null }), setCropOpen(false))
              }
              data-testid="scan-crop-apply"
            >
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={quadOpen}
        onOpenChange={(open) => {
          setQuadOpen(open);
          if (!open && quadUrl) {
            URL.revokeObjectURL(quadUrl);
            setQuadUrl(null);
          }
        }}
      >
        <DialogContent size="xl" className="max-h-[92vh] overflow-y-auto rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Redresser la page</DialogTitle>
            <DialogDescription>
              Placez les quatre coins sur les angles de la feuille : la perspective est corrigée et
              la page devient rectangulaire. Les coins proposés viennent d&apos;une détection
              automatique, à ajuster si besoin.
            </DialogDescription>
          </DialogHeader>
          {selected && quadUrl && quadDraft ? (
            // Keep the editor within the dialog height so the footer stays reachable (landscape photos on short screens).
            <div
              className="mx-auto w-full"
              style={{ maxWidth: `calc(55vh * ${selected.width / selected.height})` }}
            >
              <QuadEditor
                imageUrl={quadUrl}
                imageWidth={selected.width}
                imageHeight={selected.height}
                quad={quadDraft}
                onChange={setQuadDraft}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                selected && (updateSettings(selected.id, { quad: null }), setQuadOpen(false))
              }
            >
              Sans redressement
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!selected || !quadDraft) return;
                if (polygonArea(quadDraft) < 400) {
                  toast.error("Les coins sont trop rapprochés : agrandissez la zone.");
                  return;
                }
                updateSettings(selected.id, { quad: quadDraft, crop: null });
                setQuadOpen(false);
              }}
              data-testid="scan-straighten-apply"
            >
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableThumb({
  page,
  index,
  active,
  onSelect,
}: {
  page: ScanPage;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-60" : ""}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        aria-label={`Page ${index + 1}${active ? " (sélectionnée)" : ""}`}
        className={`relative block w-full overflow-hidden rounded-[6px] border-2 bg-muted ${active ? "border-primary" : "border-border"}`}
        {...attributes}
        {...listeners}
        data-testid="scan-thumb"
      >
        <ScanPagePreview page={page} thumbnail />
        <span className="absolute bottom-1 left-1 rounded-full bg-foreground/80 px-1.5 text-[11px] text-background">
          {index + 1}
        </span>
      </button>
    </li>
  );
}
