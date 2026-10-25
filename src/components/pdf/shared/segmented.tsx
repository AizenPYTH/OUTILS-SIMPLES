"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  description?: string;
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
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid gap-2 sm:grid-cols-3", className)}
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
            <span className="font-medium">{option.label}</span>
            {option.description ? (
              <span className="text-xs text-muted-foreground">{option.description}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
