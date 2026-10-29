import { supabase } from "./supabase";
import type { Hike } from "./types";

// La table nomme le départ start_lat/start_lng, le type Hike start_latitude/
// start_longitude : on renomme ici, à la lecture. Sans l'alias, la liste rendait
// un 400 (page /hikes vide) et la fiche perdait son lien carte, jusqu'au 29/10/2026.
const START = "start_latitude:start_lat, start_longitude:start_lng";

/**
 * Rubrique randonnées HORS LIGNE depuis le 29/10/2026 (audit demandé par François,
 * retrait choisi par Claude). Le lot du 08/04/2026 n'est pas publiable :
 * - 26 fiches sur 50 affichaient en description le refus d'un modèle (« I don't have
 *   reliable information about this trail... »), page et méta Google comprises ;
 * - les départs sont à 5-62 km des lieux réels (contrôle Nominatim : Ha 62 km,
 *   Agia Irini 59 km, Samaria 14 km), le lien carte enverrait des marcheurs ailleurs ;
 * - plusieurs sentiers n'existent pas (« Meteora » est en Thessalie, pas en Crète).
 * Rien n'est supprimé en base. Pages en 404, hors sitemap, hors auto-lien ; les liens
 * du menu, du pied de page et de la recherche ont été retirés (à remettre avec).
 * Repasser à true seulement avec des fiches sourcées (départ, description).
 */
export const HIKES_PUBLISHED = false;

export async function getAllHikes(): Promise<Hike[]> {
  const { data, error } = await supabase
    .from("hikes")
    .select(`slug, name_en, name_fr, name_de, name_el, image_url, difficulty, type, distance_km, elevation_gain_m, duration_hours, ${START}`)
    .order("name_en");

  if (error) throw error;
  return (data as Hike[]) || [];
}

export async function getHikeBySlug(slug: string): Promise<Hike | null> {
  if (!HIKES_PUBLISHED) return null;
  const { data, error } = await supabase
    .from("hikes")
    .select(`*, ${START}`)
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Hike;
}
