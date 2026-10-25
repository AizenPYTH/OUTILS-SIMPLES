"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getCategoryPath, type ToolCategory } from "@/lib/tools";
import { t } from "@/lib/i18n";
import { ToolIcon } from "@/components/tools/tool-icon";
import { LanguageSelector } from "./language-selector";
import { ThemeToggle } from "./theme-toggle";

interface MobileNavProps {
  categories: ToolCategory[];
  editorPath: string | null;
}

export function MobileNav({ categories, editorPath }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = React.useState(pathname);
  // Close the drawer after a navigation (state adjusted during render, no effect needed).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  const links = [
    { href: "/outils/", label: t.nav.tools },
    { href: "/guides/", label: t.nav.guides },
    { href: "/a-propos/", label: t.nav.about },
    { href: "/contact/", label: t.nav.contact },
  ];

  return (
    <div className="lg:hidden">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={t.common.openMenu}
        data-testid="mobile-menu-trigger"
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          size="sm"
          className="left-auto right-0 top-0 h-dvh max-h-none w-[min(20rem,calc(100%-2rem))] translate-x-0 translate-y-0 rounded-none border-l p-5 pt-14"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogTitle className="sr-only">{t.common.menu}</DialogTitle>
          <DialogDescription className="sr-only">{t.nav.categories}</DialogDescription>
          <nav aria-label={t.common.menu} className="flex flex-col gap-6">
            {editorPath ? (
              <Button asChild size="lg" className="w-full">
                <Link href={editorPath}>
                  <SquarePen aria-hidden="true" />
                  {t.nav.pdfEditor}
                </Link>
              </Button>
            ) : null}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.nav.categories}
              </p>
              <ul className="flex flex-col">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={getCategoryPath(category)}
                      className="flex items-center gap-3 rounded-md px-2 py-2.5 text-sm font-medium hover:bg-muted"
                    >
                      <ToolIcon name={category.icon} className="size-4 text-muted-foreground" />
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <ul className="flex flex-col border-t border-border pt-4">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-md px-2 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
}
