import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolPageLayout } from "@/components/tools/tool-page-layout";
import { ToolRenderer } from "@/components/tools/tool-renderer";
import { getCategoryBySlug, getOperationalTools, getToolByPath, getToolPath } from "@/lib/tools";
import { buildToolMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getOperationalTools().map((tool) => {
    const [, category, slug] = getToolPath(tool).split("/");
    return { category: category!, slug: slug! };
  });
}

export async function generateMetadata({
  params,
}: PageProps<"/[category]/[slug]">): Promise<Metadata> {
  const { category, slug } = await params;
  const tool = getToolByPath(category, slug);
  if (!tool || tool.status === "planned") return {};
  return buildToolMetadata(tool);
}

export default async function ToolPage({ params }: PageProps<"/[category]/[slug]">) {
  const { category: categorySlug, slug } = await params;
  const tool = getToolByPath(categorySlug, slug);
  const category = getCategoryBySlug(categorySlug);
  if (!tool || !category || tool.status === "planned") notFound();

  return (
    <ToolPageLayout tool={tool} category={category}>
      <ToolRenderer toolId={tool.id} />
    </ToolPageLayout>
  );
}
