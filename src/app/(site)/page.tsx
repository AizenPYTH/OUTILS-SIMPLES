import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { HomeSearch } from "@/components/tools/home-search";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolIcon } from "@/components/tools/tool-icon";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebsiteJsonLd } from "@/lib/seo";
import {
  getActiveCategories,
  getCategoryPath,
  getPublishedTools,
  getToolsByCategory,
} from "@/lib/tools";
import { t } from "@/lib/i18n";

/**
 * Home: one title, one search field, the popular tools, the categories and a
 * link to the full catalogue (/outils/). Principle 1 and 3 of docs/DESIGN_PRINCIPES.md.
 */
export default function HomePage() {
  const tools = getPublishedTools();
  const popular = tools.filter((tool) => tool.featured).slice(0, 9);
  const categories = getActiveCategories();

  return (
    <div className="container-page py-10 sm:py-14">
      <JsonLd data={buildWebsiteJsonLd()} />
      <section className="mx-auto max-w-2xl text-center" aria-labelledby="home-title">
        <h1 id="home-title" className="text-[clamp(30px,5vw,48px)] leading-[1.08]">
          {t.home.heroTitle}
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">{t.home.heroSubtitle}</p>
        <div className="mt-6">
          <HomeSearch toolCount={tools.length} />
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-success-foreground">
          <ShieldCheck className="size-4" aria-hidden="true" />
          {t.home.privacyTitle}
          <Link href="/confidentialite/" className="underline underline-offset-2">
            {t.common.learnMore}
          </Link>
        </p>
      </section>

      <section className="mt-12 sm:mt-16" aria-labelledby="popular-heading">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="popular-heading" className="text-xl">
            {t.home.featuredTitle}
          </h2>
          <Link
            href="/outils/"
            className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline"
          >
            {t.home.allToolsLink(tools.length)}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <ul
          className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]"
          data-testid="tool-grid"
        >
          {popular.map((tool) => (
            <li key={tool.id}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 sm:mt-16" aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="mb-4 text-xl">
          {t.home.categoriesTitle}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="home-categories">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={getCategoryPath(category)}
                className="flex h-full items-center gap-3 rounded-[14px] border border-border bg-surface p-4 transition-colors hover:border-primary hover:bg-primary-soft/40"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-link">
                  <ToolIcon name={category.icon} className="size-5" strokeWidth={1.7} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{category.shortName}</span>
                  <span className="block text-sm text-muted-foreground">
                    {t.directory.resultsCount(getToolsByCategory(category.id).length)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 text-center">
          <Link
            href="/outils/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover"
            data-testid="home-all-tools"
          >
            {t.home.heroCta}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="mt-14 sm:mt-20" aria-labelledby="how-heading">
        <h2 id="how-heading" className="mb-4 text-xl">
          {t.home.howTitle}
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {t.home.howSteps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-link">
                {i + 1}
              </span>
              <span>
                <span className="block font-semibold">{step.title}</span>
                <span className="block text-sm text-muted-foreground">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
