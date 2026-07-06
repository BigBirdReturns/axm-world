/* Service worker for the built game. This file is a template: the inline
 * sw-precache plugin in vite.config.ts substitutes the cache-version and
 * precache-list tokens at build time and emits the result as sw.js at the
 * root of the bundle (so its scope covers the whole app under the deploy
 * base). Keep the token names out of this comment — substitution applies
 * everywhere in the file. */
const CACHE = "axm-world-__CACHE_VERSION__";
const PRECACHE = __PRECACHE__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first so an updated deploy wins when online, with
  // cache fallback so an offline launch still boots the shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("./")),
        ),
    );
    return;
  }

  // Everything else same-origin: cache-first (precached/hashed assets are
  // immutable per build), falling back to network and caching the result.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
