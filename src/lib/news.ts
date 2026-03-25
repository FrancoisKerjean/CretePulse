import { supabase } from "./supabase";
import type { NewsItem } from "./types";

export async function getLatestNews(limit = 20): Promise<NewsItem[]> {
  // Fetch more than needed so we can deduplicate before returning `limit` items
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("rewritten", true)
    .order("published_at", { ascending: false })
    .limit(limit * 3);

  if (error) throw error;
  const items = (data as NewsItem[]) || [];

  // Deduplicate: if two articles share the same first 30 chars of title_en (case-insensitive),
  // keep only the most recent one (already first because of descending order).
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of items) {
    const key = (item.title_en || "").toLowerCase().slice(0, 30).trim();
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
    .eq("rewritten", true)
    .single();

  if (error) return null;
  return data as NewsItem;
}
