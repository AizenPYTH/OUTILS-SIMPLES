"use client";

import * as React from "react";
import { registerServiceWorker } from "@/lib/offline/client";
import { useOnline } from "@/lib/offline/use-online";
import { t } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n/routes";

/**
 * Registers the service worker (production builds only: in development it would
 * cache stale files) and shows a thin bar while the browser is offline.
 */
export function ServiceWorkerRegistration() {
  const online = useOnline();
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    const id = window.setTimeout(() => void registerServiceWorker(), 0);
    return () => window.clearTimeout(id);
  }, []);
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-40 border-b border-warning/40 bg-warning-soft px-4 py-2 text-center text-sm text-warning-foreground"
      data-testid="offline-banner"
    >
      {t.offline.banner}{" "}
      {/* Plain anchor on purpose: offline, a full load is served by the service worker,
          whereas a client-side navigation would need a network fetch. */}
      <a href={localizedPath("/hors-ligne/")} className="underline underline-offset-4">
        {t.offline.bannerLink}
      </a>
    </div>
  );
}
