import type { DateRange } from "./ical";

const DAY_MS = 86_400_000;

function toMs(iso: string): number {
  return new Date(iso + "T00:00:00Z").getTime();
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Nuits couvertes par une plage, borne de sortie exclue : une nuit porte la date
 * a laquelle on dort sur place, donc un sejour du 1er au 4 occupe 1, 2 et 3.
 * C'est la meme convention que la contrainte GIST en base, daterange '[)'.
 */
export function eachNight(dateFrom: string, dateTo: string): string[] {
  const from = toMs(dateFrom);
  const to = toMs(dateTo);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return [];
  const out: string[] = [];
  for (let t = from; t < to; t += DAY_MS) out.push(toIso(t));
  return out;
}

/**
 * Vrai si aucune nuit de [dateFrom, dateTo[ n'est deja prise. Deux sejours qui se
 * touchent (depart de l'un = arrivee de l'autre) ne se chevauchent pas.
 */
export function isRangeFree(
  booked: DateRange[],
  dateFrom: string,
  dateTo: string,
): boolean {
  const from = toMs(dateFrom);
  const to = toMs(dateTo);
  return !booked.some((r) => toMs(r.dateFrom) < to && from < toMs(r.dateTo));
}

/** Toutes les nuits indisponibles, dedoublonnees et triees. */
export function unavailableNights(booked: DateRange[]): string[] {
  const set = new Set<string>();
  for (const r of booked) {
    for (const n of eachNight(r.dateFrom, r.dateTo)) set.add(n);
  }
  return [...set].sort();
}
