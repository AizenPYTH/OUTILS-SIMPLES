"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parsePageRanges, type ParsedRanges } from "@/lib/pdf/page-ranges";
import { isPdfError } from "@/lib/pdf/errors";
import { t } from "@/lib/i18n";

interface PageRangeInputProps {
  pageCount: number;
  value: string;
  onChange: (value: string, parsed: ParsedRanges | null, error: string | null) => void;
  label?: string;
  id?: string;
}

/** Validated page-range field with live summary ("4 pages sélectionnées sur 10"). */
export function PageRangeInput({ pageCount, value, onChange, label, id }: PageRangeInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const parsed = React.useMemo(() => {
    if (!value.trim()) return { parsed: null, error: null };
    try {
      return { parsed: parsePageRanges(value, pageCount), error: null };
    } catch (error) {
      return { parsed: null, error: isPdfError(error) ? error.message : t.ranges.errorFormat };
    }
  }, [value, pageCount]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label ?? t.ranges.label}</Label>
      <Input
        id={inputId}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          let next_parsed: ParsedRanges | null = null;
          let next_error: string | null = null;
          if (next.trim()) {
            try {
              next_parsed = parsePageRanges(next, pageCount);
            } catch (error) {
              next_error = isPdfError(error) ? error.message : t.ranges.errorFormat;
            }
          }
          onChange(next, next_parsed, next_error);
        }}
        placeholder={t.ranges.placeholder}
        inputMode="numeric"
        aria-invalid={!!parsed.error}
        aria-describedby={`${inputId}-help`}
        data-testid="page-range-input"
      />
      <p
        id={`${inputId}-help`}
        className={parsed.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
      >
        {parsed.error ??
          (parsed.parsed
            ? t.ranges.preview(parsed.parsed.indices.length, pageCount)
            : t.ranges.help)}
      </p>
    </div>
  );
}
