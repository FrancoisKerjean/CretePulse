// Logique pure de mise en correspondance beaches <-> cb_places.
// Aucune I/O : testable et réutilisée par le script de matching.

const R_EARTH_M = 6_371_000;
const HIGH_M = 400;      // candidat évident
const MAX_M = 1500;      // au-delà : pas de match
const RATIO = 2;         // second > RATIO x best => best non ambigu

export function haversineM(latA: number, lngA: number, latB: number, lngB: number): number {
  const dLat = ((latB - latA) * Math.PI) / 180;
  const dLng = ((lngB - lngA) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((latA * Math.PI) / 180) * Math.cos((latB * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_M * Math.asin(Math.sqrt(a));
}

export type Confidence = "high" | "review" | "none";

export function classifyMatch(bestM: number | null, secondM: number | null): Confidence {
  if (bestM == null || bestM > MAX_M) return "none";
  const unique = secondM == null || secondM > RATIO * bestM;
  if (bestM <= HIGH_M && unique) return "high";
  return "review";
}

export interface GeoPoint { slug: string; latitude: number | null; longitude: number | null; }
export interface MatchResult {
  beachSlug: string;
  cbSlug: string | null;
  distanceM: number | null;
  secondM: number | null;
  confidence: Confidence;
}

export function matchBeachToCb(
  beach: { slug: string; latitude: number | null; longitude: number | null },
  candidates: GeoPoint[],
): MatchResult {
  let best: { slug: string; m: number } | null = null;
  let second: { slug: string; m: number } | null = null;

  if (beach.latitude != null && beach.longitude != null) {
    for (const c of candidates) {
      if (c.latitude == null || c.longitude == null) continue;
      const m = haversineM(beach.latitude, beach.longitude, c.latitude, c.longitude);
      if (best == null || m < best.m) {
        second = best;
        best = { slug: c.slug, m };
      } else if (second == null || m < second.m) {
        second = { slug: c.slug, m };
      }
    }
  }

  const confidence = classifyMatch(best?.m ?? null, second?.m ?? null);
  return {
    beachSlug: beach.slug,
    cbSlug: confidence === "none" ? null : (best?.slug ?? null),
    distanceM: best ? Math.round(best.m) : null,
    secondM: second ? Math.round(second.m) : null,
    confidence,
  };
}
