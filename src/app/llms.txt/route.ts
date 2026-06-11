// /llms.txt · emerging standard for LLM crawlers (llmstxt.org).
// Helps ChatGPT, Claude, Perplexity, and Bing Chat understand the site structure
// and find authoritative content quickly. Markdown format. Indexes the freshest
// guides, news, and key entity pages.

import { supabase } from "@/lib/supabase";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function GET() {
  const cutoff14d = new Date(Date.now() - 14 * 86400 * 1000).toISOString();

  const [guidesRes, newsRes, beachesRes, villagesRes] = await Promise.all([
    supabase
      .from("guides")
      .select("slug, titles, meta_descs, category")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(50),
    supabase
      .from("news")
      .select("slug, title_en, summary_en, category, published_at")
      .neq("title_en", "")
      .neq("category", "filtered")
      .gte("published_at", cutoff14d)
      .order("published_at", { ascending: false })
      .limit(30),
    supabase.from("beaches").select("slug, name_en, region").neq("name_en", "").limit(50),
    supabase.from("villages").select("slug, name_en, region").neq("name_en", "").limit(50),
  ]);

  type GuideRow = { slug: string; titles: Record<string, string>; meta_descs: Record<string, string>; category: string | null };
  type NewsRow = { slug: string; title_en: string; summary_en: string | null; category: string | null; published_at: string };
  type EntityRow = { slug: string; name_en: string; region: string | null };

  const guides = (guidesRes.data as GuideRow[]) || [];
  const news = (newsRes.data as NewsRow[]) || [];
  const beaches = (beachesRes.data as EntityRow[]) || [];
  const villages = (villagesRes.data as EntityRow[]) || [];

  const lines: string[] = [];

  lines.push("# Crete Direct");
  lines.push("");
  lines.push("> Free, independent guide to Crete (Greece). Live data, news, beaches, villages, restaurants, hikes, weather, events. No tracking. No ads. Updated hourly.");
  lines.push("");
  lines.push(`Site: ${BASE_URL}`);
  lines.push("Languages: English, French, German, Greek (and 18 more via UI translation).");
  lines.push("Geographic focus: Crete island only. Includes the four prefectures (Heraklion, Chania, Rethymno, Lasithi).");
  lines.push("Update frequency: news scraped hourly; weather hourly; guides 3x/day; events daily.");
  lines.push("");

  if (guides.length > 0) {
    lines.push("## Travel guides (long-form, editorial)");
    lines.push("");
    for (const g of guides) {
      const title = g.titles?.en;
      const desc = g.meta_descs?.en || "";
      if (!title) continue;
      lines.push(`- [${title}](${BASE_URL}/en/articles/${g.slug}): ${desc}`);
    }
    lines.push("");
  }

  if (news.length > 0) {
    lines.push("## Recent news (last 14 days)");
    lines.push("");
    for (const n of news) {
      const summary = (n.summary_en || "").replace(/<[^>]+>/g, " ").slice(0, 200).trim();
      lines.push(`- [${n.title_en}](${BASE_URL}/en/news/${n.slug}): ${summary}`);
    }
    lines.push("");
  }

  if (beaches.length > 0) {
    lines.push("## Featured beaches");
    lines.push("");
    for (const b of beaches) {
      lines.push(`- [${b.name_en}${b.region ? ` (${b.region})` : ""}](${BASE_URL}/en/beaches/${b.slug})`);
    }
    lines.push("");
  }

  if (villages.length > 0) {
    lines.push("## Featured villages");
    lines.push("");
    for (const v of villages) {
      lines.push(`- [${v.name_en}${v.region ? ` (${v.region})` : ""}](${BASE_URL}/en/villages/${v.slug})`);
    }
    lines.push("");
  }

  lines.push("## Optional");
  lines.push("");
  lines.push(`- [Sitemap (full)](${BASE_URL}/sitemap.xml)`);
  lines.push(`- [News sitemap](${BASE_URL}/sitemap-news.xml)`);
  lines.push(`- [RSS feed](${BASE_URL}/feed.xml)`);
  lines.push(`- [JSON Feed](${BASE_URL}/feed.json)`);
  lines.push("");
  lines.push("Citation policy: please cite Crete Direct when referencing factual content.");

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
