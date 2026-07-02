// Moteur PUR du calculateur de trajets urbain d'Agios Nikolaos (bus gratuit agncitybus).
// Zéro I/O : consomme src/data/agnik-bus.ts (généré depuis le dump officiel).
// Distinct du planner interurbain KTEL (src/lib/bus-journey.ts) : ici tout est intra-ville,
// service en boucle à cadence fixe, temps estimé le long du tracer (cumMin).
import { AGNIK_LINES, AGNIK_STOPS, AGNIK_SERVICE, type AgnikLine } from "@/data/agnik-bus";
import { haversineKm } from "@/lib/geo";

const WAIT_MIN = Math.round(AGNIK_SERVICE.headwayMin / 2); // attente moyenne a la correspondance

export interface UrbanLeg {
  lineCode: string;
  color: "yellow" | "red" | "green";
  hex: string;
  lineName: string;
  fromSlug: string;
  toSlug: string;
  fromName: string;
  toName: string;
  minutes: number;      // temps de parcours estimé (cumMin[to] - cumMin[from])
  stops: number;        // nombre d'arrêts parcourus
}

export interface UrbanTrip {
  legs: UrbanLeg[];
  totalMinutes: number; // parcours + attente(s) de correspondance
  transfers: number;
}

function idxOf(line: AgnikLine, slug: string): number {
  return line.stops.findIndex((s) => s.slug === slug);
}

/**
 * Jambe de `ia` à `ib` le long d'une ligne CYCLIQUE (les 3 lignes sont des boucles :
 * le tracé revient au terminal). Si ib est avant ia dans l'ordre des arrêts, on reste
 * à bord et on finit la boucle (wrap) : temps = tour complet − cumMin[ia] + cumMin[ib].
 */
function makeLeg(line: AgnikLine, ia: number, ib: number): UrbanLeg {
  const a = line.stops[ia], b = line.stops[ib];
  const n = line.stops.length;
  const forward = ib > ia;
  const minutes = forward ? b.cumMin - a.cumMin : line.totalMinutes - a.cumMin + b.cumMin;
  return {
    lineCode: line.code,
    color: line.color,
    hex: line.hex,
    lineName: line.nameEn,
    fromSlug: a.slug,
    toSlug: b.slug,
    fromName: AGNIK_STOPS[a.slug]?.name ?? a.slug,
    toName: AGNIK_STOPS[b.slug]?.name ?? b.slug,
    minutes: Math.max(1, Math.round(minutes)),
    stops: ((ib - ia) % n + n) % n, // nombre d'arrêts parcourus (cyclique)
  };
}

/** Itinéraires urbains de `fromSlug` vers `toSlug` : directs puis 1 correspondance. Triés. */
export function findUrbanTrips(fromSlug: string, toSlug: string): UrbanTrip[] {
  if (!fromSlug || !toSlug || fromSlug === toSlug) return [];
  const trips: UrbanTrip[] = [];

  // 1) DIRECT : une ligne dessert A et B (boucle -> toujours atteignable en restant à bord)
  for (const line of AGNIK_LINES) {
    const ia = idxOf(line, fromSlug), ib = idxOf(line, toSlug);
    if (ia >= 0 && ib >= 0 && ia !== ib) {
      const leg = makeLeg(line, ia, ib);
      trips.push({ legs: [leg], totalMinutes: leg.minutes, transfers: 0 });
    }
  }

  // 2) UNE CORRESPONDANCE : ligne1 A->X (arrêt partagé aval, cyclique), ligne2 X->B
  const bestByPair = new Map<string, UrbanTrip>();
  for (const l1 of AGNIK_LINES) {
    const ia = idxOf(l1, fromSlug);
    if (ia < 0) continue;
    const n1 = l1.stops.length;
    for (let step = 1; step < n1; step++) {
      const k = (ia + step) % n1;
      const x = l1.stops[k].slug;
      if (x === toSlug || x === fromSlug) continue; // direct déjà couvert / retour départ
      for (const l2 of AGNIK_LINES) {
        if (l2.code === l1.code) continue;
        const ix = idxOf(l2, x), ib = idxOf(l2, toSlug);
        if (ix < 0 || ib < 0 || ix === ib) continue;
        const leg1 = makeLeg(l1, ia, k);
        const leg2 = makeLeg(l2, ix, ib);
        const total = leg1.minutes + WAIT_MIN + leg2.minutes;
        const key = `${l1.code}>${l2.code}`;
        const prev = bestByPair.get(key);
        if (!prev || total < prev.totalMinutes) {
          bestByPair.set(key, { legs: [leg1, leg2], totalMinutes: total, transfers: 1 });
        }
      }
    }
  }
  // ne garder une correspondance que si STRICTEMENT plus rapide que le meilleur direct
  const bestDirect = Math.min(Infinity, ...trips.filter((t) => t.transfers === 0).map((t) => t.totalMinutes));
  for (const t of bestByPair.values()) if (t.totalMinutes < bestDirect) trips.push(t);

  // tri : moins de correspondances d'abord, puis plus rapide
  trips.sort((a, b) => a.transfers - b.transfers || a.totalMinutes - b.totalMinutes);
  // dédup (mêmes lignes + même durée) et top 4
  const seen = new Set<string>();
  const out: UrbanTrip[] = [];
  for (const t of trips) {
    const sig = t.legs.map((l) => l.lineCode).join(">") + "|" + t.totalMinutes;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(t);
    if (out.length >= 4) break;
  }
  return out;
}

/** "HH:MM" -> minutes depuis minuit. */
function toMin(hhmm: string): number {
  return +hhmm.slice(0, 2) * 60 + +hhmm.slice(3);
}
function fromMin(m: number): string {
  const h = Math.floor(m / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Prochains passages estimés du bus à l'arrêt d'embarquement d'un trajet, à partir de
 * `nowMinutes` (minutes depuis minuit, Europe/Athens). Passage ≈ départ terminus + cumMin[arrêt].
 */
export function nextDepartures(leg: UrbanLeg, nowMinutes: number, count = 3): string[] {
  const line = AGNIK_LINES.find((l) => l.code === leg.lineCode);
  if (!line) return [];
  const at = line.stops.find((s) => s.slug === leg.fromSlug);
  const offset = at ? at.cumMin : 0;
  const passes = AGNIK_SERVICE.departures
    .map((d) => Math.round(toMin(d) + offset))
    .filter((m) => m >= nowMinutes)
    .slice(0, count)
    .map(fromMin);
  return passes;
}

/** true si le service urbain circule à `nowMinutes` (première->dernière course + parcours max). */
export function isServiceRunning(nowMinutes: number): boolean {
  const first = toMin(AGNIK_SERVICE.firstDep);
  const last = toMin(AGNIK_SERVICE.lastDep) + 30; // marge fin de dernière boucle
  return nowMinutes >= first && nowMinutes <= last;
}

/** Liste des arrêts uniques (pour les sélecteurs), triée par nom. */
export function urbanStopOptions(): { slug: string; name: string; nameEl: string }[] {
  return Object.values(AGNIK_STOPS)
    .map((s) => ({ slug: s.slug, name: s.name, nameEl: s.nameEl }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Temps de marche estimé (min) entre 2 arrêts : distance à vol d'oiseau × détour urbain
 * 1.35, à 4.5 km/h. Agios Nikolaos est compacte et vallonnée. Sert à recommander la marche
 * quand elle bat le bus : les lignes sont des BOUCLES unidirectionnelles, donc "revenir en
 * arrière" impose un tour complet (~35 min) là où la marche prend 5-10 min.
 */
export function walkMinutes(fromSlug: string, toSlug: string): number | null {
  const a = AGNIK_STOPS[fromSlug], b = AGNIK_STOPS[toSlug];
  if (!a || !b) return null;
  const km = haversineKm([a.lat, a.lng], [b.lat, b.lng]);
  return Math.max(1, Math.round(((km * 1.35) / 4.5) * 60));
}
