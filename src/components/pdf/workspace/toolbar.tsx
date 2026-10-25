"use client";

import {
  ArrowUpRight,
  Circle,
  Highlighter,
  ImageIcon,
  MessageSquare,
  MousePointer2,
  PenLine,
  Pencil,
  Square,
  TextCursorInput,
  Type,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toolLabels, type WorkspaceTool } from "./types";

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
  arrow: ArrowUpRight,
  image: ImageIcon,
  signature: PenLine,
};

interface ToolbarProps {
  tools: WorkspaceTool[];
  active: WorkspaceTool;
  onChange: (tool: WorkspaceTool) => void;
  orientation: "vertical" | "horizontal";
}

/** Editor tool rail (handoff: 56px buttons, 20px icon + 11px label, active = soft fill + primary text). */
/** Task groups shown as labels on the desktop rail (docs/DESIGN_PRINCIPES.md § C). */
const TASK_GROUPS: { label: string; tools: WorkspaceTool[] }[] = [
  { label: "Sélection", tools: ["select"] },
  { label: "Texte", tools: ["editText", "text", "comment"] },
  { label: "Annoter", tools: ["pen", "highlight", "underline", "rect", "ellipse", "arrow"] },
  { label: "Insérer", tools: ["image", "signature"] },
];

export function Toolbar({ tools, active, onChange, orientation }: ToolbarProps) {
  if (orientation === "vertical") {
    const groups = TASK_GROUPS.map((g) => ({
      ...g,
      tools: g.tools.filter((t) => tools.includes(t)),
    })).filter((g) => g.tools.length > 0);
    return (
      <div
        role="toolbar"
        aria-label="Outils d'édition"
        aria-orientation="vertical"
        className="flex flex-col gap-2"
      >
        {groups.map((group, index) => (
          <div
            key={group.label}
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
      </div>
    );
  }
  return (
    <div
      role="toolbar"
      aria-label="Outils d'édition"
      aria-orientation={orientation}
      className="flex flex-row gap-1 overflow-x-auto px-2"
    >
      {tools.map((tool) => (
        <ToolButton key={tool} tool={tool} active={tool === active} onChange={onChange} />
      ))}
    </div>
  );
}

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
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onChange(tool)}
      className={cn(
        "flex h-14 min-w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-[10px] text-[11px] font-medium transition-colors",
        active
          ? "bg-primary-soft text-link"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      data-testid={`tool-${tool}`}
    >
      <Icon className="size-5" />
      {toolLabels[tool]}
    </button>
  );
}
