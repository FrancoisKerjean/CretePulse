// public/sw.js — service worker : web push + offline bus (lot 1 app compagnon).

// ---- Offline bus ----
// Network-first sur les navigations /buses* + cache-first sur les assets Next
// immutables (sans eux, une page en cache s'affiche sans CSS/JS hors ligne).
// Le reste (pages ISR 22 locales, contenu éditorial, APIs) reste réseau pur.
const PAGE_CACHE = "cd-bus-pages-v1";
const ASSET_CACHE = "cd-assets-v1";
const KEEP_CACHES = [PAGE_CACHE, ASSET_CACHE];
const BUS_PATH = /\/(buses)(\/|$)/;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("cd-") && !KEEP_CACHES.includes(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Assets Next.js immutables (hash dans l'URL) : cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        if (fresh.ok) {
          const cache = await caches.open(ASSET_CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      })(),
    );
    return;
  }

  // Navigations /buses* : network-first avec fallback cache.
  if (req.mode !== "navigate" || !BUS_PATH.test(url.pathname)) return;
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        if (fresh.ok) {
          const cache = await caches.open(PAGE_CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        throw new Error("offline and not cached");
      }
    })(),
  );
});

// ---- Web push ----
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_e) { data = {}; }
  const title = data.title || "Crete Direct";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "crete-direct",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || "/";
  const target = new URL(raw, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // 1) fenetre deja sur la page cible -> focus
      for (const c of list) {
        if (c.url === target && "focus" in c) return c.focus();
      }
      // 2) sinon, reutiliser une fenetre existante et naviguer vers la cible
      for (const c of list) {
        if ("focus" in c && "navigate" in c) { c.focus(); return c.navigate(target); }
      }
      // 3) aucune fenetre -> en ouvrir une
      return self.clients.openWindow(target);
    }),
  );
});
