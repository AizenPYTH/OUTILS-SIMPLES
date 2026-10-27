import { defaultLocale, getLocale, localePrefix, type Locale } from "./locale";

/** English paths of the static French pages (the keys are the canonical French paths). */
export const staticRoutes: Record<string, Record<Locale, string>> = {
  "/": { fr: "/", en: "/en/" },
  "/outils/": { fr: "/outils/", en: "/en/tools/" },
  "/guides/": { fr: "/guides/", en: "/en/guides/" },
  "/a-propos/": { fr: "/a-propos/", en: "/en/about/" },
  "/contact/": { fr: "/contact/", en: "/en/contact/" },
  "/confidentialite/": { fr: "/confidentialite/", en: "/en/privacy/" },
  "/conditions-utilisation/": { fr: "/conditions-utilisation/", en: "/en/terms/" },
  "/gestion-cookies/": { fr: "/gestion-cookies/", en: "/en/cookies/" },
  "/mentions-legales/": { fr: "/mentions-legales/", en: "/en/legal-notice/" },
  "/affiliation/": { fr: "/affiliation/", en: "/en/affiliate-disclosure/" },
  "/hors-ligne/": { fr: "/hors-ligne/", en: "/en/offline/" },
  "/verifiez-le/": { fr: "/verifiez-le/", en: "/en/verify-it/" },
};

/** Path of a static page in a locale, from its French (canonical) path. */
export function localizedPath(frPath: string, locale: Locale = getLocale()): string {
  const entry = staticRoutes[frPath];
  if (entry) return entry[locale];
  return locale === defaultLocale ? frPath : `${localePrefix(locale)}${frPath}`;
}

/** French path of a localized static path, or null when it is not a static page. */
export function staticPathToFrench(path: string): string | null {
  for (const [fr, byLocale] of Object.entries(staticRoutes)) {
    if (Object.values(byLocale).includes(path)) return fr;
  }
  return null;
}

/** Strips the locale prefix: "/en/tools/" → "/tools/". */
export function stripLocalePrefix(path: string, locale: Locale): string {
  const prefix = localePrefix(locale);
  if (!prefix) return path;
  if (path === prefix || path === `${prefix}/`) return "/";
  return path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : path;
}
