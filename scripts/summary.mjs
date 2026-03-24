import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function summarize() {
  console.log("\n=== CRETEPULSE FOOD PLACES IMPORT SUMMARY ===\n");

  // Total count
  const { count, error } = await supabase
    .from("food_places")
    .select("*", { count: "exact" });

  if (error) {
    console.error("Error querying:", error);
    return;
  }

  console.log(`✓ Total places imported: ${count}`);

  // Type breakdown
  const { data: allData } = await supabase
    .from("food_places")
    .select("type, region, phone, website");

  const typeMap = {};
  const regionMap = {};
  let withPhone = 0;
  let withWebsite = 0;

  allData?.forEach((item) => {
    typeMap[item.type] = (typeMap[item.type] || 0) + 1;
    regionMap[item.region] = (regionMap[item.region] || 0) + 1;
    if (item.phone) withPhone++;
    if (item.website) withWebsite++;
  });

  console.log("\nBreakdown by type:");
  Object.entries(typeMap).forEach(([type, cnt]) => {
    console.log(`  • ${type}: ${cnt}`);
  });

  console.log("\nBreakdown by region:");
  Object.entries(regionMap).forEach(([region, cnt]) => {
    console.log(`  • ${region}: ${cnt}`);
  });

  console.log("\nContact information:");
  console.log(`  • With phone: ${withPhone}`);
  console.log(`  • With website: ${withWebsite}`);

  // Raw data stats
  const rawData = JSON.parse(fs.readFileSync("food-osm.json", "utf8"));
  const stats = fs.statSync("food-osm.json");
  console.log(`\nRaw data file: scripts/food-osm.json`);
  console.log(`  • File size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`  • Records: ${rawData.length}`);

  // Sample places
  const { data: samples } = await supabase
    .from("food_places")
    .select("name, type, region, cuisine, phone, website")
    .limit(5);

  console.log("\nSample places:");
  samples?.forEach((place) => {
    console.log(`  • ${place.name} (${place.type}) - ${place.region}`);
    if (place.cuisine) console.log(`      Cuisine: ${place.cuisine}`);
    if (place.phone) console.log(`      Phone: ${place.phone}`);
  });

  console.log("\n✓ Import complete!\n");
}

summarize().catch(console.error);
