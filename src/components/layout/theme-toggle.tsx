"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

const LazyThemeMenu = dynamic(() => import("./theme-menu").then((m) => m.ThemeMenu), {
  ssr: false,
});

/**
 * Header button: rendered on the server; the dropdown is downloaded on the first
 * click and opens immediately in place of the placeholder button.
 */
export function ThemeToggle() {
  const [loaded, setLoaded] = React.useState(false);
  if (loaded) return <LazyThemeMenu defaultOpen />;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t.nav.theme}
      aria-haspopup="menu"
      data-testid="theme-toggle"
      onClick={() => setLoaded(true)}
    >
      <Sun className="size-5 dark:hidden" aria-hidden="true" />
      <Moon className="hidden size-5 dark:block" aria-hidden="true" />
    </Button>
  );
}
