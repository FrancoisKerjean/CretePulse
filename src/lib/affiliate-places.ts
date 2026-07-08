// Pont de données : affiliés actifs géolocalisés → format consommé par ExploreView.
// Lit la table `affiliates` côté serveur (Next.js RSC / page ISR 24h).
// Exclut : status ≠ 'active', latitude/longitude null, category = 'car_rental'
// (les loueurs de voitures passent par le rail Car Rental Direct, pas par la carte).
import { supabase } from "./supabase";
import type { CbPlaceListItem } from "./cb-places";

/** Descriptif court localisé de l'affilié (en/fr/de/el). */
export type AffiliateDescription = { en?: string; fr?: string; de?: string; el?: string } | null;

export type AffiliatePlace = CbPlaceListItem & {
  __sponsorUrl: string;
  /** Description localisée du partenaire (null quand non encore enrichie). */
  __affiliateDescription: AffiliateDescription;
};

interface AffiliateRow {
  slug: string;
  name: string;
  category: string;
  area: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  description: AffiliateDescription;
}

/**
 * Returns all active, geolocated, non-car_rental affiliates shaped as
 * the same object ExploreView's sponsorItems use, so they plug into the
 * existing amber-pin + gating + drawer rendering with zero new code paths.
 *
 * Slug convention : `affiliate:<slug>` (distinct from `sponsor:<id>`).
 * CTA URL        : `https://crete.direct/go/<slug>` (tracked redirect).
 */
export async function getAffiliatePlaces(): Promise<AffiliatePlace[]> {
  const { data, error } = await supabase
    .from("affiliates")
    .select("slug, name, category, area, latitude, longitude, photo_url, description")
    .eq("status", "active")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .neq("category", "car_rental");
  // PostgREST cap: 1000 rows; the affiliates table is expected to stay well under this.

  if (error) {
    console.error("[affiliate-places] Supabase error:", error.message);
    return [];
  }

  const rows = (data as unknown as AffiliateRow[]) ?? [];

  return rows.map(mapAffiliateRow);
}

/** Pure mapping: one DB row → one AffiliatePlace (no Supabase call). Exported for testing. */
export function mapAffiliateRow(row: AffiliateRow): AffiliatePlace {
  return {
    slug: `affiliate:${row.slug}`,
    name: row.name,
    place_type: "sponsor",           // reuse amber marker + gating (ExploreView keys off this)
    category: row.category ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    rating: null,
    prefecture: row.area ?? null,
    water_color: null,
    sand_type: null,
    depth: null,
    sea_surface: null,
    crowds: null,
    facilities: null,
    accessibility: null,
    photos: row.photo_url ? [row.photo_url] : [],
    photo_count: row.photo_url ? 1 : 0,
    water_quality: null,
    __sponsorUrl: `https://crete.direct/go/${row.slug}`,
    __affiliateDescription: row.description ?? null,
  };
}

/**
 * Descriptif localisé de l'affilié : locale → fallback 'en' → null.
 * Miroir de sponsorDescription() dans sponsored-places.ts.
 */
export function affiliateDescription(place: AffiliatePlace, locale: string): string | null {
  const desc = place.__affiliateDescription;
  if (!desc) return null;
  return (desc as Record<string, string | undefined>)[locale] || desc.en || null;
}

/** True when a map-item slug was injected from the affiliates table. */
export function isAffiliateSlug(slug: string): boolean {
  return slug.startsWith("affiliate:");
}

/** Localised "Partner" badge label (distinct from "Sponsored"). */
const PARTNER_LABEL: Record<string, string> = {
  en: "Partner",
  fr: "Partenaire",
  de: "Partner",
  el: "Συνεργάτης",
};
export function partnerLabel(locale: string): string {
  return PARTNER_LABEL[locale] ?? PARTNER_LABEL.en;
}
