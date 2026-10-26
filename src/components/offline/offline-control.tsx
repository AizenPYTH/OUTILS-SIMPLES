"use client";

import * as React from "react";
import { CloudDownload, CloudOff, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cacheUrls,
  collectPageAssets,
  fetchOfflineManifest,
  groupBytes,
  groupUrls,
  requestPersistentStorage,
  serviceWorkerSupported,
  urlsCached,
} from "@/lib/offline/client";
import { formatMegabytes, type OfflineGroup, type OfflineManifest } from "@/lib/offline/needs";
import { useOnline } from "@/lib/offline/use-online";
import { t } from "@/lib/i18n";

type Status = "idle" | "checking" | "ready" | "available" | "saving" | "failed";

interface OfflineControlProps {
  toolId: string;
  groups: OfflineGroup[];
}

/**
 * "Utiliser hors ligne" on tool pages: stores the page, the scripts it loaded
 * and the engine files it needs in the service worker caches, and reports
 * honestly when that is impossible (no service worker, development build).
 */
export function OfflineControl({ toolId, groups }: OfflineControlProps) {
  const online = useOnline();
  const [status, setStatus] = React.useState<Status>("idle");
  const [manifest, setManifest] = React.useState<OfflineManifest | null>(null);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [supported, setSupported] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(async () => {
      if (!serviceWorkerSupported() || process.env.NODE_ENV !== "production") {
        if (!cancelled) setSupported(false);
        return;
      }
      setStatus("checking");
      const m = await fetchOfflineManifest();
      if (cancelled) return;
      setManifest(m);
      const urls = [location.pathname, ...groupUrls(m, groups)];
      try {
        const cached = await urlsCached(urls);
        if (cancelled) return;
        setStatus(cached.every(Boolean) ? "available" : "ready");
      } catch {
        if (!cancelled) setStatus("ready");
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [toolId, groups]);

  if (!supported) return null;

  const bytes = groupBytes(manifest, groups);

  const save = async () => {
    setStatus("saving");
    setProgress(null);
    try {
      void requestPersistentStorage();
      const urls = Array.from(new Set([...collectPageAssets(), ...groupUrls(manifest, groups)]));
      const failed = await cacheUrls(urls, (done, total) => setProgress({ done, total }));
      // Every listed file is required: a partial save would only look available.
      setStatus(failed.length === 0 ? "available" : "failed");
    } catch {
      setStatus("failed");
    }
  };

  if (status === "available") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-medium text-success-foreground"
        data-testid="offline-available"
      >
        <Check className="size-3.5" aria-hidden="true" />
        {t.offline.available}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={save}
        disabled={status === "saving" || status === "checking" || status === "idle" || !online}
        data-testid="offline-save"
        title={online ? undefined : t.offline.needsConnection}
      >
        {status === "saving" ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : online ? (
          <CloudDownload aria-hidden="true" />
        ) : (
          <CloudOff aria-hidden="true" />
        )}
        {status === "saving"
          ? progress
            ? t.offline.savingProgress(progress.done, progress.total)
            : t.offline.saving
          : t.offline.makeAvailable}
      </Button>
      {status === "ready" && bytes > 0 ? (
        <span className="text-xs text-muted-foreground">
          {t.offline.sizeHint(formatMegabytes(bytes))}
        </span>
      ) : null}
      {status === "failed" ? (
        <span role="alert" className="text-xs text-destructive">
          {t.offline.failed}
        </span>
      ) : null}
    </span>
  );
}
