"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchField } from "@/components/tools/search-field";
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
    <SearchField
      id="home-search"
      label={t.nav.search}
      buttonLabel={t.home.searchButton}
      onSubmit={onSubmit}
      formClassName="mx-auto max-w-xl"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder={t.home.searchPlaceholder(toolCount)}
      data-testid="home-search"
    />
  );
}
