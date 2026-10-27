"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n/routes";

/** The single, large search field of the home page: submits to the catalogue. */
export function HomeSearch({ toolCount }: { toolCount: number }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    const catalog = localizedPath("/outils/");
    router.push(trimmed ? `${catalog}?q=${encodeURIComponent(trimmed)}` : catalog);
  };

  return (
    <form role="search" onSubmit={onSubmit} className="relative mx-auto max-w-xl">
      <label htmlFor="home-search" className="sr-only">
        {t.nav.search}
      </label>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id="home-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.home.searchPlaceholder(toolCount)}
        className="h-[52px] w-full rounded-[16px] border border-border bg-surface pl-12 pr-[116px] text-base shadow-md outline-hidden transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring"
        autoComplete="off"
        data-testid="home-search"
      />
      <Button
        type="submit"
        className="absolute right-1.5 top-1/2 h-10 -translate-y-1/2 rounded-[12px] px-4"
      >
        {t.home.searchButton}
      </Button>
    </form>
  );
}
