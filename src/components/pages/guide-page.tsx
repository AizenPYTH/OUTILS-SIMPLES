import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { AdPlacement } from "@/components/monetization/ad-placement";
import { Button } from "@/components/ui/button";
import { ToolCard } from "@/components/tools/tool-card";
import { siteConfig, absoluteUrl } from "@/config/site";
import type { Guide } from "@/lib/content/guides";
import { getRelatedTools, getToolById, getToolPath } from "@/lib/tools";
import { getDictionary, getLocale, t } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n/routes";

export function GuidePage({ guide }: { guide: Guide }) {
  const locale = getLocale();
  const base = localizedPath("/guides/");
  const tool = getToolById(guide.toolId);
  // Two columns: an even number of cards so that none is left alone on its row.
  const relatedAll = tool ? getRelatedTools(tool, 4) : [];
  const related =
    relatedAll.length > 1
      ? relatedAll.slice(0, relatedAll.length - (relatedAll.length % 2))
      : relatedAll;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    inLanguage: locale,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    mainEntityOfPage: absoluteUrl(`${base}${guide.slug}/`),
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
  };
  const updated = new Intl.DateTimeFormat(getDictionary(locale).site.languageTag, {
    dateStyle: "long",
  }).format(new Date(guide.updatedAt));

  return (
    <div className="container-page py-8 sm:py-10">
      <JsonLd data={jsonLd} />
      <Breadcrumbs
        items={[
          { name: t.nav.home, path: localizedPath("/") },
          { name: t.nav.guides, path: base },
          { name: guide.title, path: `${base}${guide.slug}/` },
        ]}
      />
      <article className="mx-auto mt-6 max-w-3xl">
        <h1 className="text-[clamp(30px,4vw,44px)] leading-[1.08]">{guide.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{guide.intro}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t.guidesPage.updatedOn(updated)}</p>
        {tool && tool.status === "published" ? (
          <Button asChild size="lg" className="mt-6">
            <Link href={getToolPath(tool)}>
              {t.legal.openTool(tool.name)}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
        <div className="mt-10 space-y-10 text-[16px] leading-relaxed">
          {guide.sections.map((section, index) => (
            <React.Fragment key={section.heading}>
              {/* Optional advertising placement between sections of long guides only. */}
              {index === 2 && guide.sections.length >= 3 ? (
                <AdPlacement placement="guide-inline" />
              ) : null}
              <section>
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
            </React.Fragment>
          ))}
        </div>
        {tool && tool.status === "published" ? (
          <section className="mt-12 rounded-[16px] border border-border bg-muted/50 p-6">
            <h2 className="text-xl">{t.guidesPage.takeAction}</h2>
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
        <AdPlacement placement="guide-end" className="mt-12" />
      </article>
    </div>
  );
}
