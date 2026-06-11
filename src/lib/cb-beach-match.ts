import { supabase } from "./supabase";
import type { Beach } from "./types";

// Field-observed beach attributes from cb_places (scraped dataset), matched to
// the `beaches` table by GPS proximity. 180/183 finder beaches have a match
// within 1.5 km (checked 11/06/2026).

export interface CbBeachAttrs {
  slug: string;
  rating: number | null;
  sea_surface: string | null;
  sand_type: string | null;
  depth: string | null;
  crowds: string | null;
  facilities: string | null;
  water_color: string | null;
  photos: string[] | null;
}

interface CbRow extends CbBeachAttrs {
  latitude: number;
  longitude: number;
}

const MATCH_KM = 1.5;

function haversineKm(latA: number, lngA: number, latB: number, lngB: number): number {
  const R = 6371;
  const dLat = ((latB - latA) * Math.PI) / 180;
  const dLng = ((lngB - lngA) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((latA * Math.PI) / 180) * Math.cos((latB * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function fetchCbBeaches(): Promise<CbRow[]> {
  try {
    const { data, error } = await supabase
      .from("cb_places")
      .select("slug, latitude, longitude, rating, sea_surface, sand_type, depth, crowds, facilities, water_color, photos")
      .eq("place_type", "beach")
      .not("latitude", "is", null)
      .limit(1000);
    if (error) return [];
    return (data as unknown as CbRow[]) ?? [];
  } catch {
    return [];
  }
}

/** Map beach slug -> nearest cb_places beach attributes (within 1.5 km). */
export function matchCbBeaches(beaches: Beach[], cbRows: CbRow[]): Map<string, CbBeachAttrs> {
  const out = new Map<string, CbBeachAttrs>();
  for (const b of beaches) {
    if (b.latitude == null || b.longitude == null) continue;
    let best: CbRow | null = null;
    let bestKm = MATCH_KM;
    for (const c of cbRows) {
      // cheap prefilter: ~1.5km in degrees
      if (Math.abs(c.latitude - b.latitude) > 0.02 || Math.abs(c.longitude - b.longitude) > 0.02) continue;
      const km = haversineKm(b.latitude, b.longitude, c.latitude, c.longitude);
      if (km <= bestKm) {
        bestKm = km;
        best = c;
      }
    }
    if (best) out.set(b.slug, best);
  }
  return out;
}

/**
 * Shelter factor from the observed typical sea state of the bay.
 * <1 dampens the wind/wave chop penalty (bay known usually calm),
 * >1 amplifies it (bay known wavy). 1 when unknown.
 */
export function shelterFactor(seaSurface: string | null | undefined): number {
  if (!seaSurface) return 1;
  const s = seaSurface.toLowerCase();
  const calm = s.includes("calm");
  const veryWavy = s.includes("very wavy");
  const wavy = !veryWavy && s.includes("wavy");
  if (calm && (wavy || veryWavy)) return 1;
  if (veryWavy) return 1.25;
  if (wavy) return 1.1;
  if (calm) return 0.7;
  return 1;
}
