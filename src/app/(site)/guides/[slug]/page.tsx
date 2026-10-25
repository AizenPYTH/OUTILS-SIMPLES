import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { AdSlot } from "@/components/monetization/ad-slot";
import { Button } from "@/components/ui/button";
import { ToolCard } from "@/components/tools/tool-card";
import { siteConfig, absoluteUrl } from "@/config/site";
import { getGuideBySlug, guides } from "@/lib/content/guides";
import { buildPageMetadata } from "@/lib/seo";
import { getRelatedTools, getToolById, getToolPath } from "@/lib/tools";
import { t } from "@/lib/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return {};
  return buildPageMetadata({ title: guide.seoTitle, description: guide.description, path: `/guides/${guide.slug}/`, type: "article" });
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();
  const tool = getToolById(guide.toolId);
  const related = tool ? getRelatedTools(tool, 3) : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    inLanguage: siteConfig.language,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    mainEntityOfPage: absoluteUrl(`/guides/${guide.slug}/`),
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
  };

  return (
    <div className="container-page py-8 sm:py-10">
      <JsonLd data={jsonLd} />
      <Breadcrumbs
        items={[
          { name: t.nav.home, path: "/" },
          { name: t.nav.guides, path: "/guides/" },
          { name: guide.title, path: `/guides/${guide.slug}/` },
        ]}
      />
      <article className="mx-auto mt-6 max-w-3xl">
        <h1 className="text-[clamp(30px,4vw,44px)] leading-[1.08]">{guide.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{guide.intro}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Mis à jour le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(guide.updatedAt))}
        </p>
        {tool && tool.status === "published" ? (
          <Button asChild size="lg" className="mt-6">
            <Link href={getToolPath(tool)}>
              Ouvrir l&apos;outil : {tool.name}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
        <div className="mt-10 space-y-10 text-[16px] leading-relaxed">
          {guide.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl">{section.heading}</h2>
              {section.paragraphs.map((p, i) => (
                <p key={i} className="mt-3">
                  {p}
                </p>
              ))}
              {section.list ? (
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {section.list.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
        {tool && tool.status === "published" ? (
          <section className="mt-12 rounded-[16px] border border-border bg-muted/50 p-6">
            <h2 className="text-xl">Passer à l&apos;action</h2>
            <p className="mt-2 text-sm text-muted-foreground">{tool.shortDescription}</p>
            <Button asChild className="mt-4">
              <Link href={getToolPath(tool)}>
                {tool.name}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </section>
        ) : null}
        {related.length ? (
          <section className="mt-12">
            <h2 className="text-xl">{t.tool.related}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <li key={r.id}>
                  <ToolCard tool={r} compact />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <AdSlot placement="guide-bottom" className="mt-12" />
      </article>
    </div>
  );
}
