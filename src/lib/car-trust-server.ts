// Lecture des notes Google des loueurs (colonnes car_partners.google_*, relevées
// chaque semaine par le cron google-ratings). Lecture seule.
import { supabaseAdmin } from "./supabase-admin";
import type { RatedPartner } from "./car-trust";

export interface PartnerRating extends RatedPartner {
  id: number;
  name: string;
  google_place_id: string | null;
  google_maps_url: string | null;
  /** Zones servies : la page de location en tire ses vitrines par zone. */
  zone_ids: string[] | null;
}

const COLS = "id, name, google_rating, google_rating_count, google_place_id, google_maps_url, zone_ids";

/**
 * Notes des loueurs : ceux qui sont nommés, sinon tous les loueurs actifs.
 * Une lecture refusée rend [] : le bandeau de notes disparaît, la page reste.
 */
export async function partnerRatings(ids?: number[]): Promise<PartnerRating[]> {
  if (ids && ids.length === 0) return [];
  try {
    const q = supabaseAdmin.from("car_partners").select(COLS);
    const { data, error } = await (ids ? q.in("id", ids) : q.eq("active", true));
    if (error) {
      console.error("[car-trust] lecture des notes refusée:", error.message);
      return [];
    }
    return (data ?? []) as PartnerRating[];
  } catch (e) {
    console.error("[car-trust] lecture des notes (exception):", e instanceof Error ? e.message : e);
    return [];
  }
}
