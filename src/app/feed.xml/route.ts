import { supabase } from "@/lib/supabase";

export const revalidate = 14400;

export async function GET() {
  const { data: guides } = await supabase
    .from("guides")
    .select("slug, titles, meta_descs, published_at, category")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  const items = (guides || [])
    .map((g: any) => {
      const title = g.titles?.en || "";
      const description = g.meta_descs?.en || "";
      const link = `https://crete.direct/en/articles/${g.slug}`;
      const pubDate = new Date(g.published_at).toUTCString();
      return `    <item>
      <title><![CDATA[${title}]]></title>
      <link>${link}</link>
      <description><![CDATA[${description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <category>${g.category}</category>
      <guid isPermaLink="true">${link}</guid>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Crete Direct - Travel Guides</title>
    <link>https://crete.direct</link>
    <description>Daily travel guides for Crete, Greece</description>
    <language>en</language>
    <atom:link href="https://crete.direct/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
