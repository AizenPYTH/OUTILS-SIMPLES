/**
 * Public (client-safe) environment variables, validated once at module load.
 * Only NEXT_PUBLIC_* values are read here: they are inlined in the client
 * bundle by Next.js, so they must never contain secrets.
 *
 * Validation is hand-written (no schema library): this module is imported by
 * client components on every page, so it must stay a few hundred bytes.
 */
const CONSENT_MODES = ["builtin", "external"] as const;
const ANALYTICS_PROVIDERS = ["none", "plausible", "gtag"] as const;
const ADS_PROVIDERS = ["none", "adsense"] as const;
/**
 * Who publishes the site (legal notice wording, launch check):
 * - individual: a private person (name and address published, no company wording);
 * - company: a business (registration number required);
 * - anonymous: a private person publishing on a non-professional basis who keeps
 *   their identity with the host only (LCEN art. 1-1, II) — to be confirmed legally.
 * Empty until the owner chooses: pages show the individual wording with placeholders.
 */
const PUBLISHER_KINDS = ["", "individual", "company", "anonymous"] as const;

export interface PublicEnv {
  NEXT_PUBLIC_SITE_URL: string;
  /** Preview deployments: true forbids indexing everywhere (robots.txt, meta robots, X-Robots-Tag). */
  NEXT_PUBLIC_NOINDEX: boolean;
  /** Master switch of the advertising system (see src/config/ads.ts). */
  NEXT_PUBLIC_ADS_ENABLED: boolean;
  NEXT_PUBLIC_ADS_PROVIDER: (typeof ADS_PROVIDERS)[number];
  /** Development-only preview of the ad placements (ignored in production builds). */
  NEXT_PUBLIC_ADS_PREVIEW: boolean;
  /** AdSense publisher id (ca-pub-…), empty until the account exists. */
  NEXT_PUBLIC_ADSENSE_CLIENT: string;
  /** AdSense ad unit ids, one per logical placement; an empty id disables that placement. */
  NEXT_PUBLIC_ADSENSE_SLOT_HOME_AFTER_INTRO: string;
  NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_INTRO: string;
  NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_RESULT: string;
  NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_INLINE: string;
  NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_END: string;
  NEXT_PUBLIC_ADSENSE_SLOT_CATEGORY_INLINE: string;
  NEXT_PUBLIC_CONSENT_MODE: (typeof CONSENT_MODES)[number];
  NEXT_PUBLIC_ANALYTICS_PROVIDER: (typeof ANALYTICS_PROVIDERS)[number];
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: string;
  NEXT_PUBLIC_PLAUSIBLE_HOST: string;
  NEXT_PUBLIC_GA_MEASUREMENT_ID: string;
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: string;
  /** Legal identity shown on the legal pages (empty = "à compléter" placeholder, never invented). */
  NEXT_PUBLIC_LEGAL_PUBLISHER_KIND: (typeof PUBLISHER_KINDS)[number];
  NEXT_PUBLIC_LEGAL_PUBLISHER_NAME: string;
  NEXT_PUBLIC_LEGAL_PUBLISHER_STATUS: string;
  NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS: string;
  NEXT_PUBLIC_LEGAL_REGISTRATION_NUMBER: string;
  NEXT_PUBLIC_LEGAL_VAT_NUMBER: string;
  NEXT_PUBLIC_LEGAL_PUBLICATION_DIRECTOR: string;
  NEXT_PUBLIC_LEGAL_CONTACT_EMAIL: string;
  NEXT_PUBLIC_LEGAL_HOSTING_PROVIDER: string;
  NEXT_PUBLIC_LEGAL_HOSTING_ADDRESS: string;
  NEXT_PUBLIC_LEGAL_HOSTING_PHONE: string;
}

class PublicEnvError extends Error {
  constructor(name: string, detail: string) {
    super(`Invalid public environment configuration: ${name} ${detail}`);
  }
}

function str(value: string | undefined): string {
  return value ?? "";
}

function oneOf<T extends string>(
  name: string,
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value === undefined || value === "") return fallback;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new PublicEnvError(name, `must be one of ${allowed.join(", ")} (got "${value}")`);
}

function bool(name: string, value: string | undefined): boolean {
  return oneOf(name, value, ["true", "false"] as const, "false") === "true";
}

function url(name: string, value: string | undefined, fallback: string): string {
  const candidate = value === undefined || value === "" ? fallback : value;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new PublicEnvError(name, `must be an absolute URL (got "${candidate}")`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new PublicEnvError(name, `must use http(s) (got "${candidate}")`);
  }
  return candidate.replace(/\/+$/, "");
}

export function parsePublicEnv(raw: Record<string, string | undefined>): PublicEnv {
  return {
    NEXT_PUBLIC_SITE_URL: url(
      "NEXT_PUBLIC_SITE_URL",
      raw.NEXT_PUBLIC_SITE_URL,
      "http://localhost:3000",
    ),
    NEXT_PUBLIC_NOINDEX: bool("NEXT_PUBLIC_NOINDEX", raw.NEXT_PUBLIC_NOINDEX),
    NEXT_PUBLIC_ADS_ENABLED: bool("NEXT_PUBLIC_ADS_ENABLED", raw.NEXT_PUBLIC_ADS_ENABLED),
    NEXT_PUBLIC_ADS_PROVIDER: oneOf(
      "NEXT_PUBLIC_ADS_PROVIDER",
      raw.NEXT_PUBLIC_ADS_PROVIDER,
      ADS_PROVIDERS,
      "none",
    ),
    NEXT_PUBLIC_ADS_PREVIEW: bool("NEXT_PUBLIC_ADS_PREVIEW", raw.NEXT_PUBLIC_ADS_PREVIEW),
    NEXT_PUBLIC_ADSENSE_CLIENT: str(raw.NEXT_PUBLIC_ADSENSE_CLIENT),
    NEXT_PUBLIC_ADSENSE_SLOT_HOME_AFTER_INTRO: str(raw.NEXT_PUBLIC_ADSENSE_SLOT_HOME_AFTER_INTRO),
    NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_INTRO: str(raw.NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_INTRO),
    NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_RESULT: str(raw.NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_RESULT),
    NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_INLINE: str(raw.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_INLINE),
    NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_END: str(raw.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_END),
    NEXT_PUBLIC_ADSENSE_SLOT_CATEGORY_INLINE: str(raw.NEXT_PUBLIC_ADSENSE_SLOT_CATEGORY_INLINE),
    NEXT_PUBLIC_CONSENT_MODE: oneOf(
      "NEXT_PUBLIC_CONSENT_MODE",
      raw.NEXT_PUBLIC_CONSENT_MODE,
      CONSENT_MODES,
      "builtin",
    ),
    NEXT_PUBLIC_ANALYTICS_PROVIDER: oneOf(
      "NEXT_PUBLIC_ANALYTICS_PROVIDER",
      raw.NEXT_PUBLIC_ANALYTICS_PROVIDER,
      ANALYTICS_PROVIDERS,
      "none",
    ),
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: str(raw.NEXT_PUBLIC_PLAUSIBLE_DOMAIN),
    NEXT_PUBLIC_PLAUSIBLE_HOST: str(raw.NEXT_PUBLIC_PLAUSIBLE_HOST),
    NEXT_PUBLIC_GA_MEASUREMENT_ID: str(raw.NEXT_PUBLIC_GA_MEASUREMENT_ID),
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: str(raw.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION),
    NEXT_PUBLIC_LEGAL_PUBLISHER_KIND: oneOf(
      "NEXT_PUBLIC_LEGAL_PUBLISHER_KIND",
      raw.NEXT_PUBLIC_LEGAL_PUBLISHER_KIND,
      PUBLISHER_KINDS,
      "",
    ),
    NEXT_PUBLIC_LEGAL_PUBLISHER_NAME: str(raw.NEXT_PUBLIC_LEGAL_PUBLISHER_NAME),
    NEXT_PUBLIC_LEGAL_PUBLISHER_STATUS: str(raw.NEXT_PUBLIC_LEGAL_PUBLISHER_STATUS),
    NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS: str(raw.NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS),
    NEXT_PUBLIC_LEGAL_REGISTRATION_NUMBER: str(raw.NEXT_PUBLIC_LEGAL_REGISTRATION_NUMBER),
    NEXT_PUBLIC_LEGAL_VAT_NUMBER: str(raw.NEXT_PUBLIC_LEGAL_VAT_NUMBER),
    NEXT_PUBLIC_LEGAL_PUBLICATION_DIRECTOR: str(raw.NEXT_PUBLIC_LEGAL_PUBLICATION_DIRECTOR),
    NEXT_PUBLIC_LEGAL_CONTACT_EMAIL: str(raw.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL),
    NEXT_PUBLIC_LEGAL_HOSTING_PROVIDER: str(raw.NEXT_PUBLIC_LEGAL_HOSTING_PROVIDER),
    NEXT_PUBLIC_LEGAL_HOSTING_ADDRESS: str(raw.NEXT_PUBLIC_LEGAL_HOSTING_ADDRESS),
    NEXT_PUBLIC_LEGAL_HOSTING_PHONE: str(raw.NEXT_PUBLIC_LEGAL_HOSTING_PHONE),
  };
}

/*
 * Each variable is referenced explicitly (process.env.NAME) so that Next.js can
 * inline it in client bundles. Do NOT replace this with a loop over process.env.
 */
export const publicEnv: PublicEnv = parsePublicEnv({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_NOINDEX: process.env.NEXT_PUBLIC_NOINDEX,
  NEXT_PUBLIC_ADS_ENABLED: process.env.NEXT_PUBLIC_ADS_ENABLED,
  NEXT_PUBLIC_ADS_PROVIDER: process.env.NEXT_PUBLIC_ADS_PROVIDER,
  NEXT_PUBLIC_ADS_PREVIEW: process.env.NEXT_PUBLIC_ADS_PREVIEW,
  NEXT_PUBLIC_ADSENSE_CLIENT: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
  NEXT_PUBLIC_ADSENSE_SLOT_HOME_AFTER_INTRO: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_AFTER_INTRO,
  NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_INTRO: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_INTRO,
  NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_RESULT:
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_RESULT,
  NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_INLINE: process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_INLINE,
  NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_END: process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_END,
  NEXT_PUBLIC_ADSENSE_SLOT_CATEGORY_INLINE: process.env.NEXT_PUBLIC_ADSENSE_SLOT_CATEGORY_INLINE,
  NEXT_PUBLIC_CONSENT_MODE: process.env.NEXT_PUBLIC_CONSENT_MODE,
  NEXT_PUBLIC_ANALYTICS_PROVIDER: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER,
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
  NEXT_PUBLIC_PLAUSIBLE_HOST: process.env.NEXT_PUBLIC_PLAUSIBLE_HOST,
  NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  NEXT_PUBLIC_LEGAL_PUBLISHER_KIND: process.env.NEXT_PUBLIC_LEGAL_PUBLISHER_KIND,
  NEXT_PUBLIC_LEGAL_PUBLISHER_NAME: process.env.NEXT_PUBLIC_LEGAL_PUBLISHER_NAME,
  NEXT_PUBLIC_LEGAL_PUBLISHER_STATUS: process.env.NEXT_PUBLIC_LEGAL_PUBLISHER_STATUS,
  NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS: process.env.NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS,
  NEXT_PUBLIC_LEGAL_REGISTRATION_NUMBER: process.env.NEXT_PUBLIC_LEGAL_REGISTRATION_NUMBER,
  NEXT_PUBLIC_LEGAL_VAT_NUMBER: process.env.NEXT_PUBLIC_LEGAL_VAT_NUMBER,
  NEXT_PUBLIC_LEGAL_PUBLICATION_DIRECTOR: process.env.NEXT_PUBLIC_LEGAL_PUBLICATION_DIRECTOR,
  NEXT_PUBLIC_LEGAL_CONTACT_EMAIL: process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL,
  NEXT_PUBLIC_LEGAL_HOSTING_PROVIDER: process.env.NEXT_PUBLIC_LEGAL_HOSTING_PROVIDER,
  NEXT_PUBLIC_LEGAL_HOSTING_ADDRESS: process.env.NEXT_PUBLIC_LEGAL_HOSTING_ADDRESS,
  NEXT_PUBLIC_LEGAL_HOSTING_PHONE: process.env.NEXT_PUBLIC_LEGAL_HOSTING_PHONE,
});
