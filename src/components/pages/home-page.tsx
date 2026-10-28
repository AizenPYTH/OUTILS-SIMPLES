import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Lock, ShieldCheck, Sparkles } from "lucide-react";
import editorShotFr from "@/assets/editeur-apercu.webp";
import editorShotEn from "@/assets/editor-preview-en.webp";
import { getLocale } from "@/lib/i18n/locale";
import { HomeDrop } from "@/components/home/home-drop";
import { HomeToolFilter, type HomeFilter } from "@/components/home/home-tool-filter";
import { AdPlacement } from "@/components/monetization/ad-placement";
import { HomeSearch } from "@/components/tools/home-search";
import { ToolCard } from "@/components/tools/tool-card";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebsiteJsonLd } from "@/lib/seo";
import { KIND_TOOLS } from "@/lib/files/detect";
import {
  getActiveCategories,
  getCategoryPath,
  getPublishedTools,
  getToolById,
  getToolPath,
} from "@/lib/tools";
import { toSlimTool, type SlimTool } from "@/lib/tools/search-index";
import { t } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n/routes";
import { tr } from "@/lib/i18n/messages";

/** Shown first in the grid ("Tous"), in this order; the rest follows family by family. */
const POPULAR_IDS = [
  "pdf-edit",
  "pdf-merge",
  "pdf-compress",
  "pdf-split",
  "pdf-sign",
  "conv-pdf-docx",
  "conv-docx-pdf",
  "scan-document",
  "scan-ocr",
  "pdf-to-images",
  "pdf-from-images",
  "image-compress",
];

const EDITOR_POINTS = () => [
  tr("Modifier le texte existant"),
  tr("Annoter, signer, dessiner"),
  tr("Pages, OCR et export vérifié"),
];

/**
 * Home page: one clear headline, the search, then every tool as a large tile
 * that can be filtered by family (the page is the catalogue's front door).
 * The file drop, the editor, the privacy promise and the FAQ follow.
 */
export function HomePage() {
  const editorShot = getLocale() === "en" ? editorShotEn : editorShotFr;
  const tools = getPublishedTools();
  const rank = (id: string) => {
    const i = POPULAR_IDS.indexOf(id);
    return i === -1 ? POPULAR_IDS.length : i;
  };
  // Stable sort: popular tools first, then registry order (family by family).
  const ordered = tools
    .map((tool, index) => ({ tool, index }))
    .sort((a, b) => rank(a.tool.id) - rank(b.tool.id) || a.index - b.index)
    .map((x) => x.tool);
  const categories = getActiveCategories();
  const filters: HomeFilter[] = [
    {
      id: "all",
      label: t.directory.filterAll,
      href: localizedPath("/outils/"),
      count: tools.length,
    },
    ...categories.map((category) => ({
      id: category.id,
      label: category.shortName,
      href: getCategoryPath(category),
      count: tools.filter((tool) => tool.category === category.id).length,
    })),
  ];
  const editor = getToolById("pdf-edit");
  const editorPath = editor ? getToolPath(editor) : localizedPath("/outils/");
  const suggestable: Record<string, SlimTool> = {};
  for (const id of new Set(Object.values(KIND_TOOLS).flat())) {
    const tool = getToolById(id);
    if (tool && tool.status === "published") suggestable[id] = toSlimTool(tool, getToolPath(tool));
  }
  const trustIcons = [ShieldCheck, Lock, Sparkles];

  return (
    <div>
      <JsonLd data={buildWebsiteJsonLd()} />

      {/* 1. Headline and search */}
      <section className="hero-glow" aria-labelledby="home-title">
        <div className="container-page pb-8 pt-10 text-center sm:pb-10 sm:pt-14">
          <h1
            id="home-title"
            className="mx-auto max-w-3xl text-[clamp(30px,4.6vw,50px)] leading-[1.08]"
          >
            {t.home.heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t.home.heroSubtitle}
          </p>
          <div className="mt-6">
            <HomeSearch toolCount={tools.length} />
          </div>
        </div>
      </section>

      {/* Optional advertising placement: after the intro, never inside it (src/config/ads.ts). */}
      <AdPlacement placement="home-after-intro" className="container-page" />

      {/* 2. Every tool, filterable by family */}
      <section className="container-page pb-14 pt-2" aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="sr-only">
          {t.home.heroCta}
        </h2>
        <HomeToolFilter filters={filters}>
          <ul
            className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
            data-testid="tool-grid"
          >
            {ordered.map((tool) => (
              <li key={tool.id} data-cat={tool.category}>
                <ToolCard tool={tool} compactOnPhone />
              </li>
            ))}
          </ul>
        </HomeToolFilter>
        <div className="mt-8 text-center">
          <Link
            href={localizedPath("/outils/")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-5 text-sm font-semibold text-foreground shadow-sm hover:border-accent hover:bg-primary-soft"
            data-testid="home-all-tools"
          >
            {t.home.allToolsLink(tools.length)}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* 3. Not sure which tool? Drop the file */}
      <section
        className="border-y border-border bg-surface py-12 sm:py-16"
        aria-labelledby="drop-heading"
      >
        <div className="container-page">
          <h2 id="drop-heading" className="text-center text-2xl sm:text-[28px]">
            {tr("Vous ne savez pas quel outil choisir ?")}
          </h2>
          <p className="mx-auto mb-6 mt-2 max-w-xl text-center text-muted-foreground">
            {tr(
              "Déposez votre fichier : son type est reconnu et les outils adaptés vous sont proposés.",
            )}
          </p>
          <HomeDrop tools={suggestable} />
        </div>
      </section>

      {/* 4. The editor, shown rather than described */}
      <section className="container-page py-12 sm:py-16" aria-labelledby="editor-heading">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div>
            <h2 id="editor-heading" className="text-2xl sm:text-[30px]">
              {t.homePage.editorTitle}
            </h2>
            <ul className="mt-5 space-y-3">
              {EDITOR_POINTS().map((point) => (
                <li key={point} className="flex items-center gap-3 font-medium">
                  <span className="tile-brand flex size-6 shrink-0 items-center justify-center rounded-full">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            <Link
              href={editorPath}
              className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
              data-testid="home-editor-cta"
            >
              {t.home.heroSecondaryCta}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <figure className="overflow-hidden rounded-[18px] border border-border bg-surface shadow-md">
            <Image
              src={editorShot}
              alt={t.homePage.editorAlt}
              sizes="(min-width: 1024px) 640px, 100vw"
              className="h-auto w-full"
            />
          </figure>
        </div>
      </section>

      {/* 5. Trust, compact */}
      <section className="container-page pb-12 sm:pb-16" aria-labelledby="trust-heading">
        <div className="rounded-[24px] bg-brand-dark p-6 text-white sm:p-10">
          <h2 id="trust-heading" className="text-2xl sm:text-[30px]">
            {t.home.trustTitle}
          </h2>
          <ul className="mt-6 grid gap-6 md:grid-cols-3">
            {t.home.trustItems.map((item, i) => {
              const Icon = trustIcons[i] ?? ShieldCheck;
              return (
                <li key={item.title} className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-bright text-brand-dark">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base">{item.title}</h3>
                    <p className="mt-1 text-sm text-white/80">{item.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[#c5f5ac]">
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

      {/* 6. FAQ */}
      <section className="container-page pb-14 sm:pb-20" aria-labelledby="faq-heading">
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
