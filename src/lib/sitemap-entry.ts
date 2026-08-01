import { INDEXABLE_LOCALES } from "@/i18n/routing";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export type SitemapEntry = {
  path: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: number;
  lastmod?: string;
};

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Une entree <url> du sitemap, avec ses hreflang.
 *
 * Ne declare QUE les locales indexables. Avant le 01/08/2026, cette fonction emettait
 * 22 alternates par entree : avec 3 705 entrees, cela annonçait ~81 500 URL a Google,
 * qui en avait 81 200 dans un index qu'il a fini par deprecier (chute du 19/07/2026).
 * Les 18 autres locales restent servies, simplement plus declarees.
 *
 * Extrait de src/app/sitemap.xml/route.ts pour etre testable : un route handler Next
 * ne peut pas exporter de fonction arbitraire.
 *
 * Spec : docs/superpowers/specs/2026-08-01-seo-locale-scope-design.md
 */
export function sitemapUrlEntry(entry: SitemapEntry, fallbackLastmod: string): string {
  const alternates = INDEXABLE_LOCALES.map(
    (loc) =>
      `    <xhtml:link rel="alternate" hreflang="${loc}" href="${escapeXml(`${BASE_URL}/${loc}${entry.path}`)}" />`,
  ).join("\n");
  const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${BASE_URL}/en${entry.path}`)}" />`;

  const loc = `${BASE_URL}/en${entry.path}`;
  const lastmod = entry.lastmod || fallbackLastmod;

  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
${alternates}
${xDefault}
  </url>`;
}
