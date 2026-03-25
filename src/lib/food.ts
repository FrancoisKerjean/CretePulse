import { supabase } from "./supabase";
import type { FoodPlace } from "./types";

export async function getAllFoodPlaces(): Promise<FoodPlace[]> {
  const { data, error } = await supabase
    .from("food_places")
    .select("*")
    .not("cuisine", "is", null)
    .neq("cuisine", "")
    .order("name")
    .limit(100);

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
    .select("*")
    .not("cuisine", "is", null)
    .neq("cuisine", "")
    .order("name")
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
    .select("*")
    .eq("region", region)
    .order("name");

  if (error) return [];
  return (data as FoodPlace[]) || [];
}

export async function getNearbyFoodPlaces(region: string, excludeSlug: string, limit = 4): Promise<FoodPlace[]> {
  const { data } = await supabase
    .from("food_places")
    .select("*")
    .eq("region", region)
    .neq("slug", excludeSlug)
    .order("name")
    .limit(limit);

  if (!data) return [];
  return data as FoodPlace[];
}
