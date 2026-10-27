"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutGrid, SquarePen } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ToolIcon } from "@/components/tools/tool-icon";
import { t } from "@/lib/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeMenu } from "./theme-menu";
import type { MobileNavCategory } from "./mobile-nav";
import { localizedPath } from "@/lib/i18n/routes";

interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MobileNavCategory[];
  editorPath: string | null;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

/** The drawer itself, downloaded on first open. */
export function MobileNavDrawer({
  open,
  onOpenChange,
  categories,
  editorPath,
  triggerRef,
}: MobileNavDrawerProps) {
  const links = [
    { href: localizedPath("/guides/"), label: t.nav.guides },
    { href: localizedPath("/a-propos/"), label: t.nav.about },
    { href: localizedPath("/contact/"), label: t.nav.contact },
  ];
  const row =
    "flex min-h-11 items-center gap-3 rounded-md px-2 py-2 text-[15px] font-medium hover:bg-muted";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        className="left-auto right-0 top-0 h-dvh max-h-none w-[min(20rem,calc(100%-2rem))] translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l p-5 pt-14"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">{t.common.menu}</DialogTitle>
        <DialogDescription className="sr-only">{t.nav.categories}</DialogDescription>
        <nav aria-label={t.common.menu} className="flex flex-col gap-5">
          <ul className="flex flex-col">
            <li>
              <Link
                href={localizedPath("/outils/")}
                className={row}
                data-testid="mobile-nav-all-tools"
              >
                <LayoutGrid className="size-4 text-muted-foreground" aria-hidden="true" />
                {t.nav.tools}
              </Link>
            </li>
            {editorPath ? (
              <li>
                <Link href={editorPath} className={row}>
                  <SquarePen className="size-4 text-muted-foreground" aria-hidden="true" />
                  {t.nav.pdfEditor}
                </Link>
              </li>
            ) : null}
          </ul>
          <div>
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.nav.categories}
            </p>
            <ul className="flex flex-col">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link href={category.path} className={row}>
                    <ToolIcon name={category.icon} className="size-4 text-muted-foreground" />
                    <span className="flex-1">{category.shortName}</span>
                    <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">
                      {category.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <ul className="flex flex-col border-t border-border pt-3">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={row}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 border-t border-border pt-4">
            <LanguageSwitcher />
            <ThemeMenu />
          </div>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
