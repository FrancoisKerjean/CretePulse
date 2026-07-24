// scripts/seed-bus-destinations.mjs
// Seed cure des destinations bus -> branche le sas guides.
// Run: SUPABASE_SERVICE_KEY=... node scripts/seed-bus-destinations.mjs
// NB self-hosted : peut aussi etre seede via psql sur le VPS (cf. commit message).
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service role pour ecrire
);

const DESTINATIONS = [
  // Villes (bus direct, slugs alignes sur /things-to-do/[city] et /where-to-stay/[area])
  { slug: "heraklion",      name: "Heraklion",      type: "town", region: "east", lat: 35.3387, lng: 25.1442, things_to_do_slug: "heraklion",      where_to_stay_slug: "heraklion",      beaches_near: true,  has_direct_bus: true },
  { slug: "chania",         name: "Chania",         type: "town", region: "west", lat: 35.5138, lng: 24.0180, things_to_do_slug: "chania",         where_to_stay_slug: "chania",         beaches_near: true,  has_direct_bus: true },
  { slug: "rethymno",       name: "Rethymno",       type: "town", region: "west", lat: 35.3647, lng: 24.4742, things_to_do_slug: "rethymno",       where_to_stay_slug: "rethymno",       beaches_near: true,  has_direct_bus: true },
  { slug: "agios-nikolaos", name: "Agios Nikolaos", type: "town", region: "east", lat: 35.1900, lng: 25.7160, things_to_do_slug: "agios-nikolaos", where_to_stay_slug: "agios-nikolaos", beaches_near: true,  has_direct_bus: true },
  { slug: "ierapetra",      name: "Ierapetra",      type: "town", region: "east", lat: 35.0107, lng: 25.7350, things_to_do_slug: "ierapetra",      where_to_stay_slug: "ierapetra",      beaches_near: true,  has_direct_bus: true },
  { slug: "sitia",          name: "Sitia",          type: "town", region: "east", lat: 35.2080, lng: 26.1030, things_to_do_slug: "sitia",          where_to_stay_slug: "sitia",          beaches_near: true,  has_direct_bus: true },
  { slug: "malia",          name: "Malia",          type: "town", region: "east", lat: 35.2870, lng: 25.4590, things_to_do_slug: "malia",          where_to_stay_slug: "malia",          beaches_near: true,  has_direct_bus: true },
  { slug: "hersonissos",    name: "Hersonissos",    type: "town", region: "east", lat: 35.3210, lng: 25.3850, things_to_do_slug: "hersonissos",    where_to_stay_slug: "hersonissos",    beaches_near: true,  has_direct_bus: true },
  // Sites / plages (la longue traine -- has_direct_bus a ajuster selon le scrape reel)
  { slug: "knossos",        name: "Knossos",        type: "site",  region: "east", lat: 35.2980, lng: 25.1630, things_to_do_slug: "heraklion", where_to_stay_slug: null, beaches_near: false, has_direct_bus: true },
  { slug: "matala",         name: "Matala",         type: "beach", region: "east", lat: 34.9950, lng: 24.7490, things_to_do_slug: null,        where_to_stay_slug: null, beaches_near: true,  has_direct_bus: true },
  { slug: "elafonissi",     name: "Elafonissi",     type: "beach", region: "west", lat: 35.2710, lng: 23.5390, things_to_do_slug: null,        where_to_stay_slug: null, beaches_near: true,  has_direct_bus: true },
  { slug: "balos",          name: "Balos",          type: "beach", region: "west", lat: 35.5800, lng: 23.5900, things_to_do_slug: null,        where_to_stay_slug: null, beaches_near: true,  has_direct_bus: false },
  { slug: "samaria",        name: "Samaria Gorge",  type: "site",  region: "west", lat: 35.2680, lng: 23.9560, things_to_do_slug: null,        where_to_stay_slug: null, beaches_near: false, has_direct_bus: true },
];

const { error } = await sb.from("bus_destinations").upsert(DESTINATIONS, { onConflict: "slug" });
if (error) { console.error("[seed-bus-destinations] ERROR", error); process.exit(1); }
console.log(`[seed-bus-destinations] upserted ${DESTINATIONS.length} destinations`);
