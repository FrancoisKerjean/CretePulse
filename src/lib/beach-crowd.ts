// Affluence estimée par plage, précalculée par scripts/build-beach-crowd-scores.mjs
// (fréquentation observée cb_places.crowds dominante + pression Airbnb 31K
// listings en modulation — la méthode complète est dans le script et dans le
// champ `method` du JSON). Pure, zéro I/O : importable serveur et client.
// Spec : docs/SPEC-BEACHES-DATA.md (lot 2)
import data from "../data/beach-crowd-scores.json" with { type: "json" };
import { haversineKm } from "./geo";
import type { Beach } from "./types";

export type CrowdBand = "quiet" | "moderate" | "busy";

export interface CrowdScore {
  score: number; // 0-100, 100 = pression maximale
  band: CrowdBand;
  crowds: string | null; // observation terrain brute (cb_places), si matchée
}

const SCORES = data.beaches as Record<string, CrowdScore>;

export function getCrowdScore(slug: string): CrowdScore | null {
  return SCORES[slug] ?? null;
}

export interface QuieterAlternative {
  beach: Beach;
  km: number;
  crowd: CrowdScore;
}

/**
 * Plages nettement plus calmes autour d'une plage fréquentée : même région,
 * <= 25 km, score inférieur d'au moins 15 points, triées par distance.
 * Renvoie [] si la plage est déjà quiet (rien à redistribuer) ou sans score.
 */
export function quieterAlternatives(
  beach: Beach,
  candidates: Beach[],
  limit = 4,
): QuieterAlternative[] {
  const here = getCrowdScore(beach.slug);
  if (!here || here.band === "quiet") return [];
  const out: QuieterAlternative[] = [];
  for (const c of candidates) {
    if (c.slug === beach.slug) continue;
    const crowd = getCrowdScore(c.slug);
    if (!crowd || crowd.score > here.score - 15) continue;
    const km = haversineKm([beach.latitude, beach.longitude], [c.latitude, c.longitude]);
    if (km > 25) continue;
    out.push({ beach: c, km: Math.round(km * 10) / 10, crowd });
  }
  return out.sort((a, b) => a.km - b.km).slice(0, limit);
}
