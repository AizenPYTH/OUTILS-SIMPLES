"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SearchX, X } from "lucide-react";
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
  getCategoryPath,
} from "@/lib/tools";
import { categoryTone, getToolGroups } from "@/lib/tools/groups";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n/messages";

// Read at render time (not at module evaluation): the English registry is
// registered by a sibling client module whose evaluation order is not fixed.
function catalogData() {
  const publishedTools = getPublishedTools();
  return {
    publishedTools,
    activeCategories: toolCategories.filter((c) => getToolsByCategory(c.id).length > 0),
    plannedCategories: toolCategories.filter((c) => getToolsByCategory(c.id).length === 0),
    popularTools: publishedTools.filter((x) => x.featured).slice(0, 8),
  };
}

/** Suggest tools for a query that matched nothing, searching planned tools as a hint only. */
function suggestAlternatives(query: string): ToolDefinition[] {
  const planned = searchTools(
    toolRegistry.filter((x) => x.status === "planned"),
    query,
    3,
  ).map((r) => r.tool);
  const sameCategory = planned.flatMap((p) => getToolsByCategory(p.category));
  const popular = getPublishedTools().filter((x) => x.featured);
  const merged = [...sameCategory, ...popular];
  return merged.filter((tool, i) => merged.findIndex((x) => x.id === tool.id) === i).slice(0, 4);
}

/** Tools of a category split into its sub-groups; ungrouped tools fall into "Autres". */
function groupsOf(category: ToolCategory, tools: ToolDefinition[]) {
  const groups = getToolGroups(category.id);
  if (groups.length === 0) return [{ name: null, tools }];
  const used = new Set<string>();
  const out = groups
    .map((g) => {
      const members = g.ids
        .map((id) => tools.find((x) => x.id === id))
        .filter((x): x is ToolDefinition => !!x);
      members.forEach((m) => used.add(m.id));
      return { name: g.name as string | null, tools: members };
    })
    .filter((g) => g.tools.length > 0);
  const rest = tools.filter((x) => !used.has(x.id));
  if (rest.length) out.push({ name: "Autres", tools: rest });
  return out;
}

/**
 * Mirrors the `?q=` search parameter into the catalogue's state. Kept in its
 * own Suspense boundary: `useSearchParams` makes its nearest boundary render
 * on the client only, so isolating it here lets the whole tool list be
 * prerendered (indexable HTML, no layout shift) while the query still applies
 * after hydration and follows header searches.
 */
function UrlQuerySync({ onChange }: { onChange: (query: string) => void }) {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  React.useEffect(() => {
    onChange(urlQuery);
  }, [urlQuery, onChange]);
  return null;
}

export function ToolCatalog({ initialCategory }: { initialCategory?: ToolCategory["id"] }) {
  const { publishedTools, activeCategories, plannedCategories, popularTools } = React.useMemo(
    () => catalogData(),
    [],
  );
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>(initialCategory ?? "all");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resultsId = React.useId();

  const trimmed = query.trim();
  const isFiltering = trimmed.length > 0 || category !== "all";

  const results = React.useMemo(() => {
    const pool =
      category === "all" ? publishedTools : publishedTools.filter((x) => x.category === category);
    if (trimmed.length === 0) return pool;
    return searchTools(pool, trimmed).map((r) => r.tool);
  }, [category, trimmed, publishedTools]);

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

  const categoryButton = (id: string, label: string, icon?: ToolCategory["icon"]) => {
    const tone = id === "all" ? null : categoryTone[id as ToolCategory["id"]];
    const active = category === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setCategory(id)}
        aria-pressed={active}
        className={cn(
          "flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors lg:h-11 lg:w-full lg:rounded-[10px] lg:border-transparent lg:px-2.5",
          active
            ? "border-primary bg-primary text-primary-foreground lg:bg-primary-soft lg:text-accent-foreground"
            : "border-border bg-surface text-foreground hover:bg-muted lg:bg-transparent",
        )}
        data-testid={`category-chip-${id}`}
      >
        {icon ? (
          <span
            className={cn(
              "hidden size-7 items-center justify-center rounded-[8px] lg:flex",
              tone?.tile,
            )}
          >
            <ToolIcon name={icon} className="size-4" />
          </span>
        ) : null}
        {icon ? <ToolIcon name={icon} className="size-4 opacity-80 lg:hidden" /> : null}
        <span className="flex-1 text-left">{label}</span>
        <span
          className={cn(
            "rounded-full px-1.5 text-[11px] tabular-nums",
            active ? "bg-black/15 lg:bg-primary/15" : "bg-muted text-muted-foreground",
          )}
        >
          {countFor(id)}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-8" id="outils">
      <React.Suspense fallback={null}>
        <UrlQuerySync onChange={setQuery} />
      </React.Suspense>
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
            aria-label={tr("Effacer la recherche")}
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

      <div className="grid min-w-0 gap-6 lg:grid-cols-[230px_1fr]">
        <nav
          aria-label={t.nav.categories}
          className="min-w-0 lg:sticky lg:top-[calc(var(--header-height)+16px)] lg:self-start"
        >
          <p className="section-label mb-2 hidden px-2.5 lg:block">{t.nav.categories}</p>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
            {categoryButton("all", t.directory.filterAll)}
            {activeCategories.map((c) => categoryButton(c.id, c.shortName, c.icon))}
          </div>
          {plannedCategories.length ? (
            <div className="mt-6 hidden lg:block">
              <p className="section-label mb-2 px-2.5">{t.directory.plannedTitle}</p>
              <ul className="space-y-1">
                {plannedCategories.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-muted-foreground"
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

        <div id={resultsId} className="min-w-0 space-y-10" aria-live="polite">
          {isFiltering ? (
            results.length > 0 ? (
              <section aria-labelledby="results-heading">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 id="results-heading" className="text-xl">
                    {trimmed
                      ? tr("Résultats pour « {query} »", { query: trimmed })
                      : (activeCategories.find((c) => c.id === category)?.name ??
                        t.directory.title)}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {t.directory.resultsCount(results.length)}
                  </span>
                </div>
                {trimmed ? (
                  <ToolGrid tools={results} />
                ) : (
                  <GroupedCategory
                    category={activeCategories.find((c) => c.id === category)!}
                    tools={results}
                  />
                )}
              </section>
            ) : (
              <div
                className="rounded-[20px] border border-dashed border-border bg-surface p-10 text-center"
                data-testid="no-results"
              >
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <SearchX className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-lg">{t.directory.noResultsTitle}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  {alternatives.length ? t.directory.noResultsBody : t.directory.noResultsEmpty}
                </p>
                {alternatives.length ? (
                  <div className="mt-6 text-left">
                    <ToolGrid tools={alternatives} />
                  </div>
                ) : null}
                <Button variant="outline" className="mt-6" onClick={reset}>
                  {tr("Réinitialiser la recherche")}
                </Button>
              </div>
            )
          ) : (
            <>
              <section aria-labelledby="popular-heading">
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h2 id="popular-heading" className="text-xl">
                    {t.home.featuredTitle}
                  </h2>
                </div>
                <ToolGrid tools={popularTools} />
              </section>
              {activeCategories.map((c) => {
                const tools = publishedTools.filter((x) => x.category === c.id);
                return (
                  <section key={c.id} aria-labelledby={`cat-${c.id}`}>
                    <div className="mb-4 flex items-baseline justify-between gap-3">
                      <h2 id={`cat-${c.id}`} className="flex items-center gap-2 text-xl">
                        <span
                          className={cn(
                            "flex size-8 items-center justify-center rounded-[8px]",
                            categoryTone[c.id].tile,
                          )}
                        >
                          <ToolIcon name={c.icon} className="size-4" />
                        </span>
                        <Link href={getCategoryPath(c)} className="hover:text-link">
                          {c.name}
                        </Link>
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        {t.directory.resultsCount(tools.length)}
                      </span>
                    </div>
                    <GroupedCategory category={c} tools={tools} />
                  </section>
                );
              })}
            </>
          )}
          {initialCategory ? <AdSlot placement="category-inline" /> : null}
        </div>
      </div>
    </div>
  );
}

function GroupedCategory({ category, tools }: { category: ToolCategory; tools: ToolDefinition[] }) {
  const groups = groupsOf(category, tools);
  if (groups.length === 1) return <ToolGrid tools={groups[0]!.tools} />;
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.name ?? "all"}>
          <h3 className="section-label mb-2.5">{group.name}</h3>
          <ToolGrid tools={group.tools} />
        </div>
      ))}
    </div>
  );
}

function ToolGrid({ tools }: { tools: ToolDefinition[] }) {
  return (
    <ul
      className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]"
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
