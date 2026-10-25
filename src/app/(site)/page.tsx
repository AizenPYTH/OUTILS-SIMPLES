import { Suspense } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";
import { ToolCatalog } from "@/components/tools/tool-catalog";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebsiteJsonLd } from "@/lib/seo";
import { t } from "@/lib/i18n";

export default function HomePage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <JsonLd data={buildWebsiteJsonLd()} />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[clamp(32px,4.4vw,52px)] leading-[1.05]">{t.directory.title}</h1>
          <p className="mt-2 max-w-xl text-base text-muted-foreground sm:text-lg">
            {siteConfig.name} : {t.home.heroSubtitle}
          </p>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-sm font-medium text-success-foreground">
          <ShieldCheck className="size-4" aria-hidden="true" />
          {t.home.privacyTitle}
          <Link href="/confidentialite/" className="underline underline-offset-2">
            {t.common.learnMore}
          </Link>
        </p>
      </div>
      <Suspense fallback={<div className="h-[52px] rounded-[16px] bg-muted" aria-hidden="true" />}>
        <ToolCatalog />
      </Suspense>
    </div>
  );
}
