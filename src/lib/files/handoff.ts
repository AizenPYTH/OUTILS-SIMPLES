/**
 * Passes a file dropped on the home page to the tool page the visitor picks.
 * Memory only (never persisted): it survives a client-side navigation and is
 * dropped after a minute or a full page load.
 */
let pending: { file: File; at: number } | null = null;
const TTL_MS = 60_000;

export function setHandoff(file: File): void {
  pending = { file, at: Date.now() };
}

export function peekHandoff(): File | null {
  if (pending && Date.now() - pending.at > TTL_MS) pending = null;
  return pending?.file ?? null;
}

/** Returns the pending file once and forgets it. */
export function takeHandoff(): File | null {
  const file = peekHandoff();
  pending = null;
  return file;
}

export function clearHandoff(): void {
  pending = null;
}
