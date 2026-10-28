"use client";

import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/files/format";
import { t } from "@/lib/i18n";

interface FileSummaryProps {
  name: string;
  size: number;
  pageCount?: number;
  onReset: () => void;
  children?: React.ReactNode;
}

export function FileSummary({ name, size, pageCount, onReset, children }: FileSummaryProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-[14px] border border-border bg-surface px-4 py-3"
      data-testid="file-summary"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-link">
        <FileText className="size-5" aria-hidden="true" />
      </span>
      {/* On phones the name takes the whole row next to the icon; actions wrap below. */}
      <div className="min-w-0 flex-1 basis-[calc(100%-3.25rem)] sm:basis-0">
        <p className="truncate font-medium" title={name}>
          {name}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatBytes(size)}
          {typeof pageCount === "number" ? ` · ${t.result.pages(pageCount)}` : ""}
        </p>
      </div>
      {children}
      <Button type="button" variant="outline" size="sm" onClick={onReset}>
        <RefreshCw aria-hidden="true" />
        {t.result.startOver}
      </Button>
    </div>
  );
}
