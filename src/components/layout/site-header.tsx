import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getActiveCategories, getToolById, getToolPath } from "@/lib/tools";
import { t } from "@/lib/i18n";
import { LanguageSelector } from "./language-selector";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { SearchDialog } from "./search-dialog";
import { ThemeToggle } from "./theme-toggle";

/** Short header: logo, two links, search, theme/language (docs/DESIGN_PRINCIPES.md §3.5). */
export function SiteHeader() {
  const categories = getActiveCategories();
  const editor = getToolById("pdf-edit");
  const editorPath = editor && editor.status === "published" ? getToolPath(editor) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container-page flex h-[var(--header-height)] items-center gap-3">
        <Logo />
        <nav
          aria-label="Navigation principale"
          className="hidden shrink-0 items-center gap-1 md:flex"
        >
          <Button variant="ghost" size="sm" asChild>
            <Link href="/outils/">{t.nav.tools}</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/guides/">{t.nav.guides}</Link>
          </Button>
        </nav>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
          <SearchDialog variant="field" />
          <div className="hidden shrink-0 items-center md:flex">
            <LanguageSelector />
            <ThemeToggle />
          </div>
          <MobileNav categories={categories} editorPath={editorPath} />
        </div>
      </div>
    </header>
  );
}
