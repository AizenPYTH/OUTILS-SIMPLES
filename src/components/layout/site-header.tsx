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
import { tr } from "@/lib/i18n/messages";

/** Direct links to the most used tools, with short labels (full names are on the pages). */
const QUICK_TOOLS = () => [
  { id: "pdf-merge", label: tr("Fusionner PDF") },
  { id: "pdf-compress", label: tr("Compresser PDF") },
  { id: "pdf-edit", label: tr("Modifier PDF") },
  { id: "conv-pdf-docx", label: tr("PDF en Word") },
];

/**
 * Header: logo, direct links to the four most used tools (from 1280 px),
 * the catalogue button, search, theme/language and the mobile menu. The
 * catalogue, the home grid and the menu hold every family.
 */
export function SiteHeader() {
  const categories = getActiveCategories();
  const quick = QUICK_TOOLS().flatMap(({ id, label }) => {
    const tool = getToolById(id);
    return tool && tool.status === "published" ? [{ id, label, path: getToolPath(tool) }] : [];
  });
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
          aria-label={tr("Navigation principale")}
          className="hidden shrink-0 items-center gap-1 xl:flex"
        >
          {quick.map((tool) => (
            <Link
              key={tool.id}
              href={tool.path}
              className="rounded-md px-3 py-2 text-[13px] font-bold uppercase tracking-[0.03em] text-foreground transition-colors hover:bg-primary-soft hover:text-accent-foreground"
            >
              {tool.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
          <SearchDialog variant="field" index={searchIndex} />
          <Button size="sm" asChild className="hidden shrink-0 md:inline-flex">
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
