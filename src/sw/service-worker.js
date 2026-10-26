/* global self, caches, fetch, Response, URL */
/*
 * OUTILIA service worker. Source: src/sw/service-worker.js, built by
 * scripts/build-sw.mjs into public/sw.js (version and asset key injected).
 *
 * Strategy (all same-origin, GET only):
 *  - /_next/static/**            cache-first, permanent (file names carry a content hash)
 *  - /pdfjs, /ocr, /qpdf, /fonts cache-first in a cache keyed by the engines' versions
 *  - page navigations            network-first, cached copy when offline, else /hors-ligne/
 *  - manifest, icons             stale-while-revalidate
 * Everything else (RSC payloads, cross-origin) goes straight to the network.
 *
 * Pages ask for explicit caching through postMessage (see src/lib/offline/client.ts).
 */
const VERSION = "__SW_VERSION__";
const ASSET_KEY = "__ASSET_KEY__";
const SHELL = `outilia-shell-${VERSION}`;
const STATIC = "outilia-static-v1";
const ASSETS = `outilia-assets-${ASSET_KEY}`;
const KEEP = new Set([SHELL, STATIC, ASSETS]);
const OFFLINE_URL = "/hors-ligne/";
const PRECACHE = [OFFLINE_URL, "/offline-manifest.json"];
const ENGINE_PREFIXES = ["/pdfjs/", "/ocr/", "/qpdf/", "/fonts/"];
const SHELL_FILES = new Set([
  "/manifest.webmanifest",
  "/icon.svg",
  "/favicon.ico",
  "/offline-manifest.json",
]);
const MAX_STATIC_ENTRIES = 600;

function cacheNameFor(pathname) {
  if (pathname.startsWith("/_next/static/")) return STATIC;
  if (ENGINE_PREFIXES.some((p) => pathname.startsWith(p))) return ASSETS;
  return SHELL;
}

function isNavigation(request) {
  if (request.mode === "navigate") return true;
  const accept = request.headers.get("accept") || "";
  return (
    request.destination === "document" ||
    (accept.includes("text/html") && !request.headers.get("RSC"))
  );
}

async function putSafe(cacheName, request, response) {
  if (!response || !response.ok || response.redirected || response.type !== "basic") return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    if (cacheName === STATIC) trimStatic(cache).catch(() => {});
  } catch {
    /* quota exceeded or opaque response: serve from network only */
  }
}

async function trimStatic(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_STATIC_ENTRIES) return;
  for (const key of keys.slice(0, keys.length - MAX_STATIC_ENTRIES)) await cache.delete(key);
}

async function cacheFirst(cacheName, request) {
  const cached = await caches.match(request, { ignoreSearch: false });
  if (cached) return cached;
  const response = await fetch(request);
  await putSafe(cacheName, request, response);
  return response;
}

async function staleWhileRevalidate(cacheName, request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async (response) => {
      await putSafe(cacheName, request, response);
      return response;
    })
    .catch(() => undefined);
  return cached || (await network) || Response.error();
}

async function networkFirstPage(request) {
  const url = new URL(request.url);
  const key = new Request(url.origin + url.pathname, { headers: request.headers });
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) await putSafe(SHELL, key, response);
    return response;
  } catch {
    const cached = await caches.match(key, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    // Redirect rather than serving the offline page under a foreign URL: Next would hydrate
    // the wrong route and try to fetch it. The redirected request is served from the cache.
    if (url.pathname !== OFFLINE_URL) return Response.redirect(OFFLINE_URL, 302);
    const offline = await caches.match(OFFLINE_URL, { ignoreVary: true });
    return (
      offline ||
      new Response("Hors connexion", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function precacheReferencedStatic(html) {
  const refs = new Set();
  for (const match of html.matchAll(/\/_next\/static\/[^"'\\\s<>]+/g)) refs.add(match[0]);
  const cache = await caches.open(STATIC);
  await Promise.all(
    Array.from(refs).map(async (path) => {
      try {
        if (await cache.match(path)) return;
        const response = await fetch(path);
        if (response.ok) await cache.put(path, response);
      } catch {
        /* best effort */
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await Promise.all(
        PRECACHE.map(async (path) => {
          try {
            const response = await fetch(path, { cache: "reload" });
            if (!response.ok) return;
            await cache.put(path, response.clone());
            // The offline page must hydrate without network: store the scripts and styles it references.
            if (path === OFFLINE_URL) await precacheReferencedStatic(await response.text());
          } catch {
            /* offline during install: the next install retries */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith("outilia-") && !KEEP.has(n)).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;
  if (url.searchParams.has("_rsc") || request.headers.get("RSC")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(STATIC, request));
    return;
  }
  if (ENGINE_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(cacheFirst(ASSETS, request));
    return;
  }
  if (isNavigation(request)) {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (SHELL_FILES.has(url.pathname) || url.pathname.startsWith("/_next/image")) {
    event.respondWith(staleWhileRevalidate(SHELL, request));
  }
});

async function isCached(url) {
  const u = new URL(url, self.location.origin);
  const match = await caches.match(u.origin + u.pathname, { ignoreSearch: true, ignoreVary: true });
  return Boolean(match);
}

async function cacheUrls(urls, port) {
  const failed = [];
  let done = 0;
  for (const raw of urls) {
    const u = new URL(raw, self.location.origin);
    const key = u.origin + u.pathname + (u.pathname.startsWith("/_next/static/") ? u.search : "");
    try {
      if (!(await isCached(key))) {
        const response = await fetch(key, { credentials: "same-origin" });
        if (!response.ok || response.redirected) throw new Error(`HTTP ${response.status}`);
        const cache = await caches.open(cacheNameFor(u.pathname));
        await cache.put(key, response);
      }
    } catch {
      failed.push(raw);
    }
    done += 1;
    if (port) port.postMessage({ type: "progress", done, total: urls.length });
  }
  return failed;
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  const port = event.ports && event.ports[0];
  const reply = (payload) => port && port.postMessage(payload);
  if (data.type === "VERSION") {
    reply({ type: "version", version: VERSION, assetKey: ASSET_KEY });
  } else if (data.type === "CHECK_URLS") {
    event.waitUntil(
      Promise.all((data.urls || []).map(isCached)).then((cached) =>
        reply({ type: "checked", cached }),
      ),
    );
  } else if (data.type === "CACHE_URLS") {
    event.waitUntil(
      cacheUrls(data.urls || [], port).then((failed) => reply({ type: "done", failed })),
    );
  } else if (data.type === "LIST_PAGES") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(SHELL);
        const keys = await cache.keys();
        const pages = keys
          .map((r) => new URL(r.url).pathname)
          .filter((p) => !SHELL_FILES.has(p) && p !== OFFLINE_URL && !p.startsWith("/_next/"));
        reply({ type: "pages", pages: Array.from(new Set(pages)).sort() });
      })(),
    );
  } else if (data.type === "FORGET_PAGE") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(SHELL);
        const u = new URL(data.url, self.location.origin);
        await cache.delete(u.origin + u.pathname, { ignoreSearch: true, ignoreVary: true });
        reply({ type: "forgotten" });
      })(),
    );
  }
});
