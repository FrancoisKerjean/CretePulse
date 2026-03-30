import { supabase } from "./supabase";

export interface Guide {
  id: number;
  slug: string;
  format: "long" | "mid";
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
}

export function getLocalizedGuideField(
  guide: Guide,
  field: "titles" | "meta_descs" | "contents",
  locale: string
): string {
  return guide[field]?.[locale] || guide[field]?.["en"] || "";
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
      .select("slug, titles, category, image_url, read_time, published_at, format")
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
