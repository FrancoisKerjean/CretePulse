// Barometre de l'ile : agregats servis au hero de la home.
// La home est en ISR 2 h : le live passe par ici, cache CDN 10 min.
// Les tables flux_* REFUSENT le role anonyme (42501 permission denied, verifie
// le 28/07/2026) : lecture avec la cle service, cote serveur uniquement.
// Spec : docs/superpowers/specs/2026-07-28-home-service-rail-design.md
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  athensDate,
  countTrackedVehicles,
  shouldShowBuses,
  pickTodayCruise,
  BUS_MAX_AGE_MIN,
  type CruiseCallRow,
} from "@/lib/island-now";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
};

export async function GET() {
  const now = Date.now();
  const today = athensDate(now);

  const [cruiseRes, busRes] = await Promise.all([
    supabaseAdmin
      .from("flux_cruise_calls")
      .select("call_date,port,ship_name,pax_capacity,eta,etd")
      .eq("call_date", today),
    supabaseAdmin
      .from("flux_bus_positions")
      .select("vehicle_key,recorded_at")
      .gte("recorded_at", new Date(now - BUS_MAX_AGE_MIN * 60_000).toISOString())
      .order("recorded_at", { ascending: false })
      .limit(2000),
  ]);

  // Une source en echec ne casse pas le hero : sa ligne disparait, point.
  const cruise = cruiseRes.error ? null : pickTodayCruise((cruiseRes.data ?? []) as CruiseCallRow[], today);

  let buses: { tracked: number; asOf: string } | null = null;
  if (!busRes.error && busRes.data && busRes.data.length > 0) {
    const rows = busRes.data as { vehicle_key: string; recorded_at: string }[];
    const tracked = countTrackedVehicles(rows);
    const asOf = rows[0].recorded_at;
    if (shouldShowBuses(tracked, asOf, now)) buses = { tracked, asOf };
  }

  return NextResponse.json({ cruise, buses, stock: null }, { headers: CACHE_HEADERS });
}
