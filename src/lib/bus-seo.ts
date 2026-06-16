// Helpers SEO pour les pages /buses/[pair]. Pur, zéro I/O.
// Isolé de bus-pairs.ts (refactoré par feat/bus-network) : importe seulement
// ses helpers stables. Spec : docs/superpowers/specs/2026-06-15-buses-seo-canonical-design.md
import { eligiblePairs, pairRoutes, type PairRouteLike } from "./bus-pairs.ts";

/** Route minimale + champs SEO (departures pour la qualité, scraped_at pour lastmod). */
export type SeoRoute = PairRouteLike & {
  departures?: unknown[] | null;
  scraped_at?: string | null;
};

function hasDepartures(rs: SeoRoute[]): boolean {
  return rs.some((r) => Array.isArray(r.departures) && r.departures.length > 0);
}

/** Une paire est DIGNE d'indexation si au moins un sens a des horaires publiés. */
export function pairHasTimetable(routes: SeoRoute[], slug: string): boolean {
  const pr = pairRoutes(routes, slug);
  if (!pr) return false;
  return hasDepartures(pr.outbound) || hasDepartures(pr.inbound);
}

/** Slugs des paires dignes (triés), pour le sitemap et les liens internes. */
export function qualityPairSlugs(routes: SeoRoute[]): string[] {
  return eligiblePairs(routes)
    .map((p) => p.slug)
    .filter((slug) => pairHasTimetable(routes, slug))
    .sort((a, b) => a.localeCompare(b));
}

/** lastmod honnête = max(scraped_at) des routes de la paire, ou null. */
export function pairLastmod(routes: SeoRoute[], slug: string): string | null {
  const pr = pairRoutes(routes, slug);
  if (!pr) return null;
  const dates = [...pr.outbound, ...pr.inbound]
    .map((r) => r.scraped_at)
    .filter((d): d is string => typeof d === "string");
  if (dates.length === 0) return null;
  return dates.reduce((max, d) => (d > max ? d : max));
}

// Noms de villes de la page compare -> slug bus. Seules les villes qui ONT des
// pages-trajet (grandes villes desservies). Les comparaisons island/beach -> null.
const COMPARE_CITY_SLUG: Record<string, string> = {
  Heraklion: "heraklion",
  Chania: "chania",
  Rethymno: "rethymno",
  "Agios Nikolaos": "agios-nikolaos",
  Ierapetra: "ierapetra",
  Sitia: "sitia",
  Malia: "malia",
  Hersonissos: "hersonissos",
  Elounda: "elounda",
};

/** Slug de page-trajet correspondant à une comparaison de 2 villes, si la paire existe. */
export function compareToPairSlug(routes: SeoRoute[], a: string, b: string): string | null {
  const sa = COMPARE_CITY_SLUG[a];
  const sb = COMPARE_CITY_SLUG[b];
  if (!sa || !sb || sa === sb) return null;
  const slug = sa < sb ? `${sa}-to-${sb}` : `${sb}-to-${sa}`;
  return eligiblePairs(routes).some((p) => p.slug === slug) ? slug : null;
}
