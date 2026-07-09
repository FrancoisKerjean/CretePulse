"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  loadLiveNetwork, busesAt, reconcile, lerp, lerpAngle, deriveBusSheet,
  type LiveNetwork, type LiveBus, type LiveLine, type LiveGpsBus, type BusSheetVM,
} from "@/lib/bus-live";
import { athensNow } from "@/lib/athens-time";
import { createBusEl, createGpsBusEl, setBusArrow, setBusSelected, setBusDimmed } from "./busMarker";
import { BusSheet } from "./BusSheet";
import { Link } from "@/i18n/navigation";

type MaplibreMap = import("maplibre-gl").Map;
type MaplibreMarker = import("maplibre-gl").Marker;
type GeoJSONSource = import("maplibre-gl").GeoJSONSource;
type Pose = { lat: number; lng: number; bearing: number };

const SHEET_H = 240; // hauteur approx du bottom sheet, pour l'offset de recentrage
const EMPTY = { type: "FeatureCollection" as const, features: [] };

const T: Record<string, { estimated: string; circulating: string; planTrip: string; rentCar: string; gpsLive: string; legendKtel: string; legendUrban: string }> = {
  en: { estimated: "Estimated from the timetable", circulating: "buses running", planTrip: "Plan a trip", rentCar: "Rent a car", gpsLive: "live GPS (Agios Nikolaos)", legendKtel: "KTEL (intercity)", legendUrban: "City bus (urban networks)" },
  fr: { estimated: "Estimé selon l'horaire", circulating: "bus en circulation", planTrip: "Planifier un trajet", rentCar: "Louer une voiture", gpsLive: "en direct GPS (Agios Nikolaos)", legendKtel: "KTEL (interurbain)", legendUrban: "Bus urbain (réseaux de ville)" },
};

// Sources "urbaines" (réseaux municipaux) dont on colore le tracé par leur couleur propre.
// Les interurbains ktel/osm restent en bleu unique.
function isUrbanSource(source: string): boolean {
  return source === "agncitybus" || source === "citybus";
}

// On affiche toute ligne ayant un tracé (>= 2 points), y compris les tracés OSRM
// estimés (source ktel / partialGeo) et les lignes urbaines. La page /live
// indique déjà « estimé d'après l'horaire ».
function hasTrace(l: { geometry: [number, number][] | null }): boolean {
  return Array.isArray(l.geometry) && l.geometry.length >= 2;
}

function linesGeoJSON(net: LiveNetwork) {
  return {
    type: "FeatureCollection" as const,
    features: [...net.lines.values()].filter(hasTrace).map((l) => ({
      type: "Feature" as const,
      // lineId pour le highlight de sélection ; color pour les lignes urbaines (null -> fallback)
      properties: { code: l.code, lineId: l.id, color: isUrbanSource(l.source) ? l.color : null },
      geometry: { type: "LineString" as const, coordinates: l.geometry },
    })),
  };
}

function stopsGeoJSON(line: LiveLine | null, nextStopName: string | null) {
  if (!line) return EMPTY;
  return {
    type: "FeatureCollection" as const,
    features: line.stops.map((s) => ({
      type: "Feature" as const,
      properties: { isNext: s.name === nextStopName },
      geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
    })),
  };
}

export function LiveMapClient({ locale }: { locale: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const netRef = useRef<LiveNetwork | null>(null);
  const markersRef = useRef(new Map<string, { marker: MaplibreMarker; el: HTMLDivElement; cur: Pose }>());
  const targetsRef = useRef(new Map<string, LiveBus>());
  const selectedRef = useRef<string | null>(null);
  const deselectRef = useRef<() => void>(() => {});
  // couche GPS temps réel (Agios Nikolaos) : marqueurs + lignes couvertes (masquent l'estimé)
  const gpsMarkersRef = useRef(new Map<string, { marker: MaplibreMarker; el: HTMLDivElement; cur: Pose }>());
  const gpsTargetsRef = useRef(new Map<string, LiveGpsBus>());
  const gpsCodesRef = useRef(new Set<string>());
  const [count, setCount] = useState(0);
  const [gpsCount, setGpsCount] = useState(0);
  const [sheetVM, setSheetVM] = useState<BusSheetVM | null>(null);

  useEffect(() => {
    let cancelled = false;
    let iv: ReturnType<typeof setInterval> | undefined;
    let gpsIv: ReturnType<typeof setInterval> | undefined;
    let raf = 0;
    let onVis: (() => void) | undefined;
    let onKey: ((e: KeyboardEvent) => void) | undefined;

    const reduceMotion = () =>
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

      const stopsSource = () => map.getSource("sel-stops") as GeoJSONSource | undefined;

      const applyMarkerStates = () => {
        const sel = selectedRef.current;
        for (const [id, m] of markersRef.current) {
          setBusSelected(m.el, id === sel);
          setBusDimmed(m.el, sel != null && id !== sel);
        }
      };
      const applyHighlight = (lineId: number) => {
        map.setFilter("bus-lines-highlight", ["==", ["get", "lineId"], lineId]);
        map.setPaintProperty("bus-lines-base", "line-opacity", 0.12);
      };
      const resetHighlight = () => {
        map.setFilter("bus-lines-highlight", ["==", ["get", "lineId"], -1]);
        map.setPaintProperty("bus-lines-base", "line-opacity", 0.55);
      };
      const setStops = (line: LiveLine | null, nextStopName: string | null) =>
        stopsSource()?.setData(stopsGeoJSON(line, nextStopName));

      const deselect = () => {
        if (selectedRef.current == null) return;
        selectedRef.current = null;
        resetHighlight();
        setStops(null, null);
        applyMarkerStates();
        setSheetVM(null);
      };
      deselectRef.current = deselect;

      const selectBus = (id: string) => {
        const bus = targetsRef.current.get(id);
        if (!bus) return;
        selectedRef.current = id;
        const line = netRef.current?.lines.get(bus.lineId) ?? null;
        applyHighlight(bus.lineId);
        setStops(line, bus.nextStop);
        applyMarkerStates();
        setSheetVM(deriveBusSheet(bus, athensNow().minutes, locale));
        map.easeTo({ center: [bus.lng, bus.lat], offset: [0, -SHEET_H / 2], duration: reduceMotion() ? 0 : 400 });
      };

      map.on("load", () => {
        if (cancelled) return;
        map.addSource("bus-lines", { type: "geojson", data: linesGeoJSON(net) });
        map.addLayer({
          id: "bus-lines-base", type: "line", source: "bus-lines",
          paint: {
            "line-color": ["coalesce", ["get", "color"], "#0B5E78"],
            "line-width": 3, "line-opacity": 0.55,
          },
        });
        map.addLayer({
          id: "bus-lines-highlight", type: "line", source: "bus-lines",
          filter: ["==", ["get", "lineId"], -1],
          paint: { "line-color": "#ED7A5C", "line-width": 5, "line-opacity": 1 },
        });
        map.addSource("sel-stops", { type: "geojson", data: EMPTY });
        map.addLayer({
          id: "sel-stops-dot", type: "circle", source: "sel-stops",
          filter: ["==", ["get", "isNext"], false],
          paint: { "circle-radius": 4, "circle-color": "#0B5E78", "circle-stroke-width": 1.5, "circle-stroke-color": "#fff" },
        });
        map.addLayer({
          id: "sel-stops-next", type: "circle", source: "sel-stops",
          filter: ["==", ["get", "isNext"], true],
          paint: { "circle-radius": 8, "circle-color": "#FFC83D", "circle-stroke-width": 2, "circle-stroke-color": "#0B3954" },
        });

        map.on("click", () => deselect()); // clic sur le fond = désélection

        const markers = markersRef.current;
        const tick = () => {
          const n = netRef.current; if (!n) return;
          // Tous les bus (y compris tracés estimés, cf hasTrace), SAUF les lignes déjà
          // couvertes par un vrai bus GPS (Agios Nikolaos) pour ne pas doublonner.
          const buses = busesAt(athensNow(), n).filter((bus) => !gpsCodesRef.current.has(bus.code));
          setCount(buses.length);
          const poses = new Map([...markers].map(([id, m]) => [id, m.cur]));
          const { entering, leaving } = reconcile(poses, buses);
          for (const bus of entering) {
            // marqueur coloré par ligne pour le réseau municipal (split KTEL / urbain)
            const line = n.lines.get(bus.lineId);
            const el = createBusEl(bus, line && isUrbanSource(line.source) ? line.color : null);
            el.addEventListener("click", (e) => { e.stopPropagation(); selectBus(bus.id); });
            el.addEventListener("keydown", (e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectBus(bus.id); }
            });
            const marker = new ml.Marker({ element: el, anchor: "center" }).setLngLat([bus.lng, bus.lat]).addTo(map);
            markers.set(bus.id, { marker, el, cur: { lat: bus.lat, lng: bus.lng, bearing: bus.bearing } });
          }
          for (const id of leaving) { markers.get(id)?.marker.remove(); markers.delete(id); }
          targetsRef.current = new Map(buses.map((bus) => [bus.id, bus]));
          applyMarkerStates();
          const sel = selectedRef.current;
          if (sel) {
            const b = targetsRef.current.get(sel);
            if (b) {
              setSheetVM(deriveBusSheet(b, athensNow().minutes, locale));
              setStops(netRef.current?.lines.get(b.lineId) ?? null, b.nextStop);
            } else {
              deselect();
            }
          }
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
            const t2 = targetsRef.current.get(id);
            if (!t2) continue;
            m.cur.lat = lerp(m.cur.lat, t2.lat, 0.08);
            m.cur.lng = lerp(m.cur.lng, t2.lng, 0.08);
            m.cur.bearing = lerpAngle(m.cur.bearing, t2.bearing, 0.12);
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
        onKey = (e) => { if (e.key === "Escape") deselect(); };
        document.addEventListener("keydown", onKey);
      });
    });

    return () => {
      cancelled = true;
      if (iv) clearInterval(iv);
      if (gpsIv) clearInterval(gpsIv);
      if (raf) cancelAnimationFrame(raf);
      if (onVis) document.removeEventListener("visibilitychange", onVis);
      if (onKey) document.removeEventListener("keydown", onKey);
      for (const m of markersRef.current.values()) m.marker.remove();
      markersRef.current.clear();
      for (const m of gpsMarkersRef.current.values()) m.marker.remove();
      gpsMarkersRef.current.clear();
      gpsTargetsRef.current.clear();
      gpsCodesRef.current = new Set();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [locale]);

  const t = T[locale] ?? T.en;

  return (
    <div className="relative overflow-hidden" style={{ height: "calc(100dvh - 56px)" }}>
      <div className="absolute inset-0"><div ref={containerRef} className="h-full w-full" /></div>

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-2">
        <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-night/90 px-3 py-1.5 text-xs font-medium text-sand backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-sun animate-live-pulse" />
          {t.estimated}
        </span>
        <span className="pointer-events-auto inline-flex items-baseline gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-sm text-text shadow backdrop-blur">
          <span className="font-data font-bold text-sea tabular-nums">{count}</span> {t.circulating}
        </span>
        {gpsCount > 0 && (
          <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-sm text-text shadow backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#12B76A" }} />
            <span className="font-data font-bold tabular-nums" style={{ color: "#12B76A" }}>{gpsCount}</span> {t.gpsLive}
          </span>
        )}
      </div>

      {!sheetVM && (
        <div className="pointer-events-none absolute inset-x-0 bottom-14 z-10 flex justify-center px-3 sm:bottom-6">
          <div className="flex w-full max-w-sm gap-2 sm:w-auto">
            <Link href="/buses" className="pointer-events-auto inline-flex flex-1 items-center justify-center rounded-full bg-sea px-5 py-2.5 text-sm font-heading font-semibold text-white shadow-card transition hover:bg-sea/90 sm:flex-none">
              {t.planTrip}
            </Link>
            <Link href="/car-rental" className="pointer-events-auto inline-flex flex-1 items-center justify-center rounded-full bg-terracotta px-5 py-2.5 text-sm font-heading font-semibold text-white shadow-card transition hover:bg-terracotta/90 sm:flex-none">
              {t.rentCar}
            </Link>
          </div>
        </div>
      )}

      {!sheetVM && (
        <div className="pointer-events-none absolute left-3 bottom-24 z-10 sm:bottom-6">
          <div className="rounded-lg bg-surface/90 px-2.5 py-2 text-[11px] leading-tight text-text shadow backdrop-blur">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1 w-4 rounded-full" style={{ background: "#0B5E78" }} aria-hidden />
              {t.legendKtel}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex gap-0.5" aria-hidden>
                <span className="inline-block h-1 w-1.5 rounded-full" style={{ background: "#F2C21E" }} />
                <span className="inline-block h-1 w-1.5 rounded-full" style={{ background: "#E0342B" }} />
                <span className="inline-block h-1 w-1.5 rounded-full" style={{ background: "#2FA24C" }} />
              </span>
              {t.legendUrban}
            </div>
          </div>
        </div>
      )}

      {sheetVM && <BusSheet vm={sheetVM} locale={locale} onClose={() => deselectRef.current()} />}
    </div>
  );
}
