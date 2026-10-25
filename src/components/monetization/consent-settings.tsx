"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useConsent } from "@/lib/consent/use-consent";
import { ConsentPreferencesDialog } from "./consent-preferences";

/** Used on /gestion-cookies/ so visitors can review and change their choices at any time. */
export function ConsentSettings() {
  const [open, setOpen] = React.useState(false);
  const { consent, hydrated, decided } = useConsent();

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{t.consent.analytics}</dt>
          <dd className="font-medium">
            {hydrated ? (consent.analytics ? t.common.yes : t.common.no) : "…"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t.consent.advertising}</dt>
          <dd className="font-medium">
            {hydrated ? (consent.advertising ? t.common.yes : t.common.no) : "…"}
          </dd>
        </div>
      </dl>
      {hydrated && !decided ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Aucun choix enregistré : aucun service tiers n&apos;est chargé.
        </p>
      ) : null}
      <Button className="mt-4" onClick={() => setOpen(true)}>
        {t.consent.manage}
      </Button>
      <ConsentPreferencesDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
