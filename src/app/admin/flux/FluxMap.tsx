"use client";
// Carte des flux touristiques pour /admin/flux. Données préparées côté
// serveur (page.tsx), rendu MapLibre côté client (même pattern que /live).
// 5 couches togglables : demande bus OD (arcs), points d'entrée (aéroports,
// port croisières), densité GPS bus, occupation Airbnb par zone, intérêt wiki.
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

type MaplibreMap = import("maplibre-gl").Map;

export type FluxMapData = {
  od: { f: string; t: string; total: number; zero: boolean; fLat: number; fLng: number; tLat: number; tLng: number }[];
  heat: { lat: number; lng: number; n: number }[];
  entries: { name: string; kind: "airport" | "port"; lat: number; lng: number; detail: string; size: number }[];
  zones: { zone: string; lat: number; lng: number; listings: number; occ30: number | null; size: number }[];
  wiki: { entity: string; lat: number; lng: number; views: number; size: number }[];
};

type LayerKey = "od" | "entries" | "heat" | "zones" | "wiki";

const LAYER_IDS: Record<LayerKey, string[]> = {
  heat: ["flux-heat"],
  od: ["flux-od"],
  zones: ["flux-zones"],
  wiki: ["flux-wiki"],
  entries: ["flux-entries"],
};

const TOGGLES: { key: LayerKey; label: string }[] = [
  { key: "od", label: "Demande bus (arcs 30 j)" },
  { key: "entries", label: "Entrées île (aéroports, croisières)" },
  { key: "heat", label: "Densité GPS bus (7 j)" },
  { key: "zones", label: "Occupation Airbnb (zones)" },
  { key: "wiki", label: "Intérêt Wikipedia (POI)" },
];

// Arc quadratique entre deux points : le contrôle est décalé perpendiculairement,
// donc A→B et B→A se courbent de part et d'autre (les deux sens restent lisibles).
function arc(f: [number, number], t: [number, number], steps = 24): [number, number][] {
  const mx = (f[0] + t[0]) / 2;
  const my = (f[1] + t[1]) / 2;
  const dx = t[0] - f[0];
  const dy = t[1] - f[1];
  const cx = mx - dy * 0.18;
  const cy = my + dx * 0.18;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const u = 1 - s;
    pts.push([
      u * u * f[0] + 2 * u * s * cx + s * s * t[0],
      u * u * f[1] + 2 * u * s * cy + s * s * t[1],
    ]);
  }
  return pts;
}

function fc(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features };
}

function buildGeoJSON(data: FluxMapData) {
  // Les paires non desservies (terracotta) sont dessinées en dernier pour
  // rester visibles au-dessus de la masse des arcs desservis.
  const odSorted = [...data.od].sort((a, b) => Number(a.zero) - Number(b.zero));
  const od = fc(
    odSorted.map((r) => ({
      type: "Feature",
      properties: {
        label: `${r.f} → ${r.t}`,
        total: r.total,
        zero: r.zero ? 1 : 0,
      },
      geometry: { type: "LineString", coordinates: arc([r.fLng, r.fLat], [r.tLng, r.tLat]) },
    })),
  );
  const heat = fc(
    data.heat.map((h) => ({
      type: "Feature",
      properties: { n: h.n },
      geometry: { type: "Point", coordinates: [h.lng, h.lat] },
    })),
  );
  const entries = fc(
    data.entries.map((e) => ({
      type: "Feature",
      properties: { name: e.name, kind: e.kind, detail: e.detail, size: e.size },
      geometry: { type: "Point", coordinates: [e.lng, e.lat] },
    })),
  );
  const zones = fc(
    data.zones.map((z) => ({
      type: "Feature",
      properties: {
        name: z.zone.replace(/_/g, " "),
        listings: z.listings,
        occ: z.occ30 == null ? -1 : Math.round(z.occ30 * 100),
        size: z.size,
      },
      geometry: { type: "Point", coordinates: [z.lng, z.lat] },
    })),
  );
  const wiki = fc(
    data.wiki.map((w) => ({
      type: "Feature",
      properties: { name: w.entity.replace(/_/g, " "), views: w.views, size: w.size },
      geometry: { type: "Point", coordinates: [w.lng, w.lat] },
    })),
  );
  return { od, heat, entries, zones, wiki };
}

export function FluxMap({ data }: { data: FluxMapData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
    od: true, entries: true, heat: true, zones: false, wiki: false,
  });

  useEffect(() => {
    let cancelled = false;
    import("maplibre-gl").then((ml) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = new ml.Map({
        container: containerRef.current,
        style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: [25.0, 35.28], zoom: 7.4, minZoom: 6.5, maxZoom: 14,
        attributionControl: { compact: true },
      });
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        const gj = buildGeoJSON(data);
        map.addSource("flux-heat", { type: "geojson", data: gj.heat });
        map.addSource("flux-od", { type: "geojson", data: gj.od });
        map.addSource("flux-zones", { type: "geojson", data: gj.zones });
        map.addSource("flux-wiki", { type: "geojson", data: gj.wiki });
        map.addSource("flux-entries", { type: "geojson", data: gj.entries });

        map.addLayer({
          id: "flux-heat", type: "heatmap", source: "flux-heat",
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "n"], 1, 0.15, 60, 1],
            "heatmap-intensity": 1,
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 7, 6, 12, 20],
            "heatmap-opacity": 0.55,
          },
        });
        map.addLayer({
          id: "flux-od", type: "line", source: "flux-od",
          layout: { "line-cap": "round" },
          paint: {
            "line-color": ["case", ["==", ["get", "zero"], 1], "#ED7A5C", "#0B5E78"],
            "line-width": ["interpolate", ["linear"], ["get", "total"], 1, 1, 20, 3, 90, 7],
            "line-opacity": 0.7,
          },
        });
        map.addLayer({
          id: "flux-zones", type: "circle", source: "flux-zones",
          paint: {
            "circle-radius": ["get", "size"],
            "circle-color": [
              "case", ["<", ["get", "occ"], 0], "#94A3B8",
              ["interpolate", ["linear"], ["get", "occ"], 0, "#2E7DB2", 25, "#ED7A5C"],
            ],
            "circle-opacity": 0.55,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
          },
        });
        map.addLayer({
          id: "flux-wiki", type: "circle", source: "flux-wiki",
          paint: {
            "circle-radius": ["get", "size"],
            "circle-color": "#8B5CF6",
            "circle-opacity": 0.5,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
          },
        });
        map.addLayer({
          id: "flux-entries", type: "circle", source: "flux-entries",
          paint: {
            "circle-radius": ["get", "size"],
            "circle-color": ["case", ["==", ["get", "kind"], "port"], "#7C9A53", "#0B5E78"],
            "circle-opacity": 0.85,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        // Popups au clic : un handler par couche interactive.
        const popup = new ml.Popup({ closeButton: false, maxWidth: "260px" });
        const show = (lngLat: { lng: number; lat: number }, html: string) =>
          popup.setLngLat(lngLat).setHTML(`<div style="font-size:12px">${html}</div>`).addTo(map);

        map.on("click", "flux-od", (e) => {
          const p = e.features?.[0]?.properties;
          if (!p) return;
          show(e.lngLat, `<b>${p.label}</b><br/>${p.total} recherche(s) 30 j${p.zero ? " — <b>non desservie</b>" : ""}`);
        });
        map.on("click", "flux-entries", (e) => {
          const p = e.features?.[0]?.properties;
          if (!p) return;
          show(e.lngLat, `<b>${p.name}</b><br/>${p.detail}`);
        });
        map.on("click", "flux-zones", (e) => {
          const p = e.features?.[0]?.properties;
          if (!p) return;
          show(e.lngLat, `<b>${p.name}</b><br/>${p.listings} annonces · taux 30 j : ${p.occ < 0 ? "n/d" : `${p.occ} %`}`);
        });
        map.on("click", "flux-wiki", (e) => {
          const p = e.features?.[0]?.properties;
          if (!p) return;
          show(e.lngLat, `<b>${p.name}</b><br/>${Number(p.views).toLocaleString("fr-FR")} vues/j (moy. 7 j)`);
        });
        for (const id of ["flux-od", "flux-entries", "flux-zones", "flux-wiki"]) {
          map.on("mouseenter", id, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; });
        }

        setReady(true);
      });
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // data vient du server component : stable pour la durée de vie de la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const [key, ids] of Object.entries(LAYER_IDS) as [LayerKey, string[]][]) {
      for (const id of ids) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible[key] ? "visible" : "none");
      }
    }
  }, [visible, ready]);

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl border border-border">
      <div ref={containerRef} className="h-[520px] w-full" />
      <div className="absolute left-2 top-2 rounded-lg border border-border bg-white/95 px-3 py-2 shadow-sm">
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex cursor-pointer items-center gap-1.5 py-0.5 text-[11px]">
            <input
              type="checkbox"
              checked={visible[t.key]}
              onChange={() => setVisible((v) => ({ ...v, [t.key]: !v[t.key] }))}
            />
            {t.label}
          </label>
        ))}
      </div>
      <div className="absolute bottom-6 left-2 rounded-lg border border-border bg-white/95 px-3 py-2 text-[10px] leading-4 shadow-sm">
        <div><span className="inline-block h-1 w-4 align-middle" style={{ background: "#0B5E78" }} /> trajet demandé (desservi)</div>
        <div><span className="inline-block h-1 w-4 align-middle" style={{ background: "#ED7A5C" }} /> demandé <b>non desservi</b></div>
        <div><span className="inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: "#0B5E78" }} /> aéroport · <span className="inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: "#7C9A53" }} /> port croisières</div>
      </div>
    </div>
  );
}
