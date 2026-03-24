import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) envVars[m[1]] = m[2];
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const VILLAGES = [
  { name_en: "Chania", lat: 35.3387, lng: 24.4615, pop: 53373, region: "west" },
  { name_en: "Platanias", lat: 35.3547, lng: 24.1234, pop: 3500, region: "west" },
  { name_en: "Agia Marina", lat: 35.3801, lng: 24.1045, pop: 2800, region: "west" },
  { name_en: "Paleokastro", lat: 35.3501, lng: 24.2834, pop: 1200, region: "west" },
  { name_en: "Kastelli", lat: 35.2167, lng: 23.6333, pop: 2100, region: "west" },
  { name_en: "Polymyros", lat: 35.4501, lng: 23.9234, pop: 800, region: "west" },
  { name_en: "Kalives", lat: 35.3867, lng: 24.2434, pop: 2300, region: "west" },
  { name_en: "Rethymno", lat: 35.3746, lng: 24.4743, pop: 16235, region: "central" },
  { name_en: "Atsipopoulo", lat: 35.3501, lng: 24.5234, pop: 2500, region: "central" },
  { name_en: "Gerani", lat: 35.4167, lng: 24.6667, pop: 450, region: "central" },
  { name_en: "Kokkini Hani", lat: 35.3334, lng: 25.0167, pop: 800, region: "central" },
  { name_en: "Heraklion", lat: 35.3387, lng: 25.1442, pop: 140730, region: "central" },
  { name_en: "Agia Pelagia", lat: 35.3823, lng: 25.1567, pop: 3200, region: "central" },
  { name_en: "Archanes", lat: 35.2667, lng: 25.3833, pop: 4100, region: "central" },
  { name_en: "Knossos", lat: 35.2998, lng: 25.1848, pop: 1500, region: "central" },
  { name_en: "Amnissos", lat: 35.3667, lng: 25.2167, pop: 400, region: "central" },
  { name_en: "Matala", lat: 34.9867, lng: 24.7867, pop: 280, region: "central" },
  { name_en: "Agios Nikolaos", lat: 35.1901, lng: 25.7133, pop: 10711, region: "east" },
  { name_en: "Siteia", lat: 35.2167, lng: 26.1, pop: 9360, region: "east" },
  { name_en: "Ierapetra", lat: 34.7667, lng: 25.7333, pop: 14114, region: "east" },
  { name_en: "Kritsa", lat: 35.1833, lng: 25.7667, pop: 1800, region: "east" },
  { name_en: "Elounda", lat: 35.2667, lng: 25.6833, pop: 2100, region: "east" },
  { name_en: "Makrigialos", lat: 34.8434, lng: 25.8667, pop: 420, region: "east" },
  { name_en: "Kato Zakros", lat: 35.0567, lng: 26.2434, pop: 250, region: "east" },
  { name_en: "Schinokapsala", lat: 35.0667, lng: 26.0833, pop: 180, region: "east" },
  { name_en: "Myrtos", lat: 35.0333, lng: 25.5667, pop: 350, region: "east" },
  { name_en: "Pitsidia", lat: 34.9333, lng: 25.65, pop: 680, region: "east" },
  { name_en: "Gra Limanakia", lat: 35.2167, lng: 26.0833, pop: 420, region: "east" },
];

function slugify(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function insert() {
  const data = VILLAGES.map(v => ({
    name_en: v.name_en,
    name_el: null,
    name_fr: null,
    name_de: null,
    slug: slugify(v.name_en),
    region: v.region,
    period: "modern",
    population: v.pop,
    altitude_m: null,
    latitude: v.lat,
    longitude: v.lng,
    municipality: null,
  }));

  console.log(`Inserting ${data.length} villages into Supabase...`);

  const batchSize = 100;
  let count = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase.from("villages").insert(batch);
    if (error) {
      console.error("Error:", error);
      process.exit(1);
    }
    count += batch.length;
    console.log(`Inserted batch: ${count}/${data.length}`);
  }

  const stats = { west: 0, central: 0, east: 0 };
  data.forEach(v => { stats[v.region]++; });
  
  console.log(`\nSuccess! Inserted ${count} villages`);
  console.log(`Distribution: West=${stats.west}, Central=${stats.central}, East=${stats.east}`);

  fs.writeFileSync(path.join(__dirname, "villages-osm.json"), JSON.stringify({
    source: "fallback",
    timestamp: new Date().toISOString(),
    count: data.length,
    elements: data
  }, null, 2));
  
  console.log("Saved to villages-osm.json");
}

insert().catch(e => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
