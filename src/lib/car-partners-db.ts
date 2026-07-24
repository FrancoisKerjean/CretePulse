// Accès au registre des loueurs (table car_partners). Server-only (supabase
// admin). Remplace la résolution statique de car-partners.ts : les zones
// restent statiques (CAR_ZONES), mais QUI couvre une zone vient de la base.
import { supabaseAdmin as supabase } from "./supabase-admin";

export interface DbPartner {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  zone_ids: string[];
  commission: number;
  lead_routing: "direct" | "relay";
  active: boolean;
}

const COLS = "id, name, email, phone, whatsapp, zone_ids, commission, lead_routing, active";

/** Loueurs actifs couvrant la zone : tous invités (appel d'offres first-come). */
export async function partnersForZone(zoneId: string): Promise<DbPartner[]> {
  try {
    const { data, error } = await supabase.from("car_partners")
      .select(COLS).eq("active", true).contains("zone_ids", [zoneId]);
    if (error) { console.error("[car-partners-db] partnersForZone:", error.message); return []; }
    return (data ?? []) as DbPartner[];
  } catch (e) {
    console.error("[car-partners-db] partnersForZone (exception):", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function partnerById(id: number): Promise<DbPartner | null> {
  try {
    const { data } = await supabase.from("car_partners").select(COLS).eq("id", id).maybeSingle();
    return (data as DbPartner) ?? null;
  } catch (e) {
    console.error("[car-partners-db] partnerById (exception):", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Zones ayant au moins un loueur actif (pour griser les zones non couvertes). */
export async function servedZoneIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from("car_partners").select("zone_ids").eq("active", true);
    if (error) { console.error("[car-partners-db] servedZoneIds:", error.message); return []; }
    const set = new Set<string>();
    for (const r of (data ?? []) as { zone_ids: string[] }[]) for (const z of r.zone_ids ?? []) set.add(z);
    return [...set];
  } catch (e) {
    console.error("[car-partners-db] servedZoneIds (exception):", e instanceof Error ? e.message : e);
    return [];
  }
}
