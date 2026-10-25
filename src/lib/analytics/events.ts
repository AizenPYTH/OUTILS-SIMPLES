import { publicEnv } from "@/config/env";
import { readConsent } from "@/lib/consent/store";

/**
 * Analytics abstraction. Events are named, low-cardinality and never carry
 * file names, document contents or personal data. Nothing is sent unless a
 * provider is configured AND the visitor consented to analytics.
 */
export type AnalyticsEventName =
  | "tool_view"
  | "tool_start"
  | "tool_success"
  | "tool_error"
  | "tool_download"
  | "search"
  | "consent_update"
  | "premium_cta_click";

export interface AnalyticsEventProps {
  tool?: string;
  category?: string;
  /** Coarse bucket (e.g. "lt1mb", "1-10mb"), never the exact size. */
  sizeBucket?: string;
  pagesBucket?: string;
  errorCode?: string;
  resultCount?: number;
  option?: string;
}

const ALLOWED_PROP_KEYS: (keyof AnalyticsEventProps)[] = [
  "tool",
  "category",
  "sizeBucket",
  "pagesBucket",
  "errorCode",
  "resultCount",
  "option",
];

export function sizeBucket(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return "lt1mb";
  if (mb < 10) return "1-10mb";
  if (mb < 50) return "10-50mb";
  return "gt50mb";
}

export function pagesBucket(pages: number): string {
  if (pages <= 1) return "1";
  if (pages <= 10) return "2-10";
  if (pages <= 50) return "11-50";
  return "gt50";
}

/** Strips anything not in the allow-list so a mistake upstream cannot leak data. */
export function sanitizeProps(
  props: AnalyticsEventProps | undefined,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (!props) return out;
  for (const key of ALLOWED_PROP_KEYS) {
    const value = props[key];
    if (typeof value === "string" && value.length <= 64) out[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

type PlausibleFn = (event: string, options?: { props?: Record<string, string | number> }) => void;
type GtagFn = (command: "event", name: string, params?: Record<string, string | number>) => void;

declare global {
  interface Window {
    plausible?: PlausibleFn;
    gtag?: GtagFn;
  }
}

export function isAnalyticsActive(): boolean {
  if (publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER === "none") return false;
  if (typeof window === "undefined") return false;
  return readConsent().analytics;
}

export function track(name: AnalyticsEventName, props?: AnalyticsEventProps): void {
  if (!isAnalyticsActive()) return;
  const safeProps = sanitizeProps(props);
  try {
    if (publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER === "plausible" && window.plausible) {
      window.plausible(name, { props: safeProps });
    } else if (publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER === "gtag" && window.gtag) {
      window.gtag("event", name, safeProps);
    }
  } catch {
    // Analytics must never break the product.
  }
}
