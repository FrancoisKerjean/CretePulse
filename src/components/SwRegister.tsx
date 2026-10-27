// src/components/SwRegister.tsx : enregistre le service worker au chargement
// (avant : enregistré seulement au subscribe push via PushBell). Idempotent.
// Relaie aussi la mesure hors ligne : quand sw.js sert une page depuis le cache, il
// poste `cd-offline-served` et la page remonte l'événement Plausible `offline_served`
// (le SW n'a pas accès à Plausible). Critère d'arrêt du chantier PWA : < 1 % des vues
// /buses* sur 4 semaines de saison (docs/superpowers/specs/2026-10-27-pwa-bus-hors-ligne-manques.md).
"use client";
import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onMessage = (ev: MessageEvent) => {
      const d = ev.data as { type?: string; path?: string } | null;
      if (d?.type !== "cd-offline-served") return;
      window.plausible?.("offline_served", { props: { path: d.path ?? "" } });
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    // Demande au SW si CETTE page vient du cache (il ne peut pas prévenir avant qu'elle existe).
    navigator.serviceWorker.ready
      .then((reg) => reg.active?.postMessage({ type: "cd-offline-query" }))
      .catch(() => {});
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);
  return null;
}
