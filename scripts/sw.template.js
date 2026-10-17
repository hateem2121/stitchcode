/* ------------------------------------------------------------------
 * RUN STITCHCODE — offline service worker
 *
 * VERSION is injected at build time from package.json (see vite.config.js)
 * — manual bumps can no longer drift behind a release.
 *
 * Strategy:
 *   · page navigations  → network-first (with navigation preload), fall
 *                         back to the cached page; only ok responses cached
 *   · hashed assets     → cache-first (filenames change with each build)
 *   · same-origin only  · updates are user-approved, not forced
 *
 * Update flow (2026 best practice — no skipWaiting on install):
 * the app detects "updatefound → installed", shows a prompt, and only then
 * posts SKIP_WAITING here; already-open tabs keep their old cache until
 * they reload. Activate keeps the previous generation alive for them.
 * ------------------------------------------------------------------ */
const VERSION = "__SW_VERSION__";
const CACHE = `stitchcode-${VERSION}`;

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("install", (event) => {
  /* precache the app shell so first-run offline works; individual failures
     don't block installation */
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.allSettled([cache.add(new Request("./", { cache: "reload" })), cache.add(new Request("./index.html", { cache: "reload" }))]),
      ),
  );
});

/** Keep only the current generation and the single most recent previous one —
 *  open tabs running the old worker can still fetch their old hashed assets. */
async function pruneCaches() {
  const keys = await caches.keys();
  const versions = keys
    .filter((k) => k.startsWith("stitchcode-"))
    .map((k) => k.slice("stitchcode-".length))
    .filter((v) => /^\d+\.\d+\.\d+$/.test(v))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const keep = new Set([VERSION, versions[versions.length - 1]]);
  await Promise.all(
    keys.filter((k) => k.startsWith("stitchcode-") && !keep.has(k.slice("stitchcode-".length))).map((k) => caches.delete(k)),
  );
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await pruneCaches();
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => {});
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;

  /* Whole-page loads: fresh when possible, cached copy when offline */
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preloaded = await event.preloadResponse;
          if (preloaded) return preloaded;
          const response = await fetch(request);
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        } catch {
          const hit = (await caches.match(request)) || (await caches.match("./index.html"));
          return (
            hit ||
            new Response("Offline and no cached copy yet — connect once, then reload.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })(),
    );
    return;
  }

  /* Everything else (scripts, styles, fonts): serve from cache, refill in
     the background */
  event.respondWith(
    (async () => {
      const hit = await caches.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })(),
  );
});
