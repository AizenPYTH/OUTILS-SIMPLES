"use client";

import * as React from "react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface HomeFilter {
  id: string;
  label: string;
  /** Category page: where the tab leads without JavaScript or with a modifier key. */
  href: string;
  count: number;
}

interface HomeToolFilterProps {
  filters: HomeFilter[];
  /** The server-rendered grid; every item carries `data-cat`. */
  children: React.ReactNode;
}

/**
 * Family tabs above the home grid. Each tab is a link to the family page
 * (works without JavaScript, can be opened in a new tab); a plain click
 * filters the grid in place instead. The grid itself stays server-rendered:
 * filtering only hides items with a scoped style rule.
 */
export function HomeToolFilter({ filters, children }: HomeToolFilterProps) {
  const [active, setActive] = React.useState("all");
  const current = filters.find((f) => f.id === active) ?? filters[0]!;

  return (
    <div data-home-grid={active}>
      <nav
        aria-label={t.homePage.byFamily}
        className="-mx-5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0"
      >
        <ul className="flex gap-2 sm:flex-wrap sm:justify-center" data-testid="home-categories">
          {filters.map((filter) => {
            const selected = filter.id === active;
            return (
              <li key={filter.id} className="shrink-0">
                <a
                  href={filter.href}
                  aria-current={selected ? "true" : undefined}
                  data-testid={`home-filter-${filter.id}`}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    setActive(filter.id);
                  }}
                  className={cn(
                    "inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-foreground hover:border-accent hover:bg-primary-soft",
                  )}
                >
                  {filter.label}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      selected ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {filter.count}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="sr-only" aria-live="polite">
        {t.directory.resultsCount(current.count)}
      </p>
      {active !== "all" ? (
        // Category ids come from the registry (lowercase letters only).
        <style>{`[data-home-grid="${active}"] [data-cat]:not([data-cat="${active}"]){display:none}`}</style>
      ) : null}
      {children}
    </div>
  );
}
