/* Rodoh offline shell. Engine law and run state remain inside the application;
 * this worker only caches same-origin static resources that the holder already
 * requested. It never uploads, rewrites, or interprets a cartridge. */
const VERSION = "rodoh-shell-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./rodoh-mark.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(VERSION).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("./index.html"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
      return cached || network;
    }),
  );
});
