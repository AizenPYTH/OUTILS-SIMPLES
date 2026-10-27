import { publicEnv, type PublicEnv } from "./env";

/**
 * Advertising placements: logical ids, not AdSense ids. Everything is off by
 * default; a placement only becomes active when the system is enabled, a
 * provider is chosen, the publisher id exists and that placement has its own
 * ad unit id. Pages decide where a placement may appear; this file decides
 * whether it does.
 */
export const AD_PLACEMENTS = [
  "home-after-intro",
  "tool-after-intro",
  "tool-after-result",
  "guide-inline",
  "guide-end",
  "category-inline",
] as const;
export type AdPlacementId = (typeof AD_PLACEMENTS)[number];

export type AdFormat = "horizontal" | "rectangle";

export interface AdPlacementSpec {
  /** Reserved box (CSS px) once an ad is allowed to load: avoids layout shift. */
  format: AdFormat;
  width: number;
  height: number;
  /** Where the placement is rendered (documentation + tests). */
  pages: string;
  env: keyof PublicEnv;
}

export const AD_PLACEMENT_SPECS: Record<AdPlacementId, AdPlacementSpec> = {
  "home-after-intro": {
    format: "horizontal",
    width: 728,
    height: 90,
    pages: "home (after the hero: drop zone, search and shortcuts stay first)",
    env: "NEXT_PUBLIC_ADSENSE_SLOT_HOME_AFTER_INTRO",
  },
  "tool-after-intro": {
    format: "horizontal",
    width: 728,
    height: 90,
    pages: "tool pages, under the work area (never above the drop zone)",
    env: "NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_INTRO",
  },
  "tool-after-result": {
    format: "rectangle",
    width: 336,
    height: 280,
    pages: "tool pages, end of the main column after FAQ and guides",
    env: "NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_RESULT",
  },
  "guide-inline": {
    format: "horizontal",
    width: 728,
    height: 90,
    pages: "guides with at least three sections, after the second one",
    env: "NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_INLINE",
  },
  "guide-end": {
    format: "rectangle",
    width: 336,
    height: 280,
    pages: "guides, after the related tools",
    env: "NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_END",
  },
  "category-inline": {
    format: "horizontal",
    width: 728,
    height: 90,
    pages: "category pages, after the tool list (not on the full catalogue)",
    env: "NEXT_PUBLIC_ADSENSE_SLOT_CATEGORY_INLINE",
  },
};

export interface AdsConfig {
  enabled: boolean;
  provider: PublicEnv["NEXT_PUBLIC_ADS_PROVIDER"];
  client: string;
  /** Placements that can load a real ad (all other placements render nothing). */
  active: ReadonlySet<AdPlacementId>;
  /** Simulation boxes for layout checks; never true in a production build. */
  preview: boolean;
}

export function resolveAdsConfig(env: PublicEnv, nodeEnv = process.env.NODE_ENV): AdsConfig {
  const client = env.NEXT_PUBLIC_ADSENSE_CLIENT.trim();
  const enabled =
    env.NEXT_PUBLIC_ADS_ENABLED && env.NEXT_PUBLIC_ADS_PROVIDER !== "none" && !!client;
  const active = new Set<AdPlacementId>();
  if (enabled) {
    for (const id of AD_PLACEMENTS) {
      if (String(env[AD_PLACEMENT_SPECS[id].env] ?? "").trim()) active.add(id);
    }
  }
  return {
    enabled,
    provider: enabled ? env.NEXT_PUBLIC_ADS_PROVIDER : "none",
    client: enabled ? client : "",
    active,
    preview: env.NEXT_PUBLIC_ADS_PREVIEW && nodeEnv !== "production",
  };
}

let cached: AdsConfig | null = null;

export function adsConfig(): AdsConfig {
  cached ??= resolveAdsConfig(publicEnv);
  return cached;
}

export function isPlacementActive(id: AdPlacementId): boolean {
  return adsConfig().active.has(id);
}
