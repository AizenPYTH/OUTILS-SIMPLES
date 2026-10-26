"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ToolIconName } from "@/lib/tools/types";
import { t } from "@/lib/i18n";

const MobileNavDrawer = dynamic(
  () => import("./mobile-nav-drawer").then((m) => m.MobileNavDrawer),
  {
    ssr: false,
  },
);

export interface MobileNavCategory {
  id: string;
  path: string;
  shortName: string;
  icon: ToolIconName;
  count: number;
}

interface MobileNavProps {
  categories: MobileNavCategory[];
  editorPath: string | null;
}

/** Touch menu: the button is server-rendered, the drawer (44px rows, categories with counts, site links) loads on first open. */
export function MobileNav({ categories, editorPath }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = React.useState(pathname);
  // Close the drawer after a navigation (state adjusted during render, no effect needed).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <div className="md:hidden">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
        aria-label={t.common.openMenu}
        data-testid="mobile-menu-trigger"
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>
      {loaded ? (
        <MobileNavDrawer
          open={open}
          onOpenChange={setOpen}
          categories={categories}
          editorPath={editorPath}
          triggerRef={triggerRef}
        />
      ) : null}
    </div>
  );
}
