import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Camera,
  FileText,
  ImageIcon,
  Lock,
  ScanText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HomeSearch } from "@/components/tools/home-search";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolIcon } from "@/components/tools/tool-icon";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebsiteJsonLd } from "@/lib/seo";
import { guides } from "@/lib/content/guides";
import {
  getActiveCategories,
  getCategoryPath,
  getPublishedTools,
  getToolById,
  getToolPath,
  getToolsByCategory,
} from "@/lib/tools";
import { categoryTone } from "@/lib/tools/groups";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const POPULAR_IDS = [
  "pdf-edit",
  "pdf-merge",
  "pdf-compress",
  "pdf-sign",
  "scan-document",
  "scan-ocr",
  "image-compress",
  "image-convert",
];

/**
 * Home page in ten sections (docs/DESIGN_PRINCIPES.md § C): header (layout),
 * hero with search, popular tools, families, main journeys, trust, guides,
 * FAQ, footer (layout). Never the 66 tools at once.
 */
export default function HomePage() {
  const tools = getPublishedTools();
  const popular = POPULAR_IDS.map((id) => getToolById(id)).filter(
    (tool): tool is NonNullable<typeof tool> => !!tool && tool.status === "published",
  );
  const categories = getActiveCategories();
  const path = (id: string) => {
    const tool = getToolById(id);
    return tool ? getToolPath(tool) : "/outils/";
  };
  const journeys = [
    {
      title: "Travailler sur un PDF",
      body: "Fusionner, diviser, compresser, signer, modifier le texte ou annoter.",
      href: path("pdf-edit"),
      secondary: { label: "Tous les outils PDF", href: "/pdf/" },
      icon: FileText,
      tone: categoryTone.pdf,
    },
    {
      title: "Scanner un document",
      body: "Photographiez vos pages, redressez-les et obtenez un PDF propre.",
      href: path("scan-document"),
      secondary: { label: "Corriger une photo de document", href: path("scan-perspective") },
      icon: Camera,
      tone: categoryTone.numerisation,
    },
    {
      title: "Convertir ou alléger une image",
      body: "JPG, PNG, WebP : convertir, compresser, redimensionner, par lot.",
      href: path("image-convert"),
      secondary: { label: "Tous les outils images", href: "/images/" },
      icon: ImageIcon,
      tone: categoryTone.images,
    },
    {
      title: "Reconnaître du texte (OCR)",
      body: "Extrayez le texte d'un scan ou d'une photo et créez un PDF recherchable.",
      href: path("scan-ocr"),
      secondary: { label: "Extraire le texte d'un PDF", href: path("pdf-extract-text") },
      icon: ScanText,
      tone: categoryTone.numerisation,
    },
  ];
  const trustIcons = [ShieldCheck, Lock, Sparkles];

  return (
    <div>
      <JsonLd data={buildWebsiteJsonLd()} />

      {/* 2–3. Hero + search */}
      <section className="hero-glow" aria-labelledby="home-title">
        <div className="container-page pb-12 pt-14 sm:pb-16 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="section-label mb-4">Outils en ligne gratuits · traitement local</p>
            <h1 id="home-title" className="text-[clamp(34px,5.2vw,56px)] leading-[1.06]">
              {t.home.heroTitle}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {t.home.heroSubtitle}
            </p>
            <div className="mt-7">
              <HomeSearch toolCount={tools.length} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 text-success-foreground">
                <ShieldCheck className="size-4" aria-hidden="true" />
                {t.home.privacyTitle}
              </span>
              <Link href="/outils/" className="font-medium text-link hover:underline">
                {t.home.allToolsLink(tools.length)}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Popular tools */}
      <section className="container-page py-12 sm:py-16" aria-labelledby="popular-heading">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="section-label mb-1">Les plus utilisés</p>
            <h2 id="popular-heading" className="text-2xl sm:text-[28px]">
              {t.home.featuredTitle}
            </h2>
          </div>
          <Link
            href="/outils/"
            className="hidden items-center gap-1 text-sm font-medium text-link hover:underline sm:inline-flex"
          >
            {t.home.heroCta}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="tool-grid">
          {popular.map((tool) => (
            <li key={tool.id}>
              <ToolCard tool={tool} featured />
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Families */}
      <section
        className="border-y border-border bg-muted/40 py-12 sm:py-16"
        aria-labelledby="categories-heading"
      >
        <div className="container-page">
          <div className="mb-5">
            <p className="section-label mb-1">Par famille</p>
            <h2 id="categories-heading" className="text-2xl sm:text-[28px]">
              {t.home.categoriesTitle}
            </h2>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="home-categories">
            {categories.map((category) => {
              const tone = categoryTone[category.id];
              const family = getToolsByCategory(category.id);
              const examples = family.slice(0, 2).map((x) => x.name);
              return (
                <li key={category.id}>
                  <Link
                    href={getCategoryPath(category)}
                    className="card-interactive flex h-full flex-col gap-3 rounded-[16px] border border-border bg-surface p-5 shadow-sm"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-[12px]",
                          tone.tile,
                        )}
                      >
                        <ToolIcon name={category.icon} className="size-5" strokeWidth={1.7} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{category.shortName}</span>
                        <span className="block text-xs text-muted-foreground">
                          {t.directory.resultsCount(family.length)}
                        </span>
                      </span>
                    </span>
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {examples.join(" · ")}
                      {family.length > 2 ? " · …" : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 text-center sm:hidden">
            <Link
              href="/outils/"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover"
              data-testid="home-all-tools"
            >
              {t.home.heroCta}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Journeys */}
      <section className="container-page py-12 sm:py-16" aria-labelledby="usages-heading">
        <div className="mb-5">
          <p className="section-label mb-1">Parcours</p>
          <h2 id="usages-heading" className="text-2xl sm:text-[28px]">
            {t.home.usagesTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.home.usagesSubtitle}</p>
        </div>
        <ul className="grid gap-4 md:grid-cols-2" data-testid="home-journeys">
          {journeys.map((journey) => (
            <li
              key={journey.title}
              className="flex gap-4 rounded-[18px] border border-border bg-surface p-5 shadow-sm sm:p-6"
            >
              <span
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-[12px]",
                  journey.tone.tile,
                )}
              >
                <journey.icon className="size-6" strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg">{journey.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{journey.body}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <Link
                    href={journey.href}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 font-medium text-primary-foreground hover:bg-primary-hover"
                  >
                    Commencer
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href={journey.secondary.href}
                    className="font-medium text-link hover:underline"
                  >
                    {journey.secondary.label}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 7. Trust */}
      <section className="container-page pb-12 sm:pb-16" aria-labelledby="trust-heading">
        <div className="rounded-[24px] border border-success/30 bg-success-soft/40 p-6 sm:p-8">
          <h2 id="trust-heading" className="text-2xl sm:text-[28px]">
            {t.home.trustTitle}
          </h2>
          <ul className="mt-5 grid gap-5 md:grid-cols-3">
            {t.home.trustItems.map((item, i) => {
              const Icon = trustIcons[i] ?? ShieldCheck;
              return (
                <li key={item.title} className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-surface text-success shadow-sm">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link
            href="/confidentialite/"
            className="mt-5 inline-block text-sm font-medium text-link underline-offset-4 hover:underline"
          >
            {t.home.privacyLink}
          </Link>
        </div>
      </section>

      {/* 8. Guides */}
      <section
        className="border-t border-border bg-muted/40 py-12 sm:py-16"
        aria-labelledby="guides-heading"
      >
        <div className="container-page">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="section-label mb-1">Pour aller plus loin</p>
              <h2 id="guides-heading" className="text-2xl sm:text-[28px]">
                {t.home.guidesTitle}
              </h2>
            </div>
            <Link
              href="/guides/"
              className="hidden items-center gap-1 text-sm font-medium text-link hover:underline sm:inline-flex"
            >
              Tous les guides
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid gap-3 md:grid-cols-3">
            {guides.slice(0, 3).map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`/guides/${guide.slug}/`}
                  className="card-interactive flex h-full gap-3 rounded-[14px] border border-border bg-surface p-4 shadow-sm"
                >
                  <BookOpen className="mt-0.5 size-5 shrink-0 text-link" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold leading-snug">{guide.title}</span>
                    <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                      {guide.description}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="container-page py-12 sm:py-16" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-2xl sm:text-[28px]">
          {t.home.faqTitle}
        </h2>
        <dl className="mt-5 grid gap-4 md:grid-cols-2" data-testid="home-faq">
          {t.home.faq.map((item) => (
            <div key={item.question} className="rounded-[14px] border border-border bg-surface p-5">
              <dt className="font-semibold">{item.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
