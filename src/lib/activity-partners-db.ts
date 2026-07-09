// Accès au registre des prestataires (table activity_partners). Server-only
// (supabase admin). La couverture catégorie/ville vient de la base.
import { supabaseAdmin as supabase } from "./supabase-admin";

export interface DbActivityPartner {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  category_slug: string;
  cities: string[];
  languages: string[];
  commission: number;
  lead_routing: "direct" | "relay";
  active: boolean;
}

const COLS = "id, name, email, phone, whatsapp, category_slug, cities, languages, commission, lead_routing, active";

/** Prestataires actifs couvrant catégorie + ville : tous invités (multi-devis). */
export async function partnersForCategoryCity(categorySlug: string, city: string): Promise<DbActivityPartner[]> {
  try {
    const { data, error } = await supabase.from("activity_partners")
      .select(COLS).eq("active", true).eq("category_slug", categorySlug).contains("cities", [city]);
    if (error) { console.error("[activity-partners-db] partnersForCategoryCity:", error.message); return []; }
    return (data ?? []) as DbActivityPartner[];
  } catch (e) {
    console.error("[activity-partners-db] partnersForCategoryCity (exception):", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function partnerById(id: number): Promise<DbActivityPartner | null> {
  try {
    const { data } = await supabase.from("activity_partners").select(COLS).eq("id", id).maybeSingle();
    return (data as DbActivityPartner) ?? null;
  } catch (e) {
    console.error("[activity-partners-db] partnerById (exception):", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Combos catégorie/ville ayant au moins un prestataire actif (pour griser les combos non couverts). */
export async function servedCombos(): Promise<Array<{ category_slug: string; city: string }>> {
  try {
    const { data, error } = await supabase.from("activity_partners").select("category_slug, cities").eq("active", true);
    if (error) { console.error("[activity-partners-db] servedCombos:", error.message); return []; }
    const seen = new Set<string>();
    const result: Array<{ category_slug: string; city: string }> = [];
    for (const r of (data ?? []) as { category_slug: string; cities: string[] }[]) {
      for (const city of r.cities ?? []) {
        const key = `${r.category_slug}|${city}`;
        if (!seen.has(key)) { seen.add(key); result.push({ category_slug: r.category_slug, city }); }
      }
    }
    return result;
  } catch (e) {
    console.error("[activity-partners-db] servedCombos (exception):", e instanceof Error ? e.message : e);
    return [];
  }
}
