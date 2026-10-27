"use client";

import * as React from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { t } from "@/lib/i18n";
import { locales, type Locale } from "@/lib/i18n/locale";
import { localizedPath } from "@/lib/i18n/routes";
import { cn } from "@/lib/utils";

const labels: Record<Locale, string> = { fr: "FR", en: "EN" };

/**
 * Two plain links (full page load: the locales have different root layouts).
 * The target of the other language is the page's own hreflang alternate
 * when it exists, otherwise that language's home page: no loop, no guess.
 */
function homeTargets(): Record<Locale, string> {
  return { fr: localizedPath("/", "fr"), en: localizedPath("/", "en") };
}

/** Reads the page's hreflang alternates; serialised so the snapshot is stable between renders. */
function readTargets(): string {
  const next = homeTargets();
  for (const locale of locales) {
    const link = document.querySelector<HTMLLinkElement>(
      `link[rel="alternate"][hreflang="${locale}"]`,
    );
    if (link?.href) {
      try {
        next[locale] = new URL(link.href).pathname;
      } catch {
        /* keep the home page */
      }
    }
  }
  return `${next.fr}\n${next.en}`;
}

const serverSnapshot = () => {
  const home = homeTargets();
  return `${home.fr}\n${home.en}`;
};
/** The alternates live in <head> and change on every client navigation: watch them. */
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.head, { childList: true, subtree: true, attributes: true });
  return () => observer.disconnect();
};

export function LanguageSwitcher() {
  const current = useLocale();
  const snapshot = React.useSyncExternalStore(subscribe, readTargets, serverSnapshot);
  const targets = React.useMemo(() => {
    const [fr, en] = snapshot.split("\n");
    return { fr, en } as Record<Locale, string>;
  }, [snapshot]);

  return (
    <nav aria-label={t.languageSwitcher.label} data-testid="language-switcher">
      <ul className="flex items-center rounded-md border border-border p-0.5 text-xs font-semibold">
        {locales.map((locale) => (
          <li key={locale}>
            <a
              href={targets[locale]}
              hrefLang={locale}
              lang={locale}
              aria-current={locale === current ? "true" : undefined}
              data-testid={`lang-${locale}`}
              className={cn(
                "inline-flex h-7 min-w-9 items-center justify-center rounded-[5px] px-2 transition-colors",
                locale === current
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span aria-hidden="true">{labels[locale]}</span>
              <span className="sr-only">
                {locale === "fr" ? t.languageSwitcher.french : t.languageSwitcher.english}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
