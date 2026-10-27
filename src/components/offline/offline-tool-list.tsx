"use client";

import * as React from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolIcon } from "@/components/tools/tool-icon";
import { categoryTone } from "@/lib/tools/groups";
import type { ToolDefinition } from "@/lib/tools/types";
import { cn } from "@/lib/utils";
import { forgetPage, listCachedPages, serviceWorkerSupported } from "@/lib/offline/client";
import { t } from "@/lib/i18n";

interface OfflineToolListProps {
  /** path → tool name, for every published tool (built on the server). */
  names: Record<string, string>;
  /** path → icon and family, to show the same tinted tile as the catalogue. */
  icons?: Record<string, Pick<ToolDefinition, "icon" | "category">>;
}

/** Lists the tool pages stored by the service worker on this device. */
export function OfflineToolList({ names, icons = {} }: OfflineToolListProps) {
  const [pages, setPages] = React.useState<string[] | null>(null);
  const refresh = React.useCallback(async () => {
    if (!serviceWorkerSupported() || process.env.NODE_ENV !== "production") {
      setPages([]);
      return;
    }
    try {
      setPages(await listCachedPages());
    } catch {
      setPages([]);
    }
  }, []);
  React.useEffect(() => {
    const id = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  if (pages === null) return <p className="text-sm text-muted-foreground">{t.common.loading}</p>;
  const tools = pages.filter((p) => names[p]);
  if (tools.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="offline-list-empty">
        {t.offline.none}
      </p>
    );
  }
  return (
    <ul
      className="divide-y divide-border rounded-md border border-border"
      data-testid="offline-list"
    >
      {tools.map((path) => (
        <li key={path} className="flex items-center gap-3 px-3 py-2">
          {icons[path] ? (
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-[8px]",
                categoryTone[icons[path].category].tile,
              )}
              aria-hidden="true"
            >
              <ToolIcon name={icons[path].icon} className="size-4" />
            </span>
          ) : null}
          <Link href={path} className="flex-1 text-sm font-medium">
            {names[path]}
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`${t.offline.forget} : ${names[path]}`}
            onClick={async () => {
              await forgetPage(path);
              await refresh();
            }}
          >
            <Trash2 aria-hidden="true" />
            {t.offline.forget}
          </Button>
        </li>
      ))}
    </ul>
  );
}
