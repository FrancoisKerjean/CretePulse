// Valide que la lib lit bien la DB. Run: node scripts/check-buses-lib.mjs
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(url, key);

const { data: routes, error: e1 } = await sb.from("bus_routes").select("scraped_at,to_slug").limit(500);
const { data: dests, error: e2 } = await sb.from("bus_destinations").select("slug,type").limit(50);
if (e1 || e2 || !routes || !dests) {
  console.error("FAIL: lecture DB KO", e1?.message, e2?.message);
  process.exit(1);
}
const withSlug = routes.filter((r) => r.to_slug).length;
console.log(`OK lecture: ${routes.length} routes (${withSlug} avec to_slug), ${dests.length} destinations`);
