"use client";

import * as React from "react";
import Link from "next/link";
import { publicEnv } from "@/config/env";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/lib/consent/use-consent";
import { t } from "@/lib/i18n";
import { ConsentPreferencesDialog } from "./consent-preferences";

/**
 * Shown only when a third-party service that needs consent is configured and
 * the visitor has not decided yet. With the default configuration (no ads, no
 * analytics) the banner never appears because nothing needs consent.
 */
export function consentRequired(): boolean {
  return publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER !== "none" || publicEnv.NEXT_PUBLIC_ADS_ENABLED;
}

export function ConsentBanner() {
  const { hydrated, decided, update } = useConsent();
  const [customize, setCustomize] = React.useState(false);

  if (publicEnv.NEXT_PUBLIC_CONSENT_MODE !== "builtin") return null;
  if (!consentRequired() || !hydrated || decided) return null;

  return (
    <div
      role="region"
      aria-label={t.consent.title}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface p-4 shadow-lg sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-md sm:rounded-lg sm:border"
      data-testid="consent-banner"
    >
      <h2 className="text-base font-semibold">{t.consent.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t.consent.body}{" "}
        <Link href="/gestion-cookies/" className="underline">
          {t.common.learnMore}
        </Link>
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button onClick={() => update({ analytics: true, advertising: publicEnv.NEXT_PUBLIC_ADS_ENABLED })}>
          {t.consent.acceptAll}
        </Button>
        <Button variant="outline" onClick={() => update({ analytics: false, advertising: false })}>
          {t.consent.rejectAll}
        </Button>
        <Button variant="ghost" onClick={() => setCustomize(true)}>
          {t.consent.customize}
        </Button>
      </div>
      <ConsentPreferencesDialog open={customize} onOpenChange={setCustomize} />
    </div>
  );
}
