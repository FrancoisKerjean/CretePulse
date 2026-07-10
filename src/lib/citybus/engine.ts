// Moteur PUR générique des calculateurs de trajets urbains citybus.gr (Heraklion, Chania, …).
// Zéro I/O. createCitybusEngine(data) renvoie les fonctions du planner pour un réseau donné.
// Routes LINÉAIRES et DIRECTIONNELLES (pas de wrap) : A->B seulement si A précède B sur une
// même route. Pas d'horaire (cadence non uniforme) : on estime le temps de parcours.
import type { CitybusData, CitybusRoute } from "./types";
import { haversineKm } from "../geo.ts";

const WAIT_MIN = 10; // attente nominale de correspondance (rang seulement)

export interface CitybusLeg {
  lineCode: string; lineName: string; hex: string | null; headsign: string; routeCode: string;
  fromSlug: string; toSlug: string; fromName: string; toName: string; minutes: number; stops: number;
}
export interface CitybusTrip { legs: CitybusLeg[]; totalMinutes: number; transfers: number; }
export interface CitybusPlace { label: string; lat: number; lng: number; kind: "stop" | "place"; slug?: string; }
export interface CitybusDoorPlan {
  fromStop: { slug: string; name: string } | null; toStop: { slug: string; name: string } | null;
  walkFromMin: number; walkToMin: number; bus: CitybusTrip | null; busTotalMin: number;
  directWalkMin: number; recommendWalk: boolean; tooFar: boolean;
}
export interface CitybusEngine {
  findTrips(fromSlug: string, toSlug: string): CitybusTrip[];
  stopOptions(): { slug: string; name: string; nameEl: string }[];
  searchStops(query: string, limit?: number): CitybusPlace[];
  nearestStop(lat: number, lng: number): { slug: string; name: string; lat: number; lng: number; distKm: number } | null;
  planDoorToDoor(from: { lat: number; lng: number }, to: { lat: number; lng: number }): CitybusDoorPlan;
}

const GREEK_MAP: Record<string, string> = { Α: "A", Β: "V", Γ: "G", Δ: "D", Ε: "E", Ζ: "Z", Η: "I", Θ: "Th", Ι: "I", Κ: "K", Λ: "L", Μ: "M", Ν: "N", Ξ: "X", Ο: "O", Π: "P", Ρ: "R", Σ: "S", Τ: "T", Υ: "Y", Φ: "F", Χ: "Ch", Ψ: "Ps", Ω: "O" };
function norm(s: string): string {
  return s.replace(/[Α-Ω]/g, (c) => GREEK_MAP[c] ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
export function walkMinFromKm(km: number): number {
  return Math.max(1, Math.round(((km * 1.35) / 4.5) * 60));
}

export function createCitybusEngine(data: CitybusData): CitybusEngine {
  const { stops: STOPS, lines: LINES, routes: ROUTES } = data;
  const lineByCode = new Map(LINES.map((l) => [l.code, l]));

  const routesByStop = new Map<string, { route: CitybusRoute; seq: number }[]>();
  for (const route of ROUTES) {
    route.stops.forEach((s, seq) => {
      const arr = routesByStop.get(s.slug) ?? [];
      arr.push({ route, seq });
      routesByStop.set(s.slug, arr);
    });
  }

  const NEIGHBOR_KM = 0.15; // arrêts jumeaux : extension origine/destination à ~2 min de marche
  let neighborCache: Map<string, { slug: string; walkMin: number }[]> | null = null;
  function neighborsOf(slug: string): { slug: string; walkMin: number }[] {
    if (!neighborCache) {
      neighborCache = new Map();
      const all = Object.values(STOPS);
      for (const s of all) {
        const near: { slug: string; walkMin: number }[] = [];
        for (const o of all) {
          if (o.slug === s.slug) continue;
          const d = haversineKm([s.lat, s.lng], [o.lat, o.lng]);
          if (d <= NEIGHBOR_KM) near.push({ slug: o.slug, walkMin: walkMinFromKm(d) });
        }
        if (near.length) neighborCache.set(s.slug, near);
      }
    }
    return neighborCache.get(slug) ?? [];
  }

  function makeLeg(route: CitybusRoute, i: number, j: number): CitybusLeg {
    const a = route.stops[i], b = route.stops[j];
    const line = lineByCode.get(route.lineCode);
    return {
      lineCode: route.lineCode, lineName: line?.name ?? route.lineCode, hex: line?.hex ?? null,
      headsign: route.name, routeCode: route.code, fromSlug: a.slug, toSlug: b.slug,
      fromName: STOPS[a.slug]?.name ?? a.slug, toName: STOPS[b.slug]?.name ?? b.slug,
      minutes: Math.max(1, Math.round(b.cumMin - a.cumMin)), stops: j - i,
    };
  }

  function legsFrom(fromSlug: string): Map<string, CitybusLeg> {
    const best = new Map<string, CitybusLeg>();
    for (const { route, seq: i } of routesByStop.get(fromSlug) ?? []) {
      for (let j = i + 1; j < route.stops.length; j++) {
        const dest = route.stops[j].slug;
        if (dest === fromSlug) continue;
        const leg = makeLeg(route, i, j);
        const prev = best.get(dest);
        if (!prev || leg.minutes < prev.minutes) best.set(dest, leg);
      }
    }
    return best;
  }
  function legsTo(toSlug: string): Map<string, CitybusLeg> {
    const best = new Map<string, CitybusLeg>();
    for (const { route, seq: j } of routesByStop.get(toSlug) ?? []) {
      for (let k = 0; k < j; k++) {
        const x = route.stops[k].slug;
        if (x === toSlug) continue;
        const leg = makeLeg(route, k, j);
        const prev = best.get(x);
        if (!prev || leg.minutes < prev.minutes) best.set(x, leg);
      }
    }
    return best;
  }

  // Recherche sur une paire d'arrêts EXACTE (l'utilisateur est sur ces quais précis).
  function findTripsExact(fromSlug: string, toSlug: string): CitybusTrip[] {
    if (!fromSlug || !toSlug || fromSlug === toSlug) return [];
    const trips: CitybusTrip[] = [];
    const fromLegs = legsFrom(fromSlug);
    const toLegs = legsTo(toSlug);

    const bestDirectByLine = new Map<string, CitybusTrip>();
    if (fromLegs.get(toSlug)) {
      for (const { route, seq: i } of routesByStop.get(fromSlug) ?? []) {
        const j = route.stops.findIndex((s, idx) => idx > i && s.slug === toSlug);
        if (j < 0) continue;
        const leg = makeLeg(route, i, j);
        const prev = bestDirectByLine.get(leg.lineCode);
        if (!prev || leg.minutes < prev.totalMinutes) bestDirectByLine.set(leg.lineCode, { legs: [leg], totalMinutes: leg.minutes, transfers: 0 });
      }
    }
    for (const t of bestDirectByLine.values()) trips.push(t);

    const bestByPair = new Map<string, CitybusTrip>();
    for (const [x, leg1] of fromLegs) {
      if (x === toSlug || x === fromSlug) continue;
      const leg2 = toLegs.get(x);
      if (!leg2 || leg2.lineCode === leg1.lineCode) continue;
      const total = leg1.minutes + WAIT_MIN + leg2.minutes;
      const key = `${leg1.lineCode}>${leg2.lineCode}`;
      const prev = bestByPair.get(key);
      if (!prev || total < prev.totalMinutes) bestByPair.set(key, { legs: [leg1, leg2], totalMinutes: total, transfers: 1 });
    }
    const bestDirect = Math.min(Infinity, ...trips.map((t) => t.totalMinutes));
    for (const t of bestByPair.values()) if (t.totalMinutes < bestDirect) trips.push(t);

    trips.sort((a, b) => a.transfers - b.transfers || a.totalMinutes - b.totalMinutes);
    const seen = new Set<string>();
    const out: CitybusTrip[] = [];
    for (const t of trips) {
      const sig = t.legs.map((l) => l.lineCode).join(">") + "|" + t.totalMinutes;
      if (seen.has(sig)) continue;
      seen.add(sig);
      out.push(t);
      if (out.length >= 4) break;
    }
    return out;
  }

  // Recherche publique : étend origine et destination aux arrêts jumeaux (<=150 m),
  // pénalité de marche incluse dans totalMinutes ; les legs affichent l'arrêt réel utilisé.
  function findTrips(fromSlug: string, toSlug: string): CitybusTrip[] {
    if (!fromSlug || !toSlug || fromSlug === toSlug) return [];
    const origins = [{ slug: fromSlug, walkMin: 0 }, ...neighborsOf(fromSlug)];
    const dests = [{ slug: toSlug, walkMin: 0 }, ...neighborsOf(toSlug)];
    const all: CitybusTrip[] = [];
    for (const o of origins) {
      for (const d of dests) {
        if (o.slug === d.slug) continue;
        for (const t of findTripsExact(o.slug, d.slug)) {
          const walk = o.walkMin + d.walkMin;
          all.push(walk ? { ...t, totalMinutes: t.totalMinutes + walk } : t);
        }
      }
    }
    all.sort((a, b) => a.transfers - b.transfers || a.totalMinutes - b.totalMinutes);
    const seen = new Set<string>();
    const out: CitybusTrip[] = [];
    for (const t of all) {
      const sig = t.legs.map((l) => l.lineCode).join(">");
      if (seen.has(sig)) continue;
      seen.add(sig);
      out.push(t);
      if (out.length >= 4) break;
    }
    return out;
  }

  function stopOptions() {
    return Object.values(STOPS).map((s) => ({ slug: s.slug, name: s.name, nameEl: s.nameEl })).sort((a, b) => a.name.localeCompare(b.name));
  }
  function searchStops(query: string, limit = 6): CitybusPlace[] {
    const q = norm(query);
    if (q.length < 2) return [];
    return Object.values(STOPS)
      .filter((s) => norm(s.name).includes(q) || norm(s.nameEl).includes(q))
      .slice(0, limit)
      .map((s) => ({ label: s.name, lat: s.lat, lng: s.lng, kind: "stop" as const, slug: s.slug }));
  }
  function nearestStop(lat: number, lng: number) {
    let best: { slug: string; name: string; lat: number; lng: number } | null = null, bd = Infinity;
    for (const s of Object.values(STOPS)) {
      const d = haversineKm([lat, lng], [s.lat, s.lng]);
      if (d < bd) { bd = d; best = { slug: s.slug, name: s.name, lat: s.lat, lng: s.lng }; }
    }
    return best ? { ...best, distKm: bd } : null;
  }
  function planDoorToDoor(from: { lat: number; lng: number }, to: { lat: number; lng: number }): CitybusDoorPlan {
    const directWalkMin = walkMinFromKm(haversineKm([from.lat, from.lng], [to.lat, to.lng]));
    const fs = nearestStop(from.lat, from.lng);
    const ts = nearestStop(to.lat, to.lng);
    if (!fs || !ts) return { fromStop: null, toStop: null, walkFromMin: 0, walkToMin: 0, bus: null, busTotalMin: Infinity, directWalkMin, recommendWalk: true, tooFar: true };
    const walkFromMin = walkMinFromKm(fs.distKm);
    const walkToMin = walkMinFromKm(ts.distKm);
    const tooFar = fs.distKm > 1.3 || ts.distKm > 1.3;
    const trips = fs.slug === ts.slug ? [] : findTrips(fs.slug, ts.slug);
    const bus = trips[0] ?? null;
    const busTotalMin = bus ? walkFromMin + bus.totalMinutes + walkToMin : Infinity;
    const recommendWalk = directWalkMin <= busTotalMin;
    return { fromStop: { slug: fs.slug, name: fs.name }, toStop: { slug: ts.slug, name: ts.name }, walkFromMin, walkToMin, bus, busTotalMin, directWalkMin, recommendWalk, tooFar };
  }

  return { findTrips, stopOptions, searchStops, nearestStop, planDoorToDoor };
}
