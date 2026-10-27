/**
 * Locale model. French is the default and lives at the root of the site
 * (existing URLs are kept); English lives under /en/. The "current" locale is
 * ambient: request-scoped on the server (set by each root layout and by every
 * /en page), module-scoped on the client (set by LocaleProvider).
 */
import { cache } from "react";

export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** URL prefix of a locale ("" for French, "/en" for English). */
export function localePrefix(locale: Locale): string {
  return locale === defaultLocale ? "" : `/${locale}`;
}

/** Locale of a pathname ("/en/pdf/merge/" → "en"). */
export function localeFromPathname(pathname: string): Locale {
  const first = pathname.split("/")[1] ?? "";
  return first !== defaultLocale && isLocale(first) ? first : defaultLocale;
}

// --- Server side: one memo per request (React.cache), set by the layouts/pages.
const requestStore = cache((): { locale: Locale | null } => ({ locale: null }));

// --- Client side: set by LocaleProvider before its subtree renders, and from <html lang>.
let clientLocale: Locale | null = null;

function isServer(): boolean {
  return typeof window === "undefined";
}

export function setRequestLocale(locale: Locale): void {
  if (isServer()) {
    try {
      requestStore().locale = locale;
      // Inside a request the memo persists; outside (scripts, unit tests) each
      // call gets a fresh store, so fall back to the module variable.
      if (requestStore().locale === locale) return;
    } catch {
      /* outside a React request scope: fall through */
    }
  }
  clientLocale = locale;
}

/** Current locale; French when nothing set it (scripts, unit tests). */
export function getLocale(): Locale {
  if (isServer()) {
    try {
      const stored = requestStore().locale;
      if (stored) return stored;
    } catch {
      /* outside a React request scope */
    }
    return clientLocale ?? defaultLocale;
  }
  if (clientLocale) return clientLocale;
  const lang = document.documentElement.lang;
  return isLocale(lang) ? lang : defaultLocale;
}
