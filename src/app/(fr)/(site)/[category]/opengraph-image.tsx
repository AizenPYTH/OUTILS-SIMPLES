import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { getActiveCategories, getCategoryBySlug, getToolsByCategory } from "@/lib/tools";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getActiveCategories().map((category) => ({ category: category.slug }));
}

export default async function Image({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  const count = category ? getToolsByCategory(category.id).length : 0;
  return ogImage({
    kicker: `${count} outil${count > 1 ? "s" : ""}`,
    title: category?.name ?? "Outils en ligne",
    subtitle: category?.description,
  });
}
