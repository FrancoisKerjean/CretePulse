import { supabase } from "./supabase";
import { CRETE_NEIGHBOURHOODS } from "./airbnb-mappings";

/**
 * Aggregated stats for a Crete neighbourhood (Greek municipality)
 * computed from Inside Airbnb snapshot data stored in `airbnb_listings`.
 */
export interface NeighbourhoodStats {
  greek: string;
  listings: number;
  active_listings: number;       // listings with at least 1 review
  unique_hosts: number;
  superhost_count: number;
  superhost_pct: number;
  ama_license_count: number;
  ama_license_pct: number;
  avg_price: number | null;
  median_price: number | null;
  p25_price: number | null;
  p75_price: number | null;
  p95_price: number | null;
  avg_occupancy_days: number | null;
  avg_revenue_eur: number | null;
  avg_rating: number | null;
  multi_host_listings: number;   // listings owned by hosts with >=3 properties
  multi_host_pct: number;
  snapshot_date: string | null;  // ISO date string
}

export interface PropertyTypeBreakdown {
  property_type: string;
  count: number;
  avg_price: number | null;
  avg_rating: number | null;
}

const FILTER_PRICE_MIN = 30;
const FILTER_PRICE_MAX = 2000;

/**
 * Fetch all rows for a neighbourhood and reduce them client-side.
 * PostgREST does not expose percentile_cont, so we compute the stats
 * here. Volumes per neighbourhood (50-6500 rows) make this trivial.
 */
export async function getNeighbourhoodStats(
  greek: string,
): Promise<NeighbourhoodStats | null> {
  const { data, error } = await supabase
    .from("airbnb_listings")
    .select(
      "id, host_id, host_is_superhost, host_listings_count, " +
      "price, estimated_occupancy_l365d, estimated_revenue_l365d, " +
      "review_scores_rating, license, number_of_reviews, snapshot_date",
    )
    .eq("region", "crete")
    .eq("neighbourhood", greek);

  if (error) {
    console.error("getNeighbourhoodStats", error);
    return null;
  }
  if (!data || data.length === 0) return null;

  type Row = {
    id: number;
    host_id: number | null;
    host_is_superhost: boolean | null;
    host_listings_count: number | null;
    price: number | string | null;
    estimated_occupancy_l365d: number | null;
    estimated_revenue_l365d: number | string | null;
    review_scores_rating: number | string | null;
    license: string | null;
    number_of_reviews: number | null;
    snapshot_date: string | null;
  };
  const rows = data as unknown as Row[];
  const listings = rows.length;
  const activeRows = rows.filter(r => (r.number_of_reviews ?? 0) > 0);
  const uniqueHosts = new Set(rows.map(r => r.host_id).filter(Boolean)).size;
  const superhost = rows.filter(r => r.host_is_superhost).length;
  const amaLicense = rows.filter(
    r => r.license != null && r.license.trim().length > 0,
  ).length;
  const multiHost = rows.filter(
    r => (r.host_listings_count ?? 0) >= 3,
  ).length;

  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const validPrices = rows
    .map(r => num(r.price))
    .filter((v): v is number =>
      v !== null && v >= FILTER_PRICE_MIN && v <= FILTER_PRICE_MAX,
    )
    .sort((a, b) => a - b);
  const validOcc = rows
    .map(r => num(r.estimated_occupancy_l365d))
    .filter((v): v is number => v !== null && v >= 0 && v <= 365);
  const validRev = rows
    .map(r => num(r.estimated_revenue_l365d))
    .filter((v): v is number => v !== null && v >= 0);
  const validRating = rows
    .map(r => num(r.review_scores_rating))
    .filter((v): v is number => v !== null && v > 0);

  const pct = (sorted: number[], q: number): number | null => {
    if (sorted.length === 0) return null;
    const idx = Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)));
    return sorted[idx];
  };
  const mean = (arr: number[]): number | null =>
    arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

  const snapshotDate = rows
    .map(r => r.snapshot_date)
    .filter((v): v is string => !!v)
    .sort()
    .pop() ?? null;

  return {
    greek,
    listings,
    active_listings: activeRows.length,
    unique_hosts: uniqueHosts,
    superhost_count: superhost,
    superhost_pct: listings ? (superhost / listings) * 100 : 0,
    ama_license_count: amaLicense,
    ama_license_pct: listings ? (amaLicense / listings) * 100 : 0,
    avg_price: mean(validPrices),
    median_price: pct(validPrices, 0.5),
    p25_price: pct(validPrices, 0.25),
    p75_price: pct(validPrices, 0.75),
    p95_price: pct(validPrices, 0.95),
    avg_occupancy_days: mean(validOcc),
    avg_revenue_eur: mean(validRev),
    avg_rating: mean(validRating),
    multi_host_listings: multiHost,
    multi_host_pct: listings ? (multiHost / listings) * 100 : 0,
    snapshot_date: snapshotDate,
  };
}

/**
 * Top property types in a neighbourhood, ordered by listing count.
 */
export async function getNeighbourhoodPropertyTypes(
  greek: string,
  limit = 6,
): Promise<PropertyTypeBreakdown[]> {
  const { data, error } = await supabase
    .from("airbnb_listings")
    .select("property_type, price, review_scores_rating")
    .eq("region", "crete")
    .eq("neighbourhood", greek)
    .not("property_type", "is", null);

  if (error || !data) return [];

  type Row = {
    property_type: string;
    price: number | string | null;
    review_scores_rating: number | string | null;
  };
  const rows = data as unknown as Row[];
  const buckets = new Map<string, { prices: number[]; ratings: number[] }>();
  for (const r of rows) {
    const t = r.property_type;
    if (!buckets.has(t)) buckets.set(t, { prices: [], ratings: [] });
    const bucket = buckets.get(t)!;
    const p = typeof r.price === "number" ? r.price : Number(r.price);
    const rt = typeof r.review_scores_rating === "number"
      ? r.review_scores_rating
      : Number(r.review_scores_rating);
    if (Number.isFinite(p) && p >= FILTER_PRICE_MIN && p <= FILTER_PRICE_MAX) {
      bucket.prices.push(p);
    }
    if (Number.isFinite(rt) && rt > 0) bucket.ratings.push(rt);
  }
  const out: PropertyTypeBreakdown[] = [];
  buckets.forEach((b, t) => {
    out.push({
      property_type: t,
      count: rows.filter(r => r.property_type === t).length,
      avg_price: b.prices.length
        ? b.prices.reduce((a, c) => a + c, 0) / b.prices.length
        : null,
      avg_rating: b.ratings.length
        ? b.ratings.reduce((a, c) => a + c, 0) / b.ratings.length
        : null,
    });
  });
  return out.sort((a, b) => b.count - a.count).slice(0, limit);
}

/**
 * Stats for the whole island, used as a reference baseline on each page.
 */
export async function getCreteOverall(): Promise<{
  listings: number;
  avg_price: number | null;
  avg_occupancy_days: number | null;
  avg_revenue_eur: number | null;
} | null> {
  const { data, error } = await supabase
    .from("airbnb_listings")
    .select("price, estimated_occupancy_l365d, estimated_revenue_l365d")
    .eq("region", "crete");
  if (error || !data) return null;

  type Row = {
    price: number | string | null;
    estimated_occupancy_l365d: number | null;
    estimated_revenue_l365d: number | string | null;
  };
  const rows = data as unknown as Row[];

  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const validPrices = rows
    .map(r => num(r.price))
    .filter((v): v is number =>
      v !== null && v >= FILTER_PRICE_MIN && v <= FILTER_PRICE_MAX,
    );
  const validOcc = rows
    .map(r => num(r.estimated_occupancy_l365d))
    .filter((v): v is number => v !== null);
  const validRev = rows
    .map(r => num(r.estimated_revenue_l365d))
    .filter((v): v is number => v !== null);

  const mean = (arr: number[]): number | null =>
    arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    listings: rows.length,
    avg_price: mean(validPrices),
    avg_occupancy_days: mean(validOcc),
    avg_revenue_eur: mean(validRev),
  };
}

/**
 * Sibling neighbourhoods in the same region (excluding `currentSlug`).
 */
export function getSiblingNeighbourhoods(currentSlug: string) {
  const current = CRETE_NEIGHBOURHOODS.find(n => n.slug === currentSlug);
  if (!current) return [];
  return CRETE_NEIGHBOURHOODS.filter(
    n => n.region === current.region && n.slug !== currentSlug,
  );
}

/**
 * Recent guides (articles) that mention the Greek neighbourhood label
 * inside title/meta/content. Used for cross-linking news -> data pages.
 */
export async function getRelatedGuides(
  greek: string,
  locale: string,
  limit = 4,
): Promise<Array<{ slug: string; title: string; category: string }>> {
  const safeGreek = greek.replace(/[%_]/g, "");
  // Look in JSONB titles for the locale, fallback to Greek label match in body
  const { data, error } = await supabase
    .from("guides")
    .select("slug, titles, category, published_at")
    .eq("status", "published")
    .or(`titles->>${locale}.ilike.%${safeGreek}%,titles->>en.ilike.%${safeGreek}%`)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  type Row = {
    slug: string;
    titles: Record<string, string> | null;
    category: string;
  };
  return (data as Row[]).map(r => ({
    slug: r.slug,
    title:
      (r.titles && (r.titles[locale] || r.titles["en"])) || r.slug,
    category: r.category,
  }));
}
