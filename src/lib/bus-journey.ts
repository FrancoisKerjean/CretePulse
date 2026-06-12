// Moteur d'itineraire bus : fonctions pures, zero I/O (import type uniquement),
// executees cote client sur les routes deja chargees par la page /buses.
// Teste par scripts/check-bus-journey.mjs (node, type-stripping).
// Spec : docs/superpowers/specs/2026-06-10-bus-journey-planner-design.md
import type { BusRoute } from "./buses";

export interface JourneyLeg {
  route: BusRoute;
  /** Departs du jour choisi (filtres par la marge de correspondance pour le tronçon 2). */
  times: string[];
  /** Arret intermediaire ou descendre (via_stops). null = terminus de la route.
   * KTEL ne publie pas les heures de passage : prix et duree du tronçon inconnus. */
  alightAt: string | null;
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

/** Le libelle de jours KTEL couvre-t-il ce jour ?
 * herlas : "Mon, Tue, Wed", "Sun", "Mon-Fri".
 * ektel (PDF) : "Monday To Friday", "Weekend", "Every Day", "Thursday Saktouria". */
function daysMatch(days: string, day: string): boolean {
  let norm = days.toLowerCase();
  if (norm.includes("every") || norm.includes("daily")) return true;
  const d = day.toLowerCase();
  if (norm.includes("weekend")) return d === "sat" || d === "sun";
  // noms complets -> tokens 3 lettres ("monday to friday" -> "mon to fri")
  norm = norm.replace(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*/g, "$1");
  const range = norm.match(/(mon|tue|wed|thu|fri|sat|sun)\s*(?:[-–]|to)\s*(mon|tue|wed|thu|fri|sat|sun)/);
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

/** Arc du graphe : on monte au terminus de depart de `route` et on descend
 * soit au terminus d'arrivee (alightAt null), soit a un arret intermediaire
 * de via_stops. On ne MONTE jamais a un arret intermediaire : KTEL ne publie
 * que les heures de depart du terminus (regle no-invention). */
export interface BusEdge {
  route: BusRoute;
  alightAt: string | null;
}

export function edgeDest(e: BusEdge): string {
  return e.alightAt ?? e.route.to_place;
}

export interface BusGraph {
  routes: BusRoute[];
  byFrom: Map<string, BusEdge[]>;
}

export function buildGraph(routes: BusRoute[]): BusGraph {
  const byFrom = new Map<string, BusEdge[]>();
  const push = (from: string, e: BusEdge) => {
    const list = byFrom.get(from) ?? [];
    list.push(e);
    byFrom.set(from, list);
  };
  for (const r of routes) {
    push(r.from_place, { route: r, alightAt: null });
    for (const v of r.via_stops ?? []) {
      if (v !== r.from_place && v !== r.to_place) push(r.from_place, { route: r, alightAt: v });
    }
  }
  return { routes, byFrom };
}

/** Destinations atteignables (direct ou 1 correspondance), triees, sans le depart. */
export function reachableFrom(g: BusGraph, from: string): string[] {
  const out = new Set<string>();
  for (const e1 of g.byFrom.get(from) ?? []) {
    const mid = edgeDest(e1);
    out.add(mid);
    for (const e2 of g.byFrom.get(mid) ?? []) out.add(edgeDest(e2));
  }
  out.delete(from);
  return [...out].sort((a, b) => a.localeCompare(b));
}

/** Duree exploitable du tronçon : connue seulement si on va au terminus
 * (la duree publiee couvre la route entiere, pas un arret intermediaire). */
function legDurationMin(route: BusRoute, alightAt: string | null): number | null {
  return alightAt == null ? parseDurationMin(route.duration) : null;
}

export function findJourneys(g: BusGraph, from: string, to: string, dateISO: string): Journey[] {
  const directs: Journey[] = [];
  for (const e of g.byFrom.get(from) ?? []) {
    if (edgeDest(e) !== to) continue;
    const times = timesForDate(e.route, dateISO);
    if (times.length === 0) continue;
    directs.push(makeJourney([{ route: e.route, times, alightAt: e.alightAt }], null));
  }
  if (directs.length > 0) {
    // La ligne commune Chania-Rethymno-Heraklion est publiee par les DEUX
    // KTEL : memes horaires, meme prix -> un seul itineraire affiche.
    const seen = new Set<string>();
    const unique = directs.filter((j) => {
      const l = j.legs[0];
      const key = `${l.alightAt ?? ""}|${l.times.join(",")}|${j.priceTotal ?? "?"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // terminus direct d'abord (prix/duree connus), descentes en route ensuite
    return unique
      .sort((a, b) =>
        Number(a.legs[0].alightAt != null) - Number(b.legs[0].alightAt != null) ||
        score(b) - score(a))
      .slice(0, MAX_JOURNEYS);
  }

  const transfers: Journey[] = [];
  for (const e1 of g.byFrom.get(from) ?? []) {
    const hub = edgeDest(e1);
    if (hub === to) continue;
    const t1 = timesForDate(e1.route, dateISO);
    if (t1.length === 0) continue;
    for (const e2 of g.byFrom.get(hub) ?? []) {
      if (edgeDest(e2) !== to) continue;
      let t2 = timesForDate(e2.route, dateISO);
      if (t2.length === 0) continue;
      const dur = legDurationMin(e1.route, e1.alightAt);
      if (dur != null) {
        const earliestArrival = addMinutes(t1[0], dur + TRANSFER_MARGIN_MIN);
        t2 = t2.filter((t) => t >= earliestArrival);
        if (t2.length === 0) continue;
      }
      transfers.push(makeJourney(
        [
          { route: e1.route, times: t1, alightAt: e1.alightAt },
          { route: e2.route, times: t2, alightAt: e2.alightAt },
        ],
        hub,
      ));
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
  // a volume de departs egal, un itineraire sans descente en route prime
  // (prix et duree connus, correspondance verifiable)
  const alightPenalty = j.legs.filter((l) => l.alightAt != null).length;
  return j.legs.reduce((n, l) => n + l.times.length, 0) - alightPenalty;
}

function makeJourney(legs: JourneyLeg[], hub: string | null): Journey {
  // Descente a un arret intermediaire : le prix publie couvre la route entiere,
  // pas le tronçon partiel -> prix inconnu (no-invention), « tarif au guichet ».
  const prices = legs.map((l) => (l.alightAt != null ? null : l.route.price_eur));
  const priceIncomplete = prices.some((p) => p == null);
  const priceTotal = priceIncomplete
    ? null
    : Math.round((prices as number[]).reduce((s, p) => s + p, 0) * 100) / 100;
  return {
    legs,
    hub,
    priceTotal,
    priceEstimated: legs.some((l) => l.alightAt == null && l.route.price_estimated === true),
    priceIncomplete,
    durationKnown: legDurationMin(legs[0].route, legs[0].alightAt) != null,
  };
}
