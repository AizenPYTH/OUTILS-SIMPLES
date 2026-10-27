import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getActiveCategories,
  getCategoryPath,
  getPublishedTools,
  getToolById,
  getToolPath,
  getToolsByCategory,
} from "@/lib/tools";
import { toSlimTool } from "@/lib/tools/search-index";
import { t } from "@/lib/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { SearchDialog } from "./search-dialog";
import { ThemeToggle } from "./theme-toggle";
import { localizedPath } from "@/lib/i18n/routes";

/**
 * Header: logo, three family links, Guides, search, theme/language and the
 * catalogue button (docs/DESIGN_PRINCIPES.md § B). Families with the most
 * tools get a direct link; the catalogue holds the rest.
 */
export function SiteHeader() {
  const categories = getActiveCategories();
  const quick = categories.filter((c) => ["pdf", "images", "numerisation"].includes(c.id));
  const editor = getToolById("pdf-edit");
  const editorPath = editor && editor.status === "published" ? getToolPath(editor) : null;
  const searchIndex = getPublishedTools().map((tool) => toSlimTool(tool, getToolPath(tool)));
  const navCategories = categories.map((category) => ({
    id: category.id,
    path: getCategoryPath(category),
    shortName: category.shortName,
    icon: category.icon,
    count: getToolsByCategory(category.id).length,
  }));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container-page flex h-[var(--header-height)] items-center gap-3">
        <Logo />
        <nav
          aria-label="Navigation principale"
          className="hidden shrink-0 items-center gap-0.5 lg:flex"
        >
          {quick.map((category) => (
            <Button key={category.id} variant="ghost" size="sm" asChild>
              <Link href={getCategoryPath(category)}>{category.shortName}</Link>
            </Button>
          ))}
          <Button variant="ghost" size="sm" asChild>
            <Link href={localizedPath("/guides/")}>{t.nav.guides}</Link>
          </Button>
        </nav>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
          <SearchDialog variant="field" index={searchIndex} />
          <Button size="sm" variant="secondary" asChild className="hidden shrink-0 md:inline-flex">
            <Link href={localizedPath("/outils/")} data-testid="header-all-tools">
              <LayoutGrid aria-hidden="true" />
              {t.nav.tools}
            </Link>
          </Button>
          <div className="hidden shrink-0 items-center md:flex">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <MobileNav categories={navCategories} editorPath={editorPath} />
        </div>
      </div>
    </header>
  );
}
