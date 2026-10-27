import "@/lib/i18n/register-en";
import "@/lib/i18n/register-en-registry";
import { ogImage, OG_CONTENT_TYPE, OG_FOOTER_EN, OG_SIZE } from "@/lib/og";
import { getActiveCategories, getCategoryBySlug, getToolsByCategory } from "@/lib/tools";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getActiveCategories("en").map((category) => ({ category: category.slug }));
}

export default async function Image({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug, "en");
  const count = category ? getToolsByCategory(category.id, true, "en").length : 0;
  return ogImage({
    kicker: `${count} tool${count > 1 ? "s" : ""}`,
    title: category?.name ?? "Online tools",
    subtitle: category?.description,
    footer: OG_FOOTER_EN,
  });
}
