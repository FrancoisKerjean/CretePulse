// Server-side helper that returns a curated mix of 6 related entities
// (beaches, villages, food places) for any article context.
//
// Goal: distribute internal PageRank from /articles and /news pages onto
// the 24K+ entity pages, increasing crawl depth + time on site + organic
// reach. This is rendered server-side so Google sees the links.

import { supabase } from "./supabase";
import { sanitizeImageUrl } from "./beaches";
import type { Locale } from "./types";

export type RelatedEntity = {
  href: string;
  title: string;
  subtitle?: string;
  region?: string;
  type: "beach" | "village" | "food" | "hike";
  imageUrl?: string;
};

const NAME_COL: Record<string, Record<Locale, string>> = {
  en: { en: "name_en", fr: "name_en", de: "name_en", el: "name_en" },
  fr: { en: "name_en", fr: "name_fr", de: "name_de", el: "name_el" },
  de: { en: "name_en", fr: "name_fr", de: "name_de", el: "name_el" },
  el: { en: "name_en", fr: "name_fr", de: "name_de", el: "name_el" },
};

const SUPPORTED_LOCALES: Locale[] = ["en", "fr", "de", "el"];

function pickLocale(locale: string): Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale) ? (locale as Locale) : "en";
}

async function fetchBeaches(loc: Locale, limit: number): Promise<RelatedEntity[]> {
  try {
    const { data } = await supabase
      .from("beaches")
      .select(`slug, name_en, name_${loc}, region, image_url`)
      .neq(`name_${loc}`, "")
      .not("image_url", "is", null)
      .limit(limit * 3);

    type Row = { slug: string; name_en: string | null; image_url: string | null; region: string | null } & Record<string, string | null>;
    const rows: Row[] = (data as Row[]) || [];
    return rows
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
      .map((r) => ({
        href: `/${loc}/beaches/${r.slug}`,
        title: (r[`name_${loc}`] as string) || r.name_en || r.slug,
        region: r.region || undefined,
        type: "beach" as const,
        imageUrl: sanitizeImageUrl(r.image_url) || undefined,
      }));
  } catch {
    return [];
  }
}

async function fetchVillages(loc: Locale, limit: number): Promise<RelatedEntity[]> {
  try {
    const { data } = await supabase
      .from("villages")
      .select(`slug, name_en, name_${loc}, region, image_url`)
      .neq(`name_${loc}`, "")
      .not("image_url", "is", null)
      .limit(limit * 3);

    type Row = { slug: string; name_en: string | null; image_url: string | null; region: string | null } & Record<string, string | null>;
    const rows: Row[] = (data as Row[]) || [];
    return rows
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
      .map((r) => ({
        href: `/${loc}/villages/${r.slug}`,
        title: (r[`name_${loc}`] as string) || r.name_en || r.slug,
        region: r.region || undefined,
        type: "village" as const,
        imageUrl: sanitizeImageUrl(r.image_url) || undefined,
      }));
  } catch {
    return [];
  }
}

async function fetchFoodPlaces(loc: Locale, limit: number): Promise<RelatedEntity[]> {
  try {
    const { data } = await supabase
      .from("food_places")
      .select("slug, name, region, cuisine, village")
      .neq("description_en", "")
      .limit(limit * 3);

    type Row = { slug: string; name: string; region: string | null; cuisine: string | null; village: string | null };
    const rows: Row[] = (data as Row[]) || [];
    return rows
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
      .map((r) => ({
        href: `/${loc}/food/${r.slug}`,
        title: r.name,
        subtitle: r.cuisine || undefined,
        region: r.region || r.village || undefined,
        type: "food" as const,
      }));
  } catch {
    return [];
  }
}

const NAME_COL_USED = NAME_COL; // suppress unused warning if framework prunes

/**
 * Returns 6 related entities mixing beaches, villages, food.
 * Mix depends on article category to feel relevant.
 */
export async function getRelatedEntities(
  category: string | null,
  locale: string,
): Promise<RelatedEntity[]> {
  void NAME_COL_USED;
  const loc = pickLocale(locale);

  const cat = (category || "").toLowerCase();

  let beachQuota = 3;
  let villageQuota = 2;
  let foodQuota = 1;

  if (cat === "beaches") {
    beachQuota = 4;
    villageQuota = 1;
    foodQuota = 1;
  } else if (cat === "food" || cat === "cuisine") {
    beachQuota = 1;
    villageQuota = 2;
    foodQuota = 3;
  } else if (cat === "expat" || cat === "living") {
    beachQuota = 1;
    villageQuota = 4;
    foodQuota = 1;
  } else if (cat === "hikes" || cat === "hiking") {
    beachQuota = 2;
    villageQuota = 3;
    foodQuota = 1;
  }

  const [beaches, villages, food] = await Promise.all([
    fetchBeaches(loc, beachQuota).catch(() => []),
    fetchVillages(loc, villageQuota).catch(() => []),
    fetchFoodPlaces(loc, foodQuota).catch(() => []),
  ]);

  return [...beaches, ...villages, ...food];
}

const SECTION_HEADER: Record<Locale, string> = {
  en: "Discover Crete",
  fr: "Découvrir la Crète",
  de: "Kreta entdecken",
  el: "Ανακαλύψτε την Κρήτη",
};

const TYPE_BADGE: Record<string, Record<Locale, string>> = {
  beach: { en: "Beach", fr: "Plage", de: "Strand", el: "Παραλία" },
  village: { en: "Village", fr: "Village", de: "Dorf", el: "Χωριό" },
  food: { en: "Restaurant", fr: "Restaurant", de: "Restaurant", el: "Εστιατόριο" },
  hike: { en: "Hike", fr: "Randonnée", de: "Wanderung", el: "Πεζοπορία" },
};

export function getSectionHeader(locale: string): string {
  const loc = pickLocale(locale);
  return SECTION_HEADER[loc];
}

export function getTypeBadge(type: string, locale: string): string {
  const loc = pickLocale(locale);
  return TYPE_BADGE[type]?.[loc] || type;
}
