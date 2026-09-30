const CACHE_NAME = "sriviswa-v1";

const PRECACHE_URLS = [
  "/sriviswaplk/",
  "/sriviswaplk/index.html",
  "/sriviswaplk/manifest.json",
  "/sriviswaplk/assets/logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[SW] Failed to precache:", url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, clone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          if (req.mode === "navigate") {
            return caches.match("/sriviswaplk/index.html");
          }
          return new Response("Offline", {
            status: 503,
            statusText: "Offline",
            headers: { "Content-Type": "text/plain" }
          });
        });
      })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
