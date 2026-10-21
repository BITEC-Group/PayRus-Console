const CACHE_NAME = "console-assets-v1";
// Relative to this file's own registered scope (e.g. "/PayRus-Console/"), not the site root:
// the console is deployed under a subpath on GitHub Pages, and a leading slash would resolve
// to the domain root instead.
const OFFLINE_URL = "offline.html";
// Never precache the app shell. Its HTML embeds Vite-hashed asset URLs that change on every
// publish, so a cached shell would point at dead chunks.
const urlsToCache = [OFFLINE_URL, "payrus-logo.png", "icon/icon-192.png", "icon/icon-512.png", "icon/icon-maskable-192.png", "icon/icon-maskable-512.png"];

// allSettled so one missing asset does not abort the whole install.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(urlsToCache.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("fetch", (event) => {
  // Only GET can be cached.
  if (event.request.method !== "GET") return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }
  // Never intercept cross-origin requests (Supabase, fonts, geocoding): they set their own cache headers.
  if (url.origin !== self.location.origin) return;
  // Never intercept sign-in redirects.
  if (url.pathname.includes("/auth")) return;

  // Navigations are network-only. When offline, show the offline page, never a stale app shell.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL).then((cached) => cached ?? new Response("Offline", { status: 503 }))),
    );
    return;
  }

  // Network-first for other same-origin GET requests, falling back to the cache.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response.ok) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.map((name) => (name !== CACHE_NAME ? caches.delete(name) : undefined))))
      .then(() => self.clients.claim()),
  );
});
