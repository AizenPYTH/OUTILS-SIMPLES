import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuidePage } from "@/components/pages/guide-page";
import { alternateGuideSlug, getGuideBySlug, getGuides } from "@/lib/content/guides";
import { setRequestLocale } from "@/lib/i18n/locale";
import { buildPageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getGuides("en").map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/en/guides/[slug]">): Promise<Metadata> {
  setRequestLocale("en");
  const { slug } = await params;
  const guide = getGuideBySlug(slug, "en");
  if (!guide) return {};
  const fr = alternateGuideSlug(guide, "fr");
  return buildPageMetadata({
    genericShareImage: false,
    title: guide.seoTitle,
    description: guide.description,
    path: `/en/guides/${guide.slug}/`,
    type: "article",
    alternates: { en: `/en/guides/${guide.slug}/`, ...(fr ? { fr: `/guides/${fr}/` } : {}) },
    locale: "en",
  });
}

export default async function Page({ params }: PageProps<"/en/guides/[slug]">) {
  setRequestLocale("en");
  const { slug } = await params;
  const guide = getGuideBySlug(slug, "en");
  if (!guide) notFound();
  return <GuidePage guide={guide} />;
}
