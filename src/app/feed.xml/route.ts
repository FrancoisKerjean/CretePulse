// RSS 2.0 feed for crete.direct.
// Picked up by Feedly, Inoreader, Flipboard, Mastodon RSS bots, NewsBlur,
// also crawled by AI search (ChatGPT, Perplexity), Bing News, Yandex News.
//
// Combines fresh news (last 14 days, max 40) with guides (max 20),
// merged and sorted by pubDate. Limit 50 entries total.

import { supabase } from "@/lib/supabase";

export const revalidate = 1800;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const TITLE = "Crete Direct";
const DESCRIPTION = "Free, independent news, weather, beaches, villages and events from Crete. Updated hourly.";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

type FeedItem = {
  title: string;
  url: string;
  description: string;
  pubDate: string;
  category: string;
  image?: string;
};

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

  const items: FeedItem[] = [];

  for (const n of (news as NewsRow[]) || []) {
    items.push({
      title: n.title_en,
      url: `${BASE_URL}/en/news/${n.slug}`,
      description: (n.summary_en || "").replace(/<[^>]+>/g, " ").slice(0, 500),
      pubDate: new Date(n.published_at).toUTCString(),
      category: n.category || "news",
      image: n.image_url || undefined,
    });
  }

  for (const g of (guides as GuideRow[]) || []) {
    const title = g.titles?.en;
    const desc = g.meta_descs?.en;
    if (!title) continue;
    items.push({
      title,
      url: `${BASE_URL}/en/articles/${g.slug}`,
      description: desc || "",
      pubDate: new Date(g.published_at).toUTCString(),
      category: g.category || "guide",
      image: g.image_url || undefined,
    });
  }

  items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  const itemsXml = items
    .slice(0, 50)
    .map(
      (it) => `    <item>
      <title>${escapeXml(it.title)}</title>
      <link>${escapeXml(it.url)}</link>
      <guid isPermaLink="true">${escapeXml(it.url)}</guid>
      <pubDate>${it.pubDate}</pubDate>
      <category>${escapeXml(it.category)}</category>
      <description>${cdata(it.description)}</description>${
        it.image
          ? `\n      <enclosure url="${escapeXml(it.image)}" type="image/jpeg" length="0" />`
          : ""
      }
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(TITLE)}</title>
    <link>${BASE_URL}</link>
    <description>${escapeXml(DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}
