const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  // Get total count
  const { count: totalCount } = await supabase
    .from("beaches")
    .select("*", { count: "exact", head: true });

  // Get count with null descriptions
  const { data: nullDescEn } = await supabase
    .from("beaches")
    .select("id, name_en, description_en")
    .is("description_en", null);

  const { data: emptyDescEn } = await supabase
    .from("beaches")
    .select("id, name_en, description_en")
    .eq("description_en", "");

  console.log(`Total beaches: ${totalCount}`);
  console.log(`Beaches with NULL description_en: ${nullDescEn?.length || 0}`);
  console.log(`Beaches with empty description_en: ${emptyDescEn?.length || 0}`);
  console.log(`Beaches needing update: ${(nullDescEn?.length || 0) + (emptyDescEn?.length || 0)}`);

  // Sample a few beaches
  const { data: sample } = await supabase
    .from("beaches")
    .select("id, name_en, name_fr, description_en, description_fr")
    .limit(3);

  console.log("\nSample beaches:");
  sample?.forEach((b) => {
    console.log(`\n${b.name_en} (ID: ${b.id})`);
    console.log(`  EN: ${b.description_en?.substring(0, 80) || "NULL"}`);
    console.log(`  FR: ${b.description_fr?.substring(0, 80) || "NULL"}`);
  });

  process.exit(0);
}

main();
