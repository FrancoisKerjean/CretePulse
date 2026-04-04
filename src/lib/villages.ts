import { supabase } from "./supabase";
import type { Village } from "./types";

export async function getAllVillages(): Promise<Village[]> {
  const { data, error } = await supabase
    .from("villages")
    .select("slug, name_en, name_fr, name_de, name_el, image_url, period, municipality, region, altitude_m, population, latitude, longitude")
    .order("name_en");

  if (error) throw error;
  return (data as Village[]) || [];
}

export async function getVillageBySlug(slug: string): Promise<Village | null> {
  const { data, error } = await supabase
    .from("villages")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Village;
}

export async function getVillagesByRegion(region: string): Promise<Village[]> {
  const { data, error } = await supabase
    .from("villages")
    .select("slug, name_en, name_fr, name_de, name_el, image_url, period, municipality, region, altitude_m, population, latitude, longitude")
    .eq("region", region)
    .order("name_en");

  if (error) return [];
  return (data as Village[]) || [];
}

export async function getNearbyVillages(lat: number, lng: number, excludeSlug: string, limit = 4): Promise<Village[]> {
  // Bounding box filter (~50km radius) to avoid fetching entire table
  const delta = 0.5;
  const { data } = await supabase
    .from("villages")
    .select("slug, name_en, name_fr, name_de, name_el, image_url, region, latitude, longitude")
    .neq("slug", excludeSlug)
    .gte("latitude", lat - delta)
    .lte("latitude", lat + delta)
    .gte("longitude", lng - delta)
    .lte("longitude", lng + delta)
    .limit(20);

  if (!data) return [];

  return (data as Village[])
    .map((v) => ({
      ...v,
      _dist: Math.sqrt(
        Math.pow((v.latitude - lat) * 111, 2) +
        Math.pow((v.longitude - lng) * 85, 2)
      ),
    }))
    .sort((a, b) => a._dist - b._dist)
    .slice(0, limit);
}
