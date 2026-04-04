import { supabase } from "./supabase";
import type { NewsItem } from "./types";

// Greek Unicode range check
function hasGreek(text: string): boolean {
  return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(text);
}

export async function getLatestNews(limit = 20, locale = "en"): Promise<NewsItem[]> {
  // Only EN, FR, DE have translations in the DB. All others fall back to EN.
  const TRANSLATED_LOCALES = ["en", "fr", "de"];
  const effectiveLocale = TRANSLATED_LOCALES.includes(locale) ? locale : "en";
  const titleCol = `title_${effectiveLocale}` as keyof NewsItem;

  const query = supabase
    .from("news")
    .select("slug, title_en, title_fr, title_de, title_el, summary_en, summary_fr, summary_de, summary_el, image_url, category, published_at, source_name, source_url")
    .neq("title_en", "")
    .order("published_at", { ascending: false })
    .limit(limit * 2);

  // For translated locales, also require the locale title to be filled
  if (effectiveLocale !== "en") {
    query.neq(`title_${effectiveLocale}`, "");
  }

  const { data, error } = await query;
  if (error) throw error;
  const items = (data as NewsItem[]) || [];

  // Filter out articles with Greek characters on non-Greek pages
  const filtered = items.filter((item) => {
    const title = (item[titleCol] as string) || "";
    if (!title) return false;
    if (effectiveLocale !== "el" && hasGreek(title)) return false;
    return true;
  });

  // Deduplicate by first 30 chars
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of filtered) {
    const key = ((item[titleCol] as string) || "").toLowerCase().slice(0, 30).trim();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
    if (deduped.length >= limit) break;
  }

  return deduped;
}

export async function getNewsBySlug(slug: string): Promise<NewsItem | null> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("slug", slug)
    .neq("title_en", "")
    .single();

  if (error) return null;
  return data as NewsItem;
}
