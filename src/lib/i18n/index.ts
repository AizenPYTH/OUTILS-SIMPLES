import { fr, type Dictionary } from "./fr";
import { defaultLocale, getLocale, type Locale } from "./locale";

// French is always present; other dictionaries are registered by their tree
// (src/lib/i18n/register-en.ts) so the French bundle never ships them.
const dictionaries: Record<Locale, Dictionary> = { fr, en: fr };

export function registerDictionary(locale: Locale, dictionary: Dictionary): void {
  dictionaries[locale] = dictionary;
}

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale];
}

/** BCP 47 tag of the current locale for Intl formatting ("fr-FR" / "en-US"). */
export function currentLanguageTag(): string {
  return dictionaries[getLocale()].site.languageTag;
}

/**
 * Dictionary of the current locale, resolved at access time: `t.nav.home` reads
 * the request locale on the server and the provider's locale on the client, so
 * the components written against `t` are bilingual without changes.
 */
export const t: Dictionary = new Proxy({} as Dictionary, {
  get(_target, key: string | symbol) {
    return dictionaries[getLocale()][key as keyof Dictionary];
  },
  has(_target, key) {
    return key in fr;
  },
  ownKeys() {
    return Reflect.ownKeys(fr);
  },
  getOwnPropertyDescriptor(_target, key) {
    return {
      enumerable: true,
      configurable: true,
      value: dictionaries[getLocale()][key as keyof Dictionary],
    };
  },
});

export { fr };
export type { Dictionary };
export {
  defaultLocale,
  getLocale,
  isLocale,
  localePrefix,
  localeFromPathname,
  locales,
  setRequestLocale,
} from "./locale";
export type { Locale } from "./locale";
