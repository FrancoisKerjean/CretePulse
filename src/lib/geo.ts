// Géo pure, zéro I/O : haversine + tri par distance générique.
// Importable client (useGeoPosition, NearMeClient), serveur et node (check-geo.mjs).
// Spec : docs/superpowers/specs/2026-06-12-near-me-design.md

export type GeoPos = { lat: number; lon: number };

export function haversineKm(a: [number, number], b: [number, number]): number {
  const [lat1, lng1] = a.map((d) => (d * Math.PI) / 180);
  const [lat2, lng2] = b.map((d) => (d * Math.PI) / 180);
  const h =
    Math.sin((lat2 - lat1) / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Trie items par distance croissante à pos. Les items sans coords sont exclus. */
export function nearestBy<T>(
  items: T[],
  getCoords: (t: T) => [number, number] | null,
  pos: GeoPos,
  limit = 6,
): Array<T & { km: number }> {
  const out: Array<T & { km: number }> = [];
  for (const it of items) {
    const c = getCoords(it);
    if (!c) continue;
    out.push({ ...it, km: haversineKm(c, [pos.lat, pos.lon]) });
  }
  out.sort((a, b) => a.km - b.km);
  return out.slice(0, limit);
}

// Centroïde approx. de la Crète + rayon "tu es sur l'île"
export const CRETE_CENTER: [number, number] = [35.24, 24.9];
export const ON_CRETE_RADIUS_KM = 150;

export function isOnCrete(pos: GeoPos): boolean {
  return haversineKm(CRETE_CENTER, [pos.lat, pos.lon]) <= ON_CRETE_RADIUS_KM;
}

/**
 * Anneau fermé approximant un cercle géographique de `radiusKm` autour de `center`,
 * sous forme de coordonnées [lon, lat] (ordre GeoJSON). Premier point = dernier point.
 * Approximation équirectangulaire (suffisante à l'échelle ~10 km en Crète).
 * Usage : géométrie d'un Polygon GeoJSON pour le disque "autour de moi".
 */
export function circlePolygon(
  center: GeoPos,
  radiusKm: number,
  segments = 64,
): Array<[number, number]> {
  const dLat = radiusKm / 111.32;
  const dLon = radiusKm / (111.32 * Math.cos((center.lat * Math.PI) / 180));
  const ring: Array<[number, number]> = [];
  for (let i = 0; i < segments; i++) {
    const theta = (2 * Math.PI * i) / segments;
    ring.push([center.lon + dLon * Math.cos(theta), center.lat + dLat * Math.sin(theta)]);
  }
  ring.push(ring[0]); // fermer l'anneau
  return ring;
}
