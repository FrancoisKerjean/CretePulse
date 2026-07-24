// Moteur pur de position estimée des bus. Zéro I/O.
// Convention import : valeurs cross-module en relatif + extension .ts
// (le loader node de check-bus-live.mjs ne résout pas l'alias @/ ;
// allowImportingTsExtensions est activé donc tsc accepte l'extension).
// Spec : docs/superpowers/specs/2026-06-15-bus-live-engine-design.md

import { haversineKm } from "../geo.ts";
import { timesForDate } from "../bus-journey.ts";
import { toMin } from "../athens-time.ts";
import type { BusRoute } from "../buses";
import type { LiveLine, LiveStop, LiveNetwork, LiveBus } from "./types";
import { pairSlug } from "../bus-pairs.ts";
import { parseDurationMin } from "./duration.ts";

/** Normalise un nom de lieu : minuscules, sans diacritiques, alphanum + espaces. */
export function normalizePlace(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bigrams(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

/** Similarité 0..1 (Dice sur bigrammes de caractères), tolérante Chania/Khania. */
export function placeSimilarity(a: string, b: string): number {
  const na = normalizePlace(a).replace(/ /g, "");
  const nb = normalizePlace(b).replace(/ /g, "");
  if (na.length === 0 || nb.length === 0) return 0;
  if (na === nb) return 1;
  const ba = bigrams(na);
  const bb = bigrams(nb);
  if (ba.length === 0 || bb.length === 0) return 0;
  const count = new Map<string, number>();
  for (const g of bb) count.set(g, (count.get(g) ?? 0) + 1);
  let inter = 0;
  for (const g of ba) {
    const c = count.get(g) ?? 0;
    if (c > 0) { inter++; count.set(g, c - 1); }
  }
  return (2 * inter) / (ba.length + bb.length);
}

export interface OrientedRoute {
  reversed: boolean;
  profMin: number[];      // minutes cumulées dans le sens de parcours, k=0..N
  profKm: number[];       // km cumulés dans le sens de parcours
  orientedStops: LiveStop[];
  lengthKm: number;
}

/** Oriente la route sur la géométrie de la ligne (stockée seq0→N). */
export function orientRoute(route: BusRoute, line: LiveLine): OrientedRoute {
  const stops = line.stops;
  const N = stops.length - 1;
  const m = stops.map((s) => s.cumMin);
  const c = stops.map((s) => s.cumKm);
  const L = c[N];
  const simFirst = placeSimilarity(route.from_place, stops[0].name);
  const simLast = placeSimilarity(route.from_place, stops[N].name);
  const reversed = simLast > simFirst; // from ≈ seqN → arrière
  if (!reversed) {
    return { reversed, profMin: m, profKm: c, orientedStops: stops, lengthKm: L };
  }
  const profMin = m.map((_, k) => m[N] - m[N - k]);
  const profKm = c.map((_, k) => L - c[N - k]);
  const orientedStops = [...stops].reverse();
  return { reversed, profMin, profKm, orientedStops, lengthKm: L };
}

/** Distance (km) parcourue après `elapsed` minutes, le long du profil orienté. */
export function elapsedToKm(elapsed: number, profMin: number[], profKm: number[]): number {
  const N = profMin.length - 1;
  if (elapsed <= profMin[0]) return profKm[0];
  if (elapsed >= profMin[N]) return profKm[N];
  let i = 0;
  while (i < N - 1 && profMin[i + 1] < elapsed) i++;
  const span = profMin[i + 1] - profMin[i];
  const f = span > 0 ? (elapsed - profMin[i]) / span : 0;
  return profKm[i] + f * (profKm[i + 1] - profKm[i]);
}

export interface PointOnLine {
  lat: number;
  lng: number;
  bearing: number; // cap du segment courant, sens seq 0 -> N
}

function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const p1 = toRad(lat1), p2 = toRad(lat2), dl = toRad(lng2 - lng1);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Point à `km` le long de la polyline (geometry en [lng,lat]) + cap. */
export function kmToPoint(geometry: [number, number][], km: number): PointOnLine {
  if (geometry.length === 0) return { lat: 0, lng: 0, bearing: 0 };
  if (geometry.length === 1) {
    return { lat: geometry[0][1], lng: geometry[0][0], bearing: 0 };
  }
  const target = Math.max(0, km);
  let acc = 0;
  for (let i = 0; i < geometry.length - 1; i++) {
    const [lng1, lat1] = geometry[i];
    const [lng2, lat2] = geometry[i + 1];
    const segLen = haversineKm([lat1, lng1], [lat2, lng2]); // swap -> [lat,lng]
    const last = i === geometry.length - 2;
    if (acc + segLen >= target || last) {
      const raw = segLen > 0 ? (target - acc) / segLen : 0;
      const f = Math.min(1, Math.max(0, raw));
      return {
        lat: lat1 + f * (lat2 - lat1),
        lng: lng1 + f * (lng2 - lng1),
        bearing: bearingDeg(lat1, lng1, lat2, lng2),
      };
    }
    acc += segLen;
  }
  const end = geometry[geometry.length - 1];
  return { lat: end[1], lng: end[0], bearing: 0 };
}

export interface NowAthens { iso: string; minutes: number; }

/** Heures de départ (HH:MM) actuellement en cours de trajet à `now`. */
export function activeDepartures(route: BusRoute, totalMinutes: number, now: NowAthens): string[] {
  return timesForDate(route, now.iso).filter((H) => {
    const h = toMin(H);
    return h <= now.minutes && now.minutes <= h + totalMinutes;
  });
}

/** Prochain arrêt strictement devant le bus (dans le temps) + ETA minutes. */
function nextStopAndEta(
  orientedStops: LiveStop[],
  profMin: number[],
  elapsed: number,
): { name: string | null; eta: number | null } {
  for (let k = 0; k < orientedStops.length; k++) {
    if (profMin[k] > elapsed) {
      return { name: orientedStops[k].name, eta: Math.round(profMin[k] - elapsed) };
    }
  }
  return { name: null, eta: null };
}

/** Tous les bus en circulation à l'instant `now` (Athens). Déterministe. */
export function busesAt(now: NowAthens, network: LiveNetwork): LiveBus[] {
  const out: LiveBus[] = [];
  const seen = new Set<string>();
  for (const route of network.routes) {
    if (route.line_id == null) continue;
    const line = network.lines.get(route.line_id);
    if (!line || line.stops.length < 2 || line.totalMinutes <= 0 || line.geometry.length < 2) {
      continue;
    }
    const oriented = orientRoute(route, line);
    const durMin = parseDurationMin(route.duration);
    for (const H of activeDepartures(route, line.totalMinutes, now)) {
      const key = `${line.id}|${oriented.reversed ? "rev" : "fwd"}|${H}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const elapsed = now.minutes - toMin(H);
      const dParcours = elapsedToKm(elapsed, oriented.profMin, oriented.profKm);
      const dGeo = oriented.reversed ? oriented.lengthKm - dParcours : dParcours;
      const pt = kmToPoint(line.geometry, dGeo);
      const ns = nextStopAndEta(oriented.orientedStops, oriented.profMin, elapsed);
      out.push({
        id: key,
        lineId: line.id,
        code: line.code,
        codeOfficial: line.codeOfficial,
        lat: pt.lat,
        lng: pt.lng,
        bearing: oriented.reversed ? (pt.bearing + 180) % 360 : pt.bearing,
        progress: Math.min(1, Math.max(0, elapsed / line.totalMinutes)),
        nextStop: ns.name,
        etaMinNext: ns.eta,
        headsign: route.to_place,
        direction: oriented.reversed ? "rev" : "fwd",
        degraded: line.source === "ktel" || line.partialGeo,
        origin: route.from_place,
        operatorId: route.operator_id,
        pairSlug: pairSlug(route.from_place, route.to_place),
        etaMinTerminus: durMin == null ? null : (toMin(H) + durMin) - now.minutes,
        durationEstimated: route.duration_estimated ?? false,
      });
    }
  }
  return out;
}
