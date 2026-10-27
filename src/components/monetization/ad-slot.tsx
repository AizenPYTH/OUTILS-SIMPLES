"use client";

import * as React from "react";
import Script from "next/script";
import { AD_PLACEMENT_SPECS, adsConfig, type AdPlacementId } from "@/config/ads";
import { publicEnv } from "@/config/env";
import { useConsent } from "@/lib/consent/use-consent";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface AdSlotProps {
  /** Logical placement (src/config/ads.ts), not an AdSense id. */
  placement: AdPlacementId;
  className?: string;
}

/**
 * Advertising placement. Renders NOTHING unless the placement is active
 * (system enabled, provider, publisher id and this placement's ad unit id)
 * AND the visitor consented to advertising; before that, no space is reserved
 * and no script is referenced. Once allowed, the box reserves the placement's
 * size up-front to limit layout shift, is labelled in the page language and
 * loads the provider script from this component only (never from a layout).
 *
 * Development preview (NEXT_PUBLIC_ADS_PREVIEW=true, ignored in production
 * builds): a clearly marked simulation box showing the placement name, with
 * no network activity and nothing clickable.
 */
export function AdSlot({ placement, className }: AdSlotProps) {
  const config = adsConfig();
  const spec = AD_PLACEMENT_SPECS[placement];
  const { consent, hydrated } = useConsent();

  if (config.preview) {
    return (
      <div
        role="note"
        className={cn(
          "mx-auto flex w-full max-w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-warning/60 bg-warning-soft/40 px-4 text-center text-xs text-warning-foreground",
          className,
        )}
        style={{ maxWidth: spec.width, minHeight: spec.height }}
        data-testid="ad-preview"
        data-placement={placement}
      >
        <span className="font-semibold uppercase tracking-wide">{t.ads.previewTitle}</span>
        <code className="text-[11px]">{placement}</code>
        <span>
          {spec.width} × {spec.height} · {t.ads.previewHint}
        </span>
      </div>
    );
  }

  if (!config.active.has(placement)) return null;
  if (!hydrated || !consent.advertising) return null;

  return (
    <div
      className={cn("mx-auto flex w-full max-w-full flex-col items-center gap-1", className)}
      style={{ minHeight: spec.height + 20 }}
      aria-label={t.ads.label}
      data-testid={`ad-slot-${placement}`}
    >
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {t.ads.label}
      </span>
      {config.provider === "adsense" ? (
        <AdSenseUnit placement={placement} client={config.client} />
      ) : null}
    </div>
  );
}

/** Google AdSense ad unit. The library script is referenced here only, lazily, after consent. */
function AdSenseUnit({ placement, client }: { placement: AdPlacementId; client: string }) {
  const spec = AD_PLACEMENT_SPECS[placement];
  const slot = String(publicEnv[spec.env] ?? "").trim();
  return (
    <>
      <Script
        id="adsbygoogle-script"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`}
        crossOrigin="anonymous"
        strategy="lazyOnload"
      />
      <ins
        className="adsbygoogle block"
        style={{ display: "block", width: "100%", maxWidth: spec.width, height: spec.height }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={spec.format === "horizontal" ? "horizontal" : "rectangle"}
        data-full-width-responsive="true"
      />
      <Script id={`adsbygoogle-push-${placement}`} strategy="lazyOnload">
        {`(window.adsbygoogle=window.adsbygoogle||[]).push({});`}
      </Script>
    </>
  );
}
