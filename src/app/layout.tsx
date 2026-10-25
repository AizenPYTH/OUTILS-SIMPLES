import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import { publicEnv } from "@/config/env";
import { AppProviders } from "@/components/providers/app-providers";
import { ConsentBanner } from "@/components/monetization/consent-banner";
import { AnalyticsLoader } from "@/components/monetization/analytics-loader";
import { t } from "@/lib/i18n";
import { fontBody, fontHeading, fontSignature } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} – ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: `${siteConfig.name} – ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: { card: "summary" },
  verification: publicEnv.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: publicEnv.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f1b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={siteConfig.language}
      className={`${fontBody.variable} ${fontHeading.variable} ${fontSignature.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          {t.common.skipToContent}
        </a>
        <AppProviders>
          {children}
          <ConsentBanner />
          <AnalyticsLoader />
        </AppProviders>
      </body>
    </html>
  );
}
