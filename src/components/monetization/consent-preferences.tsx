"use client";

import * as React from "react";
import { toast } from "sonner";
import { publicEnv } from "@/config/env";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useConsent } from "@/lib/consent/use-consent";
import { t } from "@/lib/i18n";

interface ConsentPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsentPreferencesDialog({ open, onOpenChange }: ConsentPreferencesDialogProps) {
  const { consent, update } = useConsent();
  const [analytics, setAnalytics] = React.useState(consent.analytics);
  const [advertising, setAdvertising] = React.useState(consent.advertising);
  const [wasOpen, setWasOpen] = React.useState(open);
  // Reset the draft to the stored choices each time the dialog opens.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setAnalytics(consent.analytics);
      setAdvertising(consent.advertising);
    }
  }

  const save = () => {
    update({ analytics, advertising });
    toast.success(t.consent.updated);
    onOpenChange(false);
  };

  const analyticsConfigured = publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER !== "none";
  const adsConfigured = publicEnv.NEXT_PUBLIC_ADS_ENABLED;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" className="rounded-[20px]">
        <DialogHeader>
          <DialogTitle>{t.consent.title}</DialogTitle>
          <DialogDescription>{t.consent.body}</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border">
          <li className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">{t.consent.necessary}</p>
              <p className="text-xs text-muted-foreground">{t.consent.necessaryBody}</p>
            </div>
            <span className="shrink-0 text-xs font-medium text-muted-foreground">{t.consent.alwaysOn}</span>
          </li>
          <li className="flex items-start justify-between gap-4 py-3">
            <div>
              <Label htmlFor="consent-analytics" className="text-sm font-medium">
                {t.consent.analytics}
              </Label>
              <p className="text-xs text-muted-foreground">{t.consent.analyticsBody}</p>
            </div>
            <Switch id="consent-analytics" checked={analytics} onCheckedChange={setAnalytics} disabled={!analyticsConfigured} />
          </li>
          <li className="flex items-start justify-between gap-4 py-3">
            <div>
              <Label htmlFor="consent-ads" className="text-sm font-medium">
                {t.consent.advertising}
              </Label>
              <p className="text-xs text-muted-foreground">{t.consent.advertisingBody}</p>
            </div>
            <Switch id="consent-ads" checked={advertising} onCheckedChange={setAdvertising} disabled={!adsConfigured} />
          </li>
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button onClick={save}>{t.consent.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
