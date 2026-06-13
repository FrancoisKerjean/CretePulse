import { supabase } from "@/lib/supabase";

export interface BusAlert {
  id: number;
  slug: string;
  title: string;
  category: string | null; // 'mods' | 'extra_routes'
  published_date: string | null;
  url: string;
  matched_routes: string[] | null;
}

// Fenêtre de fraîcheur : on ne montre que les annonces récentes (les
// perturbations sans date de fin ne peuvent pas être supposées actives
// indéfiniment). 45 jours = proxy raisonnable de « en cours ».
const FRESH_DAYS = 45;

/** Alertes service KTEL Est récentes et datées, plus récentes d'abord. */
export async function getBusAlerts(): Promise<BusAlert[]> {
  const since = new Date(Date.now() - FRESH_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const { data, error } = await supabase
    .from("bus_alerts")
    .select("*")
    .gte("published_date", since)
    .order("published_date", { ascending: false })
    .limit(6);
  if (error) {
    console.error("[bus-alerts] getBusAlerts", error.message);
    return [];
  }
  return (data as BusAlert[]) ?? [];
}
