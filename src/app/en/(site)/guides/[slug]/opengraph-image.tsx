import "@/lib/i18n/register-en";
import "@/lib/i18n/register-en-registry";
import { ogImage, OG_CONTENT_TYPE, OG_FOOTER_EN, OG_SIZE } from "@/lib/og";
import { getGuides } from "@/lib/content/guides";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getGuides("en").map((guide) => ({ slug: guide.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuides("en").find((g) => g.slug === slug);
  return ogImage({
    kicker: "Practical guide",
    title: guide?.title ?? "Guide",
    subtitle: guide?.description,
    footer: OG_FOOTER_EN,
  });
}
