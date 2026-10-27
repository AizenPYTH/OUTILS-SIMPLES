import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPage } from "@/components/pages/category-page";
import { EnglishRegistryBundle } from "@/components/providers/english-registry-bundle";
import { setRequestLocale } from "@/lib/i18n/locale";
import { getActiveCategories, getCategoryBySlug, getToolsByCategory } from "@/lib/tools";
import { buildCategoryMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getActiveCategories("en").map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/en/[category]">): Promise<Metadata> {
  setRequestLocale("en");
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug, "en");
  if (!category || getToolsByCategory(category.id, true, "en").length === 0) return {};
  return buildCategoryMetadata(category, "en");
}

export default async function Page({ params }: PageProps<"/en/[category]">) {
  setRequestLocale("en");
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug, "en");
  if (!category || getToolsByCategory(category.id, true, "en").length === 0) notFound();
  return (
    <>
      <EnglishRegistryBundle />
      <CategoryPage category={category} />
    </>
  );
}
