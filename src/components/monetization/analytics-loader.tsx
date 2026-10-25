"use client";

import * as React from "react";
import Script from "next/script";
import { publicEnv } from "@/config/env";
import { useConsent } from "@/lib/consent/use-consent";

/**
 * Loads the configured analytics script only after the visitor consented.
 * With NEXT_PUBLIC_ANALYTICS_PROVIDER=none (default) it renders nothing.
 */
export function AnalyticsLoader() {
  const { consent, hydrated } = useConsent();
  const provider = publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER;

  if (!hydrated || provider === "none" || !consent.analytics) return null;

  if (provider === "plausible" && publicEnv.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) {
    const host = publicEnv.NEXT_PUBLIC_PLAUSIBLE_HOST || "https://plausible.io";
    return (
      <Script
        defer
        data-domain={publicEnv.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
        src={`${host}/js/script.manual.js`}
        strategy="afterInteractive"
      />
    );
  }

  if (provider === "gtag" && publicEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    const id = publicEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    return (
      <>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(id)},{anonymize_ip:true});`}
        </Script>
      </>
    );
  }
  return null;
}
