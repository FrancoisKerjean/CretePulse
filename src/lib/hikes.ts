import { supabase } from "./supabase";
import type { Hike } from "./types";

// La table nomme le départ start_lat/start_lng, le type Hike start_latitude/
// start_longitude : on renomme ici, à la lecture. Sans l'alias, la liste rendait
// un 400 (page /hikes vide) et la fiche perdait son lien carte, jusqu'au 29/10/2026.
const START = "start_latitude:start_lat, start_longitude:start_lng";

export async function getAllHikes(): Promise<Hike[]> {
  const { data, error } = await supabase
    .from("hikes")
    .select(`slug, name_en, name_fr, name_de, name_el, image_url, difficulty, type, distance_km, elevation_gain_m, duration_hours, ${START}`)
    .order("name_en");

  if (error) throw error;
  return (data as Hike[]) || [];
}

export async function getHikeBySlug(slug: string): Promise<Hike | null> {
  const { data, error } = await supabase
    .from("hikes")
    .select(`*, ${START}`)
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Hike;
}
