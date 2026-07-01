"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Star, X, MapPin, Search, ChevronLeft, ChevronRight, ChevronUp,
  SlidersHorizontal, Waves, Mountain, Home, Landmark, TreePine, Sparkles,
} from "lucide-react";
import type { CbPlaceListItem, CbPlace } from "@/lib/cb-places";
import { WaterQualityBadge } from "@/components/WaterQualityBadge";
import { getCbPlaceBySlug } from "@/lib/cb-places";
import { getSponsorCards, isSponsorSlug, sponsoredLabel } from "@/lib/sponsored-places";
import { typeLabel } from "@/lib/cb-type-labels";
import { nearestBy, circlePolygon, isOnCrete } from "@/lib/geo";
import { cleanCbDescription } from "@/lib/cb-place-helpers";
import { useGeoPosition } from "@/components/geo/useGeoPosition";
import Image from "next/image";
import { CiCompass } from "@/components/icons";
import { CbPlaceActions } from "@/components/explore/CbPlaceActions";
import "maplibre-gl/dist/maplibre-gl.css";

type MaplibreMap = import("maplibre-gl").Map;
type MaplibreModule = typeof import("maplibre-gl");
type MaplibreMarker = import("maplibre-gl").Marker;

const TYPE_COLORS: Record<string, string> = {
  beach: "#0B5E78",
  gorge: "#ED7A5C",
  cave: "#6B4F8A",
  town: "#5F7A3E",
  island: "#2D9596",
  lake: "#3E7CB1",
  lighthouse: "#C9A227",
  mountain: "#8B7355",
  monastery: "#A3423C",
  "historical-site": "#7A6A53",
  plateau: "#9CAF88",
  "natural-park": "#4C7F4C",
  geological: "#7D7D7D",
  river: "#4A90B8",
  waterfall: "#5BA8C4",
  forest: "#3D6B35",
  flora: "#7FA055",
  fauna: "#A0764B",
  activity: "#C46A8A",
  tradition: "#8A6FA8",
  nature: "#5E8C61",
  museum: "#B08968",
  fort: "#6E6A4E",
  "archaeological-site": "#9C7C4C",
  mythology: "#7E6BA8",
  church: "#A3423C",
};
const FALLBACK_COLOR = "#64748B";

// 26 types regroupes en 6 familles : le rail de categories reste lisible,
// le detail par type reste accessible via la recherche et les fiches.
const FAMILIES: Array<{ key: string; types: string[]; Icon: typeof Waves }> = [
  { key: "beaches", types: ["beach"], Icon: Waves },
  { key: "gorges", types: ["gorge"], Icon: Mountain },
  { key: "villages", types: ["town"], Icon: Home },
  {
    key: "culture",
    types: ["monastery", "church", "museum", "fort", "archaeological-site", "historical-site", "mythology", "tradition", "lighthouse"],
    Icon: Landmark,
  },
  {
    key: "nature",
    types: ["cave", "island", "lake", "mountain", "plateau", "natural-park", "geological", "river", "waterfall", "forest", "flora", "fauna", "nature"],
    Icon: TreePine,
  },
  { key: "activities", types: ["activity"], Icon: Sparkles },
];

const T: Record<string, Record<string, string>> = {
  en: {
    search: "Search a place...", results: "places", rating: "Min. rating",
    prefecture: "Region", anyPref: "All Crete", sand: "Sand type", water: "Water color",
    crowds: "Crowds", any: "Any", noResults: "No place matches these filters.",
    facilities: "Facilities", accessibility: "Access",
    depth: "Depth", seaSurface: "Sea surface", loading: "Loading...", clear: "Clear filters",
    nearMe: "Near me", geoUnavailable: "Location unavailable", filters: "Filters",
    beaches: "Beaches", gorges: "Gorges", villages: "Villages", culture: "Culture",
    nature: "Nature", activities: "Activities", all: "All",
    sortRating: "Best rated", sortNear: "Nearest", fullList: "Full list",
    youAreHere: "You are here", dragToAdjust: "Drag the dot to your spot",
    notOnCrete: "You're not in Crete · drop the dot where you'll be.",
  },
  fr: {
    search: "Chercher un lieu...", results: "lieux", rating: "Note min.",
    prefecture: "Région", anyPref: "Toute la Crète", sand: "Type de sable", water: "Couleur de l'eau",
    crowds: "Affluence", any: "Indifférent", noResults: "Aucun lieu ne correspond à ces filtres.",
    facilities: "Équipements", accessibility: "Accès",
    depth: "Profondeur", seaSurface: "État de la mer", loading: "Chargement...", clear: "Effacer les filtres",
    nearMe: "Autour de moi", geoUnavailable: "Localisation indisponible", filters: "Filtres",
    beaches: "Plages", gorges: "Gorges", villages: "Villages", culture: "Culture",
    nature: "Nature", activities: "Activités", all: "Tout",
    sortRating: "Mieux notés", sortNear: "Au plus près", fullList: "Liste complète",
    youAreHere: "Vous êtes ici", dragToAdjust: "Glisse le point sur ta position",
    notOnCrete: "Tu n'es pas en Crète, place ton point là où tu seras.",
  },
  de: {
    search: "Ort suchen...", results: "Orte", rating: "Min. Bewertung",
    prefecture: "Region", anyPref: "Ganz Kreta", sand: "Sandtyp", water: "Wasserfarbe",
    crowds: "Andrang", any: "Egal", noResults: "Kein Ort entspricht diesen Filtern.",
    facilities: "Ausstattung", accessibility: "Zugang",
    depth: "Tiefe", seaSurface: "Meeresoberfläche", loading: "Laden...", clear: "Filter löschen",
    nearMe: "In meiner Nähe", geoUnavailable: "Standort nicht verfügbar", filters: "Filter",
    beaches: "Strände", gorges: "Schluchten", villages: "Dörfer", culture: "Kultur",
    nature: "Natur", activities: "Aktivitäten", all: "Alle",
    sortRating: "Bestbewertet", sortNear: "Am nächsten", fullList: "Ganze Liste",
    youAreHere: "Sie sind hier", dragToAdjust: "Punkt auf Ihren Standort ziehen",
    notOnCrete: "Sie sind nicht auf Kreta · setzen Sie den Punkt an Ihr Ziel.",
  },
  el: {
    search: "Αναζήτηση τοποθεσίας...", results: "μέρη", rating: "Ελάχ. βαθμολογία",
    prefecture: "Περιοχή", anyPref: "Όλη η Κρήτη", sand: "Τύπος άμμου", water: "Χρώμα νερού",
    crowds: "Κόσμος", any: "Οποιοδήποτε", noResults: "Κανένα μέρος δεν ταιριάζει.",
    facilities: "Παροχές", accessibility: "Πρόσβαση",
    depth: "Βάθος", seaSurface: "Επιφάνεια", loading: "Φόρτωση...", clear: "Καθαρισμός φίλτρων",
    nearMe: "Κοντά μου", geoUnavailable: "Ο εντοπισμός δεν είναι διαθέσιμος", filters: "Φίλτρα",
    beaches: "Παραλίες", gorges: "Φαράγγια", villages: "Χωριά", culture: "Πολιτισμός",
    nature: "Φύση", activities: "Δραστηριότητες", all: "Όλα",
    sortRating: "Κορυφαία", sortNear: "Πιο κοντά", fullList: "Πλήρης λίστα",
    youAreHere: "Είστε εδώ", dragToAdjust: "Σύρε το σημείο στη θέση σου",
    notOnCrete: "Δεν είσαι στην Κρήτη · βάλε το σημείο εκεί που θα είσαι.",
  },
};

const PREFECTURES = ["Chania", "Rethymnon", "Heraklion", "Lassithi"];

// Au-dela de ce zoom les clusters laissent place aux points + photo-pins.
const PHOTO_PIN_ZOOM = 11.5;
const PHOTO_PIN_MAX = 12;

// Rayon du disque "autour de moi" (visuel uniquement, ne filtre pas la liste).
const NEAR_RADIUS_KM = 10;

function detectPrefecture(p: CbPlaceListItem): string | null {
  const txt = p.prefecture || "";
  for (const pref of PREFECTURES) if (txt.includes(pref)) return pref;
  return null;
}

/** "X.X km" sous 10 km, entier au-delà (badge distance Near me). */
function fmtKm(km: number): string {
  return km < 10 ? km.toFixed(1) : String(Math.round(km));
}

function RatingStars({ rating }: { rating: number | null }) {
  if (rating == null || rating <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
      <Star size={12} fill="currentColor" /> {rating.toFixed(1)}
    </span>
  );
}

export function ExploreView({ places, locale }: { places: CbPlaceListItem[]; locale: string }) {
  const t = T[locale] || T.en;
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const maplibreRef = useRef<MaplibreModule | null>(null);
  const photoMarkersRef = useRef<MaplibreMarker[]>([]);
  const userMarkerRef = useRef<MaplibreMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapViewport, setMapViewport] = useState(0); // bump a chaque moveend -> recalcul photo-pins
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const [prefecture, setPrefecture] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sand, setSand] = useState("");
  const [water, setWater] = useState("");
  const [crowdLevel, setCrowdLevel] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<CbPlace | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  // Mobile : bottom sheet liste complete (le carousel reste toujours visible).
  const [listExpanded, setListExpanded] = useState(false);
  // Tri "Near me" : géoloc 100 % client (useGeoPosition), toggle on/off.
  const geo = useGeoPosition();
  const [nearActive, setNearActive] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // L'indice est instructif et transitoire : auto-effacement après 6 s pour qu'il
  // ne reste pas collé (ex. GPS refusé sans drag). Réinitialisé à chaque nouvel indice.
  useEffect(() => {
    if (!hint) return;
    const id = window.setTimeout(() => setHint(null), 6000);
    return () => window.clearTimeout(id);
  }, [hint]);

  const familyTypes = useMemo(() => {
    if (!family) return null;
    const fam = FAMILIES.find((f) => f.key === family);
    return fam ? new Set(fam.types) : null;
  }, [family]);

  const familyCounts = useMemo(() => {
    const byType = new Map<string, number>();
    for (const p of places) byType.set(p.place_type, (byType.get(p.place_type) || 0) + 1);
    const counts = new Map<string, number>();
    for (const f of FAMILIES) {
      counts.set(f.key, f.types.reduce((acc, ty) => acc + (byType.get(ty) || 0), 0));
    }
    return counts;
  }, [places]);

  const sandOptions = useMemo(() => uniqueValues(places, "sand_type"), [places]);
  const waterOptions = useMemo(() => uniqueValues(places, "water_color"), [places]);
  const crowdOptions = useMemo(() => uniqueValues(places, "crowds"), [places]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((p) => {
      if (familyTypes && !familyTypes.has(p.place_type)) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (prefecture && detectPrefecture(p) !== prefecture) return false;
      if (minRating > 0 && (p.rating == null || p.rating < minRating)) return false;
      if (sand && !(p.sand_type || "").includes(sand)) return false;
      if (water && !(p.water_color || "").includes(water)) return false;
      if (crowdLevel && !(p.crowds || "").includes(crowdLevel)) return false;
      return true;
    });
  }, [places, query, familyTypes, prefecture, minRating, sand, water, crowdLevel]);

  // Liste affichée : distance quand Near me actif, sinon note décroissante
  // (les lieux notés et photographiés d'abord, plus engageant que l'ordre slug).
  // Cartes partenaires (modele B) : chacune est un lieu synthetique injecte en tete,
  // avec sa propre photo/nom/note et un lien externe (slug prefixe "sponsor:").
  const sponsorItems: Array<CbPlaceListItem & { __sponsorUrl: string }> = useMemo(
    () =>
      getSponsorCards().map((c) => ({
        slug: `sponsor:${c.id}`,
        name: c.name,
        place_type: "sponsor",
        category: c.category,
        latitude: c.lat,
        longitude: c.lng,
        rating: c.rating,
        prefecture: c.prefecture,
        water_color: null,
        sand_type: null,
        depth: null,
        sea_surface: null,
        crowds: null,
        facilities: null,
        accessibility: null,
        photos: [c.photo],
        photo_count: 1,
        water_quality: null,
        __sponsorUrl: c.url,
      })),
    [],
  );

  const displayed: Array<CbPlaceListItem & { km?: number; __sponsorUrl?: string }> = useMemo(() => {
    const base: Array<CbPlaceListItem & { km?: number }> =
      nearActive && geo.pos
        ? nearestBy(
            filtered,
            (p) => (p.latitude != null && p.longitude != null ? [p.latitude, p.longitude] : null),
            geo.pos,
            filtered.length,
          )
        : [...filtered].sort((a, b) => {
            // Note ponderee par le nombre de photos : un 4.8 bien documente
            // passe devant un 5.0 obscur a 1 photo.
            const score = (p: CbPlaceListItem) =>
              (p.rating ?? 0) + Math.min(p.photo_count ?? 0, 20) * 0.02;
            return score(b) - score(a);
          });
    // Cartes partenaires en tete de liste (etiquetees Sponsorise).
    return [...sponsorItems, ...base];
  }, [filtered, nearActive, geo.pos, sponsorItems]);

  const geoBlocked = geo.status === "denied" || geo.status === "unavailable";

  function toggleNearMe() {
    if (nearActive) { setNearActive(false); setHint(null); return; }
    setNearActive(true);
    if (!geo.pos) geo.requestGeo();
  }

  const hasFilters = query || family || prefecture || minRating > 0 || sand || water || crowdLevel;
  const beachFiltersRelevant = !family || family === "beaches";
  const advancedActiveCount = [prefecture, minRating > 0, sand, water, crowdLevel].filter(Boolean).length;

  // --- Map init ---
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let cancelled = false;
    import("maplibre-gl").then((maplibre) => {
      if (cancelled || !mapContainer.current) return;
      maplibreRef.current = maplibre;
      const map = new maplibre.Map({
        container: mapContainer.current,
        style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: [25.0, 35.25],
        zoom: 8,
        minZoom: 7,
        maxZoom: 17,
      });
      mapRef.current = map;
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("load", () => {
        map.addSource("user-radius", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "user-radius-fill",
          type: "fill",
          source: "user-radius",
          paint: { "fill-color": "#0B5E78", "fill-opacity": 0.08 },
        });
        map.addLayer({
          id: "user-radius-line",
          type: "line",
          source: "user-radius",
          paint: { "line-color": "#0B5E78", "line-opacity": 0.5, "line-width": 1.5, "line-dasharray": [2, 2] },
        });
        map.addSource("places", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterMaxZoom: 13,
          clusterRadius: 55,
        });
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "places",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": ["step", ["get", "point_count"], "#2E7DB2", 50, "#0B5E78", 250, "#083D4E"],
            "circle-radius": ["step", ["get", "point_count"], 16, 50, 22, 250, 28],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.95,
          },
        });
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "places",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["Montserrat Medium"],
            "text-size": 13,
          },
          paint: { "text-color": "#ffffff" },
        });
        map.addLayer({
          id: "places-circles",
          type: "circle",
          source: "places",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 5, 12, 8, 16, 12],
            "circle-color": ["get", "color"],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.9,
          },
        });
        map.on("click", "clusters", async (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const src = map.getSource("places") as import("maplibre-gl").GeoJSONSource;
          const zoom = await src.getClusterExpansionZoom(f.properties!.cluster_id as number);
          map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: zoom + 0.3 });
        });
        map.on("click", "places-circles", (e) => {
          const f = e.features?.[0];
          if (f?.properties?.slug) selectPlace(String(f.properties.slug));
        });
        for (const layer of ["clusters", "places-circles"]) {
          map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
        }
        map.on("moveend", () => setMapViewport((v) => v + 1));
        setMapReady(true);
      });
    });
    return () => {
      cancelled = true;
      for (const m of photoMarkersRef.current) m.remove();
      photoMarkersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Sync filtered data to map ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource("places") as import("maplibre-gl").GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: "FeatureCollection",
      features: filtered
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [p.longitude!, p.latitude!] },
          properties: { slug: p.slug, color: TYPE_COLORS[p.place_type] || FALLBACK_COLOR },
        })),
    });
  }, [filtered, mapReady]);

  // Disque "autour de moi" : suit geo.pos quand le tri proximité est actif, vidé sinon.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource("user-radius") as import("maplibre-gl").GeoJSONSource | undefined;
    if (!src) return;
    if (nearActive && geo.pos) {
      src.setData({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [circlePolygon(geo.pos, NEAR_RADIUS_KM)] },
        }],
      });
    } else {
      src.setData({ type: "FeatureCollection", features: [] });
    }
  }, [nearActive, geo.pos, mapReady]);

  // Marqueur utilisateur : créé une seule fois quand une position existe + tri actif,
  // retiré sinon. La POSITION est mise à jour par un effet séparé (Step 3) pour éviter
  // une recréation (et un re-binding des handlers) à chaque drag.
  const hasPos = geo.pos != null;
  useEffect(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;
    const pos = geo.pos;
    if (!map || !maplibre || !mapReady || !nearActive || !pos) return;

    const el = document.createElement("div");
    el.title = t.youAreHere;
    el.style.cssText =
      "position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:grab;z-index:5";
    const ring = document.createElement("div");
    ring.style.cssText =
      "position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(11,94,120,.16);animation:cd-pulse 2s ease-out infinite";
    const dot = document.createElement("div");
    dot.style.cssText =
      "width:18px;height:18px;border-radius:50%;background:#0B5E78;border:3px solid #fff;box-shadow:0 2px 8px rgba(7,40,52,.45)";
    el.appendChild(ring);
    el.appendChild(dot);

    const marker = new maplibre.Marker({ element: el, anchor: "center", draggable: true })
      .setLngLat([pos.lon, pos.lat])
      .addTo(map);
    marker.on("dragend", () => {
      const ll = marker.getLngLat();
      geo.setPosition(ll.lat, ll.lng);
      setHint(null);
    });
    userMarkerRef.current = marker;

    return () => {
      marker.remove();
      userMarkerRef.current = null;
    };
    // geo.pos lu à la création seulement ; les MAJ de position passent par l'effet Step 3.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearActive, mapReady, hasPos, t.youAreHere]);

  // Met à jour la position du marqueur existant sans le recréer.
  useEffect(() => {
    const m = userMarkerRef.current;
    if (m && geo.pos) m.setLngLat([geo.pos.lon, geo.pos.lat]);
  }, [geo.pos]);

  // Réaction asynchrone à la résolution GPS (le refus/succès arrive dans un callback,
  // pas au moment du clic). Pattern repris de MatchDeck (prevGeoStatus).
  const prevGeoStatus = useRef(geo.status);
  useEffect(() => {
    const map = mapRef.current;
    const prev = prevGeoStatus.current;
    prevGeoStatus.current = geo.status;
    if (!map || !nearActive) return;

    // Succès GPS : recentrer si on est en Crète, sinon garder la carte sur l'île
    // et poser le point déplaçable au centre de la vue (persona "préparation voyage").
    if (prev === "prompting" && geo.status === "granted" && geo.pos) {
      if (isOnCrete(geo.pos)) {
        map.flyTo({ center: [geo.pos.lon, geo.pos.lat], zoom: Math.max(map.getZoom(), 11) });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHint(null);
      } else {
        const c = map.getCenter();
        geo.setPosition(c.lat, c.lng);
        setHint(t.notOnCrete);
      }
      return;
    }
    // Refus / indisponible : placement manuel au centre de la vue.
    if ((geo.status === "denied" || geo.status === "unavailable") && !geo.pos) {
      const c = map.getCenter();
      geo.setPosition(c.lat, c.lng);
      setHint(t.dragToAdjust);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status, geo.pos, nearActive]);

  // --- Photo-pins : au zoom, les meilleurs lieux visibles deviennent des
  // vignettes photo cliquables (DOM markers), les autres restent des points. ---
  useEffect(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;
    if (!map || !maplibre || !mapReady) return;
    for (const m of photoMarkersRef.current) m.remove();
    photoMarkersRef.current = [];
    if (map.getZoom() < PHOTO_PIN_ZOOM) return;
    const bounds = map.getBounds();
    const visible = filtered
      .filter((p) =>
        p.latitude != null && p.longitude != null && p.photos?.[0] &&
        bounds.contains([p.longitude, p.latitude]))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, PHOTO_PIN_MAX);
    for (const p of visible) {
      const el = document.createElement("button");
      el.className = "cd-photo-pin";
      el.setAttribute("aria-label", p.name);
      el.style.cssText =
        "width:60px;height:60px;border-radius:14px;border:3px solid #fff;box-shadow:0 6px 16px rgba(7,40,52,.35);overflow:hidden;cursor:pointer;position:relative;padding:0;background:#DFF7FA";
      const img = document.createElement("img");
      img.src = p.photos![0];
      img.alt = p.name;
      img.loading = "lazy";
      img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block";
      el.appendChild(img);
      if (p.rating != null && p.rating > 0) {
        const badge = document.createElement("span");
        badge.textContent = `★ ${p.rating.toFixed(1)}`;
        badge.style.cssText =
          "position:absolute;bottom:0;left:0;right:0;background:rgba(11,94,120,.88);color:#fff;font-size:10px;font-weight:700;text-align:center;padding:1px 0;line-height:1.4";
        el.appendChild(badge);
      }
      el.addEventListener("click", () => selectPlace(p.slug));
      const marker = new maplibre.Marker({ element: el, anchor: "bottom", offset: [0, -4] })
        .setLngLat([p.longitude!, p.latitude!])
        .addTo(map);
      photoMarkersRef.current.push(marker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, mapReady, mapViewport]);

  async function selectPlace(slug: string) {
    const base = places.find((p) => p.slug === slug);
    setPhotoIdx(0);
    setListExpanded(false);
    setSelectedLoading(true);
    setSelected(base ? ({ ...base, description: null, meta_description: null, other_info: null, source_url: null } as CbPlace) : null);
    const full = await getCbPlaceBySlug(slug);
    if (full) setSelected(full);
    setSelectedLoading(false);
    if (base?.latitude != null && base?.longitude != null) {
      mapRef.current?.flyTo({ center: [base.longitude, base.latitude], zoom: Math.max(mapRef.current.getZoom(), 12) });
    }
  }

  // Deep-link ?place=slug : ouvre le drawer à l'arrivée (utilisé par /match).
  // Lecture window au mount plutôt que useSearchParams() : évite le bailout
  // Suspense de Next sur une page ISR.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("place");
    if (slug && places.some((p) => p.slug === slug)) selectPlace(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearFilters() {
    setQuery(""); setFamily(null); setPrefecture(""); setMinRating(0);
    setSand(""); setWater(""); setCrowdLevel("");
  }

  const selectedPhotos = selected?.photos || [];

  const filtersPanel = (
    <div className="space-y-2.5">
      <select value={prefecture} onChange={(e) => setPrefecture(e.target.value)}
        className="w-full text-sm py-2 px-2.5 rounded-lg border border-sea/20 bg-surface">
        <option value="">{t.prefecture}: {t.anyPref}</option>
        {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}
        className="w-full text-sm py-2 px-2.5 rounded-lg border border-sea/20 bg-surface">
        <option value={0}>{t.rating}: {t.any}</option>
        {[3, 3.5, 4, 4.5].map((r) => <option key={r} value={r}>≥ {r} ★</option>)}
      </select>
      {beachFiltersRelevant && (
        <>
          <select value={sand} onChange={(e) => setSand(e.target.value)}
            className="w-full text-sm py-2 px-2.5 rounded-lg border border-sea/20 bg-surface">
            <option value="">{t.sand}: {t.any}</option>
            {sandOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={water} onChange={(e) => setWater(e.target.value)}
            className="w-full text-sm py-2 px-2.5 rounded-lg border border-sea/20 bg-surface">
            <option value="">{t.water}: {t.any}</option>
            {waterOptions.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          <select value={crowdLevel} onChange={(e) => setCrowdLevel(e.target.value)}
            className="w-full text-sm py-2 px-2.5 rounded-lg border border-sea/20 bg-surface">
            <option value="">{t.crowds}: {t.any}</option>
            {crowdOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </>
      )}
      {hasFilters && (
        <button onClick={clearFilters} className="text-xs text-terracotta font-semibold hover:underline">{t.clear}</button>
      )}
    </div>
  );

  // Card riche partagee entre le panneau desktop et la liste mobile.
  function PlaceRow({ p }: { p: CbPlaceListItem & { km?: number; __sponsorUrl?: string } }) {
    const spo = isSponsorSlug(p.slug);
    return (
      <button
        onClick={() =>
          spo && p.__sponsorUrl
            ? window.open(p.__sponsorUrl, "_blank", "noopener")
            : selectPlace(p.slug)
        }
        className={`flex gap-3 p-2 rounded-xl bg-white shadow-soft text-left transition-all w-full ${
          spo ? "border border-amber-300 ring-1 ring-amber-200" : "border border-sea/10 hover:border-sea/30"
        }`}
      >
        <div className="relative w-[72px] h-[64px] rounded-lg overflow-hidden bg-sand shrink-0">
          {p.photos?.[0] ? (
            <Image src={p.photos[0]} alt={p.name} fill sizes="72px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sea/30">
              <MapPin size={20} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-text truncate">{p.name}</span>
            {spo && (
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                {sponsoredLabel(locale)}
              </span>
            )}
            <RatingStars rating={p.rating} />
            {p.km != null && (
              <span className="text-xs text-text-muted font-data whitespace-nowrap">· {fmtKm(p.km)} km</span>
            )}
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: TYPE_COLORS[p.place_type] || FALLBACK_COLOR }} />
            {spo ? (p.category ?? "") : typeLabel(p.place_type, locale)}
            {detectPrefecture(p) ? ` · ${detectPrefecture(p)}` : ""}
          </div>
          {(p.water_quality || p.sand_type || p.water_color) && (
            <div className="flex items-center gap-1 mt-1.5 overflow-hidden">
              {p.water_quality && <WaterQualityBadge wq={p.water_quality} locale={locale} variant="pill" />}
              {[p.sand_type, p.water_color].filter(Boolean).slice(0, 2).map((v) => (
                <span key={v} className="text-[10px] font-medium bg-surface border border-sea/10 text-text-muted px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="relative overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
      {/* Carte plein ecran : tout le reste flotte par-dessus.
          Wrapper separe : maplibre-gl.css force position:relative sur le
          conteneur de la carte, ce qui annulerait notre `absolute`. */}
      <div className="absolute inset-0">
        <div ref={mapContainer} className="h-full w-full" />
      </div>

      {hint && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-w-[90%] md:max-w-md">
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="bg-sea text-white text-xs font-semibold px-3.5 py-2 rounded-full shadow-[0_8px_22px_rgba(11,94,120,0.35)] text-center"
          >
            {hint}
          </div>
        </div>
      )}

      {/* ===== Barre flottante haute (desktop : a droite du panneau liste) ===== */}
      <div className="absolute top-3 left-3 right-3 md:left-[360px] md:right-4 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="relative flex-1 md:max-w-[320px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-full border border-white/60 bg-white shadow-[0_6px_24px_rgba(11,94,120,0.18)] focus:outline-none focus:border-sea"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className="flex items-center gap-1.5 text-sm font-semibold py-2.5 px-4 rounded-full bg-white shadow-[0_6px_24px_rgba(11,94,120,0.18)] text-text shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">{t.filters}</span>
              {advancedActiveCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-terracotta text-white rounded-full px-1">
                  {advancedActiveCount}
                </span>
              )}
            </button>
            {filtersOpen && (
              <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-float border border-sea/10 p-3 z-30">
                {filtersPanel}
              </div>
            )}
          </div>
          <button
            onClick={toggleNearMe}
            title={geoBlocked ? t.geoUnavailable : undefined}
            aria-pressed={nearActive && Boolean(geo.pos)}
            className={`hidden md:flex items-center gap-1.5 text-sm font-semibold py-2.5 px-4 rounded-full shadow-[0_6px_24px_rgba(11,94,120,0.18)] transition-colors shrink-0 ${
              nearActive && geo.pos ? "bg-sea text-white" : "bg-white text-text hover:text-sea"
            }`}
          >
            <CiCompass className="w-4 h-4" />
            {t.nearMe}
          </button>
        </div>

        {/* Rail de familles : 6 categories scannables au lieu de 26 chips */}
        <div className="flex gap-1.5 overflow-x-auto pointer-events-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FAMILIES.map(({ key, Icon }) => {
            const active = family === key;
            const count = familyCounts.get(key) || 0;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setFamily(active ? null : key)}
                className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold shadow-[0_4px_16px_rgba(11,94,120,0.15)] transition-colors whitespace-nowrap ${
                  active ? "bg-sea text-white" : "bg-white/95 text-text hover:text-sea"
                }`}
              >
                <Icon size={14} />
                {t[key]}
                <span className={active ? "text-white/70" : "text-text-muted"}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Panneau liste flottant (desktop) ===== */}
      <div className="hidden md:flex absolute left-3 top-3 bottom-3 w-[336px] z-10 flex-col bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_14px_44px_rgba(11,94,120,0.22)] overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
          <span className="text-sm text-text-muted">
            <b className="text-text text-base font-bold">{filtered.length}</b> {t.results}
          </span>
          <span className="text-xs font-semibold text-sea bg-sea-faint px-2.5 py-1 rounded-full">
            {nearActive && geo.pos ? t.sortNear : t.sortRating}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
          {displayed.length === 0 && (
            <p className="p-4 text-sm text-text-muted">{t.noResults}</p>
          )}
          {displayed.slice(0, 200).map((p) => <PlaceRow key={p.slug} p={p} />)}
        </div>
      </div>

      {/* ===== Mobile : Near me flottant + carousel bottom sheet ===== */}
      {!selected && (
        <>
          <button
            onClick={toggleNearMe}
            aria-pressed={nearActive && Boolean(geo.pos)}
            className={`md:hidden absolute right-3 bottom-[178px] z-20 flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-full shadow-[0_8px_22px_rgba(11,94,120,0.3)] ${
              nearActive && geo.pos ? "bg-sea text-white" : "bg-white text-sea"
            }`}
          >
            <CiCompass className="w-4 h-4" />
            {t.nearMe}
          </button>

          <div className="md:hidden absolute bottom-0 left-0 right-0 z-20">
            <button
              onClick={() => setListExpanded(true)}
              className="mx-auto mb-1.5 flex items-center gap-1.5 bg-white/95 text-sea text-xs font-bold px-4 py-1.5 rounded-full shadow-[0_4px_14px_rgba(11,94,120,0.25)]"
            >
              <ChevronUp size={14} /> {filtered.length} {t.results}
            </button>
            <div className="flex gap-2.5 overflow-x-auto px-3 pb-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {displayed.slice(0, 30).map((p) => (
                <button
                  key={p.slug}
                  onClick={() =>
                    isSponsorSlug(p.slug) && p.__sponsorUrl
                      ? window.open(p.__sponsorUrl, "_blank", "noopener")
                      : selectPlace(p.slug)
                  }
                  className="snap-start shrink-0 w-[196px] bg-white rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(11,94,120,0.28)] text-left"
                >
                  <div className="h-[84px] bg-sand relative">
                    {p.photos?.[0] ? (
                      <Image src={p.photos[0]} alt={p.name} fill sizes="196px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sea/30"><MapPin size={22} /></div>
                    )}
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: TYPE_COLORS[p.place_type] || FALLBACK_COLOR }}>
                      {typeLabel(p.place_type, locale)}
                    </span>
                    {isSponsorSlug(p.slug) && (
                      <span className="absolute top-1.5 right-1.5 text-[8px] font-bold uppercase tracking-wide text-amber-700 bg-white/95 px-1.5 py-0.5 rounded-full">
                        {sponsoredLabel(locale)}
                      </span>
                    )}
                  </div>
                  <div className="px-2.5 py-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold text-[13px] text-text truncate">{p.name}</span>
                      <RatingStars rating={p.rating} />
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5 truncate">
                      {detectPrefecture(p) || ""}
                      {p.km != null ? ` · ${fmtKm(p.km)} km` : ""}
                      {p.sand_type ? ` · ${p.sand_type}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Mobile : liste complete (sheet plein ecran) */}
      {listExpanded && (
        <div className="md:hidden absolute inset-0 z-30 bg-surface flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-sea/10">
            <span className="text-sm font-bold text-text">{filtered.length} {t.results}</span>
            <button onClick={() => setListExpanded(false)}
              className="bg-sea-faint text-sea rounded-full p-2"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {displayed.length === 0 && <p className="p-4 text-sm text-text-muted">{t.noResults}</p>}
            {displayed.slice(0, 200).map((p) => <PlaceRow key={p.slug} p={p} />)}
          </div>
        </div>
      )}

      {/* ===== Fiche lieu ===== */}
      {selected && (
        <div className="absolute z-30 bg-white shadow-float overflow-y-auto inset-x-0 bottom-0 max-h-[78%] rounded-t-3xl md:inset-x-auto md:right-3 md:top-3 md:bottom-3 md:max-h-none md:w-[360px] md:rounded-2xl">
          <div className="relative">
            {selectedPhotos.length > 0 ? (
              <div className="relative h-52 bg-sand">
                <Image src={selectedPhotos[photoIdx]} alt={selected.name} fill sizes="(max-width: 768px) 100vw, 360px" className="object-cover" />
                {selectedPhotos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIdx((photoIdx - 1 + selectedPhotos.length) % selectedPhotos.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60">
                      <ChevronLeft size={18} />
                    </button>
                    <button onClick={() => setPhotoIdx((photoIdx + 1) % selectedPhotos.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60">
                      <ChevronRight size={18} />
                    </button>
                    <span className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">
                      {photoIdx + 1}/{selectedPhotos.length}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="h-20 bg-sea-faint" />
            )}
            <button onClick={() => setSelected(null)}
              className="absolute top-2 right-2 md:right-auto md:left-2 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60">
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-sea leading-tight">{selected.name}</h2>
                <RatingStars rating={selected.rating} />
              </div>
              <p className="text-xs text-text-muted mt-1">
                {typeLabel(selected.place_type, locale)}
                {selected.prefecture ? ` · ${selected.prefecture}` : ""}
              </p>
            </div>

            {selected.water_quality && <WaterQualityBadge wq={selected.water_quality} locale={locale} />}

            {/* Attributs en grille de tuiles : plus scannable qu'une dl seche */}
            <div className="grid grid-cols-2 gap-2">
              {([
                [t.sand, selected.sand_type],
                [t.water, selected.water_color],
                [t.depth, selected.depth],
                [t.seaSurface, selected.sea_surface],
                [t.crowds, selected.crowds],
                [t.accessibility, selected.accessibility],
              ] as const).filter(([, v]) => v).map(([label, v]) => (
                <div key={label} className="bg-surface border border-sea/10 rounded-xl px-2.5 py-2">
                  <div className="text-[10px] uppercase tracking-wide font-semibold text-text-muted">{label}</div>
                  <div className="text-xs font-semibold text-text mt-0.5">{v}</div>
                </div>
              ))}
              {selected.facilities && (
                <div className="col-span-2 bg-surface border border-sea/10 rounded-xl px-2.5 py-2">
                  <div className="text-[10px] uppercase tracking-wide font-semibold text-text-muted">{t.facilities}</div>
                  <div className="text-xs font-semibold text-text mt-0.5">{selected.facilities}</div>
                </div>
              )}
            </div>

            <div className="border-t border-sea/10 pt-3">
              <CbPlaceActions
                slug={selected.slug}
                name={selected.name}
                latitude={selected.latitude}
                longitude={selected.longitude}
                locale={locale}
                compact
              />
            </div>

            {selectedLoading && <p className="text-xs text-text-muted">{t.loading}</p>}
            {(() => {
              const { paragraphs, nearby } = cleanCbDescription(selected.description);
              if (paragraphs.length === 0 && nearby.length === 0) return null;
              return (
                <div className="space-y-3 border-t border-sea/10 pt-3">
                  {paragraphs.length > 0 && (
                    <div className="text-sm text-text/90 leading-relaxed space-y-2.5">
                      {paragraphs.slice(0, 8).map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  )}
                  {nearby.length > 0 && (
                    <details className="rounded-lg bg-sea-faint/30 p-2">
                      <summary className="text-xs font-semibold text-sea cursor-pointer">
                        {nearby.length} {locale === "fr" ? "lieux à proximité" : locale === "de" ? "Orte in der Nähe" : locale === "el" ? "κοντινά μέρη" : "places nearby"}
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs">
                        {nearby.slice(0, 12).map((n, i) => (
                          <li key={i} className="flex justify-between gap-2">
                            <span className="truncate text-text">{n.name}</span>
                            <span className="text-text-muted font-data shrink-0">
                              {n.km < 10 ? n.km.toFixed(1) : Math.round(n.km)} km
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function uniqueValues(places: CbPlaceListItem[], field: "sand_type" | "water_color" | "crowds"): string[] {
  const set = new Set<string>();
  for (const p of places) {
    for (const part of (p[field] || "").split(",")) {
      const v = part.trim();
      if (v) set.add(v);
    }
  }
  return [...set].sort();
}
