import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getToolPath, type ToolDefinition } from "@/lib/tools";
import { categoryTone } from "@/lib/tools/groups";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ToolIcon } from "./tool-icon";

interface ToolCardProps {
  tool: ToolDefinition;
  className?: string;
  /** @deprecated every card shares the same tile; kept for callers. */
  featured?: boolean;
  /** @deprecated every card shares the same tile; kept for callers. */
  compact?: boolean;
  /**
   * Catalogue lists: one description line on phones so that a 69-tool list
   * stays scannable (the tile layout takes over from the "sm" breakpoint).
   */
  dense?: boolean;
  /**
   * Grids of tiles (home, related tools): on phones a small square tile, icon
   * and name only, two per row, instead of a full-width row with description.
   */
  compactOnPhone?: boolean;
}

/**
 * The tool tile: a large green icon, the tool's name in bold and what it
 * does. On phones the icon sits on the left of the text (a list is easier to
 * scan); from the "sm" breakpoint up it is a tile, icon on top.
 */
export function ToolCard({
  tool,
  className,
  dense = false,
  compactOnPhone = false,
}: ToolCardProps) {
  const tone = categoryTone[tool.category];
  return (
    <Link
      href={getToolPath(tool)}
      className={cn(
        "card-interactive group relative flex h-full items-start rounded-[16px] border border-border bg-surface shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-col sm:gap-0 sm:p-6",
        compactOnPhone ? "flex-col gap-3 p-3.5" : "gap-3.5 p-4",
        className,
      )}
      data-testid="tool-card"
      data-tool-id={tool.id}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-[12px] sm:size-12",
          tone.tile,
        )}
      >
        <ToolIcon name={tool.icon} className="size-[22px] sm:size-6" strokeWidth={1.9} />
      </span>
      <span className={cn("min-w-0 flex-1 sm:mt-4", compactOnPhone && "w-full")}>
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "font-heading font-bold leading-snug text-foreground sm:text-[19px]",
              compactOnPhone ? "text-[15px] max-sm:hyphens-auto" : "text-base",
            )}
          >
            {tool.name}
          </span>
          {tool.status === "beta" ? <Badge variant="warning">{t.tool.betaBadge}</Badge> : null}
        </span>
        <span
          className={cn(
            "mt-1 block text-sm leading-relaxed text-muted-foreground sm:mt-2 sm:line-clamp-3 sm:text-[15px]",
            compactOnPhone ? "max-sm:hidden" : dense ? "line-clamp-1" : "line-clamp-2",
          )}
        >
          {tool.shortDescription}
        </span>
      </span>
    </Link>
  );
}
