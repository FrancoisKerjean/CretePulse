"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Même fond de carte que la carte immersive /explore et /map (CartoDB Voyager,
// tuiles vectorielles réelles, gratuit, sans clé API).
const CARTO_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

export function MapCell({
  lat,
  lng,
  label,
  className = "",
  zoom = 13,
}: {
  lat: number | null;
  lng: number | null;
  label?: string | null;
  className?: string;
  zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  const hasCoords = lat != null && lng != null;

  // Lazy : on ne monte la vraie carte (et on ne charge maplibre-gl) que quand la
  // cellule entre dans le viewport — évite de charger la lib sur les fiches dont
  // la carte reste sous la ligne de flottaison (24K pages).
  useEffect(() => {
    if (!hasCoords || visible || !containerRef.current) return;
    const el = containerRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasCoords, visible]);

  // Initialisation MapLibre une fois la cellule visible.
  useEffect(() => {
    if (!visible || !hasCoords || mapRef.current || !containerRef.current) return;
    let cancelled = false;
    void import("maplibre-gl").then(({ Map, Marker, NavigationControl }) => {
      if (cancelled || !containerRef.current) return;
      const map = new Map({
        container: containerRef.current,
        style: CARTO_STYLE,
        center: [lng as number, lat as number],
        zoom,
        minZoom: 7,
        maxZoom: 17,
        attributionControl: { compact: true },
        scrollZoom: false, // pas de hijack du scroll de page
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      mapRef.current = map;
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");

      const pin = document.createElement("div");
      pin.style.cssText =
        "width:16px;height:16px;border-radius:50%;background:#ED7A5C;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);";
      new Marker({ element: pin }).setLngLat([lng as number, lat as number]).addTo(map);

      map.on("load", () => {
        if (!cancelled) setReady(true);
      });
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [visible, hasCoords, lat, lng, zoom]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-aegean-faint to-stone ${className}`}
    >
      {/* Wrapper absolu séparé : maplibre-gl.css force position:relative sur le
          conteneur monté, ce qui écraserait un `absolute` direct (=> hauteur 0,
          carte invisible). Le wrapper fournit le positionnement/la taille. */}
      <div className="absolute inset-0">
        <div
          ref={containerRef}
          className="h-full w-full"
          aria-label={label ? `Carte : ${label}` : "Carte"}
        />
      </div>
      {/* Placeholder pendant le chargement des tuiles (ou si pas de coords) */}
      {hasCoords && !ready && (
        <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-white bg-terra shadow-md" />
      )}
      {label && (
        <span className="pointer-events-none absolute bottom-2 left-3 z-10 rounded-md bg-white/95 px-2 py-1 text-[10px] font-semibold text-aegean shadow-sm">
          {label}
        </span>
      )}
    </div>
  );
}
