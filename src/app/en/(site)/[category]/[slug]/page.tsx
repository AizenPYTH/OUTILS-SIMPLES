import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolPage } from "@/components/pages/tool-page";
import { setRequestLocale } from "@/lib/i18n/locale";
import { getCategoryBySlug, getOperationalTools, getToolByPath, getToolPath } from "@/lib/tools";
import { buildToolMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getOperationalTools("en").map((tool) => {
    const [, , category, slug] = getToolPath(tool, "en").split("/");
    return { category: category!, slug: slug! };
  });
}

export async function generateMetadata({
  params,
}: PageProps<"/en/[category]/[slug]">): Promise<Metadata> {
  setRequestLocale("en");
  const { category, slug } = await params;
  const tool = getToolByPath(category, slug, "en");
  if (!tool || tool.status === "planned") return {};
  return buildToolMetadata(tool, "en");
}

export default async function Page({ params }: PageProps<"/en/[category]/[slug]">) {
  setRequestLocale("en");
  const { category: categorySlug, slug } = await params;
  const tool = getToolByPath(categorySlug, slug, "en");
  const category = getCategoryBySlug(categorySlug, "en");
  if (!tool || !category || tool.status === "planned") notFound();
  return <ToolPage tool={tool} category={category} />;
}
