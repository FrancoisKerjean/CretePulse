import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { MONTHS, CITIES } from "@/lib/weather-monthly";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const LOCALES = ["en", "fr", "de", "el", "it", "nl", "pl", "es", "pt", "ru", "ja", "ko", "zh", "tr", "sv", "da", "no", "fi", "cs", "hu", "ro", "ar"] as const;

const STATIC_PAGES = [
  "",
  "/beaches",
  "/villages",
  "/events",
  "/weather",
  "/news",
  "/hikes",
  "/food",
  "/articles",
  "/about",
  "/buses",
  "/fire-alerts",
  "/property-management",
];

const BEACH_ACTIVITIES = ["snorkeling", "kids", "swimming", "secluded", "sandy", "pebble"];
const ROUTE_SLUGS = ["heraklion-to-chania", "heraklion-to-rethymno", "heraklion-to-agios-nikolaos", "heraklion-airport-to-city", "chania-airport-to-city", "athens-to-crete", "crete-to-santorini", "heraklion-to-sitia"];
const COMP_SLUGS = ["chania-vs-heraklion", "chania-vs-rethymno", "heraklion-vs-rethymno", "agios-nikolaos-vs-elounda", "malia-vs-hersonissos", "sitia-vs-ierapetra", "chania-vs-agios-nikolaos", "crete-vs-santorini", "crete-vs-rhodes", "crete-vs-corfu", "crete-vs-mykonos", "crete-vs-cyprus", "elafonisi-vs-balos", "elafonisi-vs-vai", "balos-vs-preveli"];
const AREA_SLUGS = ["chania", "heraklion", "rethymno", "agios-nikolaos", "elounda", "plakias", "paleochora", "matala"];
const ITINERARY_SLUGS = ["3-days", "5-days", "7-days", "10-days"];
const ARCH_SLUGS = ["knossos", "phaistos", "spinalonga", "gortyna", "malia-palace", "aptera"];

// One sub-sitemap per locale (index 0..21)
export async function generateSitemaps() {
  return LOCALES.map((_, i) => ({ id: i }));
}

async function fetchSlugs(table: string, extra?: string): Promise<string[]> {
  try {
    let query = supabase.from(table).select("slug");
    if (extra === "news") {
      query = supabase.from(table).select("slug").neq("title_en", "").order("published_at", { ascending: false }).limit(200);
    } else if (extra === "food_featured") {
      query = supabase.from(table).select("slug").neq("description_en", "");
    }
    const { data } = await query;
    return (data || []).map((r: { slug: string }) => r.slug);
  } catch {
    return [];
  }
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const locale = LOCALES[id];
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();

  const add = (path: string, freq: MetadataRoute.Sitemap[0]["changeFrequency"], priority: number, lastMod?: Date) => {
    entries.push({
      url: `${BASE_URL}/${locale}${path}`,
      lastModified: lastMod || now,
      changeFrequency: freq,
      priority,
    });
  };

  // Static pages
  for (const page of STATIC_PAGES) {
    add(page, page === "" ? "daily" : "weekly", page === "" ? 1.0 : 0.8);
  }

  // Utility pages
  add("/faq", "monthly", 0.7);
  add("/map", "monthly", 0.6);
  add("/search", "monthly", 0.4);

  // Programmatic pages
  for (const city of CITIES) {
    add(`/things-to-do/${city.slug}`, "monthly", 0.6);
    for (const month of MONTHS) {
      add(`/weather/${city.slug}/${month}`, "monthly", 0.5);
    }
  }
  for (const month of MONTHS) add(`/visit/${month}`, "monthly", 0.7);
  for (const a of BEACH_ACTIVITIES) add(`/beaches/best-for/${a}`, "monthly", 0.6);
  for (const s of ROUTE_SLUGS) add(`/getting-around/${s}`, "monthly", 0.6);
  for (const s of COMP_SLUGS) add(`/compare/${s}`, "monthly", 0.6);
  for (const s of AREA_SLUGS) add(`/where-to-stay/${s}`, "monthly", 0.6);
  for (const s of ITINERARY_SLUGS) add(`/itineraries/${s}`, "monthly", 0.7);
  for (const s of ARCH_SLUGS) add(`/archaeology/${s}`, "monthly", 0.6);

  // Dynamic DB pages
  const [beaches, villages, foodPlaces, hikes, news] = await Promise.all([
    fetchSlugs("beaches"),
    fetchSlugs("villages"),
    fetchSlugs("food_places", "food_featured"),
    fetchSlugs("hikes"),
    fetchSlugs("news", "news"),
  ]);

  for (const s of beaches) add(`/beaches/${s}`, "monthly", 0.6);
  for (const s of villages) {
    add(`/villages/${s}`, "monthly", 0.6);
    add(`/beaches/near/${s}`, "monthly", 0.5);
  }
  for (const s of foodPlaces) add(`/food/${s}`, "monthly", 0.6);
  for (const s of hikes) add(`/hikes/${s}`, "monthly", 0.6);
  for (const s of news) add(`/news/${s}`, "daily", 0.5);

  return entries;
}
