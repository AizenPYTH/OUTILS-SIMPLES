/**
 * First-party consent state. Stored on the visitor's device only.
 *
 * Categories follow the usual CMP split. "necessary" is always on and only
 * covers theme + consent preferences themselves (no identifiers).
 *
 * IMPORTANT: when advertising is activated for EEA traffic, Google requires a
 * certified CMP (TCF v2.2). This built-in banner is a baseline for the
 * no-ads / first-party-analytics configuration and documents the integration
 * boundary; it must not be presented as a certified CMP.
 */
export const CONSENT_STORAGE_KEY = "averopdf-consent-v1";
export const CONSENT_EVENT = "averopdf:consent-changed";

export interface ConsentState {
  /** ISO timestamp of the decision; undefined until the visitor chooses. */
  decidedAt?: string;
  analytics: boolean;
  advertising: boolean;
}

export const defaultConsent: ConsentState = { analytics: false, advertising: false };

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function parseConsent(raw: string | null): ConsentState {
  if (!raw) return defaultConsent;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return {
      decidedAt: typeof parsed.decidedAt === "string" ? parsed.decidedAt : undefined,
      analytics: parsed.analytics === true,
      advertising: parsed.advertising === true,
    };
  } catch {
    return defaultConsent;
  }
}

// Snapshot cache so useSyncExternalStore receives a stable reference.
let cachedRaw: string | null | undefined;
let cachedState: ConsentState = defaultConsent;

export function readConsent(): ConsentState {
  if (!isBrowser()) return defaultConsent;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = parseConsent(raw);
  }
  return cachedState;
}

export function writeConsent(state: Omit<ConsentState, "decidedAt">): ConsentState {
  const next: ConsentState = { ...state, decidedAt: new Date().toISOString() };
  if (isBrowser()) {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable (private mode); keep the in-memory value.
      cachedRaw = JSON.stringify(next);
      cachedState = next;
    }
    window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_EVENT, { detail: next }));
  }
  return next;
}

export function hasDecided(state: ConsentState): boolean {
  return typeof state.decidedAt === "string";
}

export function subscribeConsent(callback: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(CONSENT_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CONSENT_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
