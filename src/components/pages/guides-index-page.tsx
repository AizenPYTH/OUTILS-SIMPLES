import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
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
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {guides.map((guide) => {
          const tool = getToolById(guide.toolId);
          return (
            <li key={guide.slug}>
              <Link
                href={`${base}${guide.slug}/`}
                className="block h-full rounded-[16px] border border-border bg-surface p-5 transition-[transform,border-color] hover:-translate-y-[3px] hover:border-primary motion-reduce:hover:translate-y-0"
              >
                <h2 className="text-lg">{guide.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{guide.description}</p>
                {tool ? (
                  <p className="mt-3 text-xs font-medium text-link">
                    {t.legal.tool}: {tool.name}
                  </p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
