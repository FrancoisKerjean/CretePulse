// Chargement du réseau bus pour le moteur live. Seul module avec I/O.
// Lecture seule via le client anon (RLS public read sur toutes les bus_*).
import { supabase } from "@/lib/supabase";
import type { BusRoute } from "../buses";
import type { LiveLine, LiveNetwork, LiveStop } from "./types";

interface LineRow {
  id: number; code: string; code_official: string | null;
  source: "osm" | "ktel" | "agncitybus"; color: string | null; geometry: [number, number][] | null;
  total_minutes: number | null; length_km: number | null; partial_geo: boolean | null;
}
interface LineStopRow {
  line_id: number; stop_id: number; seq: number;
  cumulative_km: number | null; cumulative_minutes: number | null;
}
interface StopRow { id: number; slug: string; name: string; lat: number; lng: number; }

/** Charge lignes + arrêts + routes appariées, assemble et filtre les lignes inexploitables. */
export async function loadLiveNetwork(): Promise<LiveNetwork> {
  const [linesRes, lsRes, stopsRes, routesRes] = await Promise.all([
    supabase.from("bus_lines").select(
      "id, code, code_official, source, color, geometry, total_minutes, length_km, partial_geo",
    ),
    supabase.from("bus_line_stops")
      .select("line_id, stop_id, seq, cumulative_km, cumulative_minutes")
      .order("line_id", { ascending: true }).order("seq", { ascending: true }),
    supabase.from("bus_stops").select("id, slug, name, lat, lng"),
    supabase.from("bus_routes").select("*").not("line_id", "is", null),
  ]);

  if (linesRes.error || lsRes.error || stopsRes.error || routesRes.error) {
    console.error("[bus-live] loadLiveNetwork", {
      lines: linesRes.error?.message, lineStops: lsRes.error?.message,
      stops: stopsRes.error?.message, routes: routesRes.error?.message,
    });
    return { lines: new Map(), routes: [] };
  }

  const stopById = new Map<number, StopRow>();
  for (const s of (stopsRes.data as StopRow[]) ?? []) stopById.set(s.id, s);

  // arrêts groupés par ligne, déjà triés par seq
  const stopsByLine = new Map<number, LiveStop[]>();
  for (const ls of (lsRes.data as LineStopRow[]) ?? []) {
    const s = stopById.get(ls.stop_id);
    if (!s) continue;
    const arr = stopsByLine.get(ls.line_id) ?? [];
    arr.push({
      seq: ls.seq, slug: s.slug, name: s.name, lat: s.lat, lng: s.lng,
      cumKm: ls.cumulative_km ?? 0, cumMin: ls.cumulative_minutes ?? 0,
    });
    stopsByLine.set(ls.line_id, arr);
  }

  const lines = new Map<number, LiveLine>();
  for (const l of (linesRes.data as LineRow[]) ?? []) {
    const stops = stopsByLine.get(l.id) ?? [];
    const total = l.total_minutes ?? 0;
    // garde-fou : >= 2 arrêts, total_minutes > 0
    if (stops.length < 2 || total <= 0) continue;
    // géométrie : OSRM si présente, sinon segment droit entre les 2 terminus
    let geometry = l.geometry ?? [];
    let partialGeo = l.partial_geo ?? false;
    if (geometry.length < 2) {
      const a = stops[0], b = stops[stops.length - 1];
      geometry = [[a.lng, a.lat], [b.lng, b.lat]];
      partialGeo = true;
    }
    lines.set(l.id, {
      id: l.id, code: l.code, codeOfficial: l.code_official, source: l.source, color: l.color ?? null,
      totalMinutes: total, lengthKm: l.length_km ?? stops[stops.length - 1].cumKm,
      partialGeo, geometry, stops,
    });
  }

  const routes = ((routesRes.data as BusRoute[]) ?? []).filter((r) => r.line_id != null);
  return { lines, routes };
}
