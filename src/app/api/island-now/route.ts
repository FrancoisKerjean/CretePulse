// Baromètre de l'île : agrégats servis au hero de la home.
// La home est en ISR 2 h : le live passe par ici, cache CDN 10 min.
// Les tables flux_* REFUSENT le rôle anonyme (42501 permission denied, vérifié
// le 28/07/2026) : lecture avec la clé service, côté serveur uniquement.
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

// Filet de sécurité : un hang réseau contre le PostgREST self-hosted ne doit
// jamais laisser le Promise.all pendu jusqu'à ce que la plateforme tue la
// fonction. 5 s par requête, le même budget que le cache CDN est généreux.
const QUERY_TIMEOUT_MS = 5000;

export async function GET() {
  try {
    const now = Date.now();
    const today = athensDate(now);

    const [cruiseRes, busRes] = await Promise.all([
      supabaseAdmin
        .from("flux_cruise_calls")
        .select("call_date,port,ship_name,pax_capacity,eta,etd")
        .eq("call_date", today)
        .abortSignal(AbortSignal.timeout(QUERY_TIMEOUT_MS)),
      supabaseAdmin
        .from("flux_bus_positions")
        .select("vehicle_key,recorded_at")
        .gte("recorded_at", new Date(now - BUS_MAX_AGE_MIN * 60_000).toISOString())
        .order("recorded_at", { ascending: false })
        .limit(2000)
        .abortSignal(AbortSignal.timeout(QUERY_TIMEOUT_MS)),
    ]);

    // Une source en echec ne casse pas le hero : sa ligne disparait, point.
    // Le console.error garde une trace (cle rotee, grant change) sans bloquer le hero.
    if (cruiseRes.error) console.error("[island-now] flux_cruise_calls:", cruiseRes.error.message);
    const cruise = cruiseRes.error ? null : pickTodayCruise((cruiseRes.data ?? []) as CruiseCallRow[], today);

    let buses: { tracked: number; asOf: string } | null = null;
    if (busRes.error) {
      console.error("[island-now] flux_bus_positions:", busRes.error.message);
    } else if (busRes.data && busRes.data.length > 0) {
      const rows = busRes.data as { vehicle_key: string; recorded_at: string }[];
      const tracked = countTrackedVehicles(rows);
      const asOf = rows[0].recorded_at;
      if (shouldShowBuses(tracked, asOf, now)) buses = { tracked, asOf };
    }

    return NextResponse.json({ cruise, buses, stock: null }, { headers: CACHE_HEADERS });
  } catch (err) {
    // Contrat explicite : jamais de 500 au client, meme sur timeout ou exception
    // imprevue -> hero degrade proprement, memes en-tetes de cache.
    console.error("[island-now] exception:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ cruise: null, buses: null, stock: null }, { headers: CACHE_HEADERS });
  }
}
