// /api/buses/nearest-stop?lat=..&lng=.. : l'arrêt de bus le plus proche (≤3 km)
// avec info live éventuelle (citybus HER/CHA). Les arrêts bougent pas : liste
// gardée en mémoire 1 h par instance + cache CDN 5 min sur la réponse.
// Lot 2 app compagnon, consommé par NowPanel (/explore).
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { pickNearestStop, type StopRow } from "@/lib/nearest-stop";

export const dynamic = "force-dynamic";

let cachedStops: { at: number; rows: StopRow[] } | null = null;

async function loadStops(): Promise<StopRow[]> {
  if (cachedStops && Date.now() - cachedStops.at < 60 * 60 * 1000) return cachedStops.rows;
  const { data, error } = await supabase
    .from("bus_stops")
    .select("slug,name,lat,lng,api_code,coords_source,prefecture");
  if (error || !data) return cachedStops?.rows ?? [];
  cachedStops = { at: Date.now(), rows: data as StopRow[] };
  return cachedStops.rows;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  // Borné à la Crète élargie : pas de scan pour des coordonnées hors sujet.
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 34 || lat > 36.2 || lng < 23 || lng > 27) {
    return NextResponse.json({ stop: null }, { status: 422 });
  }
  const stops = await loadStops();
  const stop = pickNearestStop(stops, lat, lng);
  return NextResponse.json(
    { stop },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
