import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getToolPath, type ToolDefinition } from "@/lib/tools";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ToolIcon } from "./tool-icon";

interface ToolCardProps {
  tool: ToolDefinition;
  className?: string;
  /** Kept for callers; every card now shares the same layout (docs/DESIGN_PRINCIPES.md §3.4). */
  compact?: boolean;
  featured?: boolean;
}

/** The single card model: icon tile, name, two-line description. */
export function ToolCard({ tool, className }: ToolCardProps) {
  return (
    <Link
      href={getToolPath(tool)}
      className={cn(
        "group relative flex h-full items-start gap-3.5 rounded-[14px] border border-border bg-surface p-4 transition-[border-color,box-shadow] duration-150 hover:border-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
      data-testid="tool-card"
      data-tool-id={tool.id}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-link">
        <ToolIcon name={tool.icon} className="size-5" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-semibold leading-snug text-foreground">
            {tool.name}
          </span>
          {tool.status === "beta" ? <Badge variant="warning">{t.tool.betaBadge}</Badge> : null}
        </span>
        <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-muted-foreground">
          {tool.shortDescription}
        </span>
      </span>
    </Link>
  );
}
