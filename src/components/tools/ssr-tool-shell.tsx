"use client";

import { useHydrated } from "@/lib/use-hydrated";

/**
 * Wraps a server-rendered tool: identical markup on the server and during
 * hydration, then interactive. Until React takes over, the work area is
 * `inert` (no focus, no typing), so nothing entered before hydration can be
 * overwritten by the component's initial state.
 */
export function SsrToolShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  return (
    <div inert={!hydrated} data-hydrated={hydrated ? "" : undefined}>
      {children}
    </div>
  );
}
