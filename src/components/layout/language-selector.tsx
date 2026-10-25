"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { siteConfig } from "@/config/site";
import { t } from "@/lib/i18n";

/**
 * Placeholder for future internationalisation: lists the configured languages
 * and only enables the published ones. Switching languages will route to a
 * localised prefix once an English dictionary and pages exist.
 */
export function LanguageSelector() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t.nav.language}>
          <Languages className="size-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t.nav.language}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={siteConfig.language}>
          {siteConfig.supportedLanguages.map((lang) => (
            <DropdownMenuRadioItem key={lang.code} value={lang.code} disabled={!lang.published}>
              {lang.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-xs text-muted-foreground">{t.nav.languageComingSoon}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
