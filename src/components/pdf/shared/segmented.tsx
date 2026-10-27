"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  description?: string;
  /**
   * Word shown on phones. When every option has one, the control stays a
   * single row of segments on small screens instead of stacking full-width
   * cards (the full label stays the accessible name).
   */
  shortLabel?: string;
  disabled?: boolean;
}

interface SegmentedProps<V extends string> {
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  label: string;
  className?: string;
}

/** Segmented options (handoff: 42px, radius 12, 1.5px border, active = primary border + soft fill). */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedProps<V>) {
  const compactOnPhones = options.length <= 4 && options.every((o) => o.shortLabel);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "grid gap-2 sm:grid-cols-3",
        compactOnPhones &&
          (options.length === 2
            ? "grid-cols-2"
            : options.length === 4
              ? "grid-cols-4"
              : "grid-cols-3"),
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-h-[42px] flex-col items-start justify-center rounded-md border-[1.5px] px-3.5 py-2 text-left text-sm transition-colors disabled:opacity-50",
              active
                ? "border-primary bg-primary-soft text-foreground"
                : "border-border bg-surface hover:bg-muted",
            )}
            data-testid={`segmented-${option.value}`}
          >
            {compactOnPhones ? (
              <>
                <span className="w-full text-center font-medium sm:hidden" aria-hidden="true">
                  {option.shortLabel}
                </span>
                <span className="font-medium max-sm:sr-only">{option.label}</span>
              </>
            ) : (
              <span className="font-medium">{option.label}</span>
            )}
            {option.description ? (
              <span
                className={cn(
                  "text-xs",
                  active ? "text-foreground/80" : "text-muted-foreground",
                  compactOnPhones && "max-sm:hidden",
                )}
              >
                {option.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
