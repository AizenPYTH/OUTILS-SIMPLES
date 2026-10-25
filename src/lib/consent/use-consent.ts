"use client";

import * as React from "react";
import { defaultConsent, hasDecided, readConsent, subscribeConsent, writeConsent, type ConsentState } from "./store";

const getServerSnapshot = () => defaultConsent;
const subscribeNoop = () => () => {};

export function useConsent() {
  const consent = React.useSyncExternalStore(subscribeConsent, readConsent, getServerSnapshot);
  // false during SSR and the hydration render, true afterwards.
  const hydrated = React.useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const update = React.useCallback((next: Omit<ConsentState, "decidedAt">) => {
    writeConsent(next);
  }, []);

  return { consent, hydrated, decided: hasDecided(consent), update };
}
