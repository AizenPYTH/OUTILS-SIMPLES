"use client";

import * as React from "react";
import { setRequestLocale, type Locale } from "@/lib/i18n/locale";

const LocaleContext = React.createContext<Locale>("fr");

/**
 * Makes the locale available to client components. It also sets the ambient
 * client locale during render so that `t` and the registry helpers resolve
 * the right language in this subtree (the browser only ever runs one locale).
 */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  setRequestLocale(locale);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return React.useContext(LocaleContext);
}
