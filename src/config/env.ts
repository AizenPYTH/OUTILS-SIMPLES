import { z } from "zod";

/**
 * Public (client-safe) environment variables, validated once at module load.
 * Only NEXT_PUBLIC_* values are read here: they are inlined in the client
 * bundle by Next.js, so they must never contain secrets.
 */
const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default("http://localhost:3000")
    .transform((v) => v.replace(/\/+$/, "")),
  NEXT_PUBLIC_ADS_ENABLED: booleanString,
  NEXT_PUBLIC_ADSENSE_CLIENT: z.string().default(""),
  NEXT_PUBLIC_ADSENSE_SLOT_DIRECTORY: z.string().default(""),
  NEXT_PUBLIC_ADSENSE_SLOT_TOOL_BOTTOM: z.string().default(""),
  NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_BOTTOM: z.string().default(""),
  NEXT_PUBLIC_CONSENT_MODE: z.enum(["builtin", "external"]).default("builtin"),
  NEXT_PUBLIC_ANALYTICS_PROVIDER: z.enum(["none", "plausible", "gtag"]).default("none"),
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().default(""),
  NEXT_PUBLIC_PLAUSIBLE_HOST: z.string().default(""),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().default(""),
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: z.string().default(""),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function emptyToUndefined(value: string | undefined): string | undefined {
  return value === "" ? undefined : value;
}

export function parsePublicEnv(raw: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: emptyToUndefined(raw.NEXT_PUBLIC_SITE_URL),
    NEXT_PUBLIC_ADS_ENABLED: emptyToUndefined(raw.NEXT_PUBLIC_ADS_ENABLED),
    NEXT_PUBLIC_ADSENSE_CLIENT: raw.NEXT_PUBLIC_ADSENSE_CLIENT,
    NEXT_PUBLIC_ADSENSE_SLOT_DIRECTORY: raw.NEXT_PUBLIC_ADSENSE_SLOT_DIRECTORY,
    NEXT_PUBLIC_ADSENSE_SLOT_TOOL_BOTTOM: raw.NEXT_PUBLIC_ADSENSE_SLOT_TOOL_BOTTOM,
    NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_BOTTOM: raw.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_BOTTOM,
    NEXT_PUBLIC_CONSENT_MODE: emptyToUndefined(raw.NEXT_PUBLIC_CONSENT_MODE),
    NEXT_PUBLIC_ANALYTICS_PROVIDER: emptyToUndefined(raw.NEXT_PUBLIC_ANALYTICS_PROVIDER),
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: raw.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
    NEXT_PUBLIC_PLAUSIBLE_HOST: raw.NEXT_PUBLIC_PLAUSIBLE_HOST,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: raw.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: raw.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  });
  if (!result.success) {
    throw new Error(`Invalid public environment configuration: ${result.error.message}`);
  }
  return result.data;
}

/*
 * Each variable is referenced explicitly (process.env.NAME) so that Next.js can
 * inline it in client bundles. Do NOT replace this with a loop over process.env.
 */
export const publicEnv: PublicEnv = parsePublicEnv({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_ADS_ENABLED: process.env.NEXT_PUBLIC_ADS_ENABLED,
  NEXT_PUBLIC_ADSENSE_CLIENT: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
  NEXT_PUBLIC_ADSENSE_SLOT_DIRECTORY: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DIRECTORY,
  NEXT_PUBLIC_ADSENSE_SLOT_TOOL_BOTTOM: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOOL_BOTTOM,
  NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_BOTTOM: process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_BOTTOM,
  NEXT_PUBLIC_CONSENT_MODE: process.env.NEXT_PUBLIC_CONSENT_MODE,
  NEXT_PUBLIC_ANALYTICS_PROVIDER: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER,
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
  NEXT_PUBLIC_PLAUSIBLE_HOST: process.env.NEXT_PUBLIC_PLAUSIBLE_HOST,
  NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
});
