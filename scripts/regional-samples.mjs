import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function showSamples() {
  const regions = ["west", "central", "east"];

  console.log("\n=== SAMPLE PLACES BY REGION ===\n");

  for (const region of regions) {
    const { data } = await supabase
      .from("food_places")
      .select("name, type, cuisine, phone, website")
      .eq("region", region)
      .neq("slug", "")
      .limit(3);

    console.log(`\n[${region.toUpperCase()}]`);
    data?.forEach((place) => {
      console.log(`  • ${place.name}`);
      console.log(`    Type: ${place.type}${place.cuisine ? ` | Cuisine: ${place.cuisine}` : ""}`);
      if (place.phone || place.website) {
        if (place.phone) console.log(`    Phone: ${place.phone}`);
        if (place.website) console.log(`    Web: ${place.website}`);
      }
    });
  }

  console.log("\n");
}

showSamples().catch(console.error);
