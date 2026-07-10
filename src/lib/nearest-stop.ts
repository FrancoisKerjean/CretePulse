// src/lib/nearest-stop.ts : choix pur de l'arrêt de bus le plus proche (lot 2).
// Le live par arrêt n'existe que sur les réseaux urbains citybus HER/CHA
// (colonnes réelles bus_stops : prefecture HER|CHA|LAS..., coords_source, api_code).
import { haversineKm } from "./geo.ts";

export type StopRow = {
  slug: string;
  name: string;
  lat: number | null;
  lng: number | null;
  api_code: string | null;
  coords_source: string | null;
  prefecture: string | null;
};

export type NearestStop = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  km: number;
  apiCode: string | null;
  liveCity: "her" | "cha" | null;
};

export function liveCityFor(stop: Pick<StopRow, "api_code" | "coords_source" | "prefecture">): "her" | "cha" | null {
  if (!stop.api_code || stop.coords_source !== "citybus") return null;
  if (stop.prefecture === "HER") return "her";
  if (stop.prefecture === "CHA") return "cha";
  return null;
}

export function pickNearestStop(
  stops: StopRow[],
  lat: number,
  lng: number,
  maxKm = 3,
): NearestStop | null {
  let best: NearestStop | null = null;
  for (const s of stops) {
    if (typeof s.lat !== "number" || typeof s.lng !== "number") continue;
    const km = haversineKm([s.lat, s.lng], [lat, lng]);
    if (km > maxKm) continue;
    if (!best || km < best.km) {
      best = {
        slug: s.slug,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        km,
        apiCode: s.api_code,
        liveCity: liveCityFor(s),
      };
    }
  }
  return best;
}
