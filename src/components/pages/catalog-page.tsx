import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ToolCatalog } from "@/components/tools/tool-catalog";
import { getPublishedTools } from "@/lib/tools";
import { t } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n/routes";

/** The full catalogue: every published tool, searchable and filterable by category. */
export function CatalogPage() {
  const count = getPublishedTools().length;
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { name: t.nav.home, path: localizedPath("/") },
          { name: t.directory.title, path: localizedPath("/outils/") },
        ]}
      />
      <div className="mb-6 mt-4">
        <h1 className="text-[clamp(28px,4vw,40px)] leading-[1.1]">{t.directory.title}</h1>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          {t.directory.subtitleWithCount(count)}
        </p>
      </div>
      <Suspense fallback={<div className="h-[52px] rounded-[16px] bg-muted" aria-hidden="true" />}>
        <ToolCatalog />
      </Suspense>
    </div>
  );
}
