import { supabase } from "./supabase";

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
}

export interface CbPlace extends CbPlaceListItem {
  meta_description: string | null;
  description: string | null;
  other_info: string | null;
  source_url: string | null;
}

const LIST_FIELDS =
  "slug, name, place_type, category, latitude, longitude, rating, prefecture, water_color, sand_type, depth, sea_surface, crowds, facilities, accessibility, photos, photo_count";

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
    const batch = (data as unknown as CbPlaceListItem[]) || [];
    all.push(...batch);
    if (batch.length < 1000) break;
  }
  return all;
}

export async function getCbPlaceBySlug(slug: string): Promise<CbPlace | null> {
  const { data, error } = await supabase
    .from("cb_places")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) return null;
  return data as unknown as CbPlace;
}

// 3 photos de plages très bien notées pour le teaser /match de la home.
export async function getMatchTeaserPhotos(): Promise<string[]> {
  const { data, error } = await supabase
    .from("cb_places")
    .select("photos")
    .eq("place_type", "beach")
    .gt("photo_count", 0)
    .gte("rating", 4.5)
    .order("rating", { ascending: false })
    .limit(3);
  if (error) return [];
  return ((data as { photos: string[] | null }[]) || [])
    .map((r) => r.photos?.[0])
    .filter((u): u is string => Boolean(u));
}
