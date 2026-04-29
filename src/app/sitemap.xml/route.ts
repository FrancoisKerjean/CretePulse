// Single XML sitemap with hreflang alternates per entry.
//
// We previously used Next.js `generateSitemaps()` to split into 22 sub-sitemaps
// (one per locale). That triggered a Next.js 16 / Turbopack bug where the `id`
// argument passed to the sitemap function was unreliable, producing URLs like
// /undefined/* in production. After deploying a defensive `resolveLocale()`,
// we still observed that all sub-sitemaps emitted /en/* — the underlying bug
// could not be worked around in code.
//
// This route handler bypasses the framework convention entirely. It produces a
// single XML sitemap at /sitemap.xml. With ~3.3K URLs across 22 locales, we
// stay well under Google's 50K/50MB limits.
//
// Each <url> includes <xhtml:link rel="alternate" hreflang="…"> for all locales
// plus x-default. This is what tells Google to dedupe the language variants
// and was the root cause of the cannibalization observed in GSC (16 languages
// competing on the same query without 0 click).

import { supabase } from "@/lib/supabase";
import { MONTHS, CITIES } from "@/lib/weather-monthly";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const LOCALES = [
  "en", "fr", "de", "el", "it", "nl", "pl", "es", "pt", "ru",
  "ja", "ko", "zh", "tr", "sv", "da", "no", "fi", "cs", "hu",
  "ro", "ar",
] as const;

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

type Entry = {
  path: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: number;
};

async function fetchSlugs(table: string, extra?: string): Promise<string[]> {
  try {
    let query = supabase.from(table).select("slug");
    if (extra === "news") {
      query = supabase
        .from(table)
        .select("slug")
        .neq("title_en", "")
        .order("published_at", { ascending: false })
        .limit(200);
    } else if (extra === "food_featured") {
      query = supabase.from(table).select("slug").neq("description_en", "");
    }
    const { data } = await query;
    return (data || []).map((r: { slug: string }) => r.slug);
  } catch {
    return [];
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(entry: Entry, lastmod: string): string {
  const alternates = LOCALES.map(
    (loc) =>
      `    <xhtml:link rel="alternate" hreflang="${loc}" href="${escapeXml(`${BASE_URL}/${loc}${entry.path}`)}" />`,
  ).join("\n");
  const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${BASE_URL}/en${entry.path}`)}" />`;

  // Canonical URL = English version. Each language variant is exposed via the
  // xhtml:link alternates; Google then picks the right one per-user.
  const loc = `${BASE_URL}/en${entry.path}`;

  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
${alternates}
${xDefault}
  </url>`;
}

export async function GET() {
  const entries: Entry[] = [];
  const push = (path: string, changefreq: Entry["changefreq"], priority: number) => {
    entries.push({ path, changefreq, priority });
  };

  // Static pages
  for (const page of STATIC_PAGES) {
    push(page, page === "" ? "daily" : "weekly", page === "" ? 1.0 : 0.8);
  }

  // Utility pages
  push("/faq", "monthly", 0.7);
  push("/map", "monthly", 0.6);
  push("/search", "monthly", 0.4);

  // Programmatic pages
  for (const city of CITIES) {
    push(`/things-to-do/${city.slug}`, "monthly", 0.6);
    for (const month of MONTHS) {
      push(`/weather/${city.slug}/${month}`, "monthly", 0.5);
    }
  }
  for (const month of MONTHS) push(`/visit/${month}`, "monthly", 0.7);
  for (const a of BEACH_ACTIVITIES) push(`/beaches/best-for/${a}`, "monthly", 0.6);
  for (const s of ROUTE_SLUGS) push(`/getting-around/${s}`, "monthly", 0.6);
  for (const s of COMP_SLUGS) push(`/compare/${s}`, "monthly", 0.6);
  for (const s of AREA_SLUGS) push(`/where-to-stay/${s}`, "monthly", 0.6);
  for (const s of ITINERARY_SLUGS) push(`/itineraries/${s}`, "monthly", 0.7);
  for (const s of ARCH_SLUGS) push(`/archaeology/${s}`, "monthly", 0.6);

  // Dynamic DB pages
  const [beaches, villages, foodPlaces, hikes, news, guides] = await Promise.all([
    fetchSlugs("beaches"),
    fetchSlugs("villages"),
    fetchSlugs("food_places", "food_featured"),
    fetchSlugs("hikes"),
    fetchSlugs("news", "news"),
    fetchSlugs("guides"),
  ]);

  for (const s of beaches) push(`/beaches/${s}`, "monthly", 0.6);
  for (const s of villages) {
    push(`/villages/${s}`, "monthly", 0.6);
    push(`/beaches/near/${s}`, "monthly", 0.5);
  }
  for (const s of foodPlaces) push(`/food/${s}`, "monthly", 0.6);
  for (const s of hikes) push(`/hikes/${s}`, "monthly", 0.6);
  for (const s of news) push(`/news/${s}`, "daily", 0.5);
  for (const s of guides) push(`/articles/${s}`, "weekly", 0.7);

  const lastmod = new Date().toISOString();
  const xmlEntries = entries.map((e) => urlEntry(e, lastmod)).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${xmlEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
