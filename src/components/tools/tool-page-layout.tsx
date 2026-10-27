import Link from "next/link";
import { BookOpen, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ToolCard } from "@/components/tools/tool-card";
import { AdPlacement } from "@/components/monetization/ad-placement";
import { OfflineControl } from "@/components/offline/offline-control";
import { offlineGroupsFor } from "@/lib/offline/needs";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/files/format";
import { getToolInputLimits } from "@/lib/tools/input-limits";
import { getGuidesForTool } from "@/lib/content/guides";
import { buildFaqJsonLd, buildToolJsonLd } from "@/lib/seo";
import {
  getCategoryPath,
  getRelatedTools,
  getToolPath,
  type ToolCategory,
  type ToolDefinition,
} from "@/lib/tools";
import { t } from "@/lib/i18n";
import { ToolFaq } from "./tool-faq";
import { localizedPath } from "@/lib/i18n/routes";
import { tr } from "@/lib/i18n/messages";

interface ToolPageLayoutProps {
  tool: ToolDefinition;
  category: ToolCategory;
  children: React.ReactNode;
}

/**
 * Server-rendered template for every tool page. The action comes first:
 * breadcrumb, a compact H1 and one-line summary, then the tool itself. The
 * full description, steps, limitations, privacy, FAQ and related tools follow
 * (docs/DESIGN_PRINCIPES.md §4, "Pages d'outil"). Content comes from the registry.
 */
export function ToolPageLayout({ tool, category, children }: ToolPageLayoutProps) {
  const related = getRelatedTools(tool);
  const guides = getGuidesForTool(tool.id);
  const faqJsonLd = buildFaqJsonLd(tool);
  const inputLimits = getToolInputLimits(tool);

  return (
    <div className="container-page py-5 sm:py-7">
      <JsonLd data={buildToolJsonLd(tool)} />
      {faqJsonLd ? <JsonLd data={faqJsonLd} /> : null}
      <Breadcrumbs
        items={[
          { name: t.nav.home, path: localizedPath("/") },
          { name: category.name, path: getCategoryPath(category) },
          { name: tool.name, path: getToolPath(tool) },
        ]}
      />
      <div className="mt-4 max-w-3xl">
        <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.1]">{tool.name}</h1>
        <p className="mt-2 text-[15px] text-muted-foreground sm:text-base">
          {tool.shortDescription}
        </p>
      </div>

      <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-12">
          <section aria-label={tool.name} data-testid="tool-workspace">
            {children}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="success">
                <ShieldCheck aria-hidden="true" />{" "}
                {tool.processing === "client" ? t.tool.processingLocal : t.tool.processingServer}
              </Badge>
              <Badge variant="neutral">{t.tool.freeBadge}</Badge>
              {tool.status === "beta" ? <Badge variant="warning">{t.tool.betaBadge}</Badge> : null}
              <span className="ml-auto">
                <OfflineControl toolId={tool.id} groups={offlineGroupsFor(tool)} />
              </span>
            </div>
          </section>

          {/* Optional advertising placement: below the work area, never above the drop zone. */}
          <AdPlacement placement="tool-after-intro" />

          <section aria-labelledby="about-heading" className="prose-tool">
            <h2 id="about-heading" className="text-2xl">
              {t.tool.about}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
              {tool.description}
            </p>
          </section>

          <section aria-labelledby="howto-heading" className="prose-tool">
            <h2 id="howto-heading" className="text-2xl">
              {t.tool.howTo}
            </h2>
            <ol className="mt-4 space-y-3">
              {tool.content.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-link">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="limits-heading" className="prose-tool">
            <h2 id="limits-heading" className="text-2xl">
              {t.tool.limitations}
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
              {tool.content.limitations.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2" data-testid="tool-input-limits">
              {inputLimits.acceptsFiles ? (
                <>
                  {inputLimits.formats.length > 0 ? (
                    <div className="rounded-md bg-muted p-3">
                      <dt className="text-muted-foreground">{t.tool.inputFormats}</dt>
                      <dd className="font-medium">{inputLimits.formats.join(", ")}</dd>
                    </div>
                  ) : null}
                  <div className="rounded-md bg-muted p-3">
                    <dt className="text-muted-foreground">{t.tool.maxSize}</dt>
                    <dd className="font-medium">
                      {formatBytes(inputLimits.maxFileSizeBytes!)}
                      {inputLimits.maxFileCount
                        ? ` · ${inputLimits.maxFileCount} ${t.common.files} max`
                        : ""}
                    </dd>
                  </div>
                </>
              ) : (
                <div className="rounded-md bg-muted p-3 sm:col-span-2">
                  <dt className="text-muted-foreground">{t.tool.noFileTitle}</dt>
                  <dd className="font-medium">{t.tool.noFileBody}</dd>
                </div>
              )}
            </dl>
          </section>

          <section
            aria-labelledby="privacy-heading"
            className="prose-tool rounded-[16px] border border-success/30 bg-success-soft/50 p-5"
          >
            <h2 id="privacy-heading" className="flex items-center gap-2 text-xl">
              <ShieldCheck className="size-5 text-success" aria-hidden="true" />
              {t.tool.privacy}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed">
              {tool.content.privacyNote ??
                tr(
                  "Votre fichier est traité directement dans votre navigateur et n'est jamais envoyé sur nos serveurs.",
                )}
            </p>
            <Link
              href={localizedPath("/confidentialite/")}
              className="mt-3 inline-block text-sm font-medium text-link underline-offset-4 hover:underline"
            >
              {t.home.privacyLink}
            </Link>
          </section>

          {tool.content.faq.length > 0 ? <ToolFaq items={tool.content.faq} /> : null}

          {guides.length > 0 ? (
            <section aria-labelledby="guides-heading">
              <h2 id="guides-heading" className="text-2xl">
                {t.nav.guides}
              </h2>
              <ul className="mt-4 space-y-2">
                {guides.map((guide) => (
                  <li key={guide.slug}>
                    <Link
                      href={`${localizedPath("/guides/")}${guide.slug}/`}
                      className="inline-flex items-center gap-2 text-[15px] font-medium text-link hover:underline"
                    >
                      <BookOpen className="size-4" aria-hidden="true" />
                      {guide.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <AdPlacement placement="tool-after-result" />
        </div>

        <aside className="space-y-8 lg:sticky lg:top-[calc(var(--header-height)+24px)] lg:self-start">
          {related.length ? (
            <section aria-labelledby="related-heading">
              <h2 id="related-heading" className="mb-3 text-lg">
                {t.tool.related}
              </h2>
              <ul className="space-y-2.5">
                {related.map((r) => (
                  <li key={r.id}>
                    <ToolCard tool={r} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
