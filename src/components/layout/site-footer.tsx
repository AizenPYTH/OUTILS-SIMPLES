import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getActiveCategories, getCategoryPath, getToolsByCategory } from "@/lib/tools";
import { t } from "@/lib/i18n";
import { Logo } from "./logo";
import { localizedPath } from "@/lib/i18n/routes";
import { tr } from "@/lib/i18n/messages";

/** Four-column footer: brand and trust, families, resources, legal; bottom bar. */
export function SiteFooter() {
  const categories = getActiveCategories();
  const year = new Date().getFullYear();
  const linkClass = "text-sm text-muted-foreground transition-colors hover:text-foreground";

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{t.footer.tagline}</p>
          <p className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success-foreground">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {t.home.privacyTitle}
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">{t.footer.openSource}</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t.footer.toolsHeading}</h2>
          <ul className="space-y-2">
            {categories.map((category) => (
              <li key={category.id}>
                <Link href={getCategoryPath(category)} className={linkClass}>
                  {category.shortName}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {getToolsByCategory(category.id).length}
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={localizedPath("/outils/")}
                className="text-sm font-medium text-link hover:underline"
              >
                {t.nav.tools}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t.footer.siteHeading}</h2>
          <ul className="space-y-2">
            <li>
              <Link href={localizedPath("/guides/")} className={linkClass}>
                {t.nav.guides}
              </Link>
            </li>
            <li>
              <Link href={localizedPath("/a-propos/")} className={linkClass}>
                {t.nav.about}
              </Link>
            </li>
            <li>
              <Link href={localizedPath("/contact/")} className={linkClass}>
                {t.nav.contact}
              </Link>
            </li>
            <li>
              <Link href={localizedPath("/confidentialite/")} className={linkClass}>
                {t.nav.privacy}
              </Link>
            </li>
            <li>
              <Link href={localizedPath("/verifiez-le/")} className={linkClass}>
                {tr("Vérifiez-le vous-même")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t.footer.legalHeading}</h2>
          <ul className="space-y-2">
            <li>
              <Link href={localizedPath("/mentions-legales/")} className={linkClass}>
                {t.nav.legal}
              </Link>
            </li>
            <li>
              <Link href={localizedPath("/conditions-utilisation/")} className={linkClass}>
                {t.nav.terms}
              </Link>
            </li>
            <li>
              <Link href={localizedPath("/gestion-cookies/")} className={linkClass}>
                {t.nav.cookies}
              </Link>
            </li>
            <li>
              <Link href={localizedPath("/affiliation/")} className={linkClass}>
                {t.nav.affiliate}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border bg-muted/40">
        <div className="container-page flex flex-col gap-2 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t.footer.rights(year)}</p>
          <p>{siteConfig.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
