const CACHE_NAME = "bebiapp-v1";
const PRECACHE = [
  "/La-Bebi-App/app/",
  "/La-Bebi-App/app/index.html",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // Non cachare le chiamate API
  if (e.request.url.includes("/api/")) return;

  e.respondWith(
    caches.match(e.request)
      .then((r) => r || fetch(e.request))
  );
});
