"use client";

import { ArrowUpRight, Circle, Highlighter, ImageIcon, MessageSquare, MousePointer2, PenLine, Pencil, Square, Type, Underline } from "lucide-react";
import { cn } from "@/lib/utils";
import { toolLabels, type WorkspaceTool } from "./types";

const icons: Record<WorkspaceTool, React.ComponentType<{ className?: string }>> = {
  select: MousePointer2,
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
export function Toolbar({ tools, active, onChange, orientation }: ToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Outils d'édition"
      aria-orientation={orientation}
      className={cn("flex gap-1", orientation === "vertical" ? "flex-col" : "flex-row overflow-x-auto px-2")}
    >
      {tools.map((tool) => {
        const Icon = icons[tool];
        const isActive = tool === active;
        return (
          <button
            key={tool}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(tool)}
            className={cn(
              "flex h-14 min-w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-[10px] text-[11px] font-medium transition-colors",
              isActive ? "bg-primary-soft text-link" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            data-testid={`tool-${tool}`}
          >
            <Icon className="size-5" />
            {toolLabels[tool]}
          </button>
        );
      })}
    </div>
  );
}
