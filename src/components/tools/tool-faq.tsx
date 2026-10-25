"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import type { ToolFaqEntry } from "@/lib/tools";
import { t } from "@/lib/i18n";

/** Accessible accordion (one item open at a time, per the design spec). */
export function ToolFaq({ items }: { items: ToolFaqEntry[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);
  const baseId = React.useId();

  return (
    <section aria-labelledby="faq-heading" className="prose-tool">
      <h2 id="faq-heading" className="text-2xl">
        {t.tool.faq}
      </h2>
      <div className="mt-4 divide-y divide-border rounded-[14px] border border-border bg-surface">
        {items.map((item, i) => {
          const open = openIndex === i;
          const panelId = `${baseId}-panel-${i}`;
          const buttonId = `${baseId}-button-${i}`;
          return (
            <div key={i}>
              <h3 className="text-base font-semibold">
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/60"
                >
                  <span>{item.question}</span>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground" aria-hidden="true">
                    {open ? <Minus className="size-4" /> : <Plus className="size-4" />}
                  </span>
                </button>
              </h3>
              <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="px-5 pb-5 text-[15px] leading-relaxed text-foreground/90">
                {item.answer}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
