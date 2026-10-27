"use client";

import * as React from "react";
import Script from "next/script";
import { publicEnv } from "@/config/env";
import { useConsent } from "@/lib/consent/use-consent";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n/messages";

export type AdPlacement = "directory-footer" | "tool-aside" | "tool-bottom" | "guide-bottom";

/** Reserved sizes per placement (handoff: 728×90 catalogue footer, 300×250 tool aside). */
const placementConfig: Record<
  AdPlacement,
  { width: number; height: number; slotEnv: string; label: string }
> = {
  "directory-footer": {
    width: 728,
    height: 90,
    slotEnv: publicEnv.NEXT_PUBLIC_ADSENSE_SLOT_DIRECTORY,
    label: "728×90",
  },
  "tool-aside": {
    width: 300,
    height: 250,
    slotEnv: publicEnv.NEXT_PUBLIC_ADSENSE_SLOT_TOOL_BOTTOM,
    label: "300×250",
  },
  "tool-bottom": {
    width: 728,
    height: 90,
    slotEnv: publicEnv.NEXT_PUBLIC_ADSENSE_SLOT_TOOL_BOTTOM,
    label: "728×90",
  },
  "guide-bottom": {
    width: 728,
    height: 90,
    slotEnv: publicEnv.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_BOTTOM,
    label: "728×90",
  },
};

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
}

/**
 * Advertising placement. Renders NOTHING unless:
 *   NEXT_PUBLIC_ADS_ENABLED=true, a publisher id and slot id are configured,
 *   and the visitor consented to advertising.
 * When active it reserves its size up-front to avoid layout shift. In
 * development with ads enabled but no consent, a dotted placeholder shows the
 * reserved area so layouts can be checked without loading any ad script.
 */
export function AdSlot({ placement, className }: AdSlotProps) {
  const { consent, hydrated } = useConsent();
  const config = placementConfig[placement];
  const enabled =
    publicEnv.NEXT_PUBLIC_ADS_ENABLED && !!publicEnv.NEXT_PUBLIC_ADSENSE_CLIENT && !!config.slotEnv;

  if (!enabled) return null;

  const canLoad = hydrated && consent.advertising;
  return (
    <div
      className={cn("mx-auto flex w-full max-w-full flex-col items-center gap-1", className)}
      style={{ minHeight: config.height + 20 }}
      aria-label={tr("Publicité")}
      data-testid={`ad-slot-${placement}`}
    >
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {tr("Publicité")}
      </span>
      {canLoad ? (
        <>
          <Script
            id="adsbygoogle-script"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publicEnv.NEXT_PUBLIC_ADSENSE_CLIENT)}`}
            crossOrigin="anonymous"
            strategy="lazyOnload"
          />
          <ins
            className="adsbygoogle block"
            style={{
              display: "block",
              width: "100%",
              maxWidth: config.width,
              height: config.height,
            }}
            data-ad-client={publicEnv.NEXT_PUBLIC_ADSENSE_CLIENT}
            data-ad-slot={config.slotEnv}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
          <Script id={`adsbygoogle-push-${placement}`} strategy="lazyOnload">
            {`(window.adsbygoogle=window.adsbygoogle||[]).push({});`}
          </Script>
        </>
      ) : (
        <div
          className="flex w-full items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground"
          style={{ maxWidth: config.width, height: config.height }}
        >
          {config.label}
        </div>
      )}
    </div>
  );
}
