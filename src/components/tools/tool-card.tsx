import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getToolPath, type ToolDefinition } from "@/lib/tools";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ToolIcon } from "./tool-icon";

interface ToolCardProps {
  tool: ToolDefinition;
  className?: string;
  /** Compact list card (icon 40, padding 16) — default. */
  compact?: boolean;
  /** Popular card (icon 46, padding 20, filled primary icon). */
  featured?: boolean;
}

export function ToolCard({ tool, className, featured = false }: ToolCardProps) {
  return (
    <Link
      href={getToolPath(tool)}
      className={cn(
        "group relative flex h-full gap-3.5 border border-border bg-surface transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-[3px] hover:border-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:ring-[3px] focus-visible:ring-ring motion-reduce:hover:translate-y-0",
        featured ? "flex-col rounded-[16px] p-5" : "items-start rounded-[14px] p-4",
        className,
      )}
      data-testid="tool-card"
      data-tool-id={tool.id}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[10px]",
          featured ? "size-12 bg-primary text-primary-foreground" : "size-10 bg-primary-soft text-link",
        )}
      >
        <ToolIcon name={tool.icon} className={featured ? "size-6" : "size-5"} strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn("font-semibold leading-snug text-foreground", featured ? "text-base" : "text-[15px]")}>{tool.name}</span>
          {tool.status === "beta" ? <Badge variant="warning">{t.tool.betaBadge}</Badge> : null}
        </span>
        <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-muted-foreground">{tool.shortDescription}</span>
      </span>
    </Link>
  );
}
