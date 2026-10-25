import { cn } from "@/lib/utils";

/** Card-like container for tool controls and results (handoff: radius 16, surface, border). */
export function ToolPanel({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-[16px] border border-border bg-surface p-4 sm:p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function StatGrid({ items, className }: { items: { label: string; value: React.ReactNode; hint?: string }[]; className?: string }) {
  return (
    <dl className={cn("grid gap-2 sm:grid-cols-3 lg:grid-cols-4", className)} data-testid="stat-grid">
      {items.map((item) => (
        <div key={item.label} className="rounded-md bg-muted px-3 py-2">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="font-heading text-lg font-bold tabular-nums" title={item.hint}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
