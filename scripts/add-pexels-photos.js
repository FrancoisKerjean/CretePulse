/**
 * add-pexels-photos.js
 *
 * Fetches real photos from the Pexels API and assigns them to CretePulse
 * content (beaches, villages, hikes) where image_url IS NULL.
 *
 * Strategy per table:
 *   - beaches : search "[name] Crete beach" → fallback "Crete beach [region]"
 *   - villages: search "[name] Crete village" → fallback "Crete traditional village"
 *   - hikes   : search "[name] Crete" or type-specific → fallback "Crete hiking trail"
 *
 * Rate limit: 200 req/hour → 1 second delay between Pexels calls.
 * Order: beaches first (most visible), then villages, then hikes.
 *
 * Only updates rows WHERE image_url IS NULL.
 * Hikes table has no image_credit column — only image_url is updated there.
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PEXELS_API_KEY = "Uzrk9EzODLTZx1rP7sVP87oubMhBPrUKsATOrffEe8fQ2cE72GuDd4td";
const PEXELS_SEARCH = "https://api.pexels.com/v1/search";
const DELAY_MS = 1100; // slightly over 1s to stay safely under rate limit

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ---------------------------------------------------------------------------
// Pexels helper
// ---------------------------------------------------------------------------
async function searchPexels(query) {
  const url = `${PEXELS_SEARCH}?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: PEXELS_API_KEY },
  });
  if (!res.ok) {
    console.warn(`  Pexels HTTP ${res.status} for "${query}"`);
    return null;
  }
  const data = await res.json();
  if (!data.photos || data.photos.length === 0) return null;
  // Prefer landscape photos, pick the first one
  const photo = data.photos[0];
  return {
    url: photo.src.large2x || photo.src.large || photo.src.medium,
    credit: `Pexels / ${photo.photographer}`,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Per-table search strategies
// ---------------------------------------------------------------------------

async function photoForBeach(beach) {
  // 1. Specific search: "[name] Crete beach"
  let result = await searchPexels(`${beach.name_en} Crete beach`);
  await sleep(DELAY_MS);
  if (result) return result;

  // 2. Regional fallback
  const region = beach.region || "Crete";
  result = await searchPexels(`Crete beach ${region}`);
  await sleep(DELAY_MS);
  if (result) return result;

  // 3. Generic fallback
  result = await searchPexels("Crete beach turquoise water");
  await sleep(DELAY_MS);
  return result;
}

async function photoForVillage(village) {
  // 1. Specific search: "[name] Crete village"
  let result = await searchPexels(`${village.name_en} Crete village`);
  await sleep(DELAY_MS);
  if (result) return result;

  // 2. Period-based fallback (Minoan, Venetian, Byzantine, Ottoman, etc.)
  const period = village.period;
  if (period && period !== "modern") {
    result = await searchPexels(`Crete ${period} village`);
    await sleep(DELAY_MS);
    if (result) return result;
  }

  // 3. Regional fallback
  const region = village.region || "Crete";
  result = await searchPexels(`Crete traditional village ${region}`);
  await sleep(DELAY_MS);
  if (result) return result;

  // 4. Generic fallback
  result = await searchPexels("Greek village traditional stone houses");
  await sleep(DELAY_MS);
  return result;
}

async function photoForHike(hike) {
  // Build a query based on hike name and type
  const typeMap = {
    gorge: "Crete gorge hiking",
    mountain: "Crete mountain trail hiking",
    coastal: "Crete coastal path hiking",
    cultural: "Crete traditional path hiking",
    forest: "Crete forest trail",
    circular: "Crete hiking trail",
  };

  // 1. Specific search: "[name] Crete"
  let result = await searchPexels(`${hike.name_en} Crete`);
  await sleep(DELAY_MS);
  if (result) return result;

  // 2. Type-based fallback
  const typeQuery = typeMap[hike.type] || "Crete hiking trail mountains";
  result = await searchPexels(typeQuery);
  await sleep(DELAY_MS);
  if (result) return result;

  // 3. Generic fallback
  result = await searchPexels("Crete mountains hiking landscape");
  await sleep(DELAY_MS);
  return result;
}

// ---------------------------------------------------------------------------
// Process a table
// ---------------------------------------------------------------------------
async function processTable(tableName, fetchColumns, photoFn, hasImageCredit = true) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing ${tableName.toUpperCase()}...`);
  console.log("=".repeat(60));

  const { data: rows, error } = await supabase
    .from(tableName)
    .select(fetchColumns)
    .is("image_url", null)
    .order("id", { ascending: true });

  if (error) {
    console.error(`Supabase error fetching ${tableName}:`, error.message);
    return { success: 0, failed: 0, skipped: 0 };
  }

  console.log(`Found ${rows.length} rows without image_url.`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const progress = `[${i + 1}/${rows.length}]`;

    console.log(`\n${progress} ${row.name_en} (${row.slug})`);

    const photo = await photoFn(row);

    if (!photo) {
      console.log(`  No photo found — skipping.`);
      skipped++;
      continue;
    }

    console.log(`  Found: ${photo.url.substring(0, 80)}...`);
    console.log(`  Credit: ${photo.credit}`);

    const updatePayload = { image_url: photo.url };
    if (hasImageCredit) updatePayload.image_credit = photo.credit;

    const { error: updateErr } = await supabase
      .from(tableName)
      .update(updatePayload)
      .eq("id", row.id);

    if (updateErr) {
      console.error(`  UPDATE FAILED: ${updateErr.message}`);
      failed++;
    } else {
      console.log(`  Saved.`);
      success++;
    }
  }

  return { success, failed, skipped };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("CretePulse - Pexels Photo Importer");
  console.log("====================================");
  console.log("Rate limit: 1.1s delay between Pexels calls");
  console.log("Order: beaches → villages → hikes\n");

  // Pre-flight check
  const { data: test, error: testErr } = await supabase
    .from("beaches")
    .select("id")
    .limit(1);
  if (testErr) {
    console.error("Supabase connection failed:", testErr.message);
    process.exit(1);
  }
  console.log("Supabase connection OK.\n");

  // Test Pexels API
  console.log("Testing Pexels API...");
  const testPhoto = await searchPexels("Crete beach test");
  if (!testPhoto) {
    console.error("Pexels API test failed. Check your API key.");
    process.exit(1);
  }
  console.log("Pexels API OK.\n");
  await sleep(DELAY_MS);

  const results = {};

  // --- BEACHES ---
  results.beaches = await processTable(
    "beaches",
    "id, slug, name_en, region",
    photoForBeach,
    true // has image_credit
  );

  // --- VILLAGES ---
  results.villages = await processTable(
    "villages",
    "id, slug, name_en, region, period",
    photoForVillage,
    true // has image_credit
  );

  // --- HIKES ---
  results.hikes = await processTable(
    "hikes",
    "id, slug, name_en, type",
    photoForHike,
    false // NO image_credit column in hikes table
  );

  // ---------------------------------------------------------------------------
  // Final report
  // ---------------------------------------------------------------------------
  console.log(`\n${"=".repeat(60)}`);
  console.log("FINAL REPORT");
  console.log("=".repeat(60));

  for (const [table, r] of Object.entries(results)) {
    console.log(`\n${table.toUpperCase()}`);
    console.log(`  Updated : ${r.success}`);
    console.log(`  Failed  : ${r.failed}`);
    console.log(`  Skipped : ${r.skipped}`);
  }

  // Verify final state
  console.log("\nVerifying final state in Supabase...");
  for (const table of ["beaches", "villages", "hikes"]) {
    const { count: withPhoto } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .not("image_url", "is", null);
    const { count: total } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    console.log(`  ${table}: ${withPhoto}/${total} have a photo`);
  }

  const totalSuccess =
    results.beaches.success + results.villages.success + results.hikes.success;
  const target = 100 + 50 + 20; // beaches + villages + hikes
  console.log(`\nTotal photos added: ${totalSuccess}`);
  console.log(`Target: ${target}`);
  console.log(totalSuccess >= target ? "TARGET REACHED." : "Target not fully reached.");

  console.log("\nDone.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
