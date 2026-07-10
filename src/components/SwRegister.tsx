// src/components/SwRegister.tsx — enregistre le service worker au chargement
// (avant : enregistré seulement au subscribe push via PushBell). Idempotent.
"use client";
import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
