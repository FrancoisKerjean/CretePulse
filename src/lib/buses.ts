import { supabase } from "@/lib/supabase";

export interface BusDepartureGroup {
  days: string;
  times: string[];
}

export interface BusRoute {
  id: number;
  line_id: number | null; // FK SP2 vers bus_lines.id (NULL = non apparié)
  operator_id: string;
  from_place: string;
  to_place: string;
  to_slug: string | null;
  /** Arrêts intermédiaires de la ligne, dans l'ordre (PDF e-ktel). Heures de
   * passage non publiées par KTEL : seul le départ du terminus est connu. */
  via_stops: string[] | null;
  season: string;
  duration: string | null;
  /** true = durée estimée au km (enveloppe haute, plan B) → afficher « indicatif » */
  duration_estimated: boolean | null;
  price_eur: number | null;
  /** true = prix estimé au km (plan B scraper) → afficher « indicatif » */
  price_estimated: boolean | null;
  frequency: string | null;
  departures: string[] | null;
  departures_by_day: BusDepartureGroup[] | null;
  source_url: string;
  scraped_at: string;
}

export interface BusDestination {
  slug: string;
  name: string;
  type: "town" | "beach" | "village" | "site";
  region: string | null;
  things_to_do_slug: string | null;
  where_to_stay_slug: string | null;
  beaches_near: boolean;
  has_direct_bus: boolean;
}

export async function getBusRoutes(): Promise<BusRoute[]> {
  const { data, error } = await supabase
    .from("bus_routes")
    .select("*")
    .order("operator_id", { ascending: true })
    .order("from_place", { ascending: true })
    .order("to_place", { ascending: true });
  if (error) {
    console.error("[buses] getBusRoutes", error.message);
    return [];
  }
  return (data as BusRoute[]) ?? [];
}

export async function getBusDestinations(): Promise<Record<string, BusDestination>> {
  const { data, error } = await supabase.from("bus_destinations").select("*");
  if (error) {
    console.error("[buses] getBusDestinations", error.message);
    return {};
  }
  const map: Record<string, BusDestination> = {};
  for (const d of (data as BusDestination[]) ?? []) map[d.slug] = d;
  return map;
}

/** Date ISO la plus recente parmi les routes (pour le badge "Mis a jour le"). */
export function latestScrapedAt(routes: BusRoute[]): string | null {
  if (routes.length === 0) return null;
  return routes.reduce(
    (max, r) => (r.scraped_at > max ? r.scraped_at : max),
    routes[0].scraped_at,
  );
}
