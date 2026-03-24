import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) envVars[m[1]] = m[2];
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verify() {
  const { data, error } = await supabase
    .from("villages")
    .select("*")
    .order("region, name_en");

  if (error) {
    console.error("Error:", error);
    process.exit(1);
  }

  console.log(`\nTotal villages in Supabase: ${data.length}\n`);

  const regions = { west: [], central: [], east: [] };
  data.forEach(v => {
    if (regions[v.region]) regions[v.region].push(v);
  });

  console.log("West villages:");
  regions.west.forEach(v => console.log(`  - ${v.name_en} (pop: ${v.population})`));

  console.log("\nCentral villages:");
  regions.central.forEach(v => console.log(`  - ${v.name_en} (pop: ${v.population})`));

  console.log("\nEast villages:");
  regions.east.forEach(v => console.log(`  - ${v.name_en} (pop: ${v.population})`));

  console.log(`\nDistribution: West=${regions.west.length}, Central=${regions.central.length}, East=${regions.east.length}`);
}

verify();
