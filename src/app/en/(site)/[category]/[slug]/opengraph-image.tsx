import "@/lib/i18n/register-en";
import "@/lib/i18n/register-en-registry";
import { ogImage, OG_CONTENT_TYPE, OG_FOOTER_EN, OG_SIZE } from "@/lib/og";
import { getCategoryById, getOperationalTools, getToolByPath, getToolPath } from "@/lib/tools";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getOperationalTools("en").map((tool) => {
    const [, , category, slug] = getToolPath(tool, "en").split("/");
    return { category: category!, slug: slug! };
  });
}

export default async function Image({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const tool = getToolByPath(category, slug, "en");
  const family = tool ? getCategoryById(tool.category, "en") : undefined;
  return ogImage({
    kicker: family?.name,
    title: tool?.name ?? "Online tool",
    subtitle: tool?.shortDescription,
    footer: OG_FOOTER_EN,
  });
}
