/* Rodoh offline shell. Engine law and run state remain inside the application;
 * this worker caches only same-origin product resources already admitted into the
 * published build. It never uploads, interprets, or accepts a cartridge or demo. */
const VERSION = "rodoh-shell-v2";
const SHELL = [
  "./",
  "./index.html",
  "./fabric.html",
  "./classics.html",
  "./showcase.html",
  "./studio.html",
  "./manifest.webmanifest",
  "./rodoh-mark.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

async function navigationFallback(request) {
  const cache = await caches.open(VERSION);
  const exact = await cache.match(request, { ignoreSearch: true });
  if (exact) return exact;

  const pathname = new URL(request.url).pathname;
  const filename = pathname.split("/").filter(Boolean).at(-1) || "index.html";
  const admitted = new Set([
    "index.html",
    "fabric.html",
    "classics.html",
    "showcase.html",
    "studio.html",
  ]);
  if (admitted.has(filename)) {
    const named = await cache.match(`./${filename}`, { ignoreSearch: true });
    if (named) return named;
  }
  return (await cache.match("./index.html")) || new Response("Offline", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Range responses are streamed by the origin or portable server and are not
  // inserted into the ordinary static cache.
  if (request.headers.has("range")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            const key = new Request(new URL(request.url).origin + new URL(request.url).pathname, {
              method: "GET",
              headers: { Accept: "text/html" },
            });
            void caches.open(VERSION).then((cache) => cache.put(key, copy));
          }
          return response;
        })
        .catch(() => navigationFallback(request)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || new Response("Offline", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }));
      return cached || network;
    }),
  );
});
