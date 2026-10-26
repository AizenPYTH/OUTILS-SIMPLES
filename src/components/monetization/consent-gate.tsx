"use client";

import dynamic from "next/dynamic";
import { analyticsConfigured, consentRequired } from "@/lib/consent/required";

/*
 * Client-side split point: a client component referenced from a server
 * component always ships with the page, even inside a server `import()`.
 * Here the banner and the analytics loader are only downloaded when a service
 * that needs consent is configured (never with the default configuration).
 */
const ConsentBanner = dynamic(() => import("./consent-banner").then((m) => m.ConsentBanner), {
  ssr: false,
});
const AnalyticsLoader = dynamic(() => import("./analytics-loader").then((m) => m.AnalyticsLoader), {
  ssr: false,
});

export function ConsentGate() {
  if (!consentRequired()) return null;
  return (
    <>
      <ConsentBanner />
      {analyticsConfigured() ? <AnalyticsLoader /> : null}
    </>
  );
}
