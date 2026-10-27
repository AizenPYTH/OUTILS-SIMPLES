import Image from "next/image";
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
import editorShot from "@/assets/editeur-apercu.webp";
import { HomeDrop } from "@/components/home/home-drop";
import { AdPlacement } from "@/components/monetization/ad-placement";
import { HomeSearch } from "@/components/tools/home-search";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolIcon } from "@/components/tools/tool-icon";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebsiteJsonLd } from "@/lib/seo";
import { KIND_TOOLS } from "@/lib/files/detect";
import {
  getActiveCategories,
  getCategoryPath,
  getPublishedTools,
  getToolById,
  getToolPath,
  getToolsByCategory,
} from "@/lib/tools";
import { categoryTone } from "@/lib/tools/groups";
import { toSlimTool, type SlimTool } from "@/lib/tools/search-index";
import { t } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n/routes";
import { getGuides } from "@/lib/content/guides";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n/messages";

const POPULAR_IDS = [
  "pdf-edit",
  "pdf-merge",
  "pdf-compress",
  "pdf-sign",
  "scan-document",
  "scan-ocr",
  "image-compress",
  "conv-docx-pdf",
];

const EDITOR_POINTS = () => [
  {
    title: tr("Modifier le texte existant"),
    body: tr(
      "Double-cliquez sur un mot et corrigez-le dans la police d'origine quand elle le permet, sans refaire la page.",
    ),
  },
  {
    title: tr("Annoter, signer, dessiner"),
    body: tr(
      "Texte, surlignage, formes, flèches, masques, signature manuscrite ou image : tout est déplaçable et modifiable.",
    ),
  },
  {
    title: tr("Pages, OCR et export vérifié"),
    body: tr(
      "Réorganisez les pages, reconnaissez le texte d'un scan et téléchargez un PDF relu par le site avant de vous être proposé.",
    ),
  },
];

export function HomePage() {
  const editorPoints = EDITOR_POINTS();
  const guides = getGuides();
  const tools = getPublishedTools();
  const popular = POPULAR_IDS.map((id) => getToolById(id)).filter(
    (tool): tool is NonNullable<typeof tool> => !!tool && tool.status === "published",
  );
  const categories = getActiveCategories();
  const path = (id: string) => {
    const tool = getToolById(id);
    return tool ? getToolPath(tool) : "/outils/";
  };
  const suggestable: Record<string, SlimTool> = {};
  for (const id of new Set(Object.values(KIND_TOOLS).flat())) {
    const tool = getToolById(id);
    if (tool && tool.status === "published") suggestable[id] = toSlimTool(tool, getToolPath(tool));
  }
  const journeys = [
    { label: t.homePage.journeys.editor, href: path("pdf-edit"), icon: FileText },
    { label: t.homePage.journeys.scan, href: path("scan-document"), icon: Camera },
    { label: t.homePage.journeys.image, href: path("image-convert"), icon: ImageIcon },
    { label: t.homePage.journeys.ocr, href: path("scan-ocr"), icon: ScanText },
  ];
  const trustIcons = [ShieldCheck, Lock, Sparkles];

  return (
    <div>
      <JsonLd data={buildWebsiteJsonLd()} />

      {/* 1. Hero: one promise, the drop zone, the search, four shortcuts */}
      <section className="hero-glow" aria-labelledby="home-title">
        <div className="container-page pb-10 pt-12 sm:pb-14 sm:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="section-label mb-4">{t.homePage.label}</p>
            <h1 id="home-title" className="text-[clamp(32px,5vw,54px)] leading-[1.06]">
              {t.home.heroTitle}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {t.home.heroSubtitle}
            </p>
          </div>
          <div className="mt-7">
            <HomeDrop tools={suggestable} />
          </div>
          <p className="mt-5 text-center text-sm text-muted-foreground">{t.homePage.orSearch}</p>
          <div className="mt-2">
            <HomeSearch toolCount={tools.length} />
          </div>
          <ul
            className="mx-auto mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-2"
            data-testid="home-journeys"
            aria-label={t.homePage.shortcuts}
          >
            {journeys.map((journey) => (
              <li key={journey.label}>
                <Link
                  href={journey.href}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-sm font-medium shadow-sm hover:bg-muted"
                >
                  <journey.icon className="size-4 text-link" aria-hidden="true" />
                  {journey.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 text-success-foreground">
              <ShieldCheck className="size-4" aria-hidden="true" />
              {t.home.privacyTitle}
            </span>
            <Link
              href={localizedPath("/outils/")}
              className="font-medium text-link hover:underline"
            >
              {t.home.allToolsLink(tools.length)}
            </Link>
          </div>
        </div>
      </section>

      {/* Optional advertising placement: after the hero, never inside it (src/config/ads.ts). */}
      <AdPlacement placement="home-after-intro" className="container-page" />

      {/* 2. The editor, shown rather than described */}
      <section className="container-page py-12 sm:py-16" aria-labelledby="editor-heading">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div>
            <p className="section-label mb-1">{t.homePage.flagship}</p>
            <h2 id="editor-heading" className="text-2xl sm:text-[28px]">
              {t.homePage.editorTitle}
            </h2>
            <ul className="mt-5 space-y-4">
              {editorPoints.map((point) => (
                <li key={point.title} className="flex gap-3">
                  <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-link">
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold">{point.title}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{point.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={path("pdf-edit")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover"
                data-testid="home-editor-cta"
              >
                {t.home.heroSecondaryCta}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href={getCategoryPath(getActiveCategories()[0]!)}
                className="text-sm font-medium text-link hover:underline"
              >
                {t.homePage.allPdfTools}
              </Link>
            </div>
          </div>
          <figure className="overflow-hidden rounded-[18px] border border-border bg-surface shadow-md">
            <Image
              src={editorShot}
              alt={t.homePage.editorAlt}
              sizes="(min-width: 1024px) 640px, 100vw"
              className="h-auto w-full"
            />
            <figcaption className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              {t.homePage.editorCaption}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* 3. Popular tools */}
      <section
        className="border-y border-border bg-muted/40 py-12 sm:py-16"
        aria-labelledby="popular-heading"
      >
        <div className="container-page">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="section-label mb-1">{t.homePage.mostUsed}</p>
              <h2 id="popular-heading" className="text-2xl sm:text-[28px]">
                {t.home.featuredTitle}
              </h2>
            </div>
            <Link
              href={localizedPath("/outils/")}
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
        </div>
      </section>

      {/* 4. Families */}
      <section className="container-page py-12 sm:py-16" aria-labelledby="categories-heading">
        <div className="mb-5">
          <p className="section-label mb-1">{t.homePage.byFamily}</p>
          <h2 id="categories-heading" className="text-2xl sm:text-[28px]">
            {t.home.categoriesTitle}
          </h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="home-categories">
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
            href={localizedPath("/outils/")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover"
            data-testid="home-all-tools"
          >
            {t.home.heroCta}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* 5. Trust, compact */}
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
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-link">
            <Link
              href={localizedPath("/confidentialite/")}
              className="underline-offset-4 hover:underline"
            >
              {t.home.privacyLink}
            </Link>
            <Link
              href={localizedPath("/verifiez-le/")}
              className="underline-offset-4 hover:underline"
            >
              {t.homePage.verifyLink}
            </Link>
            <Link
              href={localizedPath("/hors-ligne/")}
              className="underline-offset-4 hover:underline"
            >
              {t.homePage.offlineLink}
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Guides */}
      <section
        className="border-t border-border bg-muted/40 py-12 sm:py-16"
        aria-labelledby="guides-heading"
      >
        <div className="container-page">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="section-label mb-1">{t.homePage.goFurther}</p>
              <h2 id="guides-heading" className="text-2xl sm:text-[28px]">
                {t.home.guidesTitle}
              </h2>
            </div>
            <Link
              href={localizedPath("/guides/")}
              className="hidden items-center gap-1 text-sm font-medium text-link hover:underline sm:inline-flex"
            >
              {t.homePage.allGuides}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid gap-3 md:grid-cols-3">
            {guides.slice(0, 3).map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`${localizedPath("/guides/")}${guide.slug}/`}
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

      {/* 7. FAQ */}
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
