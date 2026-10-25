"use client";

import { cn } from "@/lib/utils";

interface PageTileProps {
  pageNumber: number;
  selected?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
  dragging?: boolean;
}

/** Thumbnail frame (handoff: 2px border, radius 6, active = primary). */
export function PageTile({ pageNumber, selected = false, children, actions, onClick, ariaLabel, className, dragging }: PageTileProps) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <div className={cn("group relative flex flex-col items-center gap-1.5", className)}>
      <Wrapper
        type={onClick ? "button" : undefined}
        onClick={onClick}
        aria-pressed={onClick ? selected : undefined}
        aria-label={ariaLabel}
        className={cn(
          "relative overflow-hidden rounded-[6px] border-2 bg-muted transition-colors",
          selected ? "border-primary ring-[3px] ring-ring" : "border-border",
          onClick && "cursor-pointer hover:border-primary/60",
          dragging && "opacity-60",
        )}
      >
        {children}
        <span className="absolute bottom-1 left-1 rounded-full bg-foreground/80 px-1.5 text-[11px] font-medium tabular-nums text-background">
          {pageNumber}
        </span>
      </Wrapper>
      {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
    </div>
  );
}
