"use client";

import {
  ArrowUpRight,
  Circle,
  EyeOff,
  Highlighter,
  ImageIcon,
  MessageSquare,
  Minus,
  MousePointer2,
  PenLine,
  Pencil,
  Square,
  TextCursorInput,
  Type,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n/messages";
import { TOOL_GROUPS, toolLabels, toolShortcuts, type WorkspaceTool } from "./types";

const icons: Record<WorkspaceTool, React.ComponentType<{ className?: string }>> = {
  select: MousePointer2,
  editText: TextCursorInput,
  text: Type,
  comment: MessageSquare,
  pen: Pencil,
  highlight: Highlighter,
  underline: Underline,
  rect: Square,
  ellipse: Circle,
  line: Minus,
  arrow: ArrowUpRight,
  mask: EyeOff,
  image: ImageIcon,
  signature: PenLine,
};

/** A button of the rail that opens a panel instead of selecting a tool (Pages, OCR). */
export interface ToolbarExtra {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  /** Small hint shown as a dot (e.g. OCR available). */
  attention?: boolean;
}

interface ToolbarProps {
  tools: WorkspaceTool[];
  active: WorkspaceTool;
  onChange: (tool: WorkspaceTool) => void;
  orientation: "vertical" | "horizontal";
  extras?: ToolbarExtra[];
}

/**
 * Tool rail grouped by intent: selection, text, annotation, insertion, then
 * the document panels (pages, OCR). Vertical on desktop with group labels,
 * one scrollable row on mobile.
 */
export function Toolbar({ tools, active, onChange, orientation, extras = [] }: ToolbarProps) {
  const groups = TOOL_GROUPS.map((g) => ({
    ...g,
    tools: g.tools.filter((t) => tools.includes(t)),
  })).filter((g) => g.tools.length > 0);

  if (orientation === "vertical") {
    return (
      <div
        role="toolbar"
        aria-label={tr("Outils d'édition")}
        aria-orientation="vertical"
        className="flex h-full flex-col gap-2"
      >
        {groups.map((group, index) => (
          <div
            key={group.id}
            className={cn("flex flex-col gap-0.5", index > 0 && "border-t border-border pt-2")}
          >
            {groups.length > 1 ? (
              <p className="px-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
            ) : null}
            {group.tools.map((tool) => (
              <ToolButton key={tool} tool={tool} active={tool === active} onChange={onChange} />
            ))}
          </div>
        ))}
        {extras.length ? (
          <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-2">
            <p className="px-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {tr("Document")}
            </p>
            <div className="grid grid-cols-2 gap-0.5">
              {extras.map((extra) => (
                <ExtraButton key={extra.id} extra={extra} compact />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div
      role="toolbar"
      aria-label={tr("Outils d'édition")}
      aria-orientation={orientation}
      className="flex flex-row gap-1 overflow-x-auto px-2"
    >
      {groups.map((group, index) => (
        <div
          key={group.id}
          className={cn("flex shrink-0 flex-row gap-1", index > 0 && "border-l border-border pl-1")}
        >
          {group.tools.map((tool) => (
            <ToolButton key={tool} tool={tool} active={tool === active} onChange={onChange} />
          ))}
        </div>
      ))}
      {extras.length ? (
        <div className="flex shrink-0 flex-row gap-1 border-l border-border pl-1">
          {extras.map((extra) => (
            <ExtraButton key={extra.id} extra={extra} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const buttonClass = (active: boolean) =>
  cn(
    "relative flex h-12 min-w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[10px] text-[10px] font-medium leading-tight transition-colors sm:h-[46px]",
    active
      ? "bg-primary-soft text-link"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

function ToolButton({
  tool,
  active,
  onChange,
}: {
  tool: WorkspaceTool;
  active: boolean;
  onChange: (tool: WorkspaceTool) => void;
}) {
  const Icon = icons[tool];
  const key = toolShortcuts[tool];
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-keyshortcuts={key}
      title={key ? `${toolLabels[tool]} (${key})` : toolLabels[tool]}
      onClick={() => onChange(tool)}
      className={buttonClass(active)}
      data-testid={`tool-${tool}`}
    >
      <Icon className="size-5" />
      {toolLabels[tool]}
    </button>
  );
}

function ExtraButton({ extra, compact = false }: { extra: ToolbarExtra; compact?: boolean }) {
  const Icon = extra.icon;
  return (
    <button
      type="button"
      aria-pressed={extra.active}
      aria-label={extra.label}
      title={extra.label}
      onClick={extra.onClick}
      className={cn(buttonClass(extra.active), compact && "h-9 min-w-0 sm:h-9")}
      data-testid={`panel-${extra.id}`}
    >
      <Icon className={compact ? "size-[18px]" : "size-5"} />
      {compact ? null : extra.label}
      {extra.attention ? (
        <span
          className="absolute right-2 top-2 size-2 rounded-full bg-primary"
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}
