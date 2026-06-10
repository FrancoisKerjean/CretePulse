// Moteur d'itineraire bus : fonctions pures, zero I/O (import type uniquement),
// executees cote client sur les routes deja chargees par la page /buses.
// Teste par scripts/check-bus-journey.mjs (node, type-stripping).
// Spec : docs/superpowers/specs/2026-06-10-bus-journey-planner-design.md
import type { BusRoute } from "./buses";

export interface JourneyLeg {
  route: BusRoute;
  /** Departs du jour choisi (filtres par la marge de correspondance pour le tronçon 2). */
  times: string[];
}

export interface Journey {
  legs: JourneyLeg[];           // 1 = direct, 2 = correspondance
  hub: string | null;           // lieu de correspondance
  priceTotal: number | null;    // null si un tronçon n'a pas de prix
  priceEstimated: boolean;      // au moins un tronçon estime -> mention « indicatif »
  priceIncomplete: boolean;     // au moins un tronçon sans prix -> « + tarif au guichet »
  durationKnown: boolean;       // duree tronçon 1 connue -> correspondance filtree
}

const DAY_TOKENS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TRANSFER_MARGIN_MIN = 15;
const MAX_JOURNEYS = 3;

/** Jour de semaine ("Mon".."Sun") d'une date calendaire YYYY-MM-DD. */
export function dayToken(dateISO: string): string {
  return DAY_TOKENS[new Date(`${dateISO}T12:00:00Z`).getUTCDay()];
}

/** "2h 30min" -> 150 ; "50min" -> 50 ; "1h" -> 60 ; sinon null. */
export function parseDurationMin(duration: string | null): number | null {
  if (!duration) return null;
  const h = duration.match(/(\d+)\s*h/i);
  const m = duration.match(/(\d+)\s*min/i);
  if (!h && !m) return null;
  return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Le libelle de jours KTEL ("Mon, Tue, ...", "Sun", "Mon-Fri", "EVERY DAY") couvre-t-il ce jour ? */
function daysMatch(days: string, day: string): boolean {
  const norm = days.toLowerCase();
  if (norm.includes("every") || norm.includes("daily")) return true;
  const d = day.toLowerCase();
  const range = norm.match(/(mon|tue|wed|thu|fri|sat|sun)\s*[-–]\s*(mon|tue|wed|thu|fri|sat|sun)/);
  if (range) {
    const i = DAY_ORDER.indexOf(range[1]);
    const j = DAY_ORDER.indexOf(range[2]);
    const k = DAY_ORDER.indexOf(d);
    return i <= j ? k >= i && k <= j : k >= i || k <= j;
  }
  return norm.includes(d);
}

/** Departs de la route pour une date donnee (sous-grille du jour, fallback flat). */
export function timesForDate(route: BusRoute, dateISO: string): string[] {
  const day = dayToken(dateISO);
  const groups = route.departures_by_day;
  if (groups && groups.length > 0) {
    const out = new Set<string>();
    for (const g of groups) {
      if (daysMatch(g.days, day)) for (const t of g.times) out.add(t);
    }
    return [...out].sort();
  }
  return route.departures ?? [];
}

export interface BusGraph {
  routes: BusRoute[];
  byFrom: Map<string, BusRoute[]>;
}

export function buildGraph(routes: BusRoute[]): BusGraph {
  const byFrom = new Map<string, BusRoute[]>();
  for (const r of routes) {
    const list = byFrom.get(r.from_place) ?? [];
    list.push(r);
    byFrom.set(r.from_place, list);
  }
  return { routes, byFrom };
}

/** Destinations atteignables (direct ou 1 correspondance), triees, sans le depart. */
export function reachableFrom(g: BusGraph, from: string): string[] {
  const out = new Set<string>();
  for (const r1 of g.byFrom.get(from) ?? []) {
    out.add(r1.to_place);
    for (const r2 of g.byFrom.get(r1.to_place) ?? []) out.add(r2.to_place);
  }
  out.delete(from);
  return [...out].sort((a, b) => a.localeCompare(b));
}

export function findJourneys(g: BusGraph, from: string, to: string, dateISO: string): Journey[] {
  const directs: Journey[] = [];
  for (const r of g.byFrom.get(from) ?? []) {
    if (r.to_place !== to) continue;
    const times = timesForDate(r, dateISO);
    if (times.length === 0) continue;
    directs.push(makeJourney([{ route: r, times }], null));
  }
  if (directs.length > 0) return directs.slice(0, MAX_JOURNEYS);

  const transfers: Journey[] = [];
  for (const r1 of g.byFrom.get(from) ?? []) {
    if (r1.to_place === to) continue;
    const t1 = timesForDate(r1, dateISO);
    if (t1.length === 0) continue;
    for (const r2 of g.byFrom.get(r1.to_place) ?? []) {
      if (r2.to_place !== to) continue;
      let t2 = timesForDate(r2, dateISO);
      if (t2.length === 0) continue;
      const dur = parseDurationMin(r1.duration);
      if (dur != null) {
        const earliestArrival = addMinutes(t1[0], dur + TRANSFER_MARGIN_MIN);
        t2 = t2.filter((t) => t >= earliestArrival);
        if (t2.length === 0) continue;
      }
      transfers.push(makeJourney([{ route: r1, times: t1 }, { route: r2, times: t2 }], r1.to_place));
    }
  }
  // un seul itineraire par hub, les mieux desservis d'abord
  const byHub = new Map<string, Journey>();
  for (const j of transfers) {
    const prev = byHub.get(j.hub!);
    if (!prev || score(j) > score(prev)) byHub.set(j.hub!, j);
  }
  return [...byHub.values()].sort((a, b) => score(b) - score(a)).slice(0, MAX_JOURNEYS);
}

function score(j: Journey): number {
  return j.legs.reduce((n, l) => n + l.times.length, 0);
}

function makeJourney(legs: JourneyLeg[], hub: string | null): Journey {
  const prices = legs.map((l) => l.route.price_eur);
  const priceIncomplete = prices.some((p) => p == null);
  const priceTotal = priceIncomplete
    ? null
    : Math.round((prices as number[]).reduce((s, p) => s + p, 0) * 100) / 100;
  return {
    legs,
    hub,
    priceTotal,
    priceEstimated: legs.some((l) => l.route.price_estimated === true),
    priceIncomplete,
    durationKnown: parseDurationMin(legs[0].route.duration) != null,
  };
}
