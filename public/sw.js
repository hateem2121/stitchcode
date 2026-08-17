/* ------------------------------------------------------------------
 * RUN STITCHCODE — offline service worker
 *
 * Strategy (keeps the studio forever usable, online or not):
 *   · page navigations  → network-first, fall back to the cached page
 *   · hashed assets     → cache-first (filenames change with each build,
 *                         so the cache can never go stale)
 *   · fonts & images    → cached on first sight
 *
 * MAINTAINERS: bump VERSION whenever the app changes shape, so old
 * visitors' caches refresh cleanly on their next load.
 * ------------------------------------------------------------------ */
const VERSION = "v1755442980000"; // Auto-generated build version
const CACHE = `stitchcode-${VERSION}`;

self.addEventListener("install", () => {
  /* take over immediately — no waiting behind an old worker */
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;

  /* Whole-page loads: fresh when possible, cached copy when offline */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match("./index.html")),
        ),
    );
    return;
  }

  /* Everything else (scripts, styles, fonts): serve from cache, refill in background */
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
