import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { siteConfig } from "@/config/site";
import { guides } from "@/lib/content/guides";
import { buildPageMetadata } from "@/lib/seo";
import { getToolById } from "@/lib/tools";
import { t } from "@/lib/i18n";

export const metadata: Metadata = buildPageMetadata({
  title: "Guides pratiques PDF : fusion, compression, signature, organisation",
  description: `Guides pas à pas rédigés par ${siteConfig.name} pour fusionner, alléger, signer et réorganiser vos PDF en toute sécurité.`,
  path: "/guides/",
});

export default function GuidesPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { name: t.nav.home, path: "/" },
          { name: t.nav.guides, path: "/guides/" },
        ]}
      />
      <h1 className="mt-6 text-[clamp(32px,4.4vw,52px)] leading-[1.05]">Guides pratiques</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
        Des explications concrètes, rédigées à la main, pour résoudre les problèmes courants et bien
        utiliser les outils.
      </p>
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {guides.map((guide) => {
          const tool = getToolById(guide.toolId);
          return (
            <li key={guide.slug}>
              <Link
                href={`/guides/${guide.slug}/`}
                className="block h-full rounded-[16px] border border-border bg-surface p-5 transition-[transform,border-color] hover:-translate-y-[3px] hover:border-primary motion-reduce:hover:translate-y-0"
              >
                <h2 className="text-lg">{guide.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{guide.description}</p>
                {tool ? (
                  <p className="mt-3 text-xs font-medium text-link">Outil : {tool.name}</p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
