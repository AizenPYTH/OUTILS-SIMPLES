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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, FileText, GripVertical, Merge, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PdfDropzone } from "@/components/pdf/shared/pdf-dropzone";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import { pdfLimits } from "@/config/limits";
import { formatBytes } from "@/lib/files/format";
import { validateFileBatch } from "@/lib/files/validation";
import { readPdfFile } from "@/lib/pdf/browser/read-file";
import { isPdfError, PdfError, toPdfError } from "@/lib/pdf/errors";
import { mergePdfs, type MergeResult } from "@/lib/pdf/operations/merge";
import { getToolById, getToolPath } from "@/lib/tools";
import { t } from "@/lib/i18n";
import { uid } from "@/lib/utils";

interface QueuedFile {
  id: string;
  file: File;
  bytes: Uint8Array;
  pageCount: number | null;
}

const TOOL_ID = "pdf-merge";

export function MergeTool() {
  const tool = getToolById(TOOL_ID)!;
  const [files, setFiles] = React.useState<QueuedFile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const op = useOperation<MergeResult>(TOOL_ID);
  const editor = getToolById("pdf-edit");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addFiles = async (incoming: File[]) => {
    setLoading(true);
    try {
      const next: QueuedFile[] = [];
      for (const file of incoming) {
        if (
          files.some(
            (f) =>
              f.file.name === file.name &&
              f.file.size === file.size &&
              f.file.lastModified === file.lastModified,
          )
        ) {
          toast.info(t.upload.fileRejected(file.name, t.errors.duplicateFile));
          continue;
        }
        try {
          const bytes = await readPdfFile(file, tool.limits.maxFileSizeBytes);
          const pageCount = await countPages(bytes);
          next.push({ id: uid("file"), file, bytes, pageCount });
        } catch (error) {
          toast.error(
            t.upload.fileRejected(file.name, isPdfError(error) ? error.message : t.errors.notPdf),
          );
        }
      }
      const combined = [...files, ...next];
      try {
        validateFileBatch(
          combined.map((f) => f.file),
          {
            maxFileCount: tool.limits.maxFileCount,
            maxTotalSizeBytes: pdfLimits.maxTotalSizeBytes,
          },
        );
      } catch (error) {
        toast.error(toPdfError(error).message);
        return;
      }
      setFiles(combined);
      if (next.length)
        toast.success(
          next.length === 1
            ? t.upload.fileAdded(next[0]!.file.name)
            : t.upload.filesAdded(next.length),
        );
    } finally {
      setLoading(false);
    }
  };

  const move = (index: number, delta: number) => {
    setFiles((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      return arrayMove(list, index, target);
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFiles((list) =>
      arrayMove(
        list,
        list.findIndex((f) => f.id === active.id),
        list.findIndex((f) => f.id === over.id),
      ),
    );
  };

  const merge = () => {
    if (files.length < 2) {
      toast.error(t.errors.needTwoFiles);
      return;
    }
    void op.run((report) =>
      mergePdfs(
        files.map((f) => ({ name: f.file.name, bytes: f.bytes })),
        report,
      ),
    );
  };

  const resetAll = () => {
    setFiles([]);
    op.reset();
  };

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error")
    return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={resetAll} />;
  if (op.state.status === "done") {
    const result = op.state.result;
    const firstName = files[0]?.file.name ?? "document.pdf";
    return (
      <DonePanel
        summary={`${t.result.pages(result.pageCount)} · ${formatBytes(result.bytes.byteLength)}`}
        onDownload={() => downloadPdf(result.bytes, firstName, "fusionne", TOOL_ID)}
        onStartOver={resetAll}
        editorPath={editor ? getToolPath(editor) : null}
      />
    );
  }

  const totalPages = files.reduce((sum, f) => sum + (f.pageCount ?? 0), 0);
  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);

  return (
    <div className="space-y-5">
      {files.length === 0 ? (
        <PdfDropzone
          onFiles={(f) => void addFiles(f)}
          multiple
          maxFileSizeBytes={tool.limits.maxFileSizeBytes}
          maxFileCount={tool.limits.maxFileCount}
          disabled={loading}
        />
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={files.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <ol
                className="space-y-2"
                aria-label="Fichiers à fusionner"
                data-testid="merge-file-list"
              >
                {files.map((item, index) => (
                  <SortableFileRow
                    key={item.id}
                    item={item}
                    index={index}
                    total={files.length}
                    onMoveUp={() => move(index, -1)}
                    onMoveDown={() => move(index, 1)}
                    onRemove={() => setFiles((list) => list.filter((f) => f.id !== item.id))}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
          <PdfDropzone
            onFiles={(f) => void addFiles(f)}
            multiple
            compact
            maxFileSizeBytes={tool.limits.maxFileSizeBytes}
            maxFileCount={tool.limits.maxFileCount}
            disabled={loading}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {files.length} {t.common.files} · {t.result.pages(totalPages)} ·{" "}
              {formatBytes(totalSize)}
            </p>
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              onClick={merge}
              disabled={files.length < 2 || loading}
              data-testid="merge-button"
            >
              <Merge aria-hidden="true" />
              Fusionner {files.length > 1 ? `${files.length} fichiers` : ""}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function SortableFileRow({
  item,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  item: QueuedFile;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-[14px] border border-border bg-surface px-3 py-2.5 ${isDragging ? "z-10 shadow-lg" : ""}`}
      data-testid="merge-file-row"
    >
      <button
        type="button"
        className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label={`Déplacer ${item.file.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-link">
        <FileText className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={item.file.name}>
          <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>
          {item.file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(item.file.size)}
          {item.pageCount !== null ? ` · ${t.result.pages(item.pageCount)}` : ""}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onMoveUp}
        disabled={index === 0}
        aria-label="Monter"
      >
        <ArrowUp aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onMoveDown}
        disabled={index === total - 1}
        aria-label="Descendre"
      >
        <ArrowDown aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        aria-label={`${t.common.remove} ${item.file.name}`}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </li>
  );
}

async function countPages(bytes: Uint8Array): Promise<number | null> {
  try {
    const { loadPdfDocument } = await import("@/lib/pdf/load");
    const doc = await loadPdfDocument(bytes, { maxPageCount: Number.MAX_SAFE_INTEGER });
    return doc.getPageCount();
  } catch (error) {
    if (
      isPdfError(error) &&
      (error.code === "ENCRYPTED" || error.code === "CORRUPTED" || error.code === "EMPTY")
    )
      throw error;
    if (error instanceof PdfError) throw error;
    return null;
  }
}
