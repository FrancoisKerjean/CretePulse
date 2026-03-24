import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verify() {
  const { data, count, error } = await supabase
    .from("food_places")
    .select("*", { count: "exact" })
    .limit(10);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log(`Total records in food_places: ${count}`);
    console.log(`\nSample records (first 10):`);
    data?.forEach((record: any) => {
      console.log(`  - ${record.name} (${record.type}) in ${record.region}`);
    });

    // Breakdown by type
    const { data: typeCount } = await supabase
      .from("food_places")
      .select("type")
      .then((result) => {
        const counts: Record<string, number> = {};
        result.data?.forEach((item: any) => {
          counts[item.type] = (counts[item.type] || 0) + 1;
        });
        return { data: counts };
      });

    console.log(`\nBreakdown by type:`);
    if (typeCount) {
      Object.entries(typeCount).forEach(([type, cnt]) => {
        console.log(`  - ${type}: ${cnt}`);
      });
    }
  }
}

verify().catch(console.error);
