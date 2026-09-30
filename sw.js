/* ============================================================
   Sri Viswa School – Service Worker
   Network-first with cache fallback
============================================================ */

const CACHE_NAME = "sriviswa-v3";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/logo.png",
  "./assets/favicon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

/* INSTALL — pre-cache core assets */
self.addEventListener("install", event => {
  console.log("[SW] Installing…");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        CORE_ASSETS.map(url => cache.add(url).catch(() => {
          console.warn("[SW] Failed to precache:", url);
        }))
      ))
      .then(() => self.skipWaiting())
  );
});

/* ACTIVATE — clean up old caches */
self.addEventListener("activate", event => {
  console.log("[SW] Activating…");
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log("[SW] Deleting old cache:", k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

/* FETCH — network-first, cache fallback */
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* Navigation requests — network first, fallback to cached index */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  /* Other requests — cache first, then network */
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => {
        if (req.destination === "image") return caches.match("./assets/logo.png");
      });
    })
  );
});

/* MESSAGE — allow manual skip waiting */
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
