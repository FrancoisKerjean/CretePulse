"use client";

import { useEffect, useRef, useState } from "react";
import { Waves, Mountain, UtensilsCrossed, Footprints } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

interface POI {
  id: number;
  name: string;
  type: "beach" | "village" | "food" | "hike";
  lat: number;
  lng: number;
  slug: string;
  extra?: string;
}

interface MapViewProps {
  beaches: POI[];
  villages: POI[];
  food: POI[];
  hikes: POI[];
  locale: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  beach: "#1B4965",
  village: "#5F7A3E",
  food: "#B85C38",
  hike: "#8B7355",
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  beach: { en: "Beaches", fr: "Plages", de: "Strände", el: "Παραλίες" },
  village: { en: "Villages", fr: "Villages", de: "Dörfer", el: "Χωριά" },
  food: { en: "Food", fr: "Restaurants", de: "Essen", el: "Φαγητό" },
  hike: { en: "Hikes", fr: "Randos", de: "Wandern", el: "Πεζοπορία" },
};

export function MapView({ beaches, villages, food, hikes, locale }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(["beach", "village", "food", "hike"]));
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    import("maplibre-gl").then(({ Map, Popup, Marker, NavigationControl }) => {
      const map = new Map({
        container: mapContainer.current!,
        style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: [25.0, 35.25],
        zoom: 8.5,
        minZoom: 7,
        maxZoom: 16,
      });

      mapRef.current = map;

      map.on("load", () => {
        setMapLoaded(true);

        // Add all POIs as markers
        const allPOIs = [
          ...beaches.map(p => ({ ...p, type: "beach" as const })),
          ...villages.map(p => ({ ...p, type: "village" as const })),
          ...food.map(p => ({ ...p, type: "food" as const })),
          ...hikes.map(p => ({ ...p, type: "hike" as const })),
        ];

        for (const poi of allPOIs) {
          const el = document.createElement("div");
          el.className = `map-marker marker-${poi.type}`;
          el.style.cssText = `width:12px;height:12px;border-radius:50%;background:${CATEGORY_COLORS[poi.type]};border:2px solid white;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.3);`;
          el.dataset.type = poi.type;

          const popup = new Popup({ offset: 15, closeButton: false })
            .setHTML(`
              <div style="font-family:system-ui;padding:4px">
                <a href="/${locale}/${poi.type === "beach" ? "beaches" : poi.type === "village" ? "villages" : poi.type === "food" ? "food" : "hikes"}/${poi.slug}"
                   style="font-weight:600;font-size:13px;color:#1B4965;text-decoration:none">
                  ${poi.name}
                </a>
                ${poi.extra ? `<div style="font-size:11px;color:#6B7280;margin-top:2px">${poi.extra}</div>` : ""}
              </div>
            `);

          new Marker({ element: el })
            .setLngLat([poi.lng, poi.lat])
            .setPopup(popup)
            .addTo(map);
        }
      });

      // Navigation control
      map.addControl(new NavigationControl(), "top-right");
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [beaches, villages, food, hikes, locale]);

  // Toggle category visibility
  useEffect(() => {
    if (!mapLoaded) return;
    const markers = document.querySelectorAll(".map-marker");
    markers.forEach((el) => {
      const type = (el as HTMLElement).dataset.type || "";
      (el as HTMLElement).style.display = activeFilters.has(type) ? "block" : "none";
    });
  }, [activeFilters, mapLoaded]);

  function toggleFilter(type: string) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const filterButtons = [
    { type: "beach", icon: <Waves className="w-4 h-4" /> },
    { type: "village", icon: <Mountain className="w-4 h-4" /> },
    { type: "food", icon: <UtensilsCrossed className="w-4 h-4" /> },
    { type: "hike", icon: <Footprints className="w-4 h-4" /> },
  ];

  return (
    <div className="relative">
      {/* Filter buttons */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        {filterButtons.map(({ type, icon }) => (
          <button
            key={type}
            onClick={() => toggleFilter(type)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shadow-md transition-all ${
              activeFilters.has(type)
                ? "bg-white text-text border border-border"
                : "bg-white/50 text-text-light border border-transparent"
            }`}
          >
            {icon}
            {CATEGORY_LABELS[type][locale] || CATEGORY_LABELS[type].en}
          </button>
        ))}
      </div>

      {/* Map container */}
      <div ref={mapContainer} className="w-full h-[70vh] min-h-[500px] rounded-xl overflow-hidden border border-border" />
    </div>
  );
}
