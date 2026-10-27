import { AppProviders } from "@/components/providers/app-providers";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { ConsentGate } from "@/components/monetization/consent-gate";
import { ServiceWorkerRegistration } from "@/components/offline/sw-register";
import { t } from "@/lib/i18n";
import { setRequestLocale, type Locale } from "@/lib/i18n/locale";
import { fontBody, fontHeading, fontSignature } from "@/app/fonts";

/**
 * The <html>/<body> shell shared by the French root (`app/(fr)`) and the
 * English root (`app/en`). Each root layout sets the request locale before
 * rendering so that server components resolve the right dictionary, and the
 * LocaleProvider does the same for client components.
 */
export function RootDocument({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  setRequestLocale(locale);
  return (
    <html
      lang={locale}
      className={`${fontBody.variable} ${fontHeading.variable} ${fontSignature.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col overflow-x-clip">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          {t.common.skipToContent}
        </a>
        <LocaleProvider locale={locale}>
          <AppProviders>
            <ServiceWorkerRegistration />
            {children}
            <ConsentGate />
          </AppProviders>
        </LocaleProvider>
      </body>
    </html>
  );
}
