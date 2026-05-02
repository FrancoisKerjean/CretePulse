// JSON Feed 1.1 (jsonfeed.org).
// Used by Feedbin, Inoreader, NetNewsWire and increasingly by AI search
// crawlers (ChatGPT, Perplexity, Claude) which prefer structured JSON over RSS XML.

import { supabase } from "@/lib/supabase";

export const revalidate = 1800;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function GET() {
  const cutoff = new Date(Date.now() - 14 * 86400 * 1000).toISOString();

  const [{ data: news }, { data: guides }] = await Promise.all([
    supabase
      .from("news")
      .select("slug, title_en, summary_en, category, published_at, image_url")
      .neq("title_en", "")
      .neq("category", "filtered")
      .gte("published_at", cutoff)
      .order("published_at", { ascending: false })
      .limit(40),
    supabase
      .from("guides")
      .select("slug, titles, meta_descs, category, published_at, image_url")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(20),
  ]);

  type NewsRow = { slug: string; title_en: string; summary_en: string | null; category: string | null; published_at: string; image_url: string | null };
  type GuideRow = { slug: string; titles: Record<string, string>; meta_descs: Record<string, string>; category: string | null; published_at: string; image_url: string | null };

  type FeedItem = {
    id: string;
    url: string;
    title: string;
    summary: string;
    content_text: string;
    image?: string;
    date_published: string;
    tags: string[];
  };

  const items: FeedItem[] = [];

  for (const n of (news as NewsRow[]) || []) {
    const url = `${BASE_URL}/en/news/${n.slug}`;
    items.push({
      id: url,
      url,
      title: n.title_en,
      summary: (n.summary_en || "").replace(/<[^>]+>/g, " ").slice(0, 280),
      content_text: (n.summary_en || "").replace(/<[^>]+>/g, " ").trim(),
      image: n.image_url || undefined,
      date_published: new Date(n.published_at).toISOString(),
      tags: ["news", n.category || "general"].filter(Boolean),
    });
  }

  for (const g of (guides as GuideRow[]) || []) {
    const title = g.titles?.en;
    const desc = g.meta_descs?.en || "";
    if (!title) continue;
    const url = `${BASE_URL}/en/articles/${g.slug}`;
    items.push({
      id: url,
      url,
      title,
      summary: desc.slice(0, 280),
      content_text: desc,
      image: g.image_url || undefined,
      date_published: new Date(g.published_at).toISOString(),
      tags: ["guide", g.category || "general"].filter(Boolean),
    });
  }

  items.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: "Crete Direct",
    home_page_url: BASE_URL,
    feed_url: `${BASE_URL}/feed.json`,
    description: "Free, independent news, weather, beaches, villages and events from Crete. Updated hourly.",
    icon: `${BASE_URL}/icon.svg`,
    favicon: `${BASE_URL}/icon.svg`,
    language: "en",
    items: items.slice(0, 50),
  };

  return new Response(JSON.stringify(feed), {
    status: 200,
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}
