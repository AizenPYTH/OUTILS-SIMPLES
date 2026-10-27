import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { guides } from "@/lib/content/guides";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guides.find((g) => g.slug === slug);
  return ogImage({
    kicker: "Guide pratique",
    title: guide?.title ?? "Guide",
    subtitle: guide?.description,
  });
}
