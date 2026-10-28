/**
 * Page-side helpers for the service worker (src/sw/service-worker.js):
 * registration, cache queries and explicit "make this tool available offline".
 */
import type { OfflineGroup, OfflineManifest } from "./needs";

export const SW_URL = "/sw.js";
const TRACKED_PREFIXES = ["/_next/static/", "/pdfjs/", "/ocr/", "/qpdf/", "/fonts/", "/heif/"];

export function serviceWorkerSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && window.isSecureContext;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!serviceWorkerSupported()) return null;
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch {
    return null;
  }
}

/**
 * Development only: removes a service worker left by a production run on the
 * same origin (e.g. `pnpm start` then `pnpm dev` on localhost:3000) and its
 * caches. Development file names carry no content hash, so such a worker would
 * keep serving stale styles and scripts. Returns true if a worker controlled the page.
 */
export async function removeServiceWorkers(): Promise<boolean> {
  if (!serviceWorkerSupported()) return false;
  const controlled = Boolean(navigator.serviceWorker.controller);
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
  } catch {
    return false;
  }
  return controlled;
}

async function activeWorker(): Promise<ServiceWorker | null> {
  if (!serviceWorkerSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.active ?? null;
}

type Reply =
  | { type: "version"; version: string; assetKey: string }
  | { type: "checked"; cached: boolean[] }
  | { type: "progress"; done: number; total: number }
  | { type: "done"; failed: string[] }
  | { type: "pages"; pages: string[] }
  | { type: "forgotten" };

function ask(
  worker: ServiceWorker,
  message: object,
  onProgress?: (done: number, total: number) => void,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => reject(new Error("service worker timeout")), 10 * 60_000);
    channel.port1.onmessage = (event: MessageEvent<Reply>) => {
      const data = event.data;
      if (data.type === "progress") {
        onProgress?.(data.done, data.total);
        return;
      }
      window.clearTimeout(timer);
      resolve(data);
    };
    worker.postMessage(message, [channel.port2]);
  });
}

/** Same-origin page + static files + engine files this page has loaded so far. */
export function collectPageAssets(): string[] {
  const urls = new Set<string>([location.pathname]);
  const add = (raw: string | null) => {
    if (!raw) return;
    try {
      const u = new URL(raw, location.origin);
      if (u.origin !== location.origin) return;
      if (!TRACKED_PREFIXES.some((p) => u.pathname.startsWith(p))) return;
      urls.add(u.pathname + (u.pathname.startsWith("/_next/static/") ? u.search : ""));
    } catch {
      /* ignore malformed URLs */
    }
  };
  document
    .querySelectorAll<HTMLScriptElement>("script[src]")
    .forEach((s) => add(s.getAttribute("src")));
  document
    .querySelectorAll<HTMLLinkElement>(
      'link[rel="stylesheet"], link[rel="preload"], link[rel="modulepreload"]',
    )
    .forEach((l) => add(l.getAttribute("href")));
  for (const entry of performance.getEntriesByType("resource")) add(entry.name);
  return Array.from(urls);
}

export async function fetchOfflineManifest(): Promise<OfflineManifest | null> {
  try {
    const response = await fetch("/offline-manifest.json", { cache: "no-cache" });
    if (!response.ok) return null;
    return (await response.json()) as OfflineManifest;
  } catch {
    return null;
  }
}

export function groupUrls(manifest: OfflineManifest | null, groups: OfflineGroup[]): string[] {
  if (!manifest) return [];
  return groups.flatMap((g) => manifest.groups[g]?.files ?? []);
}

export function groupBytes(manifest: OfflineManifest | null, groups: OfflineGroup[]): number {
  if (!manifest) return 0;
  return groups.reduce((sum, g) => sum + (manifest.groups[g]?.bytes ?? 0), 0);
}

export async function urlsCached(urls: string[]): Promise<boolean[]> {
  const worker = await activeWorker();
  if (!worker) return urls.map(() => false);
  const reply = await ask(worker, { type: "CHECK_URLS", urls });
  return reply.type === "checked" ? reply.cached : urls.map(() => false);
}

export async function cacheUrls(
  urls: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const worker = await activeWorker();
  if (!worker) throw new Error("service worker unavailable");
  const reply = await ask(worker, { type: "CACHE_URLS", urls }, onProgress);
  return reply.type === "done" ? reply.failed : urls;
}

export async function listCachedPages(): Promise<string[]> {
  const worker = await activeWorker();
  if (!worker) return [];
  const reply = await ask(worker, { type: "LIST_PAGES" });
  return reply.type === "pages" ? reply.pages : [];
}

export async function forgetPage(path: string): Promise<void> {
  const worker = await activeWorker();
  if (!worker) return;
  await ask(worker, { type: "FORGET_PAGE", url: path });
}

/** Ask the browser not to evict the caches under storage pressure (best effort). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* unsupported */
  }
  return false;
}
