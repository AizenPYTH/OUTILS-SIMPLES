import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ToolCatalog } from "@/components/tools/tool-catalog";
import { getActiveCategories, getCategoryBySlug, getToolsByCategory } from "@/lib/tools";
import { buildCategoryMetadata } from "@/lib/seo";
import { t } from "@/lib/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return getActiveCategories().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category || getToolsByCategory(category.id).length === 0) return {};
  return buildCategoryMetadata(category);
}

export default async function CategoryPage({ params }: PageProps<"/[category]">) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category || getToolsByCategory(category.id).length === 0) notFound();

  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ name: t.nav.home, path: "/" }, { name: category.name, path: `/${category.slug}/` }]} />
      <div className="mb-8 mt-4">
        <h1 className="text-[clamp(32px,4.4vw,52px)] leading-[1.05]">{category.name}</h1>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground sm:text-lg">{category.description}</p>
      </div>
      <Suspense fallback={<div className="h-[52px] rounded-[16px] bg-muted" aria-hidden="true" />}>
        <ToolCatalog initialCategory={category.id} />
      </Suspense>
    </div>
  );
}
