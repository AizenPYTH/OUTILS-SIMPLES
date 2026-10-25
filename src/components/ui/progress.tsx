import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentProps<"div"> {
  /** 0–100, or undefined for an indeterminate bar. */
  value?: number;
  label: string;
}

function Progress({ className, value, label, ...props }: ProgressProps) {
  const determinate = typeof value === "number";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? Math.round(value) : undefined}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      {determinate ? (
        <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      ) : (
        <div className="h-full w-1/3 animate-[indeterminate_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
      )}
      <style>{`@keyframes indeterminate{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}

export { Progress };
