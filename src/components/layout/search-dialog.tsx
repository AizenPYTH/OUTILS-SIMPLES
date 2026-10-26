"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SlimTool } from "@/lib/tools/search-index";
import { t } from "@/lib/i18n";

const SearchPanel = dynamic(() => import("./search-panel").then((m) => m.SearchPanel), {
  ssr: false,
});

interface SearchDialogProps {
  variant?: "field" | "icon";
  /** Slim list of published tools, built on the server (keeps the registry out of the bundle). */
  index: SlimTool[];
}

/**
 * Header search: the triggers are rendered on the server; the dialog (Radix,
 * ranking, icons) is downloaded the first time it opens or on Ctrl/⌘+K.
 */
export function SearchDialog({ variant = "field", index }: SearchDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const show = React.useCallback((next: boolean) => {
    if (next) setLoaded(true);
    setOpen(next);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setLoaded(true);
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {variant === "field" ? (
        <button
          type="button"
          onClick={() => show(true)}
          className="hidden h-10 min-w-0 flex-1 basis-28 max-w-sm items-center gap-2 rounded-md border border-input bg-surface px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-muted md:flex"
          data-testid="search-trigger"
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="flex-1 truncate text-left">{t.nav.search}</span>
          <kbd
            aria-hidden="true"
            className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline"
          >
            {t.nav.searchShortcutHint}
          </kbd>
        </button>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className={variant === "field" ? "md:hidden" : ""}
        onClick={() => show(true)}
        aria-label={t.nav.search}
        data-testid="search-trigger-mobile"
      >
        <Search className="size-5" aria-hidden="true" />
      </Button>

      {loaded ? <SearchPanel open={open} onOpenChange={show} index={index} /> : null}
    </>
  );
}
