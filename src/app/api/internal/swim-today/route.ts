import { NextRequest, NextResponse } from "next/server";
import { buildSwimToday, type ScoredBeach } from "@/lib/swim-today";
import { getLocalizedField } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Internal JSON feed for the daily "where to swim today" Reel pipeline
 * (cretepulse-video on the VPS). Single source of truth: buildSwimToday().
 * The video render fetches this instead of duplicating the swim-today logic.
 *
 * EN-first (Meta audience is international). Token-gated.
 *   GET /api/internal/swim-today?secret=$SWIM_FEED_SECRET
 */

type BeachLite = {
  name: string;
  slug: string;
  region: string;
  imageUrl: string | null;
  rating: "calm" | "fair" | "exposed";
  windCardinal: string;
  windSpeed: number;
  waveHeight: number | null;
  seaTemp: number | null;
  bus: { name: string; km: number; direct: boolean } | null;
  /** Estimated drive time from the 2 nearest major cities (minutes). */
  fromCities: { name: string; min: number }[];
  lat: number;
  lng: number;
};

// Major hubs for the "where is it / how far" line of the Reel.
const MAJOR_CITIES = [
  { name: "Chania", lat: 35.5138, lng: 24.018 },
  { name: "Rethymno", lat: 35.3669, lng: 24.4738 },
  { name: "Heraklion", lat: 35.3387, lng: 25.1442 },
  { name: "Agios Nikolaos", lat: 35.1908, lng: 25.7193 },
  { name: "Sitia", lat: 35.2089, lng: 26.1019 },
  { name: "Ierapetra", lat: 35.0114, lng: 25.7424 },
];

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** 2 nearest major cities + rough drive time (road km ≈ crow × 1.4, ~55 km/h, rounded 5 min). */
function nearestCities(lat: number, lng: number): { name: string; min: number }[] {
  return MAJOR_CITIES.map((c) => ({
    name: c.name,
    min: Math.max(5, Math.round((haversineKm(lat, lng, c.lat, c.lng) * 1.4) / 55 * 60 / 5) * 5),
  }))
    .sort((a, b) => a.min - b.min)
    .slice(0, 2);
}

export async function GET(req: NextRequest) {
  const expected = process.env.SWIM_FEED_SECRET || process.env.REVALIDATE_SECRET;
  const provided = req.nextUrl.searchParams.get("secret");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = await buildSwimToday();
  if (!data) {
    return NextResponse.json({ error: "no_data" }, { status: 503 });
  }

  const lite = (s: ScoredBeach): BeachLite => ({
    name: getLocalizedField(s.beach, "name", "en"),
    slug: s.beach.slug,
    region: s.beach.region,
    imageUrl: s.imageUrl,
    rating: s.rating,
    windCardinal: s.windCardinal,
    windSpeed: Math.round(s.windSpeed),
    waveHeight: s.waveHeight,
    seaTemp: s.seaTemp,
    bus: s.busStop
      ? { name: s.busStop.name, km: s.busStop.km, direct: s.busStop.hasDirectBus }
      : null,
    fromCities: nearestCities(s.beach.latitude, s.beach.longitude),
    lat: s.beach.latitude,
    lng: s.beach.longitude,
  });

  const alternatives = (["west", "central", "east", "south"] as const).flatMap((z) =>
    (data.byRegion[z] ?? []).map(lite),
  );

  return NextResponse.json({
    date: new Date().toISOString().slice(0, 10),
    wind: data.wind,
    pick: lite(data.pick),
    alternatives,
    avoid: data.avoid.map(lite),
  });
}
