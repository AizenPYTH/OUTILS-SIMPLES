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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  RotateCcw,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PageThumbnail } from "@/components/pdf/shared/page-thumbnail";
import type { PageInfo } from "@/lib/pdf/browser/pdfjs";
import {
  duplicatePlanned,
  movePlanned,
  removePlanned,
  rotatePlanned,
  type PagePlan,
} from "@/lib/pdf/operations/page-plan";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface PagesPanelProps {
  doc: PDFDocumentProxy;
  pages: PageInfo[];
  plan: PagePlan;
  /** Position in the plan of the page shown. */
  current: number;
  onSelect: (position: number) => void;
  /** Source pages carrying annotations or text edits (dot on the thumbnail). */
  modifiedSources: Set<number>;
  onPlanChange: (plan: PagePlan, label: string) => void;
  onClose: () => void;
}

/** Stable ids through reorders: the source page and its occurrence number. */
function planIds(plan: PagePlan): string[] {
  const seen = new Map<number, number>();
  return plan.map((p) => {
    const n = seen.get(p.source) ?? 0;
    seen.set(p.source, n + 1);
    return `p${p.source}-${n}`;
  });
}

/**
 * Compact, collapsible page navigation with page actions: rotate, duplicate,
 * delete, move (drag, keyboard or arrows). The plan only describes what the
 * export will do; the document itself is unchanged until then.
 */
export function PagesPanel({
  doc,
  pages,
  plan,
  current,
  onSelect,
  modifiedSources,
  onPlanChange,
  onClose,
}: PagesPanelProps) {
  const refs = React.useRef<(HTMLLIElement | null)[]>([]);
  const ids = React.useMemo(() => planIds(plan), [plan]);
  React.useEffect(() => {
    refs.current[current]?.scrollIntoView({ block: "nearest" });
  }, [current]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onPlanChange(movePlanned(plan, from, to), `Page ${from + 1} déplacée en ${to + 1}`);
    onSelect(to);
  };

  const act = (
    position: number,
    action: "rotate-left" | "rotate-right" | "duplicate" | "delete" | "up" | "down",
  ) => {
    switch (action) {
      case "rotate-left":
        onPlanChange(rotatePlanned(plan, position, -90), `Page ${position + 1} pivotée`);
        break;
      case "rotate-right":
        onPlanChange(rotatePlanned(plan, position, 90), `Page ${position + 1} pivotée`);
        break;
      case "duplicate":
        onPlanChange(duplicatePlanned(plan, position), `Page ${position + 1} dupliquée`);
        break;
      case "delete":
        if (plan.length <= 1) return;
        onPlanChange(removePlanned(plan, position), `Page ${position + 1} supprimée`);
        onSelect(Math.min(position, plan.length - 2));
        break;
      case "up":
        onPlanChange(movePlanned(plan, position, position - 1), `Page ${position + 1} déplacée`);
        onSelect(position - 1);
        break;
      case "down":
        onPlanChange(movePlanned(plan, position, position + 1), `Page ${position + 1} déplacée`);
        onSelect(position + 1);
        break;
    }
  };

  return (
    <nav
      aria-label="Pages"
      className="flex h-full w-full flex-col border-r border-border bg-muted/40"
      data-testid="pages-panel"
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <p className="text-xs font-semibold">
          {plan.length} {plan.length > 1 ? t.common.pages : "page"}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Masquer le panneau des pages"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          data-testid="pages-panel-close"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="flex min-h-0 flex-1 flex-col items-stretch gap-2 overflow-y-auto p-2">
            {plan.map((planned, position) => {
              const page = pages[planned.source];
              if (!page) return null;
              return (
                <PageItem
                  key={ids[position]}
                  id={ids[position]!}
                  ref={(el) => {
                    refs.current[position] = el;
                  }}
                  doc={doc}
                  page={page}
                  rotation={planned.rotation}
                  position={position}
                  total={plan.length}
                  current={position === current}
                  modified={modifiedSources.has(planned.source)}
                  onSelect={() => onSelect(position)}
                  onAction={(action) => act(position, action)}
                />
              );
            })}
          </ol>
        </SortableContext>
      </DndContext>
    </nav>
  );
}

type PageAction = "rotate-left" | "rotate-right" | "duplicate" | "delete" | "up" | "down";

const PageItem = React.forwardRef<
  HTMLLIElement,
  {
    id: string;
    doc: PDFDocumentProxy;
    page: PageInfo;
    rotation: number;
    position: number;
    total: number;
    current: boolean;
    modified: boolean;
    onSelect: () => void;
    onAction: (action: PageAction) => void;
  }
>(function PageItem(
  { id, doc, page, rotation, position, total, current, modified, onSelect, onAction },
  forwardedRef,
) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li
      ref={(el) => {
        setNodeRef(el);
        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      }}
      style={style}
      className={cn(
        "group relative rounded-[8px] border bg-surface p-1.5",
        current ? "border-primary ring-1 ring-primary" : "border-border",
        isDragging && "z-10 shadow-lg",
      )}
      data-testid={`page-item-${position}`}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          className="flex touch-none items-center self-stretch rounded px-0.5 text-muted-foreground hover:bg-muted"
          aria-label={`Déplacer la page ${position + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onSelect}
          aria-current={current ? "page" : undefined}
          aria-label={`${t.common.page} ${position + 1}${rotation ? ` (pivotée de ${rotation}°)` : ""}${modified ? " (modifiée)" : ""}`}
          className="relative flex-1 overflow-hidden rounded-[4px]"
          data-testid={`thumb-${position}`}
        >
          <div className="mx-auto flex h-[104px] w-[80px] items-center justify-center bg-white">
            <PageThumbnail doc={doc} page={page} width={80} height={104} extraRotation={rotation} />
          </div>
          <span className="absolute bottom-1 left-1 rounded-full bg-foreground/80 px-1.5 text-[11px] text-background">
            {position + 1}
          </span>
          {modified ? (
            <span
              className="absolute right-1 top-1 size-2.5 rounded-full bg-primary"
              aria-hidden="true"
            />
          ) : null}
        </button>
      </div>
      <div
        className={cn(
          "mt-1 flex flex-wrap items-center justify-center gap-0.5",
          !current && "opacity-0 focus-within:opacity-100 group-hover:opacity-100",
        )}
        role="group"
        aria-label={`Actions de la page ${position + 1}`}
      >
        <PageActionButton
          label="Pivoter vers la gauche"
          onClick={() => onAction("rotate-left")}
          testId={`page-rotate-left-${position}`}
        >
          <RotateCcw className="size-3.5" />
        </PageActionButton>
        <PageActionButton
          label="Pivoter vers la droite"
          onClick={() => onAction("rotate-right")}
          testId={`page-rotate-right-${position}`}
        >
          <RotateCw className="size-3.5" />
        </PageActionButton>
        <PageActionButton
          label="Dupliquer la page"
          onClick={() => onAction("duplicate")}
          testId={`page-duplicate-${position}`}
        >
          <Copy className="size-3.5" />
        </PageActionButton>
        <PageActionButton
          label="Monter la page"
          onClick={() => onAction("up")}
          disabled={position === 0}
          testId={`page-up-${position}`}
        >
          <ChevronUp className="size-3.5" />
        </PageActionButton>
        <PageActionButton
          label="Descendre la page"
          onClick={() => onAction("down")}
          disabled={position >= total - 1}
          testId={`page-down-${position}`}
        >
          <ChevronDown className="size-3.5" />
        </PageActionButton>
        <PageActionButton
          label="Supprimer la page"
          onClick={() => onAction("delete")}
          disabled={total <= 1}
          destructive
          testId={`page-delete-${position}`}
        >
          <Trash2 className="size-3.5" />
        </PageActionButton>
      </div>
    </li>
  );
});

function PageActionButton({
  label,
  onClick,
  disabled,
  destructive,
  testId,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-40",
        destructive
          ? "text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      data-testid={testId}
    >
      {children}
    </button>
  );
}
