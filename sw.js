/* ============================================================
   Maanlicht service worker
   - Precache de app-shell zodat de app volledig offline opent.
   - Lettertypen (Google Fonts) worden runtime gecachet (stale-while-revalidate),
     zodat ze na de eerste keer ook zonder internet werken.
   Verhoog CACHE_VERSION bij elke nieuwe release om de cache te verversen.
   ============================================================ */
const CACHE_VERSION = "maanlicht-v1";
const CORE_CACHE = CACHE_VERSION + "-core";
const RUNTIME_CACHE = CACHE_VERSION + "-runtime";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
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

  // Lettertypen: stale-while-revalidate (snel + zelf-vernieuwend)
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Navigaties: probeer netwerk, val terug op gecachete index.html (offline)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Overige same-origin: cache-first
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
