import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getCategoryById, getToolPath, type ToolDefinition } from "@/lib/tools";
import { categoryTone } from "@/lib/tools/groups";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ToolIcon } from "./tool-icon";

interface ToolCardProps {
  tool: ToolDefinition;
  className?: string;
  /** Popular card: larger tile, family label, three description lines. */
  featured?: boolean;
  /** @deprecated every card shares the same layout; kept for callers. */
  compact?: boolean;
}

/**
 * The tool card (docs/DESIGN_PRINCIPES.md § B): icon tile tinted by family,
 * name, two-line description, family label. One shape everywhere; the
 * "featured" variant only changes the scale.
 */
export function ToolCard({ tool, className, featured = false }: ToolCardProps) {
  const tone = categoryTone[tool.category];
  const category = getCategoryById(tool.category);
  return (
    <Link
      href={getToolPath(tool)}
      className={cn(
        "card-interactive group relative flex h-full gap-3.5 rounded-[14px] border border-border bg-surface shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        featured ? "flex-col p-5" : "items-start p-4",
        className,
      )}
      data-testid="tool-card"
      data-tool-id={tool.id}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[12px]",
          tone.tile,
          featured ? "size-12" : "size-10",
        )}
      >
        <ToolIcon name={tool.icon} className={featured ? "size-6" : "size-5"} strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "font-semibold leading-snug text-foreground",
              featured ? "text-base" : "text-[15px]",
            )}
          >
            {tool.name}
          </span>
          {tool.status === "beta" ? <Badge variant="warning">{t.tool.betaBadge}</Badge> : null}
        </span>
        <span
          className={cn(
            "mt-1 block text-sm leading-relaxed text-muted-foreground",
            featured ? "line-clamp-3" : "line-clamp-2",
          )}
        >
          {tool.shortDescription}
        </span>
        {featured && category ? (
          <span className={cn("mt-3 block text-xs font-medium", tone.text)}>{category.shortName}</span>
        ) : null}
      </span>
    </Link>
  );
}
