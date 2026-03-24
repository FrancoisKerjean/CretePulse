const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  // Get all beaches with their descriptions
  const { data: beaches, count } = await supabase
    .from("beaches")
    .select("id, name_en, type, region, wind_exposure, description_en, description_fr", {
      count: "exact",
    })
    .limit(10);

  console.log(`=== BEACH DESCRIPTIONS VERIFICATION ===\n`);
  console.log(`Total beaches with descriptions: ${count || beaches?.length || 0}\n`);

  beaches?.forEach((b, i) => {
    console.log(`${i + 1}. ${b.name_en}`);
    console.log(`   Type: ${b.type}, Region: ${b.region}, Wind: ${b.wind_exposure}`);
    console.log(`   EN: ${b.description_en}`);
    console.log(`   FR: ${b.description_fr}`);
    console.log();
  });

  process.exit(0);
}

main();
