// public/sw.js — service worker minimal pour le web push.
// Ne fait QUE le push (pas de cache offline).

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
