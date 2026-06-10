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
import { eligiblePairs } from "@/lib/bus-pairs";
import { MONTHS, CITIES } from "@/lib/weather-monthly";
import { CRETE_NEIGHBOURHOODS } from "@/lib/airbnb-mappings";
import { CRETE_AIRPORTS } from "@/lib/airports";

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
  "/daily",
  "/about",
  "/buses",
  "/fire-alerts",
  "/property-management",
  "/airbnb",
  "/airport",
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
  lastmod?: string;
};

async function fetchSlugs(table: string, extra?: string): Promise<string[]> {
  try {
    let query = supabase.from(table).select("slug");
    if (extra === "news") {
      query = supabase
        .from(table)
        .select("slug")
        .neq("title_en", "")
        .neq("category", "filtered")
        .order("published_at", { ascending: false })
        .limit(500);
    } else if (extra === "food_featured") {
      query = supabase.from(table).select("slug").neq("description_en", "");
    }
    const { data } = await query;
    return (data || []).map((r: { slug: string }) => r.slug);
  } catch {
    return [];
  }
}

async function fetchSlugsWithDate(
  table: string,
  dateCol: string,
  extra?: string,
): Promise<Array<{ slug: string; lastmod: string }>> {
  try {
    const cols = `slug, ${dateCol}`;
    let q = supabase.from(table).select(cols);
    if (extra === "news") {
      q = supabase
        .from(table)
        .select(cols)
        .neq("title_en", "")
        .neq("category", "filtered")
        .order(dateCol, { ascending: false })
        .limit(500);
    } else if (extra === "guides_published") {
      q = supabase
        .from(table)
        .select(cols)
        .eq("status", "published")
        .order(dateCol, { ascending: false });
    }
    const { data } = await q;
    const rows = (data as unknown as Array<Record<string, string>>) || [];
    return rows.map((r) => ({
      slug: r.slug,
      lastmod: new Date(r[dateCol]).toISOString(),
    }));
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

function urlEntry(entry: Entry, fallbackLastmod: string): string {
  const alternates = LOCALES.map(
    (loc) =>
      `    <xhtml:link rel="alternate" hreflang="${loc}" href="${escapeXml(`${BASE_URL}/${loc}${entry.path}`)}" />`,
  ).join("\n");
  const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${BASE_URL}/en${entry.path}`)}" />`;

  const loc = `${BASE_URL}/en${entry.path}`;
  const lastmod = entry.lastmod || fallbackLastmod;

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
  const push = (path: string, changefreq: Entry["changefreq"], priority: number, lastmod?: string) => {
    entries.push({ path, changefreq, priority, lastmod });
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
  // /visit/[month] pages are noindex (GSC: ~5800 impressions on 28d for only 4 clicks
  // across 170+ pages, average position 60+ = invisible page 5-8 Google).
  // No /visit index page exists, so the section is fully removed from the sitemap.
  // for (const month of MONTHS) push(`/visit/${month}`, "monthly", 0.7);
  for (const a of BEACH_ACTIVITIES) push(`/beaches/best-for/${a}`, "monthly", 0.6);
  // /getting-around/[route] pages are noindex (GSC: 41 pages, 704 impressions for
  // only 2 clicks on 28d, average position 38 = invisible). Removed from sitemap
  // for coherence with the noindex header.
  // for (const s of ROUTE_SLUGS) push(`/getting-around/${s}`, "monthly", 0.6);
  void ROUTE_SLUGS;
  // Pages par paire de villes /buses/[pair] (spec 2026-06-10-bus-pair-pages) :
  // data vivante (horaires MAJ hebdo scraper), indexables, revue GSC J+45.
  const { data: busPairRoutes } = await supabase.from("bus_routes").select("from_place,to_place");
  for (const p of eligiblePairs(busPairRoutes ?? [])) push(`/buses/${p.slug}`, "weekly", 0.7);

  for (const s of COMP_SLUGS) push(`/compare/${s}`, "monthly", 0.6);
  for (const s of AREA_SLUGS) push(`/where-to-stay/${s}`, "monthly", 0.6);
  for (const s of ITINERARY_SLUGS) push(`/itineraries/${s}`, "monthly", 0.7);
  for (const s of ARCH_SLUGS) push(`/archaeology/${s}`, "monthly", 0.6);

  // Inside Airbnb data pages: 24 Crete neighbourhoods x 22 locales = 528 URLs.
  // High SEO priority — these are data-exclusive pages (ADR, occupancy, hosts
  // breakdown, revenue estimates from public Inside Airbnb snapshot) that
  // no competitor can replicate. Prerendered for en/fr/de/el (96 pages),
  // ISR-served for the other 18 locales with English UI fallback + proper
  // hreflang alternates.
  for (const n of CRETE_NEIGHBOURHOODS) push(`/airbnb/${n.slug}`, "monthly", 0.7);

  // HCAA airport traffic pages: 3 Crete airports, data-exclusive (official
  // monthly XLSX parsed by our pipeline, updated as HCAA publishes).
  for (const a of CRETE_AIRPORTS) push(`/airport/${a.slug}`, "monthly", 0.7);

  // Live utility: "where to swim today" (wind-aware daily pick, ISR 30 min).
  push("/beaches/today", "daily", 0.9);

  // Dynamic DB pages — news + guides use real published_at as lastmod
  // (huge crawl prioritization signal for Google News)
  const [beaches, villages, foodPlaces, hikes, news, guides] = await Promise.all([
    fetchSlugs("beaches"),
    fetchSlugs("villages"),
    fetchSlugs("food_places", "food_featured"),
    fetchSlugs("hikes"),
    fetchSlugsWithDate("news", "published_at", "news"),
    fetchSlugsWithDate("guides", "published_at", "guides_published"),
  ]);

  for (const s of beaches) push(`/beaches/${s}`, "monthly", 0.6);
  for (const s of villages) {
    push(`/villages/${s}`, "monthly", 0.6);
    push(`/beaches/near/${s}`, "monthly", 0.5);
  }
  // /food/[slug] pages are noindex (4875/5000 pages had 0 clicks on 28d, low-quality signal).
  // Keep the /food index page indexed (added above), but exclude individual restaurant pages.
  // for (const s of foodPlaces) push(`/food/${s}`, "monthly", 0.6);
  void foodPlaces;
  for (const s of hikes) push(`/hikes/${s}`, "monthly", 0.6);
  for (const n of news) push(`/news/${n.slug}`, "daily", 0.5, n.lastmod);
  for (const g of guides) push(`/articles/${g.slug}`, "weekly", 0.7, g.lastmod);

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
