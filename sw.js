/* ============================================================
   Manifestation service worker
   - Precaches the app shell so the app opens fully offline.
   - Fonts (Google Fonts) are cached at runtime (stale-while-revalidate),
     so after the first visit they also work without internet.
   Raise CACHE_VERSION on every new release to refresh the cache.
   ============================================================ */
const CACHE_VERSION = "manifestation-v4";
const CORE_CACHE = CACHE_VERSION + "-core";
const RUNTIME_CACHE = CACHE_VERSION + "-runtime";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./js/storage.js",
  "./js/bridge.js",
  "./worlds/aurora.html",
  "./worlds/contact.html",
  "./worlds/reis.html",
  "./worlds/kaarten.html",
  "./worlds/kompas.html"
];

const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Fonts: stale-while-revalidate (fast + self-refreshing)
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Navigations: try the network, fall back to the cached index.html (offline)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Other same-origin: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => cached))
    );
  }
});

function staleWhileRevalidate(req) {
  return caches.open(RUNTIME_CACHE).then((cache) =>
    cache.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
}
