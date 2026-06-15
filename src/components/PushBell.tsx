// src/components/PushBell.tsx
"use client";
import { useEffect, useState } from "react";

// Convertit la clé VAPID base64url en Uint8Array pour applicationServerKey.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  // ArrayBuffer explicite : evite l'union ArrayBufferLike (SharedArrayBuffer)
  // refusee par BufferSource de applicationServerKey (TS >= 5.7).
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "unsupported" | "ios-install" | "idle" | "subscribed" | "denied" | "working";

const T = {
  cta: {
    en: "Get bus & urgent Crete alerts",
    fr: "Recevoir les alertes bus & infos urgentes",
    de: "Bus- & Eilmeldungen für Kreta erhalten",
    el: "Ειδοποιήσεις λεωφορείων & έκτακτα Κρήτης",
  },
  on: {
    en: "Alerts on", fr: "Alertes activées", de: "Meldungen aktiv", el: "Ειδοποιήσεις ενεργές",
  },
  blocked: {
    en: "Notifications blocked in your browser.",
    fr: "Notifications bloquées dans le navigateur.",
    de: "Benachrichtigungen im Browser blockiert.",
    el: "Οι ειδοποιήσεις είναι αποκλεισμένες στο πρόγραμμα περιήγησης.",
  },
  iosInstall: {
    en: "Bus alerts: add this site to your Home Screen (Share, then Add to Home Screen) to enable them.",
    fr: "Alertes bus : ajoute le site à ton écran d'accueil (Partager, puis Sur l'écran d'accueil) pour les activer.",
    de: "Bus-Meldungen: Seite zum Home-Bildschirm hinzufügen (Teilen, dann Zum Home-Bildschirm), um sie zu aktivieren.",
    el: "Ειδοποιήσεις λεωφορείων: πρόσθεσε τον ιστότοπο στην αρχική οθόνη (Κοινή χρήση, μετά Προσθήκη) για ενεργοποίηση.",
  },
} as const;
type Ui = keyof (typeof T)["cta"];

export function PushBell({ locale, label }: { locale: string; label?: string }) {
  const ui = (["en", "fr", "de", "el"].includes(locale) ? locale : "en") as Ui;
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      // iOS Safari (onglet) n'expose PushManager qu'en PWA installée : on guide
      // vers "Ajouter à l'écran d'accueil" au lieu de masquer le bouton.
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const isiOS = /iP(hone|ad|od)/.test(ua);
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches === true ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(isiOS && !standalone ? "ios-install" : "unsupported");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (Notification.permission === "denied") { setState("denied"); return; }
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const existing = reg && (await reg.pushManager.getSubscription());
      setState(existing ? "subscribed" : "idle");
    }).catch(() => setState("idle"));
  }, []);

  async function subscribe() {
    setState("working");
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("no vapid key");
      // Permission d'abord : si refus, pas de service worker orphelin enregistre.
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("denied"); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), locale, topics: ["bus_alerts", "urgent_news"] }),
      });
      setState(res.ok ? "subscribed" : "idle");
    } catch (e) {
      console.error("[PushBell]", e);
      setState("idle");
    }
  }

  if (state === "unsupported") return null;
  if (state === "ios-install") {
    return (
      <p className="text-xs text-text-muted m-0 inline-flex items-start gap-1.5 max-w-sm">
        <span aria-hidden>🔔</span>
        <span>{T.iosInstall[ui]}</span>
      </p>
    );
  }
  if (state === "denied") {
    return <p className="text-xs text-text-muted m-0">{T.blocked[ui]}</p>;
  }
  if (state === "subscribed") {
    return <span className="inline-flex items-center gap-1.5 text-sm text-aegean font-semibold">🔔 {T.on[ui]}</span>;
  }
  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={state === "working"}
      className="inline-flex items-center gap-2 rounded-full bg-night px-4 py-2 text-sm font-semibold text-white hover:bg-aegean transition-colors disabled:opacity-60"
    >
      🔔 {state === "working" ? "..." : (label ?? T.cta[ui])}
    </button>
  );
}
