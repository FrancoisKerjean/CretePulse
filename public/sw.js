// public/sw.js — service worker : web push + offline bus (lot 1 app compagnon).

// ---- Offline bus ----
// Network-first sur les navigations /buses* + cache-first sur les assets Next
// immutables (sans eux, une page en cache s'affiche sans CSS/JS hors ligne).
// Le reste (pages ISR 22 locales, contenu éditorial, APIs) reste réseau pur.
const PAGE_CACHE = "cd-bus-pages-v1";
const ASSET_CACHE = "cd-assets-v1";
const SHELL_CACHE = "cd-shell-v1"; // page de repli hors ligne, pré-cachée à l'install
const KEEP_CACHES = [PAGE_CACHE, ASSET_CACHE, SHELL_CACHE];
const BUS_PATH = /\/(buses)(\/|$)/;
const OFFLINE_URL = "/offline.html";
// Plafond du cache pages : au-delà, les entrées les plus anciennes partent (lot 1 hors ligne,
// 27/10/2026 : avant, le cache grandissait sans borne et n'expirait jamais).
const PAGE_CACHE_MAX = 60;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.add(new Request(OFFLINE_URL, { cache: "reload" }))).catch(() => {}),
  );
  self.skipWaiting();
});

// Mesure : une navigation servie depuis le cache est notée ici ; la page, une fois
// chargée, demande (`cd-offline-query`, SwRegister) et reçoit `cd-offline-served`, puis
// remonte l'événement Plausible `offline_served`. Un postMessage au moment du fetch se
// perdrait : le document n'existe pas encore. Le SW n'appelle jamais Plausible.
const servedOffline = new Map(); // pathname -> timestamp ms
const SERVED_TTL_MS = 60_000;
function notifyOfflineServed(path) {
  servedOffline.set(path, Date.now());
}
self.addEventListener("message", (event) => {
  const d = event.data;
  if (!d || d.type !== "cd-offline-query" || !event.source || !event.source.url) return;
  const path = new URL(event.source.url).pathname;
  const at = servedOffline.get(path);
  if (!at) return;
  servedOffline.delete(path);
  if (Date.now() - at > SERVED_TTL_MS) return;
  event.source.postMessage({ type: "cd-offline-served", path });
});

async function putPageBounded(req, res) {
  const cache = await caches.open(PAGE_CACHE);
  await cache.put(req, res);
  const keys = await cache.keys();
  if (keys.length > PAGE_CACHE_MAX) {
    // Cache API conserve l'ordre d'insertion : les premières clés sont les plus anciennes.
    await Promise.all(keys.slice(0, keys.length - PAGE_CACHE_MAX).map((k) => cache.delete(k)));
  }
}

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

  if (req.mode !== "navigate") return;
  const isBus = BUS_PATH.test(url.pathname);
  // Navigations : /buses* network-first avec mise en cache ; toute navigation qui échoue
  // (hors ligne) sert la page en cache si elle existe, sinon la page de repli offline.html
  // avec la liste des horaires sauvegardés (avant : erreur du navigateur).
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        // Hors ligne, fetch() peut encore répondre depuis le cache HTTP du navigateur
        // (s-maxage/stale-while-revalidate) : c'est aussi une page servie sans réseau.
        if (self.navigator && self.navigator.onLine === false) notifyOfflineServed(url.pathname);
        // waitUntil : le SW reste vivant jusqu'à ce que le corps complet soit en cache.
        if (isBus && fresh.ok) event.waitUntil(putPageBounded(req, fresh.clone()));
        return fresh;
      } catch {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) {
          notifyOfflineServed(url.pathname);
          return cached;
        }
        const shell = await caches.match(OFFLINE_URL);
        if (shell) return shell;
        return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
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
