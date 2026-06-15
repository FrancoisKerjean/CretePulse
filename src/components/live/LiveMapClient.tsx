"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  loadLiveNetwork, busesAt, reconcile, lerp, lerpAngle,
  type LiveNetwork, type LiveBus,
} from "@/lib/bus-live";
import { athensNow } from "@/lib/athens-time";
import { createBusEl, setBusArrow } from "./busMarker";

type MaplibreMap = import("maplibre-gl").Map;
type MaplibreMarker = import("maplibre-gl").Marker;
type Pose = { lat: number; lng: number; bearing: number };

function linesGeoJSON(net: LiveNetwork) {
  return {
    type: "FeatureCollection" as const,
    features: [...net.lines.values()].map((l) => ({
      type: "Feature" as const,
      properties: { code: l.code, degraded: l.source === "ktel" || l.partialGeo },
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
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let iv: ReturnType<typeof setInterval> | undefined;
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
          filter: ["!", ["get", "degraded"]],
          paint: { "line-color": "#0B5E78", "line-width": 3, "line-opacity": 0.55 },
        });
        map.addLayer({
          id: "bus-lines-ktel", type: "line", source: "bus-lines",
          filter: ["get", "degraded"],
          paint: { "line-color": "#5C7886", "line-width": 2, "line-dasharray": [2, 2], "line-opacity": 0.5 },
        });

        const markers = markersRef.current;
        const tick = () => {
          const n = netRef.current; if (!n) return;
          const buses = busesAt(athensNow(), n);
          setCount(buses.length);
          const poses = new Map([...markers].map(([id, m]) => [id, m.cur]));
          const { entering, leaving } = reconcile(poses, buses);
          for (const bus of entering) {
            const el = createBusEl(bus);
            const marker = new ml.Marker({ element: el }).setLngLat([bus.lng, bus.lat]).addTo(map);
            markers.set(bus.id, { marker, el, cur: { lat: bus.lat, lng: bus.lng, bearing: bus.bearing } });
          }
          for (const id of leaving) { markers.get(id)?.marker.remove(); markers.delete(id); }
          targetsRef.current = new Map(buses.map((bus) => [bus.id, bus]));
        };
        tick();
        iv = setInterval(tick, 2000);

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
          raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);

        onVis = () => { if (document.visibilityState === "visible") tick(); };
        document.addEventListener("visibilitychange", onVis);
      });
    });

    return () => {
      cancelled = true;
      if (iv) clearInterval(iv);
      if (raf) cancelAnimationFrame(raf);
      if (onVis) document.removeEventListener("visibilitychange", onVis);
      for (const m of markersRef.current.values()) m.marker.remove();
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
      <div className="absolute inset-0"><div ref={containerRef} className="h-full w-full" /></div>
    </div>
  );
}
