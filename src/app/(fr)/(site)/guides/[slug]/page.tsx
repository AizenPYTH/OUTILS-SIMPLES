import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuidePage } from "@/components/pages/guide-page";
import { alternateGuideSlug, getGuideBySlug, getGuides } from "@/lib/content/guides";
import { buildPageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getGuides("fr").map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug, "fr");
  if (!guide) return {};
  const en = alternateGuideSlug(guide, "en");
  return buildPageMetadata({
    genericShareImage: false,
    title: guide.seoTitle,
    description: guide.description,
    path: `/guides/${guide.slug}/`,
    type: "article",
    alternates: { fr: `/guides/${guide.slug}/`, ...(en ? { en: `/en/guides/${en}/` } : {}) },
    locale: "fr",
  });
}

export default async function Page({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug, "fr");
  if (!guide) notFound();
  return <GuidePage guide={guide} />;
}
