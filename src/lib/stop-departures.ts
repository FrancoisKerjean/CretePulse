// Moteur arrêt-centré : pour un arrêt, les destinations atteignables avec passage
// estimé (départ KTEL + proratisation de la durée réelle du trajet). Pur, zéro I/O,
// exécutable côté client. Réutilise placeSimilarity (matching noms terminus) +
// timesForDate/parseDurationMin (grille KTEL).
// Spec : docs/superpowers/specs/2026-06-17-near-me-arret-centre-design.md (§6)
import type { LiveNetwork } from "./bus-live/types";
import type { BusRoute } from "./buses";
import { placeSimilarity } from "./bus-live/position.ts";
import { timesForDate, parseDurationMin } from "./bus-journey.ts";
import { toMin, clockHHMM } from "./athens-time.ts";

export interface GraphStop { slug: string; name: string; lat: number; lng: number; }
export interface GraphLineStop { slug: string; name: string; cumMin: number; }
export interface GraphLine {
  id: number;
  code: string;
  totalMinutes: number;
  stops: GraphLineStop[]; // triés seq 0..N
  routes: BusRoute[];     // routes à horaire de cette ligne
}
export interface StopGraph { stops: GraphStop[]; lines: GraphLine[]; }

export interface StopDeparture {
  destination: string;    // route.to_place (sens de circulation)
  lineCode: string;
  nextTimes: string[];    // "HH:MM" estimés à venir (max 2) ; vide si durée inconnue
  estimated: boolean;     // true : passage proratisé, pas une heure ferme
  durationKnown: boolean; // false : destination affichée sans horaire (« au guichet »)
  isTomorrow: boolean;    // true : nextTimes = 1er passage de demain
}

const SIM = 0.5;

/** Index du stop de `stops` le mieux apparié à `name` (similarité >= SIM), sinon -1. */
function matchIdx(name: string, stops: GraphLineStop[]): number {
  let best = -1, bestS = SIM;
  for (let i = 0; i < stops.length; i++) {
    const s = placeSimilarity(name, stops[i].name);
    if (s >= bestS) { bestS = s; best = i; }
  }
  return best;
}

interface Raw { destination: string; lineCode: string; durationKnown: boolean; minutes: number[]; tmw: number[]; }

/** Destinations desservies à `stopSlug`, passages estimés à `now` (TZ Athens). */
export function stopDepartures(
  graph: StopGraph,
  stopSlug: string,
  now: { iso: string; minutes: number },
  tomorrowIso: string,
): StopDeparture[] {
  const raws: Raw[] = [];
  for (const line of graph.lines) {
    const sIdx = line.stops.findIndex((s) => s.slug === stopSlug);
    if (sIdx < 0) continue;
    const cumS = line.stops[sIdx].cumMin;
    for (const r of line.routes) {
      const a = matchIdx(r.from_place, line.stops);
      const b = matchIdx(r.to_place, line.stops);
      const iFrom = a >= 0 ? a : 0;
      const iTo = b >= 0 ? b : line.stops.length - 1;
      if (iFrom === iTo) continue;
      const forward = iFrom < iTo;
      // l'arrêt doit être DANS le tronçon parcouru, et pas le terminus d'arrivée
      const served = forward ? (sIdx >= iFrom && sIdx < iTo) : (sIdx > iTo && sIdx <= iFrom);
      if (!served) continue;
      const dur = parseDurationMin(r.duration);
      const durationKnown = dur != null;
      let mins: number[] = [];
      let tmw: number[] = [];
      if (durationKnown) {
        const cumFrom = line.stops[iFrom].cumMin;
        const cumTo = line.stops[iTo].cumMin;
        const span = Math.abs(cumTo - cumFrom);
        const frac = span > 0 ? Math.abs(cumS - cumFrom) / span : 0;
        const offset = frac * (dur as number);
        mins = timesForDate(r, now.iso).map((H) => toMin(H) + offset);
        tmw = timesForDate(r, tomorrowIso).map((H) => toMin(H) + offset);
      }
      raws.push({ destination: r.to_place, lineCode: line.code, durationKnown, minutes: mins, tmw });
    }
  }
  // Fusion par destination (une destination peut venir de plusieurs routes/lignes).
  const byDest = new Map<string, { lineCode: string; durationKnown: boolean; today: number[]; tmw: number[] }>();
  for (const r of raws) {
    const e = byDest.get(r.destination) ?? { lineCode: r.lineCode, durationKnown: false, today: [], tmw: [] };
    e.durationKnown = e.durationKnown || r.durationKnown;
    e.today.push(...r.minutes);
    e.tmw.push(...r.tmw);
    byDest.set(r.destination, e);
  }
  const out: StopDeparture[] = [];
  for (const [destination, e] of byDest) {
    const upcoming = e.today.filter((m) => m >= now.minutes).sort((x, y) => x - y);
    let times = upcoming, isTomorrow = false;
    if (times.length === 0 && e.tmw.length > 0) {
      times = e.tmw.sort((x, y) => x - y).slice(0, 1);
      isTomorrow = true;
    }
    out.push({
      destination,
      lineCode: e.lineCode,
      nextTimes: times.slice(0, 2).map(clockHHMM),
      estimated: true,
      durationKnown: e.durationKnown,
      isTomorrow,
    });
  }
  // Tri : destinations avec horaire d'abord (prochain passage croissant), puis les autres.
  return out.sort((x, y) => {
    const tx = x.nextTimes[0] ?? "99:99";
    const ty = y.nextTimes[0] ?? "99:99";
    return tx.localeCompare(ty);
  });
}

// LiveNetwork est utilisé par Task 2 (buildStopGraph) — import type conservé.
type _LiveNetworkRef = LiveNetwork;
