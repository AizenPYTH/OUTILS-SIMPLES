"use client";

import * as React from "react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RotateCw, Trash2, Undo2 } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { PageThumbnail } from "@/components/pdf/shared/page-thumbnail";
import { PageTile } from "@/components/pdf/shared/page-tile";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import type { PageInfo } from "@/lib/pdf/browser/pdfjs";
import { formatBytes } from "@/lib/files/format";
import { normalizeRotation, organizePages, type PageArrangement } from "@/lib/pdf/operations/pages";
import { t } from "@/lib/i18n";

const TOOL_ID = "pdf-organize";

interface Item extends PageArrangement {
  id: string;
}

export function OrganizeTool() {
  return <SingleFileTool toolId={TOOL_ID}>{({ pdf, reset }) => <OrganizeWorkspace pdf={pdf} reset={reset} />}</SingleFileTool>;
}

function OrganizeWorkspace({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const initial = React.useMemo<Item[]>(() => pdf.pages.map((p) => ({ id: `p-${p.index}`, sourceIndex: p.index, rotation: 0 })), [pdf.pages]);
  const [items, setItems] = React.useState<Item[]>(initial);
  const [history, setHistory] = React.useState<Item[][]>([]);
  const op = useOperation<Uint8Array>(TOOL_ID);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const update = (next: Item[]) => {
    setHistory((h) => [...h.slice(-30), items]);
    setItems(next);
  };
  const undo = () => {
    const prev = history.at(-1);
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setItems(prev);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    update(arrayMove(items, items.findIndex((i) => i.id === active.id), items.findIndex((i) => i.id === over.id)));
  };

  const changed = items.length !== pdf.pageCount || items.some((it, i) => it.sourceIndex !== i || normalizeRotation(it.rotation) !== 0);
  const run = () => void op.run(() => organizePages(pdf.bytes, items.map(({ sourceIndex, rotation }) => ({ sourceIndex, rotation }))));

  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error") return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={reset} />;
  if (op.state.status === "done") {
    const bytes = op.state.result;
    return (
      <DonePanel
        summary={`${t.result.pages(items.length)} · ${formatBytes(bytes.byteLength)}`}
        onDownload={() => downloadPdf(bytes, pdf.file.name, "organise", TOOL_ID)}
        onStartOver={() => {
          op.reset();
          reset();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <FileSummary name={pdf.file.name} size={pdf.file.size} pageCount={pdf.pageCount} onReset={reset} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Faites glisser les vignettes pour les réordonner. {items.length} page(s) dans le document final.</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={undo} disabled={history.length === 0}>
            <Undo2 aria-hidden="true" /> {t.common.undo}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => update(initial)} disabled={!changed}>
            {t.common.reset}
          </Button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]" aria-label="Ordre des pages" data-testid="organize-grid">
            {items.map((item, position) => (
              <SortablePage
                key={item.id}
                item={item}
                position={position}
                page={pdf.pages[item.sourceIndex]!}
                doc={pdf.opened.doc}
                onRotate={() => update(items.map((i) => (i.id === item.id ? { ...i, rotation: normalizeRotation(i.rotation + 90) } : i)))}
                onDelete={() => update(items.filter((i) => i.id !== item.id))}
                canDelete={items.length > 1}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <Button type="button" size="lg" className="w-full" onClick={run} disabled={!changed || items.length === 0} data-testid="organize-export">
        {t.common.export} ({t.result.pages(items.length)})
      </Button>
    </div>
  );
}

function SortablePage({
  item,
  position,
  page,
  doc,
  onRotate,
  onDelete,
  canDelete,
}: {
  item: Item;
  position: number;
  page: PageInfo;
  doc: PDFDocumentProxy;
  onRotate: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex justify-center" data-testid="organize-page" data-source-index={item.sourceIndex}>
      <PageTile
        pageNumber={item.sourceIndex + 1}
        dragging={isDragging}
        actions={
          <>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onRotate} aria-label={`Pivoter la page ${item.sourceIndex + 1}`}>
              <RotateCw aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onDelete} disabled={!canDelete} aria-label={`Supprimer la page ${item.sourceIndex + 1}`} className="text-destructive hover:text-destructive">
              <Trash2 aria-hidden="true" />
            </Button>
          </>
        }
      >
        <div
          className="cursor-grab touch-none active:cursor-grabbing"
          aria-label={`Position ${position + 1} : page d'origine ${item.sourceIndex + 1}. Déplacer avec les flèches.`}
          {...attributes}
          {...listeners}
        >
          <PageThumbnail doc={doc} page={page} width={104} height={146} extraRotation={item.rotation} />
        </div>
      </PageTile>
    </li>
  );
}
