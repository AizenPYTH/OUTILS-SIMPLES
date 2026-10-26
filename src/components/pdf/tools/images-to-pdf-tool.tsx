"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
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
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import { IMAGE_MAX_SIZE, validateImageFile } from "@/components/images/image-batch-tool";
import { decodeImage, drawToCanvas, encodeCanvas, releaseCanvas } from "@/lib/images/canvas";
import {
  imagesToPdf,
  defaultImagesToPdfOptions,
  type ImagesToPdfOptions,
  type ImageInput,
} from "@/lib/pdf/operations/images-to-pdf";
import { detectImageType } from "@/lib/files/validation";
import { formatBytes } from "@/lib/files/format";
import { uid } from "@/lib/utils";

const TOOL_ID = "pdf-from-images";

interface Item {
  id: string;
  file: File;
  url: string;
}

export function ImagesToPdfTool() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [options, setOptions] = React.useState<ImagesToPdfOptions>(defaultImagesToPdfOptions);
  const [jpegQuality, setJpegQuality] = React.useState(0.9);
  const op = useOperation<Uint8Array>(TOOL_ID);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const itemsRef = React.useRef(items);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  React.useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  const add = (files: File[]) => {
    if (items.length + files.length > 100) toast.info("100 images maximum.");
    setItems((list) => [
      ...list,
      ...files
        .slice(0, 100 - list.length)
        .map((file) => ({ id: uid("img"), file, url: URL.createObjectURL(file) })),
    ]);
  };
  const remove = (id: string) =>
    setItems((list) => {
      const it = list.find((i) => i.id === id);
      if (it) URL.revokeObjectURL(it.url);
      return list.filter((i) => i.id !== id);
    });
  const clear = () => {
    items.forEach((i) => URL.revokeObjectURL(i.url));
    setItems([]);
    op.reset();
  };

  const run = () =>
    void op.run(async (report) => {
      const inputs: ImageInput[] = [];
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i]!;
        report({ current: i + 1, total: items.length, label: `Préparation de ${item.file.name}…` });
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        const type = detectImageType(bytes);
        if (type === "image/jpeg" || (type === "image/png" && item.file.size < 20 * 1024 * 1024)) {
          inputs.push({ name: item.file.name, bytes, mimeType: type });
          continue;
        }
        // WebP, GIF, BMP, AVIF, SVG (or huge PNG): re-encode through the canvas.
        const decoded = await decodeImage(item.file);
        const canvas = drawToCanvas(
          decoded.bitmap,
          decoded.width,
          decoded.height,
          options.pageSize === "fit-image" ? undefined : "#ffffff",
        );
        decoded.bitmap.close();
        const hasAlpha =
          item.file.type === "image/png" ||
          item.file.type === "image/webp" ||
          item.file.type === "image/gif" ||
          item.file.type === "image/svg+xml";
        const encoded = await encodeCanvas(
          canvas,
          hasAlpha ? "image/png" : "image/jpeg",
          jpegQuality,
        );
        releaseCanvas(canvas);
        inputs.push({
          name: item.file.name,
          bytes: new Uint8Array(await encoded.blob.arrayBuffer()),
          mimeType: hasAlpha ? "image/png" : "image/jpeg",
        });
      }
      return imagesToPdf(inputs, options, report);
    });

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={clear} />;
  if (op.state.status === "done") {
    const bytes = op.state.result;
    return (
      <DonePanel
        summary={`${items.length} page(s) · ${formatBytes(bytes.byteLength)}`}
        onDownload={() =>
          downloadPdf(bytes, items[0]?.file.name ?? "images.pdf", "images", TOOL_ID)
        }
        onStartOver={clear}
      />
    );
  }

  return (
    <div className="space-y-5">
      {items.length === 0 ? (
        <FileDropzone
          onFiles={add}
          accept="image/*"
          validate={validateImageFile}
          multiple
          title="Déposez vos images (JPG, PNG, WebP…)"
          hint={`Une page par image · ${formatBytes(IMAGE_MAX_SIZE)} max par fichier · 100 images max`}
          buttonLabel="Choisir des images"
          capture="environment"
          testId="image-dropzone"
        />
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e: DragEndEvent) =>
              e.over &&
              e.active.id !== e.over.id &&
              setItems((l) =>
                arrayMove(
                  l,
                  l.findIndex((i) => i.id === e.active.id),
                  l.findIndex((i) => i.id === e.over!.id),
                ),
              )
            }
          >
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              <ul
                className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]"
                aria-label="Ordre des pages"
                data-testid="images-list"
              >
                {items.map((item, index) => (
                  <SortableImage
                    key={item.id}
                    item={item}
                    index={index}
                    onRemove={() => remove(item.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          <FileDropzone
            onFiles={add}
            accept="image/*"
            validate={validateImageFile}
            multiple
            compact
            title="Ajouter des images"
            hint="Glissez d'autres images ou cliquez"
            buttonLabel="Ajouter"
            testId="image-dropzone-more"
          />
          <ToolPanel className="space-y-4">
            <Segmented
              label="Taille des pages"
              value={options.pageSize}
              onChange={(pageSize) => setOptions((o) => ({ ...o, pageSize }))}
              className="sm:grid-cols-4"
              options={[
                { value: "a4-portrait", label: "A4 portrait", description: "Image centrée" },
                { value: "a4-landscape", label: "A4 paysage", description: "Image centrée" },
                { value: "letter", label: "Lettre US", description: "216 × 279 mm" },
                { value: "fit-image", label: "Taille de l'image", description: "Page = image" },
              ]}
            />
            <div className="flex flex-wrap gap-4">
              {options.pageSize !== "fit-image" ? (
                <div className="space-y-1">
                  <Label htmlFor="i2p-margin">Marge (pt)</Label>
                  <Input
                    id="i2p-margin"
                    type="number"
                    min={0}
                    max={200}
                    value={options.margin}
                    onChange={(e) =>
                      setOptions((o) => ({ ...o, margin: Number(e.target.value) || 0 }))
                    }
                    className="w-28"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="i2p-dpi">Résolution (dpi)</Label>
                  <Input
                    id="i2p-dpi"
                    type="number"
                    min={36}
                    max={600}
                    value={options.dpi}
                    onChange={(e) =>
                      setOptions((o) => ({ ...o, dpi: Number(e.target.value) || 150 }))
                    }
                    className="w-28"
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="i2p-quality">
                  Qualité JPG des images converties ({Math.round(jpegQuality * 100)} %)
                </Label>
                <input
                  id="i2p-quality"
                  type="range"
                  min={50}
                  max={100}
                  value={Math.round(jpegQuality * 100)}
                  onChange={(e) => setJpegQuality(Number(e.target.value) / 100)}
                  className="block w-48 accent-primary"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Les JPG et PNG sont intégrés tels quels (aucune recompression). Les autres formats
              sont convertis en PNG (transparence conservée) ou JPG.
            </p>
          </ToolPanel>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={clear}>
              Tout retirer
            </Button>
            <Button type="button" size="lg" onClick={run} data-testid="images-to-pdf-run">
              <FileText aria-hidden="true" /> Créer le PDF ({items.length} page
              {items.length > 1 ? "s" : ""})
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function SortableImage({
  item,
  index,
  onRemove,
}: {
  item: Item;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col items-center gap-1 ${isDragging ? "opacity-60" : ""}`}
      data-testid="images-item"
    >
      <div
        className="relative cursor-grab touch-none overflow-hidden rounded-[6px] border-2 border-border bg-muted checkerboard active:cursor-grabbing"
        aria-label={`Page ${index + 1} : ${item.file.name}`}
        {...attributes}
        {...listeners}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview */}
        <img src={item.url} alt="" className="h-36 w-28 object-contain" draggable={false} />
        <span className="absolute bottom-1 left-1 rounded-full bg-foreground/80 px-1.5 text-[11px] text-background">
          {index + 1}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        aria-label={`Retirer ${item.file.name}`}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </li>
  );
}
