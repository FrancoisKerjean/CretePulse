// Prochains departs DEPUIS un lieu, toutes lignes confondues (modele gare routiere).
// Pur, zero I/O (import type) : testable node + utilisable client.
// L'heure est injectee (nowMinutes) pour rester deterministe ; le composant
// la fournit via la TZ Athenes. Teste par scripts/check-bus-departures.mjs.
import type { BusRoute } from "./buses";
// Extensions .ts explicites : runtime imports résolus par le loader node du test
// (allowImportingTsExtensions activé, même convention que check-bus-*.mjs).
import { timesForDate } from "./bus-journey.ts";
import { pairSlug } from "./bus-pairs.ts";

export interface DepartureRow {
  routeId: number;
  time: string;              // "14:00"
  toPlace: string;
  durationLabel: string | null;
  priceEur: number | null;
  priceEstimated: boolean;
  pairSlug: string | null;   // page paire si digne, sinon null
  minutesUntil: number | null; // null pour un jour futur ou demain
  isTomorrow: boolean;
}

const toMin = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Departs depuis `place` le jour `dateISO`, tries par heure (modele panneau de gare :
 * CHAQUE bus a venir est une ligne, meme plusieurs vers la meme destination).
 * - nowMinutes != null (jour courant) : tous les departs >= now, minutesUntil renseigne.
 *   Si plus rien aujourd'hui : bascule sur opts.tomorrowISO (premier bus de chaque
 *   ligne, isTomorrow=true, minutesUntil=null) pour que le board vive meme tard.
 * - nowMinutes == null (jour futur) : tous les departs du jour, sans countdown.
 */
export function departuresFrom(
  routes: BusRoute[],
  place: string,
  dateISO: string,
  nowMinutes: number | null,
  opts: { tomorrowISO?: string } = {},
): DepartureRow[] {
  const fromHere = routes.filter((r) => r.from_place === place);

  const build = (r: BusRoute, time: string, until: number | null, tomorrow: boolean): DepartureRow => ({
    routeId: r.id,
    time,
    toPlace: r.to_place,
    durationLabel: r.duration,
    priceEur: r.price_eur,
    priceEstimated: r.price_estimated === true,
    pairSlug: pairSlug(r.from_place, r.to_place),
    minutesUntil: until,
    isTomorrow: tomorrow,
  });

  const rows: DepartureRow[] = [];
  for (const r of fromHere) {
    const times = timesForDate(r, dateISO);
    for (const t of times) {
      if (nowMinutes == null) {
        rows.push(build(r, t, null, false));
      } else if (toMin(t) >= nowMinutes) {
        rows.push(build(r, t, toMin(t) - nowMinutes, false));
      }
    }
  }

  // Jour courant, plus aucun depart restant -> montrer demain (le board vit toujours)
  if (nowMinutes != null && rows.length === 0 && opts.tomorrowISO) {
    for (const r of fromHere) {
      const first = timesForDate(r, opts.tomorrowISO).slice().sort((a, b) => toMin(a) - toMin(b))[0];
      if (first) rows.push(build(r, first, null, true));
    }
  }

  return rows.sort((a, b) => toMin(a.time) - toMin(b.time));
}

/** Liste triee des lieux de depart ayant au moins une ligne (pour les pills). */
export function originPlaces(routes: BusRoute[]): string[] {
  return [...new Set(routes.map((r) => r.from_place))].sort((a, b) => a.localeCompare(b));
}
