"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolIcon } from "@/components/tools/tool-icon";
import { ToolCard } from "@/components/tools/tool-card";
import { AdSlot } from "@/components/monetization/ad-slot";
import {
  getPublishedTools,
  getToolsByCategory,
  searchTools,
  toolCategories,
  toolRegistry,
  type ToolCategory,
  type ToolDefinition,
} from "@/lib/tools";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const publishedTools = getPublishedTools();
const activeCategories = toolCategories.filter((c) => getToolsByCategory(c.id).length > 0);
const plannedCategories = toolCategories.filter((c) => getToolsByCategory(c.id).length === 0);
const SECTION_LIMIT = 8;

/** Suggest tools for a query that matched nothing, searching planned tools as a hint only. */
function suggestAlternatives(query: string): ToolDefinition[] {
  const planned = searchTools(
    toolRegistry.filter((x) => x.status === "planned"),
    query,
    3,
  ).map((r) => r.tool);
  const sameCategory = planned.flatMap((p) => getToolsByCategory(p.category));
  const popular = publishedTools.filter((x) => x.featured);
  const merged = [...sameCategory, ...popular];
  return merged.filter((tool, i) => merged.findIndex((x) => x.id === tool.id) === i).slice(0, 4);
}

export function ToolCatalog({ initialCategory }: { initialCategory?: ToolCategory["id"] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = React.useState(urlQuery);
  const [lastUrlQuery, setLastUrlQuery] = React.useState(urlQuery);
  const [category, setCategory] = React.useState<string>(initialCategory ?? "all");
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resultsId = React.useId();

  // Follow the URL when it changes (e.g. header search submits ?q=), without an effect.
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const trimmed = query.trim();
  const isFiltering = trimmed.length > 0 || category !== "all";

  const results = React.useMemo(() => {
    const pool =
      category === "all" ? publishedTools : publishedTools.filter((x) => x.category === category);
    if (trimmed.length === 0) return pool;
    return searchTools(pool, trimmed).map((r) => r.tool);
  }, [category, trimmed]);

  const alternatives = React.useMemo(
    () => (results.length === 0 && trimmed ? suggestAlternatives(trimmed) : []),
    [results.length, trimmed],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    router.replace(trimmed ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  };

  const reset = () => {
    setQuery("");
    setCategory("all");
    router.replace(pathname, { scroll: false });
    inputRef.current?.focus();
  };

  const countFor = (id: string) =>
    id === "all" ? publishedTools.length : publishedTools.filter((x) => x.category === id).length;

  const categoryButton = (id: string, label: string, icon?: ToolCategory["icon"]) => (
    <button
      key={id}
      type="button"
      onClick={() => setCategory(id)}
      aria-pressed={category === id}
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors lg:w-full lg:rounded-[10px] lg:border-transparent lg:px-3",
        category === id
          ? "border-primary bg-primary text-primary-foreground lg:bg-primary-soft lg:text-accent-foreground"
          : "border-border bg-surface text-foreground hover:bg-muted lg:bg-transparent",
      )}
      data-testid={`category-chip-${id}`}
    >
      {icon ? <ToolIcon name={icon} className="size-4 opacity-80" /> : null}
      <span className="flex-1 text-left">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-[11px] tabular-nums",
          category === id ? "bg-white/20 lg:bg-primary/15" : "bg-muted text-muted-foreground",
        )}
      >
        {countFor(id)}
      </span>
    </button>
  );

  return (
    <div className="space-y-8" id="outils">
      <form role="search" onSubmit={onSubmit} className="relative">
        <label htmlFor="catalog-search" className="sr-only">
          {t.nav.search}
        </label>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="catalog-search"
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.home.searchPlaceholder(publishedTools.length)}
          className="h-[52px] w-full rounded-[16px] border border-border bg-surface pl-12 pr-[116px] text-base shadow-md outline-hidden transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring"
          autoComplete="off"
          aria-controls={resultsId}
          data-testid="catalog-search"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Effacer la recherche"
            className="absolute right-[100px] top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
        <Button
          type="submit"
          className="absolute right-1.5 top-1/2 h-10 -translate-y-1/2 rounded-[12px] px-4"
        >
          {t.home.searchButton}
        </Button>
      </form>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[210px_1fr]">
        <nav
          aria-label={t.nav.categories}
          className="min-w-0 lg:sticky lg:top-[calc(var(--header-height)+16px)] lg:self-start"
        >
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
            {categoryButton("all", t.directory.filterAll)}
            {activeCategories.map((c) => categoryButton(c.id, c.shortName, c.icon))}
          </div>
          {plannedCategories.length ? (
            <div className="mt-6 hidden lg:block">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.directory.plannedTitle}
              </p>
              <ul className="space-y-1">
                {plannedCategories.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground"
                  >
                    <ToolIcon name={c.icon} className="size-4 opacity-60" />
                    <span className="flex-1">{c.shortName}</span>
                    <span className="rounded-full bg-muted px-1.5 text-[11px]">
                      {t.common.soon}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </nav>

        <div id={resultsId} className="min-w-0 space-y-9" aria-live="polite">
          {isFiltering ? (
            results.length > 0 ? (
              <section aria-labelledby="results-heading">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 id="results-heading" className="text-lg">
                    {trimmed
                      ? `Résultats pour « ${trimmed} »`
                      : (activeCategories.find((c) => c.id === category)?.name ??
                        t.directory.title)}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {t.directory.resultsCount(results.length)}
                  </span>
                </div>
                <ToolGrid tools={results} />
              </section>
            ) : (
              <div
                className="rounded-[20px] border border-dashed border-border p-10 text-center"
                data-testid="no-results"
              >
                <h2 className="text-lg">{t.directory.noResultsTitle}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  {alternatives.length ? t.directory.noResultsBody : t.directory.noResultsEmpty}
                </p>
                {alternatives.length ? (
                  <div className="mt-6 text-left">
                    <ToolGrid tools={alternatives} />
                  </div>
                ) : null}
                <Button variant="outline" className="mt-6" onClick={reset}>
                  Réinitialiser la recherche
                </Button>
              </div>
            )
          ) : (
            <>
              {activeCategories.map((c) => {
                const tools = publishedTools.filter((x) => x.category === c.id);
                const isExpanded = expanded[c.id] ?? false;
                const visible = isExpanded ? tools : tools.slice(0, SECTION_LIMIT);
                return (
                  <section key={c.id} aria-labelledby={`cat-${c.id}`}>
                    <div className="mb-4 flex items-baseline justify-between gap-3">
                      <h2 id={`cat-${c.id}`} className="text-lg">
                        <Link href={`/${c.slug}/`} className="hover:text-link">
                          {c.name}
                        </Link>
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        {t.directory.resultsCount(tools.length)}
                      </span>
                    </div>
                    <ToolGrid tools={visible} />
                    {tools.length > SECTION_LIMIT ? (
                      <Button
                        variant="link"
                        className="mt-2 px-0"
                        onClick={() => setExpanded((s) => ({ ...s, [c.id]: !isExpanded }))}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? "Réduire" : `Voir les ${tools.length}`}
                      </Button>
                    ) : null}
                  </section>
                );
              })}
            </>
          )}
          <AdSlot placement="directory-footer" />
        </div>
      </div>
    </div>
  );
}

function ToolGrid({ tools }: { tools: ToolDefinition[] }) {
  return (
    <ul
      className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]"
      data-testid="tool-grid"
    >
      {tools.map((tool) => (
        <li key={tool.id}>
          <ToolCard tool={tool} />
        </li>
      ))}
    </ul>
  );
}
