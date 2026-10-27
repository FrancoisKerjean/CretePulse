import { supabase } from "./supabase";
import { NEWS_INDEXABLE_MAX_AGE_DAYS } from "./news";

export interface Guide {
  id: number;
  slug: string;
  format: "long" | "mid" | "short" | "daily" | "news";
  category: string;
  keywords: string[];
  titles: Record<string, string>;
  meta_descs: Record<string, string>;
  contents: Record<string, string>;
  faqs: Record<string, { q: string; a: string }[]> | null;
  image_url: string | null;
  read_time: number | null;
  published_at: string;
  created_at: string;
  status: string;
  youtube_video_id: string | null;
}

export function getLocalizedGuideField(
  guide: Guide,
  field: "titles" | "meta_descs" | "contents",
  locale: string
): string {
  return guide[field]?.[locale] || guide[field]?.["en"] || "";
}

/**
 * True if the guide actually has body content for this locale (not an EN fallback).
 * Used to noindex EN-fallback variants (e.g. daily weather/news guides that exist only in
 * EN) so 22 identical-content URLs don't cannibalise each other in search.
 */
export function isGuideTranslated(guide: Guide, locale: string): boolean {
  if (locale === "en") return true;
  const c = guide.contents?.[locale];
  return !!c && c.trim().length > 0 && c.trim() !== (guide.contents?.["en"] || "").trim();
}

/** Formats dates (meteo du jour, recap presse) : perimes passes 30 j, comme les news. */
const DATED_FORMATS: ReadonlySet<Guide["format"]> = new Set(["daily", "news"]);
/**
 * Le bulletin meteo quotidien (`daily`) n'est jamais indexable, meme frais : GSC du 01/05 au
 * 18/07/2026, 61 pages pour 8 clics ; 1 clic depuis. Il reste servi par /daily et la video,
 * il ne concourt plus au crawl. Les news gardent leur fenetre de 30 j (12 clics avant la chute).
 */
const NEVER_INDEXED_FORMATS: ReadonlySet<Guide["format"]> = new Set(["daily"]);

/**
 * Indexable = traduit dans la locale ET, pour un format date, publie depuis moins de
 * NEWS_INDEXABLE_MAX_AGE_DAYS. 235 des 508 articles du sitemap etaient des
 * `crete-weather-*` / `crete-news-recap-*` perimes (27/10/2026), le format mesure a
 * 0,2 visiteur par guide (project_crete_direct_guides) : ils diluaient le crawl.
 * Une seule verite pour la page (robots) et le sitemap.
 */
export function isGuideIndexable(guide: Guide, locale: string, now: Date = new Date()): boolean {
  if (NEVER_INDEXED_FORMATS.has(guide.format)) return false;
  if (!isGuideTranslated(guide, locale)) return false;
  if (!DATED_FORMATS.has(guide.format)) return true;
  const ts = Date.parse(guide.published_at);
  if (Number.isNaN(ts)) return false;
  return now.getTime() - ts <= NEWS_INDEXABLE_MAX_AGE_DAYS * 86_400_000;
}

export function getLocalizedFaqs(
  guide: Guide,
  locale: string
): { q: string; a: string }[] {
  return guide.faqs?.[locale] || guide.faqs?.["en"] || [];
}

export function extractToc(html: string): { id: string; label: string }[] {
  const matches = html.matchAll(/<h2[^>]*id="([^"]*)"[^>]*>([^<]*)<\/h2>/g);
  return Array.from(matches, (m) => ({ id: m[1], label: m[2] }));
}

export async function getPublishedGuides(limit: number = 100): Promise<Guide[]> {
  try {
    const { data, error } = await supabase
      .from("guides")
      .select("id, slug, format, category, keywords, titles, meta_descs, image_url, read_time, published_at, status")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as Guide[]) || [];
  } catch {
    return [];
  }
}

// Editorial travel guides only (format "long" or "mid"), excluding scraped
// news entries that share the guides table (format "news", from diavgeia
// administrative announcements and similar).
export async function getEditorialGuides(limit: number = 12): Promise<Guide[]> {
  try {
    const { data, error } = await supabase
      .from("guides")
      .select("id, slug, format, category, keywords, titles, meta_descs, image_url, read_time, published_at, status")
      .eq("status", "published")
      .in("format", ["long", "mid"])
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as Guide[]) || [];
  } catch {
    return [];
  }
}

// First-party crete.direct news articles (format "news", category "news").
// Distinct from the diavgeia administrative scrapes, which also use
// format "news" but carry categories like infrastructure/airport/permits/
// tourism and stay unlisted. These editorial pieces are surfaced on the
// /news hub alongside the translated Greek-press aggregator feed.
export async function getEditorialNews(limit: number = 30): Promise<Guide[]> {
  try {
    const { data, error } = await supabase
      .from("guides")
      .select("id, slug, format, category, keywords, titles, meta_descs, image_url, read_time, published_at, status")
      .eq("status", "published")
      .eq("format", "news")
      .eq("category", "news")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as Guide[]) || [];
  } catch {
    return [];
  }
}

// Daily editorial posts (format "daily"): dated weather bulletins + news recaps.
// Shown only on the /daily hub, excluded from the evergreen /articles index.
export async function getDailyPosts(
  category?: "daily-news" | "daily-weather",
  limit: number = 30
): Promise<Guide[]> {
  try {
    let q = supabase
      .from("guides")
      .select("id, slug, format, category, keywords, titles, meta_descs, image_url, read_time, published_at, status")
      .eq("status", "published")
      .eq("format", "daily")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Guide[]) || [];
  } catch {
    return [];
  }
}

export async function getGuideBySlug(slug: string): Promise<Guide | null> {
  try {
    const { data, error } = await supabase
      .from("guides")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error) throw error;
    return data as Guide;
  } catch {
    return null;
  }
}

export async function getRelatedGuides(
  category: string,
  excludeSlug: string,
  limit: number = 3
): Promise<Guide[]> {
  try {
    const { data, error } = await supabase
      .from("guides")
      .select("slug, titles, meta_descs, category, image_url, read_time, published_at, format")
      .eq("status", "published")
      .eq("category", category)
      .neq("slug", excludeSlug)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as Guide[]) || [];
  } catch {
    return [];
  }
}
