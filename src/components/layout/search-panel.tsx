"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ToolIcon } from "@/components/tools/tool-icon";
import { searchSlim, type SlimTool } from "@/lib/tools/search-index";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { localizedPath } from "@/lib/i18n/routes";

interface SearchPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  index: SlimTool[];
}

/** The search dialog itself: loaded on first open so the Radix dialog stays out of the initial bundle. */
export function SearchPanel({ open, onOpenChange, index }: SearchPanelProps) {
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const router = useRouter();
  const inputId = React.useId();
  const listId = React.useId();

  const results: SlimTool[] = React.useMemo(() => {
    if (query.trim().length === 0) return index.slice(0, 8);
    return searchSlim(index, query, 8);
  }, [query, index]);

  const setOpen = onOpenChange;
  const go = (tool: SlimTool) => {
    setOpen(false);
    setQuery("");
    router.push(tool.path);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      const tool = results[activeIndex];
      if (tool) {
        e.preventDefault();
        go(tool);
      } else if (query.trim()) {
        setOpen(false);
        router.push(`${localizedPath("/outils/")}?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[12%] translate-y-0 gap-0 p-0"
        showCloseButton={false}
        size="md"
      >
        <DialogTitle className="sr-only">{t.nav.search}</DialogTitle>
        <DialogDescription className="sr-only">{t.directory.subtitle}</DialogDescription>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            id={inputId}
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={
              results[activeIndex] ? `${listId}-${results[activeIndex]!.id}` : undefined
            }
            aria-autocomplete="list"
            autoComplete="off"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={t.nav.searchPlaceholder}
            className="h-12 w-full bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
            data-testid="search-input"
          />
        </div>
        <ul
          id={listId}
          role="listbox"
          aria-label={t.nav.search}
          className="max-h-80 overflow-y-auto p-2"
        >
          {results.length === 0 ? (
            <li
              className="px-3 py-6 text-center text-sm text-muted-foreground"
              role="option"
              aria-selected={false}
            >
              {t.directory.noResultsTitle}
            </li>
          ) : (
            results.map((tool, index) => (
              <li
                key={tool.id}
                id={`${listId}-${tool.id}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(tool)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm",
                  index === activeIndex ? "bg-muted" : "",
                )}
                data-testid="search-result"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-accent-foreground">
                  <ToolIcon name={tool.icon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{tool.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {tool.shortDescription}
                  </span>
                </span>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
