import { supabase } from "./supabase";
import type { BentoTiles } from "./bento-tiles";
import { getBathingWaterQuality, type WaterQuality } from "./bathing-water";

// Places scraped from cretanbeaches.com (cb_places table).
// List payload excludes `description` (heavy); the explorer drawer
// fetches the full row on demand via getCbPlaceBySlug.

export interface CbPlaceListItem {
  slug: string;
  name: string;
  place_type: string;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  prefecture: string | null;
  water_color: string | null;
  sand_type: string | null;
  depth: string | null;
  sea_surface: string | null;
  crowds: string | null;
  facilities: string | null;
  accessibility: string | null;
  photos: string[] | null;
  photo_count: number;
  // Classement EU 2025 de l'eau de baignade (plages avec point de mesure EEA proche), sinon null.
  water_quality: WaterQuality | null;
}

// Rattache le classement EEA aux plages uniquement (les zones de baignade EEA
// sont des plages ; un lieu intérieur n'a pas de mesure).
function withWaterQuality<T extends { place_type: string; latitude: number | null; longitude: number | null; name: string }>(
  p: T,
): T & { water_quality: WaterQuality | null } {
  const water_quality =
    p.place_type === "beach" ? getBathingWaterQuality(p.latitude, p.longitude, p.name) : null;
  return { ...p, water_quality };
}

export interface CbPlace extends CbPlaceListItem {
  meta_description: string | null;
  description: string | null;
  other_info: string | null;
  source_url: string | null;
  bento_tiles: BentoTiles | null;
}

const LIST_FIELDS =
  "slug, name, place_type, category, latitude, longitude, rating, prefecture, water_color, sand_type, depth, sea_surface, crowds, facilities, accessibility, photos, photo_count";

type CbPlaceListRaw = Omit<CbPlaceListItem, "water_quality">;
type CbPlaceRaw = Omit<CbPlace, "water_quality">;

export async function getAllCbPlaces(): Promise<CbPlaceListItem[]> {
  // PostgREST caps responses at 1000 rows by default: page through.
  const all: CbPlaceListItem[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("cb_places")
      .select(LIST_FIELDS)
      .order("slug")
      .range(from, from + 999);
    if (error) throw error;
    const batch = (data as unknown as CbPlaceListRaw[]) || [];
    all.push(...batch.map(withWaterQuality));
    if (batch.length < 1000) break;
  }
  return all;
}

// Slim variant for /explore: trims photos array to the first entry only.
// The drawer fetches the full row via getCbPlaceBySlug (select *) on demand.
// Reduces RSC payload by ~50–60% (photos[] is the dominant field by size).
export async function getAllCbPlacesSlim(): Promise<CbPlaceListItem[]> {
  const places = await getAllCbPlaces();
  return places.map((p) => ({
    ...p,
    photos: p.photos && p.photos.length > 0 ? [p.photos[0]] : p.photos,
  }));
}

export async function getCbPlaceBySlug(slug: string): Promise<CbPlace | null> {
  const { data, error } = await supabase
    .from("cb_places")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) return null;
  return withWaterQuality(data as unknown as CbPlaceRaw);
}
