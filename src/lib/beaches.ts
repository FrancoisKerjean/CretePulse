import { supabase } from "./supabase";
import type { Beach } from "./types";

export async function getAllBeaches(): Promise<Beach[]> {
  const { data, error } = await supabase
    .from("beaches")
    .select("*")
    .order("name_en");

  if (error) throw error;
  return (data as Beach[]) || [];
}

export async function getBeachBySlug(slug: string): Promise<Beach | null> {
  const { data, error } = await supabase
    .from("beaches")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Beach;
}

export async function getBeachesByRegion(region: string): Promise<Beach[]> {
  const { data, error } = await supabase
    .from("beaches")
    .select("*")
    .eq("region", region)
    .order("name_en");

  if (error) return [];
  return (data as Beach[]) || [];
}

export async function getNearbyBeaches(lat: number, lng: number, excludeSlug: string, limit = 4): Promise<Beach[]> {
  // Simple distance approximation - fetch all and sort client-side
  // (Supabase free tier doesn't have PostGIS)
  const { data } = await supabase
    .from("beaches")
    .select("*")
    .neq("slug", excludeSlug);

  if (!data) return [];

  return (data as Beach[])
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
