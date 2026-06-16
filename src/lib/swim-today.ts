import { getAllBeaches } from "./beaches";
import { fetchAllCitiesWeather, type CityWeather } from "./weather";
import { supabase } from "./supabase";
import type { Beach } from "./types";
import {
  fetchCbBeaches,
  matchCbBySlug,
  shelterFactor,
  type CbBeachAttrs,
} from "./cb-beach-match";

/**
 * "Where to swim today" engine.
 *
 * For each beach we estimate which way it faces (seaward bearing) from its
 * position relative to the island's mountain spine, attach the live weather
 * of the nearest of the 10 monitored cities (wind speed/direction, wave
 * height at the marine point, sea temperature), and score how comfortable
 * the water is likely to be right now. Wind blowing onshore (from the sea
 * toward the beach) raises chop; offshore or cross-shore wind leaves the
 * shoreline flat. The estimate is geometric: individual bays can behave
 * differently, and the methodology says so.
 */

/** Crete mountain-spine polyline (lng -> lat), west to east. */
const SPINE: Array<[number, number]> = [
  [23.45, 35.28],
  [23.80, 35.34],
  [24.10, 35.34],
  [24.50, 35.25],
  [24.90, 35.20],
  [25.30, 35.15],
  [25.70, 35.08],
  [26.00, 35.10],
  [26.35, 35.14],
];

function spineLatAt(lng: number): number {
  if (lng <= SPINE[0][0]) return SPINE[0][1];
  for (let i = 1; i < SPINE.length; i++) {
    if (lng <= SPINE[i][0]) {
      const [x0, y0] = SPINE[i - 1];
      const [x1, y1] = SPINE[i];
      return y0 + ((lng - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return SPINE[SPINE.length - 1][1];
}

/** Bearing in degrees (0=N) from point A to point B, on small distances. */
function bearing(latA: number, lngA: number, latB: number, lngB: number): number {
  const dLat = latB - latA;
  const dLng = (lngB - lngA) * Math.cos(((latA + latB) / 2) * (Math.PI / 180));
  const deg = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Seaward facing of a beach, estimated from its offset to the island spine. */
export function beachFacing(lat: number, lng: number): number {
  // East cape and west cape beaches face out along the island axis.
  if (lng > 26.25) return 90;
  if (lng < 23.55) return 270;
  // The coast runs parallel to the ridge: facing is the perpendicular to the
  // local spine tangent, on the side of the island the beach sits on.
  const d = 0.15;
  const tangent = bearing(spineLatAt(lng - d), lng - d, spineLatAt(lng + d), lng + d);
  return lat >= spineLatAt(lng) ? (tangent + 270) % 360 : (tangent + 90) % 360;
}

function haversineKm(latA: number, lngA: number, latB: number, lngB: number): number {
  const R = 6371;
  const dLat = ((latB - latA) * Math.PI) / 180;
  const dLng = ((lngB - lngA) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((latA * Math.PI) / 180) * Math.cos((latB * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export function cardinal(deg: number): (typeof CARDINALS)[number] {
  return CARDINALS[Math.round(((deg % 360) / 45)) % 8];
}

export type ShoreWind = "offshore" | "cross" | "onshore";

/** Nearest KTEL-served stop, for the "getting there" line. */
export interface NearestBusStop {
  name: string;
  km: number;
  hasDirectBus: boolean;
}

export interface ScoredBeach {
  beach: Beach;
  score: number;
  rating: "calm" | "fair" | "exposed";
  shoreWind: ShoreWind;
  facing: number;
  city: CityWeather;
  /** Distance to the nearest monitored city, km (taxi reference). */
  cityKm: number;
  windSpeed: number;
  windCardinal: (typeof CARDINALS)[number];
  waveHeight: number | null;
  seaTemp: number | null;
  busStop: NearestBusStop | null;
  /** Field-observed attributes of the matched cb_places beach, if any. */
  cb: CbBeachAttrs | null;
  /** Hero/list image: beaches.image_url, else first cb photo. */
  imageUrl: string | null;
}

export interface SwimToday {
  /** Deterministic daily hero pick among the best-rated beaches. */
  pick: ScoredBeach;
  /** Best alternatives grouped by site region (west/central/east/south). */
  byRegion: Record<string, ScoredBeach[]>;
  /** Most exposed beaches right now (score < 50), worst first. */
  avoid: ScoredBeach[];
  /** Live city conditions used for the computation. */
  cities: CityWeather[];
  /** Dominant wind over the island (mode of city cardinals + speed range). */
  wind: { cardinal: (typeof CARDINALS)[number]; minSpeed: number; maxSpeed: number };
  scored: ScoredBeach[];
}

interface StopRow {
  name: string;
  lat: number | null;
  lng: number | null;
  has_direct_bus: boolean;
}

function nearestStop(beach: Beach, stops: StopRow[]): NearestBusStop | null {
  let best: NearestBusStop | null = null;
  for (const s of stops) {
    if (s.lat === null || s.lng === null) continue;
    const km = haversineKm(beach.latitude, beach.longitude, s.lat, s.lng);
    if (km <= 12 && (!best || km < best.km)) {
      best = { name: s.name, km: Math.round(km * 10) / 10, hasDirectBus: s.has_direct_bus };
    }
  }
  return best;
}

function scoreBeach(
  beach: Beach,
  cities: CityWeather[],
  stops: StopRow[],
  cb: CbBeachAttrs | null,
): ScoredBeach | null {
  const usable = cities.filter(c => c.windSpeed > 0 || c.temp > 0);
  if (usable.length === 0) return null;
  let city = usable[0];
  let best = Infinity;
  for (const c of usable) {
    const d = haversineKm(beach.latitude, beach.longitude, c.lat, c.lng);
    if (d < best) {
      best = d;
      city = c;
    }
  }

  const facing = beachFacing(beach.latitude, beach.longitude);
  const diff = angleDiff(city.windDir, facing);
  // Wind coming from the direction the beach faces = onshore.
  const shoreWind: ShoreWind = diff <= 60 ? "onshore" : diff >= 120 ? "offshore" : "cross";
  const onshoreness = Math.max(0, Math.cos((diff * Math.PI) / 180)); // 1 onshore, 0 side/offshore

  const effectiveWind = city.windSpeed * (0.35 + 0.65 * onshoreness);
  const wavePenalty = (city.waveHeight ?? 0.3) * 22;
  const code = city.weatherCode;
  const rainPenalty = code >= 95 ? 40 : code >= 80 ? 30 : code >= 51 ? 25 : 0;

  // Observed typical sea state of the bay (cb_places) corrects the geometric
  // estimate: a bay known usually calm takes less chop than its exposure
  // suggests, a bay known wavy takes more.
  const shelter = shelterFactor(cb?.sea_surface);
  const raw = 100 - (effectiveWind * 1.8 + wavePenalty) * shelter - rainPenalty;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    beach,
    score,
    rating: score >= 75 ? "calm" : score >= 50 ? "fair" : "exposed",
    shoreWind,
    facing,
    city,
    cityKm: Math.round(best),
    windSpeed: city.windSpeed,
    windCardinal: cardinal(city.windDir),
    waveHeight: city.waveHeight,
    seaTemp: city.seaTemp,
    busStop: nearestStop(beach, stops),
    cb,
    imageUrl: beach.image_url ?? cb?.photos?.[0] ?? null,
  };
}

/** Day-of-year in Athens time, used for the deterministic daily rotation. */
function athensDayOfYear(now: Date): number {
  const athens = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Athens" }));
  const start = new Date(athens.getFullYear(), 0, 0);
  return Math.floor((athens.getTime() - start.getTime()) / 86_400_000);
}

async function fetchBusStops(): Promise<StopRow[]> {
  try {
    const { data } = await supabase
      .from("bus_destinations")
      .select("name, lat, lng, has_direct_bus");
    return (data as StopRow[] | null) ?? [];
  } catch {
    return [];
  }
}

export async function buildSwimToday(): Promise<SwimToday | null> {
  const [beaches, cities, stops, cbRows] = await Promise.all([
    getAllBeaches(),
    fetchAllCitiesWeather(),
    fetchBusStops(),
    fetchCbBeaches(),
  ]);
  if (!beaches?.length || !cities?.length) return null;

  const cbMatch = matchCbBySlug(beaches, cbRows);
  const scored = beaches
    .map(b => scoreBeach(b, cities, stops, cbMatch.get(b.slug) ?? null))
    .filter((s): s is ScoredBeach => s !== null)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) return null;

  // Hero pick: rotate daily across the best-rated beaches that have a photo
  // (falls back to all top beaches if none has one), so the page and the
  // daily Instagram post change every day even under a stable meltemi.
  const top = scored.slice(0, 8);
  const withPhoto = top.filter(s => s.imageUrl);
  const pool = withPhoto.length >= 3 ? withPhoto : top;
  const pick = pool[athensDayOfYear(new Date()) % pool.length];

  const byRegion: Record<string, ScoredBeach[]> = {};
  for (const region of ["west", "central", "east", "south"]) {
    byRegion[region] = scored
      .filter(s => s.beach.region === region && s.beach.slug !== pick.beach.slug)
      .slice(0, 3);
  }

  const avoid = [...scored]
    .filter(s => s.score < 50)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);

  const counts = new Map<string, number>();
  for (const c of cities) {
    if (c.windSpeed > 0) counts.set(cardinal(c.windDir), (counts.get(cardinal(c.windDir)) ?? 0) + 1);
  }
  const dominant =
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? cardinal(cities[0].windDir);
  const speeds = cities.map(c => c.windSpeed).filter(v => v > 0);

  return {
    pick,
    byRegion,
    avoid,
    cities,
    wind: {
      cardinal: dominant as (typeof CARDINALS)[number],
      minSpeed: Math.min(...speeds),
      maxSpeed: Math.max(...speeds),
    },
    scored,
  };
}
