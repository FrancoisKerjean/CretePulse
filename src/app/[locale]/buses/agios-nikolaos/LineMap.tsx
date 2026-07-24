"use client";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { AGNIK_STOPS, type AgnikLine } from "@/data/agnik-bus";
import { createGpsBusEl } from "@/components/live/busMarker";
import type { LiveGpsBus } from "@/lib/bus-live";

type MaplibreMap = import("maplibre-gl").Map;
type MaplibreMarker = import("maplibre-gl").Marker;

/**
 * Carte géographique d'UNE ligne de bus urbaine (fond OpenStreetMap = rues + côte
 * exactes) : tracé GPS coloré + arrêts cliquables + bus GPS en direct si le bus roule.
 */
export function LineMap({ line, departureLabel, arrivalLabel }: {
  line: AgnikLine; departureLabel: string; arrivalLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: MaplibreMap | undefined;
    let gpsIv: ReturnType<typeof setInterval> | undefined;
    const gpsMarkers = new Map<string, MaplibreMarker>();

    Promise.all([import("maplibre-gl")]).then(([ml]) => {
      if (cancelled || !containerRef.current) return;
      map = new ml.Map({
        container: containerRef.current,
        style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: [line.geometry[0][0], line.geometry[0][1]],
        zoom: 13, minZoom: 11, maxZoom: 18,
        attributionControl: { compact: true },
      });
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        if (cancelled || !map) return;
        // tracé : liseré blanc + trait coloré épais
        map.addSource("line", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line.geometry } } });
        map.addLayer({ id: "line-casing", type: "line", source: "line", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.95 } });
        map.addLayer({ id: "line-main", type: "line", source: "line", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": line.hex, "line-width": 5 } });

        // arrêts (terminus plus gros) + popup nom
        line.stops.forEach((s, i) => {
          const stop = AGNIK_STOPS[s.slug];
          if (!stop) return;
          const term = i === 0 || i === line.stops.length - 1;
          const el = document.createElement("div");
          const size = term ? 15 : 10;
          el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${term ? line.hex : "#fff"};border:2.5px solid ${line.hex};cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.35)`;
          const tag = i === 0 ? ` · ${departureLabel}` : i === line.stops.length - 1 ? ` · ${arrivalLabel}` : "";
          new ml.Marker({ element: el, anchor: "center" })
            .setLngLat([stop.lng, stop.lat])
            .setPopup(new ml.Popup({ offset: 12, closeButton: false }).setText(`${stop.name}${tag}`))
            .addTo(map!);
        });

        // cadrer sur toute la ligne
        const b = new ml.LngLatBounds();
        for (const c of line.geometry) b.extend(c as [number, number]);
        map.fitBounds(b, { padding: 44, duration: 0 });

        // bus GPS en direct (uniquement ceux de cette ligne)
        const gpsTick = async () => {
          if (cancelled || !map) return;
          try {
            const res = await fetch("/api/buses/agncitybus-live", { cache: "no-store" });
            if (!res.ok || cancelled) return;
            const data = (await res.json()) as { buses?: LiveGpsBus[] };
            const buses = (data.buses ?? []).filter((bu) => bu.lineCode === line.code && Number.isFinite(bu.lat) && Number.isFinite(bu.lng));
            const ids = new Set(buses.map((bu) => bu.id));
            for (const bu of buses) {
              const existing = gpsMarkers.get(bu.id);
              if (existing) existing.setLngLat([bu.lng, bu.lat]);
              else {
                const marker = new ml.Marker({ element: createGpsBusEl(bu), anchor: "center" }).setLngLat([bu.lng, bu.lat]).addTo(map!);
                gpsMarkers.set(bu.id, marker);
              }
            }
            for (const [id, m] of gpsMarkers) if (!ids.has(id)) { m.remove(); gpsMarkers.delete(id); }
          } catch { /* silencieux */ }
        };
        gpsTick();
        gpsIv = setInterval(gpsTick, 8000);
      });
    });

    return () => {
      cancelled = true;
      if (gpsIv) clearInterval(gpsIv);
      for (const m of gpsMarkers.values()) m.remove();
      map?.remove();
    };
  }, [line, departureLabel, arrivalLabel]);

  return <div ref={containerRef} className="h-80 w-full overflow-hidden rounded-xl border border-black/5" />;
}
