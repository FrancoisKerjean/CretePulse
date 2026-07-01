"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  loadLiveNetwork, busesAt, reconcile, lerp, lerpAngle,
  type LiveNetwork, type LiveBus, type LiveGpsBus,
} from "@/lib/bus-live";
import { athensNow } from "@/lib/athens-time";
import { createBusEl, createGpsBusEl, setBusArrow } from "./busMarker";
import { Link } from "@/i18n/navigation";

type MaplibreMap = import("maplibre-gl").Map;
type MaplibreMarker = import("maplibre-gl").Marker;
type Pose = { lat: number; lng: number; bearing: number };

const T: Record<string, { estimated: string; circulating: string; planTrip: string; rentCar: string; gpsLive: string }> = {
  en: { estimated: "Estimated from the timetable", circulating: "buses running", planTrip: "Plan a trip", rentCar: "Rent a car", gpsLive: "live GPS (Agios Nikolaos)" },
  fr: { estimated: "Estimé selon l'horaire", circulating: "bus en circulation", planTrip: "Planifier un trajet", rentCar: "Louer une voiture", gpsLive: "en direct GPS (Agios Nikolaos)" },
};

// On ne trace que les lignes à vraie géométrie routière (OSM ou bus urbain agncitybus).
// Les lignes KTEL-fallback sont des segments droits entre 2 terminus qui coupent la mer
// (bus "dans l'eau") -> exclues tant qu'elles n'ont pas un vrai tracé.
function isMapped(l: { source: "osm" | "ktel" | "agncitybus"; partialGeo: boolean }): boolean {
  return l.source !== "ktel" && !l.partialGeo;
}

function linesGeoJSON(net: LiveNetwork) {
  return {
    type: "FeatureCollection" as const,
    features: [...net.lines.values()].filter(isMapped).map((l) => ({
      type: "Feature" as const,
      // couleur propre aux lignes urbaines (jaune/rouge/verte) ; null -> fallback aegean
      properties: { code: l.code, color: l.source === "agncitybus" ? l.color : null },
      geometry: { type: "LineString" as const, coordinates: l.geometry },
    })),
  };
}

export function LiveMapClient({ locale }: { locale: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const netRef = useRef<LiveNetwork | null>(null);
  const markersRef = useRef(new Map<string, { marker: MaplibreMarker; el: HTMLDivElement; cur: Pose }>());
  const targetsRef = useRef(new Map<string, LiveBus>());
  // couche GPS temps réel (Agios Nikolaos) : marqueurs + lignes couvertes (masquent l'estimé)
  const gpsMarkersRef = useRef(new Map<string, { marker: MaplibreMarker; el: HTMLDivElement; cur: Pose }>());
  const gpsTargetsRef = useRef(new Map<string, LiveGpsBus>());
  const gpsCodesRef = useRef(new Set<string>());
  const [count, setCount] = useState(0);
  const [gpsCount, setGpsCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let iv: ReturnType<typeof setInterval> | undefined;
    let gpsIv: ReturnType<typeof setInterval> | undefined;
    let raf = 0;
    let onVis: (() => void) | undefined;

    Promise.all([import("maplibre-gl"), loadLiveNetwork()]).then(([ml, net]) => {
      if (cancelled || !containerRef.current) return;
      netRef.current = net;
      const map = new ml.Map({
        container: containerRef.current,
        style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: [25.0, 35.25], zoom: 8.5, minZoom: 7, maxZoom: 16,
      });
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;
        map.addSource("bus-lines", { type: "geojson", data: linesGeoJSON(net) });
        map.addLayer({
          id: "bus-lines-osm", type: "line", source: "bus-lines",
          paint: {
            "line-color": ["coalesce", ["get", "color"], "#0B5E78"],
            "line-width": 3, "line-opacity": 0.55,
          },
        });

        const markers = markersRef.current;
        const tick = () => {
          const n = netRef.current; if (!n) return;
          // masque l'estimé des lignes déjà couvertes par un vrai bus GPS (Agios Nikolaos)
          const buses = busesAt(athensNow(), n)
            .filter((bus) => !bus.degraded && !gpsCodesRef.current.has(bus.code));
          setCount(buses.length);
          const poses = new Map([...markers].map(([id, m]) => [id, m.cur]));
          const { entering, leaving } = reconcile(poses, buses);
          for (const bus of entering) {
            const el = createBusEl(bus);
            const marker = new ml.Marker({ element: el, anchor: "center" }).setLngLat([bus.lng, bus.lat]).addTo(map);
            markers.set(bus.id, { marker, el, cur: { lat: bus.lat, lng: bus.lng, bearing: bus.bearing } });
          }
          for (const id of leaving) { markers.get(id)?.marker.remove(); markers.delete(id); }
          targetsRef.current = new Map(buses.map((bus) => [bus.id, bus]));
        };
        tick();
        iv = setInterval(tick, 2000);

        // --- couche GPS temps réel (Agios Nikolaos) ---
        const gpsMarkers = gpsMarkersRef.current;
        let gpsInFlight = false; // single-flight : pas de gpsTick concurrent
        const gpsTick = async () => {
          if (gpsInFlight || cancelled) return;
          gpsInFlight = true;
          try {
            const res = await fetch("/api/buses/agncitybus-live", { cache: "no-store" });
            if (!res.ok || cancelled) return;
            const data = (await res.json()) as { buses?: LiveGpsBus[] };
            const buses = (data.buses ?? []).filter(
              (b) => b && Number.isFinite(b.lat) && Number.isFinite(b.lng) && !!b.id && !!b.lineCode,
            );
            gpsCodesRef.current = new Set(buses.map((b) => b.lineCode));
            setGpsCount(buses.length);
            const nextIds = new Set(buses.map((b) => b.id));
            for (const bus of buses) {
              const existing = gpsMarkers.get(bus.id);
              if (existing) {
                gpsTargetsRef.current.set(bus.id, bus);
              } else {
                const el = createGpsBusEl(bus);
                const marker = new ml.Marker({ element: el, anchor: "center" }).setLngLat([bus.lng, bus.lat]).addTo(map);
                gpsMarkers.set(bus.id, { marker, el, cur: { lat: bus.lat, lng: bus.lng, bearing: bus.bearing } });
                gpsTargetsRef.current.set(bus.id, bus);
              }
            }
            for (const [id, m] of gpsMarkers) {
              if (!nextIds.has(id)) { m.marker.remove(); gpsMarkers.delete(id); gpsTargetsRef.current.delete(id); }
            }
            if (!cancelled) tick(); // resync immédiat de l'estimé (purge le doublon des lignes couvertes par le GPS)
          } catch {
            // réseau/API KO : on garde l'état précédent, l'estimé reprend au tick suivant si la source se vide
          } finally {
            gpsInFlight = false;
          }
        };
        gpsTick();
        gpsIv = setInterval(gpsTick, 6000);

        const animate = () => {
          for (const [id, m] of markers) {
            const t = targetsRef.current.get(id);
            if (!t) continue;
            m.cur.lat = lerp(m.cur.lat, t.lat, 0.08);
            m.cur.lng = lerp(m.cur.lng, t.lng, 0.08);
            m.cur.bearing = lerpAngle(m.cur.bearing, t.bearing, 0.12);
            m.marker.setLngLat([m.cur.lng, m.cur.lat]);
            setBusArrow(m.el, m.cur.bearing);
          }
          // marqueurs GPS : lerp plus vif (positions réelles, moins fréquentes)
          for (const [id, m] of gpsMarkers) {
            const t = gpsTargetsRef.current.get(id);
            if (!t) continue;
            m.cur.lat = lerp(m.cur.lat, t.lat, 0.14);
            m.cur.lng = lerp(m.cur.lng, t.lng, 0.14);
            m.cur.bearing = lerpAngle(m.cur.bearing, t.bearing, 0.16);
            m.marker.setLngLat([m.cur.lng, m.cur.lat]);
            setBusArrow(m.el, m.cur.bearing);
          }
          raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);

        onVis = () => { if (document.visibilityState === "visible") { tick(); gpsTick(); } };
        document.addEventListener("visibilitychange", onVis);
      });
    });

    return () => {
      cancelled = true;
      if (iv) clearInterval(iv);
      if (gpsIv) clearInterval(gpsIv);
      if (raf) cancelAnimationFrame(raf);
      if (onVis) document.removeEventListener("visibilitychange", onVis);
      for (const m of markersRef.current.values()) m.marker.remove();
      markersRef.current.clear();
      for (const m of gpsMarkersRef.current.values()) m.marker.remove();
      gpsMarkersRef.current.clear();
      gpsTargetsRef.current.clear();
      gpsCodesRef.current = new Set();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const t = T[locale] ?? T.en;

  return (
    <div className="relative overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
      <div className="absolute inset-0"><div ref={containerRef} className="h-full w-full" /></div>

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-2">
        <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-night/90 px-3 py-1.5 text-xs font-medium text-sand backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-sun animate-live-pulse" />
          {t.estimated}
        </span>
        <span className="pointer-events-auto inline-flex items-baseline gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-sm text-text shadow backdrop-blur">
          <span className="font-data font-bold text-aegean tabular-nums">{count}</span> {t.circulating}
        </span>
        {gpsCount > 0 && (
          <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-sm text-text shadow backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#12B76A" }} />
            <span className="font-data font-bold tabular-nums" style={{ color: "#12B76A" }}>{gpsCount}</span> {t.gpsLive}
          </span>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-14 z-10 flex justify-center px-3 sm:bottom-6">
        <div className="flex w-full max-w-sm gap-2 sm:w-auto">
          <Link
            href="/buses"
            className="pointer-events-auto inline-flex flex-1 items-center justify-center rounded-full bg-aegean px-5 py-2.5 text-sm font-heading font-semibold text-white shadow-lg transition hover:bg-aegean/90 sm:flex-none"
          >
            {t.planTrip}
          </Link>
          <Link
            href="/car-rental"
            className="pointer-events-auto inline-flex flex-1 items-center justify-center rounded-full bg-terra px-5 py-2.5 text-sm font-heading font-semibold text-white shadow-lg transition hover:bg-terra/90 sm:flex-none"
          >
            {t.rentCar}
          </Link>
        </div>
      </div>
    </div>
  );
}
