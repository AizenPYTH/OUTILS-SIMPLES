import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ToolIcon } from "@/components/tools/tool-icon";
import { categoryTone } from "@/lib/tools/groups";
import { cn } from "@/lib/utils";
import { getGuides } from "@/lib/content/guides";
import { getToolById } from "@/lib/tools";
import { t } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n/routes";

export function GuidesIndexPage() {
  const guides = getGuides();
  const base = localizedPath("/guides/");
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { name: t.nav.home, path: localizedPath("/") },
          { name: t.nav.guides, path: base },
        ]}
      />
      <h1 className="mt-6 text-[clamp(32px,4.4vw,52px)] leading-[1.05]">{t.guidesPage.title}</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted-foreground">{t.guidesPage.intro}</p>
      {guides.length === 0 ? (
        <p className="mt-8 text-muted-foreground">{t.guidesPage.empty}</p>
      ) : null}
      {/* Three columns when the count allows full rows, otherwise two. */}
      <ul
        className={cn(
          "mt-8 grid gap-4 md:grid-cols-2",
          guides.length % 3 === 0 && guides.length % 2 !== 0 && "lg:grid-cols-3",
        )}
      >
        {guides.map((guide) => {
          const tool = getToolById(guide.toolId);
          return (
            <li key={guide.slug}>
              <Link
                href={`${base}${guide.slug}/`}
                className="flex h-full gap-4 rounded-[16px] border border-border bg-surface p-5 transition-[transform,border-color] hover:-translate-y-[3px] hover:border-primary motion-reduce:hover:translate-y-0"
              >
                {/* The family of the related tool, as on the catalogue cards. */}
                {tool ? (
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-[12px]",
                      categoryTone[tool.category].tile,
                    )}
                    aria-hidden="true"
                  >
                    <ToolIcon name={tool.icon} className="size-5" strokeWidth={1.7} />
                  </span>
                ) : null}
                <span className="flex min-w-0 flex-1 flex-col">
                  <h2 className="text-lg">{guide.title}</h2>
                  <span className="mt-2 text-sm text-muted-foreground">{guide.description}</span>
                  {tool ? (
                    <span className="mt-auto pt-3 text-sm font-medium text-link">
                      {t.legal.openTool(tool.name)}{" "}
                      <ArrowRight className="inline size-3.5 align-[-2px]" aria-hidden="true" />
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
