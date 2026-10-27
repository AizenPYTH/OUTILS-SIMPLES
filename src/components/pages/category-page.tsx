import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ToolCatalog } from "@/components/tools/tool-catalog";
import { getCategoryPath, type ToolCategory } from "@/lib/tools";
import { t } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n/routes";

export function CategoryPage({ category }: { category: ToolCategory }) {
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { name: t.nav.home, path: localizedPath("/") },
          { name: category.name, path: getCategoryPath(category) },
        ]}
      />
      <div className="mb-8 mt-4">
        <h1 className="text-[clamp(32px,4.4vw,52px)] leading-[1.05]">{category.name}</h1>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground sm:text-lg">
          {category.description}
        </p>
      </div>
      <ToolCatalog initialCategory={category.id} />
    </div>
  );
}
