// GÉNÉRÉ — NE PAS ÉDITER (service worker : installation + secours hors ligne).
const CACHE = "tontine-sy-v1";

self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });

// RÉSEAU D'ABORD. Le cache ne répond que si le réseau a ÉCHOUÉ — jamais
// pour aller plus vite au prix d'une version périmée servie en silence.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copie = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copie)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(e.request).then((c) => c ?? Response.error())),
  );
});
