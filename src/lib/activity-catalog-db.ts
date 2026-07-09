// Accès lecture au catalogue d'exemples d'activités (table activity_catalog_items).
// Server-only (supabase admin), consommé par les pages ISR /activities.
// RÈGLE ANTI-EXPOSITION : les colonnes internes de provenance ne sont JAMAIS
// sélectionnées ici (COLS explicite, pas d'étoile) ; check-activity-catalog.mjs
// vérifie ce fichier en texte. Pattern identique à activity-partners-db.ts.
import { supabaseAdmin as supabase } from "./supabase-admin";
import type { CatalogRow } from "./activity-catalog";

const COLS = "id, category, city, title, summary, duration_label, price_from_eur, translations, display_order";

/** Items actifs d'un combo catégorie × ville. */
export async function catalogRowsFor(categorySlug: string, city: string): Promise<CatalogRow[]> {
  try {
    const { data, error } = await supabase.from("activity_catalog_items")
      .select(COLS).eq("active", true).eq("category", categorySlug).eq("city", city);
    if (error) { console.error("[activity-catalog-db] catalogRowsFor:", error.message); return []; }
    return (data ?? []) as unknown as CatalogRow[];
  } catch (e) {
    console.error("[activity-catalog-db] catalogRowsFor (exception):", e instanceof Error ? e.message : e);
    return [];
  }
}

/** Items actifs d'une catégorie (toutes villes). */
export async function catalogRowsForCategory(categorySlug: string): Promise<CatalogRow[]> {
  try {
    const { data, error } = await supabase.from("activity_catalog_items")
      .select(COLS).eq("active", true).eq("category", categorySlug);
    if (error) { console.error("[activity-catalog-db] catalogRowsForCategory:", error.message); return []; }
    return (data ?? []) as unknown as CatalogRow[];
  } catch (e) {
    console.error("[activity-catalog-db] catalogRowsForCategory (exception):", e instanceof Error ? e.message : e);
    return [];
  }
}

/** Tous les items actifs (vitrine page mère). */
export async function allCatalogRows(): Promise<CatalogRow[]> {
  try {
    const { data, error } = await supabase.from("activity_catalog_items")
      .select(COLS).eq("active", true);
    if (error) { console.error("[activity-catalog-db] allCatalogRows:", error.message); return []; }
    return (data ?? []) as unknown as CatalogRow[];
  } catch (e) {
    console.error("[activity-catalog-db] allCatalogRows (exception):", e instanceof Error ? e.message : e);
    return [];
  }
}
