"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Star, X, MapPin, Search, ChevronLeft, ChevronRight, List, Map as MapIcon } from "lucide-react";
import type { CbPlaceListItem, CbPlace } from "@/lib/cb-places";
import { getCbPlaceBySlug } from "@/lib/cb-places";
import { typeLabel } from "@/lib/cb-type-labels";
import { nearestBy } from "@/lib/geo";
import { cleanCbDescription } from "@/lib/cb-place-helpers";
import { useGeoPosition } from "@/components/geo/useGeoPosition";
import { CiCompass } from "@/components/icons";
import { CbPlaceActions } from "@/components/explore/CbPlaceActions";
import "maplibre-gl/dist/maplibre-gl.css";

type MaplibreMap = import("maplibre-gl").Map;

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

const T: Record<string, Record<string, string>> = {
  en: {
    search: "Search a place...", results: "results", allTypes: "All", rating: "Min. rating",
    prefecture: "Region", anyPref: "All Crete", sand: "Sand type", water: "Water color",
    crowds: "Crowds", any: "Any", photos: "photos", noResults: "No place matches these filters.",
    showMap: "Map", showList: "List", facilities: "Facilities", accessibility: "Access",
    depth: "Depth", seaSurface: "Sea surface", loading: "Loading...", clear: "Clear filters",
    nearMe: "Near me", geoUnavailable: "Location unavailable",
  },
  fr: {
    search: "Chercher un lieu...", results: "résultats", allTypes: "Tous", rating: "Note min.",
    prefecture: "Région", anyPref: "Toute la Crète", sand: "Type de sable", water: "Couleur de l'eau",
    crowds: "Affluence", any: "Indifférent", photos: "photos", noResults: "Aucun lieu ne correspond à ces filtres.",
    showMap: "Carte", showList: "Liste", facilities: "Équipements", accessibility: "Accès",
    depth: "Profondeur", seaSurface: "État de la mer", loading: "Chargement...", clear: "Effacer les filtres",
    nearMe: "Autour de moi", geoUnavailable: "Localisation indisponible",
  },
  de: {
    search: "Ort suchen...", results: "Ergebnisse", allTypes: "Alle", rating: "Min. Bewertung",
    prefecture: "Region", anyPref: "Ganz Kreta", sand: "Sandtyp", water: "Wasserfarbe",
    crowds: "Andrang", any: "Egal", photos: "Fotos", noResults: "Kein Ort entspricht diesen Filtern.",
    showMap: "Karte", showList: "Liste", facilities: "Ausstattung", accessibility: "Zugang",
    depth: "Tiefe", seaSurface: "Meeresoberfläche", loading: "Laden...", clear: "Filter löschen",
    nearMe: "In meiner Nähe", geoUnavailable: "Standort nicht verfügbar",
  },
  el: {
    search: "Αναζήτηση τοποθεσίας...", results: "αποτελέσματα", allTypes: "Όλα", rating: "Ελάχ. βαθμολογία",
    prefecture: "Περιοχή", anyPref: "Όλη η Κρήτη", sand: "Τύπος άμμου", water: "Χρώμα νερού",
    crowds: "Κόσμος", any: "Οποιοδήποτε", photos: "φωτογραφίες", noResults: "Κανένα μέρος δεν ταιριάζει.",
    showMap: "Χάρτης", showList: "Λίστα", facilities: "Παροχές", accessibility: "Πρόσβαση",
    depth: "Βάθος", seaSurface: "Επιφάνεια", loading: "Φόρτωση...", clear: "Καθαρισμός φίλτρων",
    nearMe: "Κοντά μου", geoUnavailable: "Ο εντοπισμός δεν είναι διαθέσιμος",
  },
};

const PREFECTURES = ["Chania", "Rethymnon", "Heraklion", "Lassithi"];

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
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
      <Star size={12} fill="currentColor" /> {rating.toFixed(1)}
    </span>
  );
}

export function ExploreView({ places, locale }: { places: CbPlaceListItem[]; locale: string }) {
  const t = T[locale] || T.en;
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [prefecture, setPrefecture] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sand, setSand] = useState("");
  const [water, setWater] = useState("");
  const [crowdLevel, setCrowdLevel] = useState("");
  const [selected, setSelected] = useState<CbPlace | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  // Tri "Near me" : géoloc 100 % client (useGeoPosition), toggle on/off.
  const geo = useGeoPosition();
  const [nearActive, setNearActive] = useState(false);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of places) counts.set(p.place_type, (counts.get(p.place_type) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [places]);

  const sandOptions = useMemo(
    () => uniqueValues(places, "sand_type"),
    [places]
  );
  const waterOptions = useMemo(
    () => uniqueValues(places, "water_color"),
    [places]
  );
  const crowdOptions = useMemo(
    () => uniqueValues(places, "crowds"),
    [places]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((p) => {
      if (activeTypes.size > 0 && !activeTypes.has(p.place_type)) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (prefecture && detectPrefecture(p) !== prefecture) return false;
      if (minRating > 0 && (p.rating == null || p.rating < minRating)) return false;
      if (sand && !(p.sand_type || "").includes(sand)) return false;
      if (water && !(p.water_color || "").includes(water)) return false;
      if (crowdLevel && !(p.crowds || "").includes(crowdLevel)) return false;
      return true;
    });
  }, [places, query, activeTypes, prefecture, minRating, sand, water, crowdLevel]);

  // Liste affichée : tri distance quand Near me est actif et la position connue.
  // Sinon ordre actuel, inchangé (denied/unavailable n'altèrent rien).
  const displayed: Array<CbPlaceListItem & { km?: number }> = useMemo(() => {
    if (!nearActive || !geo.pos) return filtered;
    return nearestBy(
      filtered,
      (p) => (p.latitude != null && p.longitude != null ? [p.latitude, p.longitude] : null),
      geo.pos,
      filtered.length,
    );
  }, [filtered, nearActive, geo.pos]);

  const geoBlocked = geo.status === "denied" || geo.status === "unavailable";

  function toggleNearMe() {
    if (nearActive) { setNearActive(false); return; }
    setNearActive(true);
    if (!geo.pos) geo.requestGeo();
  }

  const hasFilters = query || activeTypes.size > 0 || prefecture || minRating > 0 || sand || water || crowdLevel;
  const beachFiltersRelevant = activeTypes.size === 0 || activeTypes.has("beach");

  // --- Map init ---
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let cancelled = false;
    import("maplibre-gl").then(({ Map, NavigationControl }) => {
      if (cancelled || !mapContainer.current) return;
      const map = new Map({
        container: mapContainer.current,
        style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: [25.0, 35.25],
        zoom: 8,
        minZoom: 7,
        maxZoom: 17,
      });
      mapRef.current = map;
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => {
        map.addSource("places", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "places-circles",
          type: "circle",
          source: "places",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 4, 12, 8, 16, 12],
            "circle-color": ["get", "color"],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.9,
          },
        });
        map.on("click", "places-circles", (e) => {
          const f = e.features?.[0];
          if (f?.properties?.slug) selectPlace(String(f.properties.slug));
        });
        map.on("mouseenter", "places-circles", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "places-circles", () => (map.getCanvas().style.cursor = ""));
        setMapReady(true);
      });
    });
    return () => {
      cancelled = true;
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

  async function selectPlace(slug: string) {
    const base = places.find((p) => p.slug === slug);
    setPhotoIdx(0);
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

  function toggleType(type: string) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function clearFilters() {
    setQuery(""); setActiveTypes(new Set()); setPrefecture(""); setMinRating(0);
    setSand(""); setWater(""); setCrowdLevel("");
  }

  const selectedPhotos = selected?.photos || [];

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Filter bar */}
      <div className="border-b border-aegean/10 bg-white px-4 py-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-aegean/20 bg-surface focus:outline-none focus:border-aegean w-52"
            />
          </div>
          <select value={prefecture} onChange={(e) => setPrefecture(e.target.value)}
            className="text-sm py-1.5 px-2 rounded-lg border border-aegean/20 bg-surface">
            <option value="">{t.anyPref}</option>
            {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}
            className="text-sm py-1.5 px-2 rounded-lg border border-aegean/20 bg-surface">
            <option value={0}>{t.rating}: {t.any}</option>
            {[3, 3.5, 4, 4.5].map((r) => <option key={r} value={r}>≥ {r} ★</option>)}
          </select>
          {beachFiltersRelevant && (
            <>
              <select value={sand} onChange={(e) => setSand(e.target.value)}
                className="text-sm py-1.5 px-2 rounded-lg border border-aegean/20 bg-surface">
                <option value="">{t.sand}: {t.any}</option>
                {sandOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={water} onChange={(e) => setWater(e.target.value)}
                className="text-sm py-1.5 px-2 rounded-lg border border-aegean/20 bg-surface">
                <option value="">{t.water}: {t.any}</option>
                {waterOptions.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              <select value={crowdLevel} onChange={(e) => setCrowdLevel(e.target.value)}
                className="text-sm py-1.5 px-2 rounded-lg border border-aegean/20 bg-surface">
                <option value="">{t.crowds}: {t.any}</option>
                {crowdOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </>
          )}
          <button
            onClick={toggleNearMe}
            title={geoBlocked ? t.geoUnavailable : undefined}
            aria-pressed={nearActive && Boolean(geo.pos)}
            className={`flex items-center gap-1.5 text-sm py-1.5 px-3 rounded-lg border transition-colors ${
              nearActive && geo.pos
                ? "bg-aegean text-white border-aegean"
                : geoBlocked
                  ? "bg-surface text-text-muted border-aegean/20 opacity-60 cursor-help"
                  : "bg-surface text-text border-aegean/20 hover:border-aegean/50"
            }`}
          >
            <CiCompass className="w-4 h-4" />
            {t.nearMe}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-terra hover:underline">{t.clear}</button>
          )}
          <span className="ml-auto text-xs text-text-muted font-medium">
            {filtered.length} {t.results}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {typeCounts.map(([type, count]) => {
            const active = activeTypes.size === 0 || activeTypes.has(type);
            const explicit = activeTypes.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  explicit
                    ? "text-white border-transparent"
                    : active
                      ? "bg-white text-text border-aegean/20 hover:border-aegean/50"
                      : "bg-surface text-text-muted border-transparent opacity-50"
                }`}
                style={explicit ? { backgroundColor: TYPE_COLORS[type] || FALLBACK_COLOR } : undefined}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                  style={{ backgroundColor: explicit ? "#fff" : TYPE_COLORS[type] || FALLBACK_COLOR }} />
                {typeLabel(type, locale)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile toggle */}
      <div className="md:hidden flex border-b border-aegean/10 bg-white">
        {(["map", "list"] as const).map((v) => (
          <button key={v} onClick={() => setMobileView(v)}
            className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 ${
              mobileView === v ? "text-aegean border-b-2 border-aegean" : "text-text-muted"
            }`}>
            {v === "map" ? <MapIcon size={15} /> : <List size={15} />}
            {v === "map" ? t.showMap : t.showList}
          </button>
        ))}
      </div>

      {/* Main: list + map */}
      <div className="flex flex-1 min-h-0 relative">
        <div className={`${mobileView === "list" ? "flex" : "hidden"} md:flex flex-col w-full md:w-96 border-r border-aegean/10 bg-white overflow-y-auto`}>
          {displayed.length === 0 && (
            <p className="p-6 text-sm text-text-muted">{t.noResults}</p>
          )}
          {displayed.slice(0, 200).map((p) => (
            <button
              key={p.slug}
              onClick={() => { selectPlace(p.slug); setMobileView("map"); }}
              className="flex gap-3 p-3 border-b border-aegean/5 hover:bg-aegean-faint/50 text-left transition-colors"
            >
              <div className="w-20 h-16 rounded-lg overflow-hidden bg-sand shrink-0">
                {p.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photos[0]} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-aegean/30">
                    <MapPin size={20} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-text truncate">{p.name}</span>
                  <RatingStars rating={p.rating} />
                  {p.km != null && (
                    <span className="text-xs text-text-muted font-data whitespace-nowrap">
                      · {fmtKm(p.km)} km
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: TYPE_COLORS[p.place_type] || FALLBACK_COLOR }} />
                  {typeLabel(p.place_type, locale)}
                  {detectPrefecture(p) ? ` · ${detectPrefecture(p)}` : ""}
                </div>
                {(p.sand_type || p.water_color) && (
                  <div className="text-xs text-text-muted mt-0.5 truncate">
                    {[p.sand_type, p.water_color].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className={`${mobileView === "map" ? "block" : "hidden"} md:block flex-1 relative`}>
          <div ref={mapContainer} className="h-full w-full" />

          {/* Detail drawer */}
          {selected && (
            <div className="absolute top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-xl overflow-y-auto z-10">
              <div className="relative">
                {selectedPhotos.length > 0 ? (
                  <div className="relative h-56 bg-sand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedPhotos[photoIdx]} alt={selected.name} className="w-full h-full object-cover" />
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
                  <div className="h-20 bg-aegean-faint" />
                )}
                <button onClick={() => setSelected(null)}
                  className="absolute top-2 left-2 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60">
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-bold text-aegean leading-tight">{selected.name}</h2>
                    <RatingStars rating={selected.rating} />
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {typeLabel(selected.place_type, locale)}
                    {selected.prefecture ? ` · ${selected.prefecture}` : ""}
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  {([
                    [t.sand, selected.sand_type],
                    [t.water, selected.water_color],
                    [t.depth, selected.depth],
                    [t.seaSurface, selected.sea_surface],
                    [t.crowds, selected.crowds],
                    [t.accessibility, selected.accessibility],
                  ] as const).filter(([, v]) => v).map(([label, v]) => (
                    <div key={label}>
                      <dt className="text-text-muted">{label}</dt>
                      <dd className="font-medium text-text">{v}</dd>
                    </div>
                  ))}
                  {selected.facilities && (
                    <div className="col-span-2">
                      <dt className="text-text-muted">{t.facilities}</dt>
                      <dd className="font-medium text-text">{selected.facilities}</dd>
                    </div>
                  )}
                </dl>

                <div className="border-t border-aegean/10 pt-3">
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
                    <div className="space-y-3 border-t border-aegean/10 pt-3">
                      {paragraphs.length > 0 && (
                        <div className="text-sm text-text/90 leading-relaxed space-y-2.5">
                          {paragraphs.slice(0, 8).map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                        </div>
                      )}
                      {nearby.length > 0 && (
                        <details className="rounded-lg bg-aegean-faint/30 p-2">
                          <summary className="text-xs font-semibold text-aegean cursor-pointer">
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
      </div>
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
