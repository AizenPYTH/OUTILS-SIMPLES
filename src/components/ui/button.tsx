import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:ring-[3px] focus-visible:ring-ring",
  {
    variants: {
      variant: {
        // Disabled (and not busy): neutral grey, so that an unavailable main
        // action is not mistaken for a pale secondary button (audit G4).
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover disabled:[&:not([aria-busy])]:bg-muted disabled:[&:not([aria-busy])]:text-muted-foreground disabled:[&:not([aria-busy])]:opacity-100 disabled:[&:not([aria-busy])]:shadow-none",
        secondary: "bg-muted text-foreground hover:bg-accent hover:text-accent-foreground",
        outline: "border border-input bg-surface text-foreground shadow-sm hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:opacity-90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-[10px] px-3 text-sm",
        lg: "h-[52px] rounded-md px-6 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  if (asChild) {
    // Slot requires exactly one element child: no loader in this mode.
    return (
      <Slot
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Slot>
    );
  }
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export { Button, buttonVariants };
