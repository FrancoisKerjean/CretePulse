import { supabase } from "./supabase";
import type { NewsItem } from "./types";

// Greek Unicode range check
function hasGreek(text: string): boolean {
  return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(text);
}

export async function getLatestNews(limit = 20, locale = "en"): Promise<NewsItem[]> {
  const titleCol = `title_${locale}` as keyof NewsItem;
  const summaryCol = `summary_${locale}` as keyof NewsItem;
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .neq("title_en", "")
    .neq(`title_${locale}`, "")
    .order("published_at", { ascending: false })
    .limit(limit * 4);

  if (error) throw error;
  const items = (data as NewsItem[]) || [];

  // Filter: require actual content in the requested locale, skip Greek on non-Greek pages
  const filtered = items.filter((item) => {
    const title = (item[titleCol] as string) || "";
    if (!title) return false;
    if (locale !== "el" && hasGreek(title)) return false;
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
