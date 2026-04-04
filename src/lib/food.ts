import { supabase } from "./supabase";
import type { FoodPlace } from "./types";

export async function getAllFoodPlaces(): Promise<FoodPlace[]> {
  const { data, error } = await supabase
    .from("food_places")
    .select("slug, name, image_url, type, region, description_en, description_fr, description_de, description_el, rating, review_count, cuisine, price_range, latitude, longitude")
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) throw error;
  return (data as FoodPlace[]) || [];
}

export async function getFoodByRegionAndType(
  region?: string,
  type?: string,
  limit = 30
): Promise<FoodPlace[]> {
  let query = supabase
    .from("food_places")
    .select("slug, name, image_url, type, region, description_en, description_fr, description_de, description_el, rating, review_count, cuisine, price_range")
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (region) query = query.eq("region", region);
  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) return [];
  return (data as FoodPlace[]) || [];
}

export async function getFoodBySlug(slug: string): Promise<FoodPlace | null> {
  const { data, error } = await supabase
    .from("food_places")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as FoodPlace;
}

export async function getFoodByRegion(region: string): Promise<FoodPlace[]> {
  const { data, error } = await supabase
    .from("food_places")
    .select("slug, name, image_url, type, region, description_en, description_fr, description_de, description_el, rating, review_count, cuisine, price_range")
    .eq("region", region)
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(50);

  if (error) return [];
  return (data as FoodPlace[]) || [];
}

export async function getNearbyFoodPlaces(region: string, excludeSlug: string, limit = 4): Promise<FoodPlace[]> {
  const { data } = await supabase
    .from("food_places")
    .select("slug, name, image_url, type, region, rating, cuisine")
    .eq("region", region)
    .neq("slug", excludeSlug)
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (!data) return [];
  return data as FoodPlace[];
}
