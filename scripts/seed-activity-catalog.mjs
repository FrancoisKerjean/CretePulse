// scripts/seed-activity-catalog.mjs
// Seed/MAJ du catalogue d'exemples d'activités depuis data/activity-catalog-seed.json.
// Idempotent : upsert sur (source_url, title). Re-runnable après MAJ du JSON.
// Run: node scripts/seed-activity-catalog.mjs   (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY requis)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import "dotenv/config";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const items = JSON.parse(readFileSync("data/activity-catalog-seed.json", "utf8"));
const rows = items.map((i) => ({
  category: i.category,
  city: i.city,
  title: i.title,
  summary: i.summary,
  duration_label: i.duration_label ?? null,
  price_from_eur: i.price_from_eur ?? null,
  price_seen_at: i.price_seen_at ?? null,
  translations: i.translations ?? {},
  source_url: i.source_url,
  source_name: i.source_name,
  display_order: i.display_order ?? 0,
  updated_at: new Date().toISOString(),
}));

const { error } = await sb.from("activity_catalog_items")
  .upsert(rows, { onConflict: "source_url,title" });
if (error) { console.error("[seed-activity-catalog] ERROR", error); process.exit(1); }
console.log(`[seed-activity-catalog] upserted ${rows.length} items`);
