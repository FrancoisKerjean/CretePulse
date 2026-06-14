// Extrait une fixture réelle pour les tests d'intégration du moteur live.
// Run: node --env-file=.env.local scripts/extract-bus-live-fixture.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.error("env Supabase manquant"); process.exit(1); }
const sb = createClient(url, key);

// 3 lignes : 1 OSM longue (LAS-02 Sitia), 1 OSM courte (LAS-07 Elounda), 1 KTEL-fallback
const CODES = ["LAS-02", "LAS-07"];
const { data: lines } = await sb.from("bus_lines")
  .select("id, code, code_official, source, geometry, total_minutes, length_km, partial_geo")
  .in("code", CODES);
const ktel = (await sb.from("bus_lines")
  .select("id, code, code_official, source, geometry, total_minutes, length_km, partial_geo")
  .eq("source", "ktel").limit(1)).data ?? [];
const allLines = [...(lines ?? []), ...ktel];
const ids = allLines.map((l) => l.id);

const { data: lineStops } = await sb.from("bus_line_stops")
  .select("line_id, stop_id, seq, cumulative_km, cumulative_minutes")
  .in("line_id", ids).order("line_id").order("seq");
const stopIds = [...new Set((lineStops ?? []).map((s) => s.stop_id))];
const { data: stops } = await sb.from("bus_stops")
  .select("id, slug, name, lat, lng").in("id", stopIds);
const { data: routes } = await sb.from("bus_routes")
  .select("*").in("line_id", ids);

mkdirSync("src/lib/bus-live/fixtures", { recursive: true });
writeFileSync(
  "src/lib/bus-live/fixtures/bus_live_sample.json",
  JSON.stringify({ lines: allLines, lineStops, stops, routes }, null, 2),
);
console.log(`fixture: ${allLines.length} lignes, ${routes?.length ?? 0} routes`);
