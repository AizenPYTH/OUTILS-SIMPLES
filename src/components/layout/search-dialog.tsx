"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ToolIcon } from "@/components/tools/tool-icon";
import { getPublishedTools, getToolPath, searchTools, type ToolDefinition } from "@/lib/tools";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const publishedTools = getPublishedTools();

export function SearchDialog({ variant = "field" }: { variant?: "field" | "icon" }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const router = useRouter();
  const inputId = React.useId();
  const listId = React.useId();

  const results: ToolDefinition[] = React.useMemo(() => {
    if (query.trim().length === 0) return publishedTools.slice(0, 8);
    return searchTools(publishedTools, query, 8).map((r) => r.tool);
  }, [query]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (tool: ToolDefinition) => {
    setOpen(false);
    setQuery("");
    router.push(getToolPath(tool));
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
        router.push(`/outils/?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  return (
    <>
      {variant === "field" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hidden h-10 min-w-0 flex-1 basis-28 max-w-sm items-center gap-2 rounded-md border border-input bg-surface px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-muted md:flex"
          aria-label={t.nav.search}
          data-testid="search-trigger"
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="flex-1 truncate text-left">{t.nav.search}</span>
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline">
            {t.nav.searchShortcutHint}
          </kbd>
        </button>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className={variant === "field" ? "md:hidden" : ""}
        onClick={() => setOpen(true)}
        aria-label={t.nav.search}
        data-testid="search-trigger-mobile"
      >
        <Search className="size-5" aria-hidden="true" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
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
    </>
  );
}
