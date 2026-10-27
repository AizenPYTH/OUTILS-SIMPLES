"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ThemeProvider } from "./theme-provider";

const Toaster = dynamic(() => import("sonner").then((m) => m.Toaster), { ssr: false });

/**
 * Mounts the toaster once the page is idle: tools only report something after
 * a user action, so the library is not part of the initial download.
 */
function ToastHost() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const win = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const arm = () => setReady(true);
    if (win.requestIdleCallback) {
      const id = win.requestIdleCallback(arm);
      return () =>
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(arm, 300);
    return () => window.clearTimeout(id);
  }, []);
  if (!ready) return null;
  return (
    // Bottom-right on large screens: away from the centred content column and
    // its primary buttons. Toasts are kept for actions without a visible
    // result (copy, download started); file errors are shown inline.
    <Toaster
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: "!bg-surface !text-surface-foreground !border-border !shadow-lg",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <ToastHost />
    </ThemeProvider>
  );
}
