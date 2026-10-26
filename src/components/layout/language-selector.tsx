"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

const LazyLanguageMenu = dynamic(() => import("./language-menu").then((m) => m.LanguageMenu), {
  ssr: false,
});

/** Header button rendered on the server; the menu is downloaded on the first click. */
export function LanguageSelector() {
  const [loaded, setLoaded] = React.useState(false);
  if (loaded) return <LazyLanguageMenu defaultOpen />;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t.nav.language}
      aria-haspopup="menu"
      onClick={() => setLoaded(true)}
    >
      <Languages className="size-5" aria-hidden="true" />
    </Button>
  );
}
