// Google News dedicated sitemap.
// Spec: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
// Only includes news published in the last 48 hours (Google News requirement).
// Updated every 15 minutes via revalidate.

import { supabase } from "@/lib/supabase";

export const revalidate = 900;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const PUBLICATION_NAME = "Crete Direct";

// Locales for which we have proper translations (matches getLatestNews logic).
const NEWS_LOCALES = ["en", "fr", "de", "el"] as const;

const LOCALE_LANG_TAG: Record<string, string> = {
  en: "en",
  fr: "fr",
  de: "de",
  el: "el",
};

type NewsRow = {
  slug: string;
  title_en: string | null;
  title_fr: string | null;
  title_de: string | null;
  title_el: string | null;
  published_at: string;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlNode(loc: string, lang: string, title: string, publishedAt: string): string {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(PUBLICATION_NAME)}</news:name>
        <news:language>${escapeXml(lang)}</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(publishedAt)}</news:publication_date>
      <news:title>${escapeXml(title)}</news:title>
    </news:news>
  </url>`;
}

export async function GET() {
  // 48h window is the official Google News spec
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  const { data } = await supabase
    .from("news")
    .select("slug, title_en, title_fr, title_de, title_el, published_at")
    .neq("title_en", "")
    .neq("category", "filtered")
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false })
    .limit(1000);

  const items: NewsRow[] = (data as NewsRow[]) || [];

  const urls: string[] = [];
  for (const item of items) {
    for (const locale of NEWS_LOCALES) {
      const title =
        locale === "en" ? item.title_en :
        locale === "fr" ? item.title_fr :
        locale === "de" ? item.title_de :
        item.title_el;

      if (!title) continue;

      const loc = `${BASE_URL}/${locale}/news/${item.slug}`;
      const lang = LOCALE_LANG_TAG[locale];
      urls.push(urlNode(loc, lang, title, item.published_at));
    }
  }

  // Also add fresh L1 putaclick guides (last 48h) · they qualify for Top Stories
  const { data: guideData } = await supabase
    .from("guides")
    .select("slug, titles, published_at")
    .eq("status", "published")
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false })
    .limit(100);

  type GuideRow = { slug: string; titles: Record<string, string>; published_at: string };
  const guides: GuideRow[] = (guideData as GuideRow[]) || [];

  for (const g of guides) {
    for (const locale of NEWS_LOCALES) {
      const title = g.titles?.[locale];
      if (!title) continue;
      const loc = `${BASE_URL}/${locale}/articles/${g.slug}`;
      urls.push(urlNode(loc, LOCALE_LANG_TAG[locale], title, g.published_at));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
