"use client";

import { useCallback, useEffect, useState } from "react";
import type { GeoPos } from "@/lib/geo";
import { SLUG_COORDS } from "@/lib/taxi-fare";

export type GeoStatus = "idle" | "prompting" | "granted" | "manual" | "denied" | "unavailable";
const KEY = "cd-geo";

/**
 * Position utilisateur, 100% client-side (ne quitte jamais le navigateur).
 * - Activation UNIQUEMENT via requestGeo() (clic), jamais au mount.
 * - setManual(slug) = fallback sélecteur (coords SLUG_COORDS).
 * - initialSlug (ex: ?from=chania-airport) initialise en "manual" sans prompt.
 * - Persistance sessionStorage pour survivre à la navigation.
 */
export function useGeoPosition(initialSlug?: string | null) {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [pos, setPos] = useState<GeoPos | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) {
        const p = JSON.parse(saved) as GeoPos & { status: GeoStatus };
        setPos({ lat: p.lat, lon: p.lon });
        setStatus(p.status === "granted" ? "granted" : "manual");
        return;
      }
    } catch { /* sessionStorage indisponible : on reste idle */ }
    if (initialSlug && SLUG_COORDS[initialSlug]) {
      const [lat, lon] = SLUG_COORDS[initialSlug];
      setPos({ lat, lon });
      setStatus("manual");
    }
  }, [initialSlug]);

  const save = (p: GeoPos, s: GeoStatus) => {
    try { sessionStorage.setItem(KEY, JSON.stringify({ ...p, status: s })); } catch { /* noop */ }
  };

  const requestGeo = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setStatus("unavailable"); return; }
    setStatus("prompting");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const p = { lat: coords.latitude, lon: coords.longitude };
        setPos(p); setStatus("granted"); save(p, "granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);

  const setManual = useCallback((slug: string) => {
    const c = SLUG_COORDS[slug];
    if (!c) return;
    const p = { lat: c[0], lon: c[1] };
    setPos(p); setStatus("manual"); save(p, "manual");
  }, []);

  // Position à coordonnées libres (point posé/glissé sur la carte Explorer).
  // Réutilise le statut "manual" : pas de nouvelle valeur dans GeoStatus, donc
  // aucun impact sur les 6 autres consommateurs du hook.
  const setPosition = useCallback((lat: number, lon: number) => {
    const p = { lat, lon };
    setPos(p); setStatus("manual"); save(p, "manual");
  }, []);

  return { status, pos, requestGeo, setManual, setPosition };
}
