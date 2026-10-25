import Link from "next/link";
import { SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveCategories, getCategoryPath, getToolById, getToolPath } from "@/lib/tools";
import { t } from "@/lib/i18n";
import { LanguageSelector } from "./language-selector";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { SearchDialog } from "./search-dialog";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  const categories = getActiveCategories();
  const editor = getToolById("pdf-edit");
  const editorPath = editor && editor.status === "published" ? getToolPath(editor) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container-page flex h-[var(--header-height)] items-center gap-3">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden shrink-0 items-center gap-1 lg:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/outils/">{t.nav.tools}</Link>
          </Button>
          {categories.map((category) => (
            <Button key={category.id} variant="ghost" size="sm" asChild>
              <Link href={getCategoryPath(category)}>{category.shortName}</Link>
            </Button>
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
          <SearchDialog variant="field" />
          {editorPath ? (
            <Button size="sm" asChild className="hidden shrink-0 sm:inline-flex lg:hidden xl:inline-flex">
              <Link href={editorPath}>
                <SquarePen aria-hidden="true" />
                {t.nav.pdfEditor}
              </Link>
            </Button>
          ) : null}
          <div className="hidden shrink-0 items-center lg:flex">
            <LanguageSelector />
            <ThemeToggle />
          </div>
          <MobileNav categories={categories} editorPath={editorPath} />
        </div>
      </div>
    </header>
  );
}
