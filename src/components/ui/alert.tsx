import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative flex w-full gap-3 rounded-md border px-4 py-3 text-sm", {
  variants: {
    variant: {
      info: "border-border bg-muted text-foreground",
      success: "border-success/30 bg-success-soft text-success-foreground",
      warning: "border-warning/40 bg-warning-soft text-warning-foreground",
      destructive: "border-destructive/30 bg-destructive-soft text-destructive",
    },
  },
  defaultVariants: { variant: "info" },
});

const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, destructive: XCircle };

interface AlertProps extends React.ComponentProps<"div">, VariantProps<typeof alertVariants> {
  title?: string;
}

function Alert({ className, variant = "info", title, children, role, ...props }: AlertProps) {
  const Icon = icons[variant ?? "info"];
  return (
    <div
      role={role ?? (variant === "destructive" ? "alert" : "status")}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-medium leading-tight">{title}</p> : null}
        {children ? <div className="text-sm leading-relaxed [&_p]:leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}

export { Alert };
