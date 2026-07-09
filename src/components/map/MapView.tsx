"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Waves,
  Mountain,
  UtensilsCrossed,
  Footprints,
  Layers,
  Bus,
  Flame,
  Timer,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, GeoJSONSource, MapMouseEvent, MapGeoJSONFeature } from "maplibre-gl";
import {
  type MapPOI,
  TYPE_TO_PATH,
  haversineKm,
  formatDistanceKm,
  circlePolygon,
  driveMinutesToKm,
  normalizeForSearch,
  poisToGeoJSON,
} from "./mapUtils";

interface MapViewProps {
  beaches: MapPOI[];
  villages: MapPOI[];
  food: MapPOI[];
  hikes: MapPOI[];
  locale: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  beach: "#0B5E78",
  village: "#5F7A3E",
  food: "#ED7A5C",
  hike: "#8B7355",
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  beach: { en: "Beaches", fr: "Plages", de: "Strände", el: "Παραλίες" },
  village: { en: "Villages", fr: "Villages", de: "Dörfer", el: "Χωριά" },
  food: { en: "Food", fr: "Restaurants", de: "Essen", el: "Φαγητό" },
  hike: { en: "Hikes", fr: "Randos", de: "Wandern", el: "Πεζοπορία" },
};

// Sous-filtres : valeurs possibles du champ `sub` par catégorie (schéma Supabase).
const SUB_VALUES: Record<string, string[]> = {
  beach: ["sand", "pebble", "rock", "mixed"],
  village: ["minoan", "venetian", "ottoman", "modern", "abandoned"],
  food: ["restaurant", "taverna", "cafe", "bar", "bakery", "other"],
  hike: ["easy", "moderate", "hard", "expert"],
};

const SUB_LABELS: Record<string, Record<string, string>> = {
  sand: { en: "Sand", fr: "Sable", de: "Sand", el: "Άμμος" },
  pebble: { en: "Pebble", fr: "Galets", de: "Kiesel", el: "Βότσαλο" },
  rock: { en: "Rock", fr: "Rocher", de: "Fels", el: "Βράχια" },
  mixed: { en: "Mixed", fr: "Mixte", de: "Gemischt", el: "Μικτή" },
  minoan: { en: "Minoan", fr: "Minoen", de: "Minoisch", el: "Μινωικό" },
  venetian: { en: "Venetian", fr: "Vénitien", de: "Venezianisch", el: "Ενετικό" },
  ottoman: { en: "Ottoman", fr: "Ottoman", de: "Osmanisch", el: "Οθωμανικό" },
  modern: { en: "Modern", fr: "Moderne", de: "Modern", el: "Σύγχρονο" },
  abandoned: { en: "Abandoned", fr: "Abandonné", de: "Verlassen", el: "Εγκαταλελειμμένο" },
  restaurant: { en: "Restaurant", fr: "Restaurant", de: "Restaurant", el: "Εστιατόριο" },
  taverna: { en: "Taverna", fr: "Taverne", de: "Taverne", el: "Ταβέρνα" },
  cafe: { en: "Café", fr: "Café", de: "Café", el: "Καφέ" },
  bar: { en: "Bar", fr: "Bar", de: "Bar", el: "Μπαρ" },
  bakery: { en: "Bakery", fr: "Boulangerie", de: "Bäckerei", el: "Φούρνος" },
  other: { en: "Other", fr: "Autre", de: "Andere", el: "Άλλο" },
  easy: { en: "Easy", fr: "Facile", de: "Leicht", el: "Εύκολο" },
  moderate: { en: "Moderate", fr: "Modéré", de: "Mittel", el: "Μέτριο" },
  hard: { en: "Hard", fr: "Difficile", de: "Schwer", el: "Δύσκολο" },
  expert: { en: "Expert", fr: "Expert", de: "Experte", el: "Απαιτητικό" },
};

interface UIStrings {
  searchPlaceholder: string;
  noResults: string;
  filters: string;
  satellite: string;
  bus: string;
  density: string;
  densityLegend: string;
  driveTime: string;
  driveLegend: string;
}

const UI: Record<string, UIStrings> = {
  en: {
    searchPlaceholder: "Search a place…",
    noResults: "No results",
    filters: "Filters",
    satellite: "Satellite",
    bus: "Bus",
    density: "Crowds",
    densityLegend: "Tourist rental density (Airbnb data)",
    driveTime: "Drive time",
    driveLegend: "15 / 30 / 60 min drive (approx.)",
  },
  fr: {
    searchPlaceholder: "Chercher un lieu…",
    noResults: "Aucun résultat",
    filters: "Filtres",
    satellite: "Satellite",
    bus: "Bus",
    density: "Affluence",
    densityLegend: "Densité de locations touristiques (données Airbnb)",
    driveTime: "Temps de route",
    driveLegend: "15 / 30 / 60 min de route (approx.)",
  },
  de: {
    searchPlaceholder: "Ort suchen…",
    noResults: "Keine Ergebnisse",
    filters: "Filter",
    satellite: "Satellit",
    bus: "Bus",
    density: "Andrang",
    densityLegend: "Dichte der Ferienunterkünfte (Airbnb-Daten)",
    driveTime: "Fahrzeit",
    driveLegend: "15 / 30 / 60 Min. Fahrt (ca.)",
  },
  el: {
    searchPlaceholder: "Αναζήτηση τοποθεσίας…",
    noResults: "Κανένα αποτέλεσμα",
    filters: "Φίλτρα",
    satellite: "Δορυφόρος",
    bus: "Λεωφορεία",
    density: "Πληρότητα",
    densityLegend: "Πυκνότητα τουριστικών καταλυμάτων (δεδομένα Airbnb)",
    driveTime: "Χρόνος οδήγησης",
    driveLegend: "15 / 30 / 60 λεπτά οδήγησης (περίπου)",
  },
};

const ALL_CATS = ["beach", "village", "food", "hike"] as const;
const CRETE_VIEWBOX = "23.3,35.9,26.5,34.6"; // left,top,right,bottom pour Nominatim

interface SearchResult {
  name: string;
  detail: string;
  lat: number;
  lng: number;
  poi?: MapPOI;
}

function readInitialParams() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search);
}

export function MapView({ beaches, villages, food, hikes, locale }: MapViewProps) {
  const t = UI[locale] || UI.en;
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<{ remove: () => void } | null>(null);
  const maplibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const busLoadedRef = useRef(false);
  const heatLoadedRef = useRef(false);

  const initial = useMemo(readInitialParams, []);

  const [activeCats, setActiveCats] = useState<Set<string>>(() => {
    const cat = initial?.get("cat");
    if (cat) {
      const parsed = new Set(cat.split(",").filter((c) => (ALL_CATS as readonly string[]).includes(c)));
      if (parsed.size > 0) return parsed;
    }
    return new Set<string>(ALL_CATS);
  });
  const [subFilters, setSubFilters] = useState<Record<string, Set<string>>>(() => {
    const out: Record<string, Set<string>> = { beach: new Set(), village: new Set(), food: new Set(), hike: new Set() };
    const sub = initial?.get("sub");
    if (sub) {
      for (const token of sub.split(",")) {
        const [cat, val] = token.split(".");
        if (out[cat] && SUB_VALUES[cat]?.includes(val)) out[cat].add(val);
      }
    }
    return out;
  });
  const [showFilters, setShowFilters] = useState(false);
  const [satOn, setSatOn] = useState(() => initial?.get("sat") === "1");
  const [busOn, setBusOn] = useState(() => initial?.get("bus") === "1");
  const [heatOn, setHeatOn] = useState(() => initial?.get("heat") === "1");
  const [ringsOn, setRingsOn] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  const allPOIs = useMemo(
    () => [...beaches, ...villages, ...food, ...hikes],
    [beaches, villages, food, hikes],
  );

  // Refs miroirs pour les listeners MapLibre (évite les closures périmées).
  const activeCatsRef = useRef(activeCats);
  activeCatsRef.current = activeCats;
  const subFiltersRef = useRef(subFilters);
  subFiltersRef.current = subFilters;
  const satRef = useRef(satOn);
  satRef.current = satOn;
  const busRef = useRef(busOn);
  busRef.current = busOn;
  const heatRef = useRef(heatOn);
  heatRef.current = heatOn;

  const syncUrl = useCallback(() => {
    const map = mapRef.current;
    if (!map || typeof window === "undefined") return;
    const c = map.getCenter();
    const sp = new URLSearchParams();
    sp.set("lat", c.lat.toFixed(4));
    sp.set("lng", c.lng.toFixed(4));
    sp.set("z", map.getZoom().toFixed(2));
    const cats = activeCatsRef.current;
    if (cats.size < ALL_CATS.length) sp.set("cat", [...cats].join(","));
    const subTokens: string[] = [];
    for (const [cat, vals] of Object.entries(subFiltersRef.current)) {
      for (const v of vals) subTokens.push(`${cat}.${v}`);
    }
    if (subTokens.length) sp.set("sub", subTokens.join(","));
    if (satRef.current) sp.set("sat", "1");
    if (busRef.current) sp.set("bus", "1");
    if (heatRef.current) sp.set("heat", "1");
    window.history.replaceState(null, "", `${window.location.pathname}?${sp.toString()}`);
  }, []);

  const filteredGeoJSON = useCallback(() => {
    const cats = activeCatsRef.current;
    const subs = subFiltersRef.current;
    const pois = allPOIs.filter((p) => {
      if (!cats.has(p.type)) return false;
      const set = subs[p.type];
      if (set && set.size > 0 && !set.has(p.sub || "")) return false;
      return true;
    });
    return poisToGeoJSON(pois);
  }, [allPOIs]);

  const openPoiPopup = useCallback(
    (lngLat: [number, number], props: { name: string; type: string; slug: string; extra: string }) => {
      const map = mapRef.current;
      const ml = maplibreRef.current;
      if (!map || !ml) return;
      popupRef.current?.remove();
      const user = userPosRef.current;
      const dist = user
        ? `<span style="color:#94A3B8"> · ${formatDistanceKm(haversineKm(user.lat, user.lng, lngLat[1], lngLat[0]))}</span>`
        : "";
      const subLabel = props.extra ? SUB_LABELS[props.extra]?.[locale] || SUB_LABELS[props.extra]?.en || props.extra : "";
      const popup = new ml.Popup({ offset: 12, closeButton: false })
        .setLngLat(lngLat)
        .setHTML(
          `<div style="font-family:system-ui;padding:4px">
            <a href="/${locale}/${TYPE_TO_PATH[props.type as MapPOI["type"]]}/${props.slug}"
               style="font-weight:600;font-size:13px;color:#0B5E78;text-decoration:none">${props.name}</a>
            <div style="font-size:11px;color:#6B7280;margin-top:2px">${subLabel}${dist}</div>
          </div>`,
        )
        .addTo(map);
      popupRef.current = popup;
    },
    [locale],
  );

  // ── Initialisation carte ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    let cancelled = false;
    import("maplibre-gl").then((ml) => {
      if (cancelled || !mapContainer.current) return;
      maplibreRef.current = ml;

      const lat = parseFloat(initial?.get("lat") || "");
      const lng = parseFloat(initial?.get("lng") || "");
      const z = parseFloat(initial?.get("z") || "");

      const map = new ml.Map({
        container: mapContainer.current,
        style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : [25.0, 35.25],
        zoom: Number.isFinite(z) ? z : 8.5,
        minZoom: 7,
        maxZoom: 16,
      });
      mapRef.current = map;

      map.addControl(new ml.NavigationControl(), "top-right");
      const geolocate = new ml.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      });
      map.addControl(geolocate, "top-right");
      geolocate.on("geolocate", (e: { coords: { latitude: number; longitude: number } }) => {
        userPosRef.current = { lat: e.coords.latitude, lng: e.coords.longitude };
      });

      map.on("load", () => {
        // 1. Satellite (au-dessus du fond voyager, sous tous nos overlays)
        map.addSource("satellite", {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "Esri, Maxar, Earthstar Geographics",
        });
        map.addLayer({
          id: "satellite-layer",
          type: "raster",
          source: "satellite",
          layout: { visibility: satRef.current ? "visible" : "none" },
        });

        // 2. Heatmap densité (source vide, données chargées au premier toggle)
        map.addSource("airbnb-density", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "density-heat",
          type: "heatmap",
          source: "airbnb-density",
          layout: { visibility: heatRef.current ? "visible" : "none" },
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "w"], 0, 0, 50, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 7, 0.6, 14, 2],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 7, 14, 14, 40],
            "heatmap-opacity": 0.55,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.3, "rgba(241,196,15,0.5)",
              0.6, "rgba(230,126,34,0.7)",
              1, "rgba(231,76,60,0.9)",
            ],
          },
        });

        // 3. Anneaux temps-de-route
        map.addSource("rings", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "rings-fill",
          type: "fill",
          source: "rings",
          paint: { "fill-color": "#0B5E78", "fill-opacity": 0.04 },
        });
        map.addLayer({
          id: "rings-line",
          type: "line",
          source: "rings",
          paint: { "line-color": "#0B5E78", "line-opacity": 0.5, "line-width": 1.5, "line-dasharray": [3, 3] },
        });

        // 4. POIs clusterisés
        map.addSource("pois", {
          type: "geojson",
          data: filteredGeoJSON(),
          cluster: true,
          clusterMaxZoom: 13,
          clusterRadius: 45,
        });
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "pois",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#0B5E78",
            "circle-opacity": 0.85,
            "circle-radius": ["step", ["get", "point_count"], 14, 25, 18, 100, 24],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "pois",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 12,
            "text-font": ["Montserrat Regular"],
          },
          paint: { "text-color": "#ffffff" },
        });
        map.addLayer({
          id: "poi-points",
          type: "circle",
          source: "pois",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "match",
              ["get", "type"],
              "beach", CATEGORY_COLORS.beach,
              "village", CATEGORY_COLORS.village,
              "food", CATEGORY_COLORS.food,
              "hike", CATEGORY_COLORS.hike,
              "#0B5E78",
            ],
            "circle-radius": 6,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        // Interactions
        map.on("click", "clusters", async (e: MapMouseEvent) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
          const clusterId = features[0]?.properties?.cluster_id;
          if (clusterId === undefined) return;
          const source = map.getSource("pois") as GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({ center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number], zoom });
        });
        map.on("click", "poi-points", (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
          const f = e.features?.[0];
          if (!f) return;
          const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
          const p = f.properties as { name: string; type: string; slug: string; extra: string; sub: string };
          openPoiPopup(coords, { name: p.name, type: p.type, slug: p.slug, extra: p.sub || p.extra });
        });
        for (const layer of ["clusters", "poi-points"]) {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        }

        map.on("moveend", syncUrl);

        // Deeplink ?poi=slug
        const poiSlug = initial?.get("poi");
        if (poiSlug) {
          const poi = allPOIs.find((p) => p.slug === poiSlug);
          if (poi) {
            map.easeTo({ center: [poi.lng, poi.lat], zoom: 13.5 });
            openPoiPopup([poi.lng, poi.lat], { name: poi.name, type: poi.type, slug: poi.slug, extra: poi.sub || poi.extra || "" });
          }
        }

        setMapReady(true);
      });
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPOIs, locale]);

  // ── Filtres catégories + sous-filtres ───────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const source = mapRef.current?.getSource("pois") as GeoJSONSource | undefined;
    source?.setData(filteredGeoJSON());
    syncUrl();
  }, [activeCats, subFilters, mapReady, filteredGeoJSON, syncUrl]);

  // ── Satellite ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map || !map.getLayer("satellite-layer")) return;
    map.setLayoutProperty("satellite-layer", "visibility", satOn ? "visible" : "none");
    syncUrl();
  }, [satOn, mapReady, syncUrl]);

  // ── Couche bus (lazy load au premier toggle) ────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    if (busOn && !busLoadedRef.current) {
      busLoadedRef.current = true;
      import("./busLayerData")
        .then(({ loadBusLayerData }) => loadBusLayerData())
        .then((data) => {
          const m = mapRef.current;
          if (!m || m.getSource("bus-lines-src")) return;
          m.addSource("bus-lines-src", { type: "geojson", data: data.lines });
          m.addSource("bus-stops-src", { type: "geojson", data: data.stops });
          m.addLayer(
            {
              id: "bus-lines-layer",
              type: "line",
              source: "bus-lines-src",
              paint: { "line-color": ["get", "color"], "line-width": 2, "line-opacity": 0.65 },
            },
            "clusters",
          );
          m.addLayer(
            {
              id: "bus-stops-layer",
              type: "circle",
              source: "bus-stops-src",
              minzoom: 9,
              paint: {
                "circle-color": "#ffffff",
                "circle-radius": 3.5,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#0B5E78",
              },
            },
            "clusters",
          );
          m.on("click", "bus-stops-layer", (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
            const f = e.features?.[0];
            const ml = maplibreRef.current;
            if (!f || !ml || !mapRef.current) return;
            popupRef.current?.remove();
            popupRef.current = new ml.Popup({ offset: 10, closeButton: false })
              .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
              .setHTML(
                `<div style="font-family:system-ui;padding:4px;font-size:12px;font-weight:600;color:#0B5E78">${(f.properties as { name: string }).name}</div>`,
              )
              .addTo(mapRef.current);
          });
          // Respecte l'état courant du toggle au moment où le fetch aboutit
          for (const id of ["bus-lines-layer", "bus-stops-layer"]) {
            m.setLayoutProperty(id, "visibility", busRef.current ? "visible" : "none");
          }
        })
        .catch(() => { busLoadedRef.current = false; });
    } else if (busLoadedRef.current) {
      for (const id of ["bus-lines-layer", "bus-stops-layer"]) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", busOn ? "visible" : "none");
      }
    }
    syncUrl();
  }, [busOn, mapReady, syncUrl]);

  // ── Heatmap densité (lazy fetch au premier toggle) ──────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map || !map.getLayer("density-heat")) return;
    if (heatOn && !heatLoadedRef.current) {
      heatLoadedRef.current = true;
      fetch("/data/airbnb-density.json")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((data: GeoJSON.FeatureCollection) => {
          (mapRef.current?.getSource("airbnb-density") as GeoJSONSource | undefined)?.setData(data);
        })
        .catch(() => { heatLoadedRef.current = false; });
    }
    map.setLayoutProperty("density-heat", "visibility", heatOn ? "visible" : "none");
    syncUrl();
  }, [heatOn, mapReady, syncUrl]);

  // ── Anneaux temps-de-route ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("rings") as GeoJSONSource | undefined;
    if (!source) return;
    if (!ringsOn) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    const origin = userPosRef.current || { lat: map.getCenter().lat, lng: map.getCenter().lng };
    const features = [15, 30, 60].map((min) =>
      circlePolygon(origin.lng, origin.lat, driveMinutesToKm(min)),
    );
    source.setData({ type: "FeatureCollection", features });
  }, [ringsOn, mapReady]);

  // ── Recherche ────────────────────────────────────────────────────────────
  const runLocalSearch = useCallback(
    (q: string): SearchResult[] => {
      const nq = normalizeForSearch(q);
      if (nq.length < 2) return [];
      return allPOIs
        .filter((p) => normalizeForSearch(p.name).includes(nq))
        .slice(0, 8)
        .map((p) => ({
          name: p.name,
          detail: CATEGORY_LABELS[p.type][locale] || CATEGORY_LABELS[p.type].en,
          lat: p.lat,
          lng: p.lng,
          poi: p,
        }));
    },
    [allPOIs, locale],
  );

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    setResults(runLocalSearch(query.trim()));
  }, [query, runLocalSearch]);

  const runRemoteSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=gr&viewbox=${CRETE_VIEWBOX}&bounded=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
      const remote: SearchResult[] = data.map((d) => ({
        name: d.display_name.split(",")[0],
        detail: d.display_name.split(",").slice(1, 3).join(",").trim(),
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
      }));
      setResults([...runLocalSearch(q), ...remote]);
    } catch {
      // Nominatim indisponible : on garde les résultats locaux
    } finally {
      setSearching(false);
    }
  }, [query, runLocalSearch]);

  const pickResult = useCallback(
    (r: SearchResult) => {
      const map = mapRef.current;
      if (!map) return;
      map.easeTo({ center: [r.lng, r.lat], zoom: 13.5 });
      if (r.poi) {
        openPoiPopup([r.poi.lng, r.poi.lat], {
          name: r.poi.name,
          type: r.poi.type,
          slug: r.poi.slug,
          extra: r.poi.sub || r.poi.extra || "",
        });
      }
      setResults(null);
      setQuery("");
    },
    [openPoiPopup],
  );

  // ── UI ───────────────────────────────────────────────────────────────────
  function toggleCat(type: string) {
    setActiveCats((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function toggleSub(cat: string, val: string) {
    setSubFilters((prev) => {
      const next = { ...prev, [cat]: new Set(prev[cat]) };
      if (next[cat].has(val)) next[cat].delete(val);
      else next[cat].add(val);
      return next;
    });
  }

  const catButtons = [
    { type: "beach", icon: <Waves className="w-4 h-4" /> },
    { type: "village", icon: <Mountain className="w-4 h-4" /> },
    { type: "food", icon: <UtensilsCrossed className="w-4 h-4" /> },
    { type: "hike", icon: <Footprints className="w-4 h-4" /> },
  ];

  const layerButtons = [
    { key: "sat", label: t.satellite, icon: <Layers className="w-4 h-4" />, on: satOn, toggle: () => setSatOn((v) => !v) },
    { key: "bus", label: t.bus, icon: <Bus className="w-4 h-4" />, on: busOn, toggle: () => setBusOn((v) => !v) },
    { key: "heat", label: t.density, icon: <Flame className="w-4 h-4" />, on: heatOn, toggle: () => setHeatOn((v) => !v) },
    { key: "rings", label: t.driveTime, icon: <Timer className="w-4 h-4" />, on: ringsOn, toggle: () => setRingsOn((v) => !v) },
  ];

  const hasActiveSubs = Object.values(subFilters).some((s) => s.size > 0);

  return (
    <div className="relative">
      {/* Recherche + filtres (haut gauche) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-[calc(100%-6rem)]">
        <div className="relative">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-border shadow-soft px-3 py-2 w-64 max-w-full">
            <Search className="w-4 h-4 text-text-light shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runRemoteSearch(); }}
              placeholder={t.searchPlaceholder}
              className="text-sm outline-none bg-transparent w-full text-text"
            />
            {query && (
              <button onClick={() => { setQuery(""); setResults(null); }} aria-label="Clear">
                <X className="w-4 h-4 text-text-light" />
              </button>
            )}
          </div>
          {results !== null && (
            <div className="absolute top-full mt-1 left-0 w-64 max-w-full bg-white rounded-lg border border-border shadow-soft overflow-hidden max-h-72 overflow-y-auto">
              {results.length === 0 && !searching && (
                <div className="px-3 py-2 text-xs text-text-light">{t.noResults}</div>
              )}
              {results.map((r, i) => (
                <button
                  key={`${r.name}-${i}`}
                  onClick={() => pickResult(r)}
                  className="w-full text-left px-3 py-2 hover:bg-surface border-b border-border last:border-b-0"
                >
                  <div className="text-sm font-semibold text-text truncate">{r.name}</div>
                  <div className="text-[11px] text-text-light truncate">{r.detail}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {catButtons.map(({ type, icon }) => (
            <button
              key={type}
              onClick={() => toggleCat(type)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shadow-soft transition-all ${
                activeCats.has(type)
                  ? "bg-white text-text border border-border"
                  : "bg-white/50 text-text-light border border-transparent"
              }`}
            >
              {icon}
              {CATEGORY_LABELS[type][locale] || CATEGORY_LABELS[type].en}
            </button>
          ))}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shadow-soft transition-all border ${
              showFilters || hasActiveSubs
                ? "bg-sea text-white border-sea"
                : "bg-white text-text border-border"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t.filters}
          </button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-lg border border-border shadow-soft p-3 flex flex-col gap-2 w-fit max-w-full">
            {ALL_CATS.filter((cat) => activeCats.has(cat)).map((cat) => (
              <div key={cat} className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold w-20 shrink-0" style={{ color: CATEGORY_COLORS[cat] }}>
                  {CATEGORY_LABELS[cat][locale] || CATEGORY_LABELS[cat].en}
                </span>
                {SUB_VALUES[cat].map((val) => (
                  <button
                    key={val}
                    onClick={() => toggleSub(cat, val)}
                    className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                      subFilters[cat].has(val)
                        ? "text-white border-transparent"
                        : "bg-surface text-text-light border-border"
                    }`}
                    style={subFilters[cat].has(val) ? { background: CATEGORY_COLORS[cat] } : undefined}
                  >
                    {SUB_LABELS[val]?.[locale] || SUB_LABELS[val]?.en || val}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toggles couches (bas gauche) */}
      <div className="absolute bottom-6 left-4 z-10 flex gap-2 flex-wrap max-w-[calc(100%-2rem)]">
        {layerButtons.map(({ key, label, icon, on, toggle }) => (
          <button
            key={key}
            onClick={toggle}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shadow-soft transition-all border ${
              on ? "bg-sea text-white border-sea" : "bg-white text-text border-border"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Légendes contextuelles */}
      {(ringsOn || heatOn) && (
        <div className="absolute bottom-20 left-4 z-10 flex flex-col gap-1">
          {ringsOn && (
            <div className="bg-white/90 rounded-md border border-border px-2.5 py-1.5 text-[11px] text-text-light shadow-soft">
              {t.driveLegend}
            </div>
          )}
          {heatOn && (
            <div className="bg-white/90 rounded-md border border-border px-2.5 py-1.5 text-[11px] text-text-light shadow-soft">
              {t.densityLegend}
            </div>
          )}
        </div>
      )}

      {/* Conteneur carte */}
      <div ref={mapContainer} className="w-full h-[70vh] min-h-[500px] rounded-xl overflow-hidden border border-border" />
    </div>
  );
}
