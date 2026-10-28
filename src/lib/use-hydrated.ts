import * as React from "react";

const subscribeNothing = () => () => {};

/**
 * False during the server render and the hydration pass, true afterwards.
 * Lets a server-rendered component keep exactly the server markup while it
 * hydrates (no mismatch), then switch to browser-only values.
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}
