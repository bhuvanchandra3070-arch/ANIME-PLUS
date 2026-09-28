/* ==========================================================================
   ANIME.PLUS - ENHANCED SERVICE WORKER FOR PWA (sw.js)
   Fast caching, offline streaming interface, and resilient asset store
   ========================================================================== */

const CACHE_NAME = "animeplus-pwa-v2";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./browse.html",
  "./watch.html",
  "./movies.html",
  "./trailers.html",
  "./schedule.html",
  "./watchlist.html",
  "./premium.html",
  "./profile.html",
  "./login.html",
  "./register.html",
  "./forgot-password.html",
  "./404.html",
  "./manifest.json",
  "./img/icon.svg",
  "./img/icon-192.png",
  "./img/icon-512.png",
  "./img/icon-maskable-512.png",
  "./css/main.css",
  "./css/navbar.css",
  "./css/hero.css",
  "./css/cards.css",
  "./css/player.css",
  "./css/browse.css",
  "./css/auth.css",
  "./css/wallpaper.css",
  "./js/anime-data.js",
  "./js/app.js",
  "./js/player.js",
  "./js/browse.js",
  "./js/schedule.js",
  "./js/watchlist.js",
  "./js/auth.js",
  "./js/anime-3d.js",
  "./js/live-wallpaper.js"
];

// Install: Cache core assets safely without failing if one asset is missing
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {
          // Non-fatal warning if an optional asset isn't ready
          console.warn("[ANIME.PLUS PWA] Non-fatal cache warning for:", asset);
        }
      }
    })
  );
  self.skipWaiting();
});

// Activate: Clean up older caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Stale-while-revalidate for local assets, network-first for external/API
self.addEventListener("fetch", (e) => {
  // Only handle GET requests
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // Ignore video streaming chunks and backend API calls from sw caching
  if (url.pathname.endsWith(".mp4") || url.pathname.includes("/api/")) {
    return;
  }

  // Same-origin request handler
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        // Fetch fresh copy in background to update cache (Stale-While-Revalidate)
        const fetchPromise = fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // If offline and request is for an HTML page, fallback to index.html or cached match
          if (e.request.headers.get("accept") && e.request.headers.get("accept").includes("text/html")) {
            return cachedResponse || caches.match("./index.html");
          }
        });

        return cachedResponse || fetchPromise;
      })
    );
  } else {
    // External CDN / images: Cache first, fallback to network
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        return cachedResponse || fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && e.request.url.startsWith("http")) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => null);
      })
    );
  }
});
