import * as React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onSubmit"
> {
  id: string;
  label: string;
  buttonLabel: string;
  onSubmit: (e: React.FormEvent) => void;
  formClassName?: string;
  /** Extra controls placed inside the field, before the submit button (e.g. clear). */
  trailing?: React.ReactNode;
}

/**
 * The one page-level search bar of the site (home hero, catalogue, family
 * pages). The header keeps its own compact quick-search pill (Ctrl K); every
 * other search field uses this component so that they look the same. On
 * phones the submit button collapses to an icon so the placeholder is never
 * cut in the middle of a word.
 */
export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(
    { id, label, buttonLabel, onSubmit, formClassName, trailing, className, ...input },
    ref,
  ) {
    return (
      <form role="search" onSubmit={onSubmit} className={cn("relative", formClassName)}>
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id={id}
          ref={ref}
          type="search"
          autoComplete="off"
          className={cn(
            "h-12 w-full truncate rounded-[14px] border border-border bg-surface pl-12 pr-[60px] text-base shadow-sm outline-hidden transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring sm:pr-[124px]",
            className,
          )}
          {...input}
        />
        {trailing}
        <Button
          type="submit"
          className="absolute right-1.5 top-1/2 size-9 -translate-y-1/2 rounded-[10px] px-0 sm:h-9 sm:w-auto sm:px-4"
        >
          <Search className="size-4 sm:hidden" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{buttonLabel}</span>
        </Button>
      </form>
    );
  },
);
