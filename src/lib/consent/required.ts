import { publicEnv } from "@/config/env";

/**
 * True when a third-party service that needs consent is configured. With the
 * default configuration (no ads, no analytics) nothing needs consent, so the
 * banner and the analytics loader are not even shipped to the browser.
 */
export function consentRequired(): boolean {
  return publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER !== "none" || publicEnv.NEXT_PUBLIC_ADS_ENABLED;
}

export function analyticsConfigured(): boolean {
  return publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER !== "none";
}
