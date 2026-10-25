import Link from "next/link";
import { siteConfig } from "@/config/site";
import { getActiveCategories, getCategoryPath, getPublishedTools, getToolPath } from "@/lib/tools";
import { t } from "@/lib/i18n";
import { Logo } from "./logo";

export function SiteFooter() {
  const categories = getActiveCategories();
  const tools = getPublishedTools();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-muted/40">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{t.footer.tagline}</p>
          <p className="max-w-xs text-xs text-muted-foreground">{t.footer.openSource}</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t.footer.toolsHeading}</h2>
          <ul className="space-y-2 text-sm">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={getCategoryPath(category)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {category.name}
                </Link>
              </li>
            ))}
            {tools.slice(0, 6).map((tool) => (
              <li key={tool.id}>
                <Link
                  href={getToolPath(tool)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {tool.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/outils/" className="font-medium text-foreground hover:underline">
                {t.nav.tools}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t.footer.siteHeading}</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/guides/" className="text-muted-foreground hover:text-foreground">
                {t.nav.guides}
              </Link>
            </li>
            <li>
              <Link href="/a-propos/" className="text-muted-foreground hover:text-foreground">
                {t.nav.about}
              </Link>
            </li>
            <li>
              <Link href="/contact/" className="text-muted-foreground hover:text-foreground">
                {t.nav.contact}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t.footer.legalHeading}</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/mentions-legales/"
                className="text-muted-foreground hover:text-foreground"
              >
                {t.nav.legal}
              </Link>
            </li>
            <li>
              <Link
                href="/confidentialite/"
                className="text-muted-foreground hover:text-foreground"
              >
                {t.nav.privacy}
              </Link>
            </li>
            <li>
              <Link
                href="/conditions-utilisation/"
                className="text-muted-foreground hover:text-foreground"
              >
                {t.nav.terms}
              </Link>
            </li>
            <li>
              <Link
                href="/gestion-cookies/"
                className="text-muted-foreground hover:text-foreground"
              >
                {t.nav.cookies}
              </Link>
            </li>
            <li>
              <Link href="/affiliation/" className="text-muted-foreground hover:text-foreground">
                {t.nav.affiliate}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t.footer.rights(year)}</p>
          <p>{siteConfig.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
