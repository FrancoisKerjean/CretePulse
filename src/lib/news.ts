import { supabase } from "./supabase";
import type { NewsItem } from "./types";

// Greek Unicode range check
function hasGreek(text: string): boolean {
  return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(text);
}

export async function getLatestNews(limit = 20, locale = "en"): Promise<NewsItem[]> {
  const titleCol = `title_${locale}`;
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .neq("title_en", "")
    .neq(titleCol, "")
    .order("published_at", { ascending: false })
    .limit(limit * 4);

  if (error) throw error;
  const items = (data as NewsItem[]) || [];

  // Filter: only show articles that have a proper title in the requested locale
  // If title_fr is still in Greek, skip it on the FR page
  const titleField = `title_${locale}` as keyof NewsItem;
  const filtered = items.filter((item) => {
    const title = (item[titleField] as string) || "";
    if (!title) return false;
    // On non-Greek pages, skip any article whose title contains Greek characters
    if (locale !== "el" && hasGreek(title)) {
      return false;
    }
    return true;
  });

  // Deduplicate by first 30 chars
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of filtered) {
    const key = ((item[titleField] as string) || "").toLowerCase().slice(0, 30).trim();
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
