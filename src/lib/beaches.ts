import { supabase } from "./supabase";
import type { Beach } from "./types";

// Wikipedia Commons scraper sometimes returns PDF preview thumbnails
// (rendered as .jpg but with `.pdf` segment in the URL). These look broken
// and damage perceived page quality. Filter at read time to stay defensive
// even if the source data still contains noise.
export function sanitizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.includes(".pdf")) return null;
  if (lower.includes(".djvu")) return null;
  if (lower.includes("page1-")) return null;
  return url;
}

function sanitizeBeach<T extends { image_url?: string | null }>(b: T): T {
  return { ...b, image_url: sanitizeImageUrl(b.image_url) };
}

export async function getAllBeaches(): Promise<Beach[]> {
  const { data, error } = await supabase
    .from("beaches")
    .select("slug, name_en, name_fr, name_de, name_el, image_url, region, type, parking, snorkeling, kids_friendly, latitude, longitude")
    .order("name_en");

  if (error) throw error;
  return ((data as Beach[]) || []).map(sanitizeBeach);
}

export async function getBeachBySlug(slug: string): Promise<Beach | null> {
  const { data, error } = await supabase
    .from("beaches")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return sanitizeBeach(data as Beach);
}

export async function getBeachesByRegion(region: string): Promise<Beach[]> {
  const { data, error } = await supabase
    .from("beaches")
    .select("slug, name_en, name_fr, name_de, name_el, image_url, region, type, parking, snorkeling, kids_friendly, latitude, longitude")
    .eq("region", region)
    .order("name_en");

  if (error) return [];
  return ((data as Beach[]) || []).map(sanitizeBeach);
}

export async function getNearbyBeaches(lat: number, lng: number, excludeSlug: string, limit = 4): Promise<Beach[]> {
  // Bounding box filter (~50km radius) to avoid fetching entire table
  const delta = 0.5; // ~55km at Crete's latitude
  const { data } = await supabase
    .from("beaches")
    .select("slug, name_en, name_fr, name_de, name_el, image_url, region, type, latitude, longitude")
    .neq("slug", excludeSlug)
    .gte("latitude", lat - delta)
    .lte("latitude", lat + delta)
    .gte("longitude", lng - delta)
    .lte("longitude", lng + delta)
    .limit(20);

  if (!data) return [];

  return (data as Beach[])
    .map(sanitizeBeach)
    .map((b) => ({
      ...b,
      _dist: Math.sqrt(
        Math.pow((b.latitude - lat) * 111, 2) +
        Math.pow((b.longitude - lng) * 85, 2)
      ),
    }))
    .sort((a, b) => a._dist - b._dist)
    .slice(0, limit);
}
