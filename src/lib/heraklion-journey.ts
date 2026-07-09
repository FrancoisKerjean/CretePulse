// Moteur PUR du calculateur de trajets urbain d'Heraklion (Αστικό ΚΤΕΛ Ηρακλείου).
// Zéro I/O : consomme src/data/heraklion-bus.ts (généré depuis l'API citybus.gr).
// Distinct du planner Agios Nikolaos (src/lib/urban-journey.ts) : là-bas les lignes sont
// des BOUCLES cycliques ; ici les routes sont LINÉAIRES et DIRECTIONNELLES (81 routes /
// 23 lignes), donc pas de wrap : on ne dessert A->B que si A précède B sur la même route.
// Pas d'horaire (la cadence Heraklion n'est pas uniforme) : on estime le temps de parcours,
// pas les heures de passage.
import { HKL_LINES, HKL_ROUTES, HKL_STOPS, type HklRoute } from "@/data/heraklion-bus";
import { haversineKm } from "@/lib/geo";

const WAIT_MIN = 10; // attente nominale de correspondance (rang seulement, non affichée comme exacte)

export interface HklLeg {
  lineCode: string;   // "HKL-01"
  lineName: string;   // "Airport"
  hex: string | null; // couleur ligne
  headsign: string;   // nom de la route (direction), ex "Elmepa - Aerodromio"
  routeCode: string;
  fromSlug: string;
  toSlug: string;
  fromName: string;
  toName: string;
  minutes: number;    // temps de parcours estimé (cumMin[to] - cumMin[from])
  stops: number;      // nombre d'arrêts parcourus
}

export interface HklTrip {
  legs: HklLeg[];
  totalMinutes: number;
  transfers: number;
}

const lineByCode = new Map(HKL_LINES.map((l) => [l.code, l]));

// index : slug d'arrêt -> [{route, seq}] (occurrences sur toutes les routes)
interface StopHit { route: HklRoute; seq: number; }
const routesByStop = new Map<string, StopHit[]>();
for (const route of HKL_ROUTES) {
  route.stops.forEach((s, seq) => {
    const arr = routesByStop.get(s.slug) ?? [];
    arr.push({ route, seq });
    routesByStop.set(s.slug, arr);
  });
}

function makeLeg(route: HklRoute, i: number, j: number): HklLeg {
  const a = route.stops[i], b = route.stops[j];
  const line = lineByCode.get(route.lineCode);
  return {
    lineCode: route.lineCode,
    lineName: line?.name ?? route.lineCode,
    hex: line?.hex ?? null,
    headsign: route.name,
    routeCode: route.code,
    fromSlug: a.slug,
    toSlug: b.slug,
    fromName: HKL_STOPS[a.slug]?.name ?? a.slug,
    toName: HKL_STOPS[b.slug]?.name ?? b.slug,
    minutes: Math.max(1, Math.round(b.cumMin - a.cumMin)),
    stops: j - i,
  };
}

/** Meilleures destinations directes depuis `from` : slug -> meilleure jambe (min minutes). */
function directLegsFrom(fromSlug: string): Map<string, HklLeg> {
  const best = new Map<string, HklLeg>();
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

/** Meilleures origines pouvant atteindre `to` directement : slug X -> meilleure jambe X->to. */
function directLegsTo(toSlug: string): Map<string, HklLeg> {
  const best = new Map<string, HklLeg>();
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

/** Itinéraires urbains de `fromSlug` vers `toSlug` : directs puis 1 correspondance. Triés, top 4. */
export function findHklTrips(fromSlug: string, toSlug: string): HklTrip[] {
  if (!fromSlug || !toSlug || fromSlug === toSlug) return [];
  const trips: HklTrip[] = [];

  const fromLegs = directLegsFrom(fromSlug); // X atteignable depuis `from`
  const toLegs = directLegsTo(toSlug);       // X pouvant atteindre `to`

  // 1) DIRECT : `from` -> `to` sur une même route. Garder le meilleur par ligne.
  const bestDirectByLine = new Map<string, HklTrip>();
  const directLeg = fromLegs.get(toSlug);
  if (directLeg) {
    // fromLegs ne garde qu'une jambe par dest (la + rapide) ; itérer les routes pour couvrir chaque ligne
    for (const { route, seq: i } of routesByStop.get(fromSlug) ?? []) {
      const j = route.stops.findIndex((s, idx) => idx > i && s.slug === toSlug);
      if (j < 0) continue;
      const leg = makeLeg(route, i, j);
      const prev = bestDirectByLine.get(leg.lineCode);
      if (!prev || leg.minutes < prev.totalMinutes) {
        bestDirectByLine.set(leg.lineCode, { legs: [leg], totalMinutes: leg.minutes, transfers: 0 });
      }
    }
  }
  for (const t of bestDirectByLine.values()) trips.push(t);

  // 2) UNE CORRESPONDANCE : `from` -> X (ligne 1), X -> `to` (ligne 2 différente). Meilleur par paire de lignes.
  const bestByPair = new Map<string, HklTrip>();
  for (const [x, leg1] of fromLegs) {
    if (x === toSlug || x === fromSlug) continue;
    const leg2 = toLegs.get(x);
    if (!leg2) continue;
    if (leg2.lineCode === leg1.lineCode) continue; // vraie correspondance = 2 lignes
    const total = leg1.minutes + WAIT_MIN + leg2.minutes;
    const key = `${leg1.lineCode}>${leg2.lineCode}`;
    const prev = bestByPair.get(key);
    if (!prev || total < prev.totalMinutes) {
      bestByPair.set(key, { legs: [leg1, leg2], totalMinutes: total, transfers: 1 });
    }
  }
  const bestDirect = Math.min(Infinity, ...trips.map((t) => t.totalMinutes));
  for (const t of bestByPair.values()) if (t.totalMinutes < bestDirect) trips.push(t);

  trips.sort((a, b) => a.transfers - b.transfers || a.totalMinutes - b.totalMinutes);
  const seen = new Set<string>();
  const out: HklTrip[] = [];
  for (const t of trips) {
    const sig = t.legs.map((l) => l.lineCode).join(">") + "|" + t.totalMinutes;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(t);
    if (out.length >= 4) break;
  }
  return out;
}

/** Liste des arrêts (pour les sélecteurs), triée par nom. */
export function hklStopOptions(): { slug: string; name: string; nameEl: string }[] {
  return Object.values(HKL_STOPS)
    .map((s) => ({ slug: s.slug, name: s.name, nameEl: s.nameEl }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// --- Recherche de lieu + porte-à-porte (mêmes helpers que le planner Ag. Nikolaos) ---

const GREEK_MAP: Record<string, string> = { Α: "A", Β: "V", Γ: "G", Δ: "D", Ε: "E", Ζ: "Z", Η: "I", Θ: "Th", Ι: "I", Κ: "K", Λ: "L", Μ: "M", Ν: "N", Ξ: "X", Ο: "O", Π: "P", Ρ: "R", Σ: "S", Τ: "T", Υ: "Y", Φ: "F", Χ: "Ch", Ψ: "Ps", Ω: "O" };
function norm(s: string): string {
  return s.replace(/[Α-Ω]/g, (c) => GREEK_MAP[c] ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export interface HklPlace { label: string; lat: number; lng: number; kind: "stop" | "place"; slug?: string; }

/** Recherche locale dans les noms d'arrêts (EN + grec), autocomplete offline. */
export function searchHklStops(query: string, limit = 6): HklPlace[] {
  const q = norm(query);
  if (q.length < 2) return [];
  return Object.values(HKL_STOPS)
    .filter((s) => norm(s.name).includes(q) || norm(s.nameEl).includes(q))
    .slice(0, limit)
    .map((s) => ({ label: s.name, lat: s.lat, lng: s.lng, kind: "stop" as const, slug: s.slug }));
}

type HklStopLite = { slug: string; name: string; lat: number; lng: number };

/** Arrêt le plus proche de coordonnées + distance (km). */
export function nearestHklStop(lat: number, lng: number): (HklStopLite & { distKm: number }) | null {
  let best: HklStopLite | null = null, bd = Infinity;
  for (const s of Object.values(HKL_STOPS)) {
    const d = haversineKm([lat, lng], [s.lat, s.lng]);
    if (d < bd) { bd = d; best = s; }
  }
  return best ? { ...best, distKm: bd } : null;
}

/** Minutes de marche pour une distance à vol d'oiseau (km) : ×1.35 détour urbain, 4.5 km/h. */
export function walkMinFromKm(km: number): number {
  return Math.max(1, Math.round(((km * 1.35) / 4.5) * 60));
}

export interface HklDoorPlan {
  fromStop: { slug: string; name: string } | null;
  toStop: { slug: string; name: string } | null;
  walkFromMin: number;
  walkToMin: number;
  bus: HklTrip | null;
  busTotalMin: number;
  directWalkMin: number;
  recommendWalk: boolean;
  tooFar: boolean;
}

/** Plan porte-à-porte entre 2 points. */
export function planHklDoorToDoor(from: { lat: number; lng: number }, to: { lat: number; lng: number }): HklDoorPlan {
  const directWalkMin = walkMinFromKm(haversineKm([from.lat, from.lng], [to.lat, to.lng]));
  const fs = nearestHklStop(from.lat, from.lng);
  const ts = nearestHklStop(to.lat, to.lng);
  if (!fs || !ts) {
    return { fromStop: null, toStop: null, walkFromMin: 0, walkToMin: 0, bus: null, busTotalMin: Infinity, directWalkMin, recommendWalk: true, tooFar: true };
  }
  const walkFromMin = walkMinFromKm(fs.distKm);
  const walkToMin = walkMinFromKm(ts.distKm);
  const tooFar = fs.distKm > 1.3 || ts.distKm > 1.3;
  const trips = fs.slug === ts.slug ? [] : findHklTrips(fs.slug, ts.slug);
  const bus = trips[0] ?? null;
  const busTotalMin = bus ? walkFromMin + bus.totalMinutes + walkToMin : Infinity;
  const recommendWalk = directWalkMin <= busTotalMin;
  return {
    fromStop: { slug: fs.slug, name: fs.name }, toStop: { slug: ts.slug, name: ts.name },
    walkFromMin, walkToMin, bus, busTotalMin, directWalkMin, recommendWalk, tooFar,
  };
}
