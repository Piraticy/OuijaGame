const CACHE_NAME = "ouija-online-v3";
const APP_SHELL = [
  "/",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first: the game ships frequent visual/behavior tweaks and needs a
// live connection to play anyway, so always prefer the current version over
// whatever happens to be cached. The cache is refreshed on every successful
// load and only used as an offline fallback - unlike the old cache-first
// approach, which silently kept serving whatever was cached at install time
// forever, until CACHE_NAME was bumped by hand on a deploy.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const isNavigation = event.request.mode === "navigate";

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }

        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || (isNavigation ? caches.match("/") : undefined)))
  );
});
