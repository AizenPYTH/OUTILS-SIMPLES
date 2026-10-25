import { fr, type Dictionary } from "./fr";

export type Locale = "fr";

const dictionaries: Record<Locale, Dictionary> = { fr };

export const defaultLocale: Locale = "fr";

/**
 * Returns the dictionary for the current locale. The site ships French only;
 * when English is added, the layout will resolve the locale from the route
 * and pass it down (or expose it through a context) instead of this constant.
 */
export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale];
}

export const t = getDictionary();
export { fr };
export type { Dictionary };
