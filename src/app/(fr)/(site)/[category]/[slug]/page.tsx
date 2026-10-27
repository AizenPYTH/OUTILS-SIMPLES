import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolPage } from "@/components/pages/tool-page";
import { getCategoryBySlug, getOperationalTools, getToolByPath, getToolPath } from "@/lib/tools";
import { buildToolMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getOperationalTools("fr").map((tool) => {
    const [, category, slug] = getToolPath(tool, "fr").split("/");
    return { category: category!, slug: slug! };
  });
}

export async function generateMetadata({
  params,
}: PageProps<"/[category]/[slug]">): Promise<Metadata> {
  const { category, slug } = await params;
  const tool = getToolByPath(category, slug, "fr");
  if (!tool || tool.status === "planned") return {};
  return buildToolMetadata(tool, "fr");
}

export default async function Page({ params }: PageProps<"/[category]/[slug]">) {
  const { category: categorySlug, slug } = await params;
  const tool = getToolByPath(categorySlug, slug, "fr");
  const category = getCategoryBySlug(categorySlug, "fr");
  if (!tool || !category || tool.status === "planned") notFound();
  return <ToolPage tool={tool} category={category} />;
}
