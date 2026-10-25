"use client";

import * as React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PageThumbnail } from "@/components/pdf/shared/page-thumbnail";
import type { PageInfo } from "@/lib/pdf/browser/pdfjs";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface ThumbnailRailProps {
  doc: PDFDocumentProxy;
  pages: PageInfo[];
  current: number;
  onSelect: (index: number) => void;
  annotatedPages: Set<number>;
}

export function ThumbnailRail({
  doc,
  pages,
  current,
  onSelect,
  annotatedPages,
}: ThumbnailRailProps) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  React.useEffect(() => {
    refs.current[current]?.scrollIntoView({ block: "nearest" });
  }, [current]);

  return (
    <nav
      aria-label="Pages"
      className="h-full overflow-y-auto border-r border-border bg-muted/50 p-2"
    >
      <ol className="flex flex-col items-center gap-3">
        {pages.map((page) => (
          <li key={page.index}>
            <button
              ref={(el) => {
                refs.current[page.index] = el;
              }}
              type="button"
              onClick={() => onSelect(page.index)}
              aria-current={page.index === current ? "page" : undefined}
              aria-label={`${t.common.page} ${page.index + 1}${annotatedPages.has(page.index) ? " (annotée)" : ""}`}
              className={cn(
                "relative overflow-hidden rounded-[6px] border-2 transition-colors",
                page.index === current
                  ? "border-primary"
                  : "border-transparent hover:border-border",
              )}
              data-testid={`thumb-${page.index}`}
            >
              <PageThumbnail doc={doc} page={page} width={96} height={136} />
              <span className="absolute bottom-1 left-1 rounded-full bg-foreground/80 px-1.5 text-[11px] text-background">
                {page.index + 1}
              </span>
              {annotatedPages.has(page.index) ? (
                <span
                  className="absolute right-1 top-1 size-2.5 rounded-full bg-primary"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
