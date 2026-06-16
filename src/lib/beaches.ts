import { supabase } from "./supabase";
import type { Beach } from "./types";

// Ligne cb_places allégée pour l'enrichissement des listes.
interface CbLite { slug: string; rating: number | null; photos: string[] | null; }

/** Reporte rating + 1re photo de cb_places sur chaque plage via cb_slug (pur, testable). */
export function mergeCbIntoBeaches(beaches: Beach[], cbRows: CbLite[]): Beach[] {
  const bySlug = new Map(cbRows.map((c) => [c.slug, c]));
  return beaches.map((b) => {
    const cb = b.cb_slug ? bySlug.get(b.cb_slug) : undefined;
    return {
      ...b,
      cb_rating: cb?.rating ?? null,
      cb_photo: cb?.photos?.[0] ?? null,
    };
  });
}

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

/**
 * Lieux présents dans la table `beaches` qui ne sont PAS des plages de baignade
 * (mauvaise catégorisation à la source). La table n'a pas de colonne "catégorie"
 * — `type` décrit seulement le revêtement (sand/gravel/pebble…) — donc on les
 * exclut explicitement ici, au point de lecture, pour qu'ils ne polluent ni les
 * listes de plages ni le moteur "où se baigner aujourd'hui".
 *
 * - `aptera` : site archéologique sur les hauteurs de la baie de Souda (à
 *   l'intérieur des terres), pas une plage. Il ressortait en reco de baignade
 *   (Reel + carrousel Instagram) avec une photo de ferry.
 */
const NON_BEACH_SLUGS = new Set<string>(["aptera"]);

/** True si le slug correspond à une vraie plage (pas un lieu mal catégorisé). */
export function isSwimmableBeach(slug: string): boolean {
  return !NON_BEACH_SLUGS.has(slug);
}

export async function getAllBeaches(): Promise<Beach[]> {
  const { data, error } = await supabase
    .from("beaches")
    .select("slug, name_en, name_fr, name_de, name_el, image_url, region, type, parking, snorkeling, kids_friendly, latitude, longitude, cb_slug")
    .order("name_en");

  if (error) throw error;
  const beaches = ((data as Beach[]) || [])
    .filter((b) => isSwimmableBeach(b.slug))
    .map(sanitizeBeach);

  const cbSlugs = beaches.map((b) => b.cb_slug).filter((s): s is string => Boolean(s));
  if (cbSlugs.length === 0) return beaches;

  const { data: cb } = await supabase
    .from("cb_places")
    .select("slug, rating, photos")
    .in("slug", cbSlugs);

  return mergeCbIntoBeaches(beaches, (cb as CbLite[]) || []);
}

export async function getBeachBySlug(slug: string): Promise<Beach | null> {
  if (!isSwimmableBeach(slug)) return null;

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
  return ((data as Beach[]) || [])
    .filter((b) => isSwimmableBeach(b.slug))
    .map(sanitizeBeach);
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
    .filter((b) => isSwimmableBeach(b.slug))
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
