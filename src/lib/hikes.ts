import { supabase } from "./supabase";
import type { Hike } from "./types";

export async function getAllHikes(): Promise<Hike[]> {
  const { data, error } = await supabase
    .from("hikes")
    .select("*")
    .order("name_en");

  if (error) throw error;
  return (data as Hike[]) || [];
}

export async function getHikeBySlug(slug: string): Promise<Hike | null> {
  const { data, error } = await supabase
    .from("hikes")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Hike;
}
