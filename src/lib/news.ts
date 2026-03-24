import { supabase } from "./supabase";
import type { NewsItem } from "./types";

export async function getLatestNews(limit = 20): Promise<NewsItem[]> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("rewritten", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as NewsItem[]) || [];
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
