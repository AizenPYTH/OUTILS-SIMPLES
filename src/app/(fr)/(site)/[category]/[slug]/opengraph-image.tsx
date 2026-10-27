import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { getCategoryById, getOperationalTools, getToolByPath, getToolPath } from "@/lib/tools";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getOperationalTools().map((tool) => {
    const [, category, slug] = getToolPath(tool).split("/");
    return { category: category!, slug: slug! };
  });
}

export default async function Image({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const tool = getToolByPath(category, slug);
  const family = tool ? getCategoryById(tool.category) : undefined;
  return ogImage({
    kicker: family?.name,
    title: tool?.name ?? "Outil en ligne",
    subtitle: tool?.shortDescription,
  });
}
