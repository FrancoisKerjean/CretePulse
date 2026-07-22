// Corridors van.crete.direct actifs, dupliqués depuis la table van_corridors
// (cretepulse-postgres VPS). Tenus en phase à la main : un corridor ajouté en
// DB doit être ajouté ici pour apparaître sur les pages-trajet bus.
// Vocabulaire slugs bus → corridor : même map que van-crete-direct
// src/lib/slug-aliases.ts (dupliquée, tenir en phase).

export interface VanCorridor {
  slug: string;
  fromName: string;
  toName: string;
  priceEur: number;
}

const BUS_TO_CORRIDOR: Record<string, string> = {
  heraklion: "heraklion-airport",
  chania: "chania-airport",
  "makry-gyalos": "makrigialos",
};

export function normalizeBusSlug(slug: string): string {
  return BUS_TO_CORRIDOR[slug] ?? slug;
}

export const VAN_CORRIDORS: VanCorridor[] = [
  { slug: "heraklion-airport--agios-nikolaos", fromName: "Heraklion Airport", toName: "Agios Nikolaos", priceEur: 20 },
  { slug: "agios-nikolaos--heraklion-airport", fromName: "Agios Nikolaos", toName: "Heraklion Airport", priceEur: 20 },
  { slug: "heraklion-airport--ierapetra", fromName: "Heraklion Airport", toName: "Ierapetra", priceEur: 28 },
  { slug: "ierapetra--heraklion-airport", fromName: "Ierapetra", toName: "Heraklion Airport", priceEur: 28 },
  { slug: "heraklion-airport--makrigialos", fromName: "Heraklion Airport", toName: "Makrigialos", priceEur: 30 },
  { slug: "makrigialos--heraklion-airport", fromName: "Makrigialos", toName: "Heraklion Airport", priceEur: 30 },
  { slug: "heraklion-airport--sitia", fromName: "Heraklion Airport", toName: "Sitia", priceEur: 34 },
  { slug: "sitia--heraklion-airport", fromName: "Sitia", toName: "Heraklion Airport", priceEur: 34 },
  { slug: "heraklion-airport--matala", fromName: "Heraklion Airport", toName: "Matala", priceEur: 24 },
  { slug: "matala--heraklion-airport", fromName: "Matala", toName: "Heraklion Airport", priceEur: 24 },
  { slug: "chania-airport--paleochora", fromName: "Chania Airport", toName: "Paleochora", priceEur: 30 },
  { slug: "paleochora--chania-airport", fromName: "Paleochora", toName: "Chania Airport", priceEur: 30 },
  { slug: "heraklion-airport--rethymno", fromName: "Heraklion Airport", toName: "Rethymno", priceEur: 40 },
  { slug: "rethymno--heraklion-airport", fromName: "Rethymno", toName: "Heraklion Airport", priceEur: 40 },
  { slug: "rethymno--chania-airport", fromName: "Rethymno", toName: "Chania Airport", priceEur: 40 },
  { slug: "chania-airport--rethymno", fromName: "Chania Airport", toName: "Rethymno", priceEur: 40 },
];

const BY_ENDPOINTS = new Map(
  VAN_CORRIDORS.map((c) => {
    const [from, to] = c.slug.split("--");
    return [`${from}|${to}`, c] as const;
  }),
);

/**
 * Corridors van couvrant une paire bus (les deux sens), ou [] si la paire
 * n'est pas couverte. Les slugs passés sont ceux des places bus (BUS_PLACE_SLUGS).
 */
export function vanCorridorsForPair(busSlugA: string, busSlugB: string): VanCorridor[] {
  const a = normalizeBusSlug(busSlugA);
  const b = normalizeBusSlug(busSlugB);
  const out: VanCorridor[] = [];
  const ab = BY_ENDPOINTS.get(`${a}|${b}`);
  const ba = BY_ENDPOINTS.get(`${b}|${a}`);
  if (ab) out.push(ab);
  if (ba) out.push(ba);
  return out;
}
