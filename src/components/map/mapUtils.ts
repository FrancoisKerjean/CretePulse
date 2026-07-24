// Utilitaires géo purs pour la carte interactive (aucune dépendance MapLibre).

export interface MapPOI {
  name: string;
  type: "beach" | "village" | "food" | "hike";
  lat: number;
  lng: number;
  slug: string;
  extra?: string;
  /** Valeur de sous-filtre : beach.type, village.period, food.type, hike.difficulty */
  sub?: string;
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/**
 * Polygone GeoJSON approximant un cercle géodésique.
 * Suffisant pour des rayons temps-de-route indicatifs (routes sinueuses en Crète :
 * on approxime 45 km/h de moyenne, la précision métrique n'a pas de sens ici).
 */
export function circlePolygon(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  steps = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const latRad = (centerLat * Math.PI) / 180;
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const dLat = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI) * Math.sin(theta);
    const dLng =
      ((radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI) * Math.cos(theta)) / Math.cos(latRad);
    coords.push([centerLng + dLng, centerLat + dLat]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

/** Vitesse moyenne routière retenue pour les rayons temps-de-route en Crète. */
export const AVG_ROAD_SPEED_KMH = 45;

export function driveMinutesToKm(minutes: number): number {
  return (AVG_ROAD_SPEED_KMH * minutes) / 60;
}

/** Normalise pour la recherche : minuscules + accents/diacritiques retirés. */
export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function poisToGeoJSON(pois: MapPOI[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: pois.map((p) => ({
      type: "Feature" as const,
      properties: {
        name: p.name,
        type: p.type,
        slug: p.slug,
        extra: p.extra || "",
        sub: p.sub || "",
      },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
    })),
  };
}

export const TYPE_TO_PATH: Record<MapPOI["type"], string> = {
  beach: "beaches",
  village: "villages",
  food: "food",
  hike: "hikes",
};
