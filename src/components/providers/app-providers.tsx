"use client";

import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider>
        {children}
        <Toaster
          position="bottom-center"
          closeButton
          toastOptions={{
            classNames: {
              toast: "!bg-surface !text-surface-foreground !border-border !shadow-lg",
              description: "!text-muted-foreground",
            },
          }}
        />
      </TooltipProvider>
    </ThemeProvider>
  );
}
