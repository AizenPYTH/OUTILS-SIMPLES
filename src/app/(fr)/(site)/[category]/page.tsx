import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPage } from "@/components/pages/category-page";
import { getActiveCategories, getCategoryBySlug, getToolsByCategory } from "@/lib/tools";
import { buildCategoryMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getActiveCategories("fr").map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug, "fr");
  if (!category || getToolsByCategory(category.id, true, "fr").length === 0) return {};
  return buildCategoryMetadata(category, "fr");
}

export default async function Page({ params }: PageProps<"/[category]">) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug, "fr");
  if (!category || getToolsByCategory(category.id, true, "fr").length === 0) notFound();
  return <CategoryPage category={category} />;
}
