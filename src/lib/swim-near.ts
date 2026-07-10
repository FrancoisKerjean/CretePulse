// Classement de baignade par position : top N par score dans un rayon, avec
// repli sur les plus proches si le rayon est vide. Zéro I/O, importable client,
// serveur et node (check-swim-near.mjs). Consommé par /api/swim-near (NowPanel v2).
// Spec : docs/superpowers/specs/2026-07-10-swim-near-design.md
import { haversineKm, type GeoPos } from "./geo.ts";

export interface SwimNearItem {
  lat: number;
  lng: number;
  score: number;
}

export interface SwimNearOptions {
  radiusKm?: number;
  fallbackCount?: number;
  limit?: number;
}

/** Top `limit` plages par score dans `radiusKm` autour de `pos`. Rayon vide :
 *  repli sur les `fallbackCount` plus proches, re-triées par score. */
export function pickSwimNear<T extends SwimNearItem>(
  items: T[],
  pos: GeoPos,
  { radiusKm = 25, fallbackCount = 5, limit = 3 }: SwimNearOptions = {},
): Array<T & { km: number }> {
  const withKm: Array<T & { km: number }> = [];
  for (const it of items) {
    if (!Number.isFinite(it.lat) || !Number.isFinite(it.lng)) continue;
    const km = haversineKm([it.lat, it.lng], [pos.lat, pos.lon]);
    withKm.push({ ...it, km: Math.round(km * 10) / 10 });
  }
  const near = withKm.filter((b) => b.km <= radiusKm);
  const pool = near.length > 0
    ? near
    : [...withKm].sort((a, b) => a.km - b.km).slice(0, fallbackCount);
  return pool
    .sort((a, b) => b.score - a.score || a.km - b.km)
    .slice(0, limit);
}
