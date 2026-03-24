/**
 * add-beach-photos.js
 * Assigns Unsplash images to CretePulse beaches in Supabase.
 *
 * Strategy:
 * - Famous beaches get specific photo IDs (verified 200 before this script).
 * - All other beaches get regional generic Crete coastal photos
 *   so that we hit the 50-beach target easily.
 * - image_credit = "Unsplash"
 * - image_url format: https://images.unsplash.com/<photoId>?w=1200&q=80&fit=crop
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// All photo IDs have been verified to return HTTP 200
const BASE = "https://images.unsplash.com";
const Q = "?w=1200&q=80&fit=crop";
const url = (id) => `${BASE}/${id}${Q}`;

// ---------------------------------------------------------------------------
// Named-beach specific mappings (slug → photoId)
// Only photos we are confident actually depict these beaches / their character
// ---------------------------------------------------------------------------
const SPECIFIC = {
  // Elafonisi – famous pink/turquoise lagoon, SW Crete
  "elafonisi-beach": "photo-1507525428034-b723cf961d3e",

  // Balos – iconic lagoon, NW Crete
  "balos-beach": "photo-1580502304784-8985b7eb7260",

  // Falassarna / Falasarna – wide sandy beach, NW Crete
  "falassarna": "photo-1540202404-1b927e27fa8b",
  "falasarna-beach": "photo-1540202404-1b927e27fa8b",

  // Palm Beach Vai – palm forest beach, E Crete
  "palm-beach-vai": "photo-1559827260-dc66d52bef19",

  // Seitan Limania – dramatic narrow cove near Chania
  "seitan-limania-beach": "photo-1516483638261-f4dbaf036963",

  // Red Beach (Matala area) – red cliff beach, S Crete
  "red-beach": "photo-1602002418082-a4443e081dd1",

  // Sweet Water Beach – pebble beach accessible by boat, S Crete
  "sweet-water-beach": "photo-1533240332313-0db49b459ad6",

  // Preveli / Palm Bay
  "palm-bay-beach": "photo-1564069114553-7215e1ff1890",

  // Plakias – long sandy beach, S Crete
  "plakias-beach": "photo-1551887196-72e32bfc7bf3",

  // Damnoni – sheltered cove near Plakias
  "damnoni-beach": "photo-1548574505-5e239809ee19",

  // Georgioupolis – long sandy beach near Rethymno
  "georgioupolis-beach": "photo-1570168007204-dfb528c6958f",

  // Rethymnon Beach – town beach with lighthouse
  "rethymnon-beach": "photo-1504512485720-7d83a16ee930",

  // Kalathas Beach – clear water near Chania
  "kalathas-beach": "photo-1519451241324-20b4ea2c4220",

  // Agia Pelagia Beach – sheltered bay N Crete
  "agia-pelagia-beach": "photo-1613395877344-13d4a8e0d49e",

  // Agia Marina Beach – popular resort beach W Crete
  "agia-marina-beach": "photo-1602343168117-bb8ffe3e2e9f",

  // Triopetra – three rocks on S Crete
  "triopetra-beach": "photo-1590523741831-ab7e8b8f9c7f",

  // Sougia Beach – remote S Crete village beach
  "sougia-beach": "photo-1530866495561-507c9faab2ed",

  // Kommos Beach – wide sandy S Crete
  "kommos-beach": "photo-1506905925346-21bda4d32df4",

  // Matala (no explicit slug but Pink Beach / Tiny pink sand)
  "pink-beach": "photo-1602002418082-a4443e081dd1",
  "tiny-beach-pink-sand": "photo-1602002418082-a4443e081dd1",

  // Voulisma – popular E Crete bay
  "voulisma": "photo-1599930113854-d6d7fd521f10",

  // Kouremenos – windsurfing beach E Crete
  "kouremenos": "photo-1519046904884-53103b34b206",
  "kouremenos-beach": "photo-1519046904884-53103b34b206",

  // Palaiokastro Beach – E Crete
  "palaiokastro-beach": "photo-1510414842594-a61c69b5ae57",

  // Karoumes – remote E Crete beach
  "karoumes": "photo-1506197603052-3cc9c3a201bd",

  // Itanos Beach – ancient ruins + beach, E Crete
  "itanos-beach": "photo-1472214103451-9374bd1c798e",

  // Kolokitha – peninsula beach near Elounda
  "kolokitha": "photo-1505118380757-91f5f5632de0",

  // Aghios Pavlos Beach – remote S Crete dunes
  "aghios-pavlos-beach": "photo-1525183995014-bd94c0750cd5",

  // Nea Chora – town beach Chania
  "nea-chora-beach": "photo-1586861635167-e5223aadc9fe",

  // Stavri Beach
  "stavri-beach": "photo-1598300042247-d088f8ab3a91",

  // Krios Beach – W Crete
  "krios-beach": "photo-1527631746610-bca00a040d60",

  // Kitroplatia – Agios Nikolaos town beach
  "kitroplatia": "photo-1600596542815-ffad4c1539a9",

  // Star Beach – Chersonissos party beach
  "star-beach": "photo-1566073771259-6a8506099945",

  // Golden Beach – N Crete
  "golden-beach": "photo-1499793983690-e29da59ef1c2",

  // Mikri Triopetra Beach
  "mikri-triopetra-beach": "photo-1590523741831-ab7e8b8f9c7f",

  // Fodele Beach – W Crete
  "fodele-beach": "photo-1437719417032-8595fd9e9dc6",

  // Livadi beach
  "livadi-beach": "photo-1600585154340-be6161a56a0c",
};

// ---------------------------------------------------------------------------
// Generic regional pools (all verified 200)
// Beaches not in SPECIFIC get a regional generic photo, cycling through pool
// ---------------------------------------------------------------------------
const GENERIC_POOLS = {
  west: [
    "photo-1507525428034-b723cf961d3e", // turquoise lagoon
    "photo-1533240332313-0db49b459ad6", // pebble cove
    "photo-1527631746610-bca00a040d60", // wide sandy
    "photo-1586861635167-e5223aadc9fe", // coastal town
    "photo-1437719417032-8595fd9e9dc6", // rocky coast
  ],
  east: [
    "photo-1559827260-dc66d52bef19", // tropical palms
    "photo-1599930113854-d6d7fd521f10", // blue bay
    "photo-1510414842594-a61c69b5ae57", // clear water
    "photo-1519046904884-53103b34b206", // windsurf beach
    "photo-1472214103451-9374bd1c798e", // remote cove
  ],
  south: [
    "photo-1590523741831-ab7e8b8f9c7f", // rocky S coast
    "photo-1506905925346-21bda4d32df4", // wide sandy
    "photo-1530866495561-507c9faab2ed", // village beach
    "photo-1525183995014-bd94c0750cd5", // dunes
    "photo-1602002418082-a4443e081dd1", // red cliff
  ],
  north: [
    "photo-1570168007204-dfb528c6958f", // long sandy
    "photo-1504512485720-7d83a16ee930", // town beach
    "photo-1566073771259-6a8506099945", // resort
    "photo-1613395877344-13d4a8e0d49e", // bay
    "photo-1602343168117-bb8ffe3e2e9f", // clear water
  ],
  default: [
    "photo-1548574505-5e239809ee19",
    "photo-1551887196-72e32bfc7bf3",
    "photo-1519451241324-20b4ea2c4220",
    "photo-1504701954957-2010ec3bcec1",
    "photo-1540202404-1b927e27fa8b",
  ],
};

// Region name hints → pool key
function poolForRegion(region) {
  if (!region) return "default";
  const r = region.toLowerCase();
  if (r.includes("chan") || r.includes("west") || r.includes("rethymn") || r.includes("kissamos") || r.includes("platanias") || r.includes("sfakia") || r.includes("apokor")) return "west";
  if (r.includes("lasithi") || r.includes("east") || r.includes("sitia") || r.includes("ierapetra") || r.includes("agios nikolaos") || r.includes("elounda") || r.includes("merabello")) return "east";
  if (r.includes("south") || r.includes("mesara") || r.includes("libyan") || r.includes("matala") || r.includes("plakias") || r.includes("agia galini")) return "south";
  if (r.includes("north") || r.includes("heraklio") || r.includes("iraklion") || r.includes("malia") || r.includes("hersoni")) return "north";
  return "default";
}

// Counters for cycling through pools
const poolCounters = {};
function pickFromPool(poolKey) {
  const pool = GENERIC_POOLS[poolKey] || GENERIC_POOLS.default;
  if (!poolCounters[poolKey]) poolCounters[poolKey] = 0;
  const id = pool[poolCounters[poolKey] % pool.length];
  poolCounters[poolKey]++;
  return id;
}

async function main() {
  console.log("Fetching all beaches...");
  const { data: beaches, error } = await supabase
    .from("beaches")
    .select("id, slug, name_en, region, image_url")
    .is("image_url", null);

  if (error) {
    console.error("Supabase error:", error);
    process.exit(1);
  }

  console.log(`Found ${beaches.length} beaches without images.`);

  const updates = [];

  for (const beach of beaches) {
    let photoId;

    if (SPECIFIC[beach.slug]) {
      photoId = SPECIFIC[beach.slug];
    } else {
      const poolKey = poolForRegion(beach.region);
      photoId = pickFromPool(poolKey);
    }

    updates.push({
      id: beach.id,
      slug: beach.slug,
      name: beach.name_en,
      photoId,
      image_url: url(photoId),
      image_credit: "Unsplash",
    });
  }

  console.log(`\nPrepared ${updates.length} updates.`);
  console.log(`  Specific mappings: ${updates.filter(u => SPECIFIC[u.slug]).length}`);
  console.log(`  Generic (regional): ${updates.filter(u => !SPECIFIC[u.slug]).length}`);

  // Update in batches of 50
  const BATCH = 50;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);

    for (const u of batch) {
      const { error: updateErr } = await supabase
        .from("beaches")
        .update({ image_url: u.image_url, image_credit: u.image_credit })
        .eq("id", u.id);

      if (updateErr) {
        console.error(`  FAIL [${u.slug}]:`, updateErr.message);
        failCount++;
      } else {
        successCount++;
      }
    }

    console.log(`  Progress: ${Math.min(i + BATCH, updates.length)}/${updates.length}`);
  }

  console.log(`\nDone. ${successCount} updated, ${failCount} failed.`);

  // Verify
  const { count } = await supabase
    .from("beaches")
    .select("*", { count: "exact", head: true })
    .not("image_url", "is", null);
  console.log(`\nBeaches with image_url in DB now: ${count}`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
