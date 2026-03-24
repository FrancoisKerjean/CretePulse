import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  const { data, count } = await supabase
    .from("food_places")
    .select("id, name, slug", { count: "exact" })
    .eq("slug", "");

  console.log(`Records with empty slug: ${count}`);
  if (data && data.length > 0) {
    console.log("Sample records:");
    data.slice(0, 5).forEach((r) => {
      console.log(`  - ${r.id}: "${r.name}" (slug: empty)`);
    });
  }
}

check().catch(console.error);
