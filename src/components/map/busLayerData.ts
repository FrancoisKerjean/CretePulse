// Couche bus pour la carte /map.
// Charge lignes + arrêts une seule fois par session (Promise mémorisée).
// Contrat consommé par MapView.tsx — ne pas modifier l'interface publique.

import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Contrat public
// ---------------------------------------------------------------------------

export interface BusLayerData {
  stops: GeoJSON.FeatureCollection<GeoJSON.Point>;    // properties: { name: string; slug: string }
  lines: GeoJSON.FeatureCollection<GeoJSON.LineString>; // properties: { code: string; color: string; source: string }
}

// ---------------------------------------------------------------------------
// Types PostgREST internes
// ---------------------------------------------------------------------------

interface LineRow {
  id: number;
  code: string;
  color: string | null;
  source: "osm" | "ktel" | "agncitybus";
  geometry: [number, number][] | null;
}

interface StopRow {
  id: number;
  slug: string;
  name: string;
  lat: number;
  lng: number;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Couleur fallback pour les lignes ktel et osm sans couleur définie. */
const FALLBACK_COLOR = "#0B5E78";

// ---------------------------------------------------------------------------
// Mise en cache module-level : une seule Promise par session navigateur.
// ---------------------------------------------------------------------------

let cached: Promise<BusLayerData> | null = null;

export async function loadBusLayerData(): Promise<BusLayerData> {
  if (cached) return cached;
  cached = fetchBusLayerData().catch((err) => {
    // En cas d'erreur réseau, on libère le cache pour permettre une nouvelle
    // tentative au prochain appel.
    cached = null;
    throw err;
  });
  return cached;
}

// ---------------------------------------------------------------------------
// Récupération réelle (jamais appelée directement en dehors du module)
// ---------------------------------------------------------------------------

async function fetchBusLayerData(): Promise<BusLayerData> {
  const [linesRes, stopsRes] = await Promise.all([
    supabase
      .from("bus_lines")
      .select("id, code, color, source, geometry"),
    supabase
      .from("bus_stops")
      .select("id, slug, name, lat, lng"),
  ]);

  if (linesRes.error || stopsRes.error) {
    console.error("[busLayerData] fetch error", {
      lines: linesRes.error?.message,
      stops: stopsRes.error?.message,
    });
    return emptyData();
  }

  // ---- Lignes -------------------------------------------------------
  const lineFeatures: GeoJSON.Feature<GeoJSON.LineString, { code: string; color: string; source: string }>[] = [];

  for (const l of (linesRes.data as LineRow[]) ?? []) {
    // Exclure les lignes sans géométrie ou trop courtes pour un tracé
    if (!Array.isArray(l.geometry) || l.geometry.length < 2) continue;

    // Couleur : agncitybus conserve sa couleur propre, ktel/osm tombent sur le fallback si null
    const color =
      l.source === "agncitybus"
        ? (l.color ?? FALLBACK_COLOR)
        : (l.color ?? FALLBACK_COLOR);

    lineFeatures.push({
      type: "Feature",
      properties: { code: l.code, color, source: l.source },
      geometry: { type: "LineString", coordinates: l.geometry },
    });
  }

  // ---- Arrêts -------------------------------------------------------
  const stopFeatures: GeoJSON.Feature<GeoJSON.Point, { name: string; slug: string }>[] = [];

  for (const s of (stopsRes.data as StopRow[]) ?? []) {
    stopFeatures.push({
      type: "Feature",
      properties: { name: s.name, slug: s.slug },
      geometry: { type: "Point", coordinates: [s.lng, s.lat] },
    });
  }

  return {
    lines: { type: "FeatureCollection", features: lineFeatures },
    stops: { type: "FeatureCollection", features: stopFeatures },
  };
}

function emptyData(): BusLayerData {
  return {
    lines: { type: "FeatureCollection", features: [] },
    stops: { type: "FeatureCollection", features: [] },
  };
}
