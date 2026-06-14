// Paires de lieux "dignes" pour les pages SEO /buses/[pair].
// Pur, zero I/O (import type) : importable client (RouteCard), serveur
// (page, sitemap) et node (scripts/check-bus-pairs.mjs).
// Spec : docs/superpowers/specs/2026-06-10-bus-pair-pages-design.md
import type { BusRoute } from "./buses";
import busPlaceSlugs from "../data/bus-places.json" with { type: "json" };

/** Route minimale acceptee par les helpers (le sitemap ne select que from/to). */
export type PairRouteLike = Pick<BusRoute, "from_place" | "to_place">;

// Lieu DB (orthographe exacte bus_routes) -> slug URL. Source unique partagée avec
// le pipeline réseau (scripts/scrapers/buses/net_places.py). Un lieu absent = jamais
// de page (arrets hotels, supermarches, bruit).
export const BUS_PLACE_SLUGS: Record<string, string> = busPlaceSlugs;

export interface BusPair {
  slug: string;
  placeA: string; // nom DB, slug alphabetiquement premier
  placeB: string;
}

export function slugifyPlace(place: string): string | null {
  return BUS_PLACE_SLUGS[place] ?? null;
}

/** Slug stable de la paire (ordre alphabetique des slugs), null si un bout est indigne. */
export function pairSlug(a: string, b: string): string | null {
  const sa = slugifyPlace(a);
  const sb = slugifyPlace(b);
  if (!sa || !sb || sa === sb) return null;
  return sa < sb ? `${sa}-to-${sb}` : `${sb}-to-${sa}`;
}

/** Paires bidirectionnelles eligibles (routes directes entre lieux dignes). */
export function eligiblePairs(routes: PairRouteLike[]): BusPair[] {
  const bySlug = new Map<string, BusPair>();
  for (const r of routes) {
    const slug = pairSlug(r.from_place, r.to_place);
    if (!slug || bySlug.has(slug)) continue;
    const sa = slugifyPlace(r.from_place)!;
    const sb = slugifyPlace(r.to_place)!;
    const [placeA, placeB] = sa < sb
      ? [r.from_place, r.to_place]
      : [r.to_place, r.from_place];
    bySlug.set(slug, { slug, placeA, placeB });
  }
  return [...bySlug.values()].sort((x, y) => x.slug.localeCompare(y.slug));
}

export interface PairRoutes<T extends PairRouteLike> {
  pair: BusPair;
  outbound: T[]; // placeA -> placeB (toutes orthographes mappant les memes slugs)
  inbound: T[];  // placeB -> placeA
}

export function pairRoutes<T extends PairRouteLike>(
  routes: T[],
  slug: string,
): PairRoutes<T> | null {
  const pair = eligiblePairs(routes).find((p) => p.slug === slug);
  if (!pair) return null;
  const sa = slugifyPlace(pair.placeA)!;
  const sb = slugifyPlace(pair.placeB)!;
  const outbound = routes.filter(
    (r) => slugifyPlace(r.from_place) === sa && slugifyPlace(r.to_place) === sb,
  );
  const inbound = routes.filter(
    (r) => slugifyPlace(r.from_place) === sb && slugifyPlace(r.to_place) === sa,
  );
  return { pair, outbound, inbound };
}

/** Destinations directes dignes depuis `place`, hors `exclude` (bloc "continuer vers"). */
export function onwardPlaces(
  routes: PairRouteLike[],
  place: string,
  exclude: string,
): string[] {
  const sx = slugifyPlace(exclude);
  const out = new Set<string>();
  for (const r of routes) {
    if (r.from_place !== place) continue;
    const s = slugifyPlace(r.to_place);
    if (s && s !== sx && s !== slugifyPlace(place)) out.add(r.to_place);
  }
  return [...out].sort((a, b) => a.localeCompare(b));
}
