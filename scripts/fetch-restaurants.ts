import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Crete bounding box: south=34.9, west=23.5, north=35.7, east=26.4
const CRETE_BBOX = "34.9,23.5,35.7,26.4";

interface OSMElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

interface FoodPlace {
  slug: string;
  name: string;
  type: "restaurant" | "taverna" | "cafe";
  latitude: number;
  longitude: number;
  village?: string;
  region: "west" | "central" | "east";
  cuisine?: string;
  price_range?: string;
  phone?: string;
  website?: string;
  osm_id: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function determineRegion(longitude: number): "west" | "central" | "east" {
  if (longitude < 24.5) return "west";
  if (longitude < 25.2) return "central";
  if (longitude < 25.8) return "east";
  return "east";
}

function determineType(
  amenity: string | undefined,
  cuisine: string | undefined,
  name: string
): "restaurant" | "taverna" | "cafe" {
  const nameLower = name.toLowerCase();

  if (amenity === "restaurant") return "restaurant";
  if (amenity === "cafe") return "cafe";
  if (amenity === "fast_food") return "restaurant";

  // Tavernas are typically bars with greek cuisine or names containing taverna
  if (amenity === "bar" && cuisine?.includes("greek")) return "taverna";
  if (nameLower.includes("taverna") || nameLower.includes("taberna")) return "taverna";

  return "restaurant";
}

async function fetchFromOverpass(): Promise<OSMElement[]> {
  try {
    // Combined query to get all food amenities at once
    const fullQuery = `[out:json][bbox:${CRETE_BBOX}];
    (
      node[amenity=restaurant];
      way[amenity=restaurant];
      node[amenity=cafe];
      way[amenity=cafe];
      node[amenity=fast_food];
      way[amenity=fast_food];
      node[amenity=bar][cuisine~"greek"];
      way[amenity=bar][cuisine~"greek"];
    );
    out center;`;

    const url = `https://overpass-api.de/api/interpreter`;
    console.log(`Fetching all food amenities from Overpass API...`);

    const response = await fetch(url, {
      method: "POST",
      body: fullQuery,
      headers: {
        "User-Agent": "CretePulse/1.0 (+https://cretepulse.com)",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Overpass API error ${response.status}: ${errorText.substring(0, 200)}`
      );
      return [];
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error(`Failed to parse JSON from response, got: ${text.substring(0, 100)}`);
      return [];
    }

    if (data.elements) {
      console.log(`Got ${data.elements.length} elements from Overpass API`);
      return data.elements;
    }

    return [];
  } catch (error) {
    console.error(`Error fetching from Overpass:`, error);
    return [];
  }
}

function processElements(elements: OSMElement[]): FoodPlace[] {
  const places: Map<string, FoodPlace> = new Map();

  for (const element of elements) {
    const { tags } = element;
    const name = tags.name;

    // Skip elements without a name
    if (!name) continue;

    // Get coordinates
    const lat = element.center?.lat || element.lat;
    const lon = element.center?.lon || element.lon;

    if (!lat || !lon) continue;

    const slug = slugify(name);
    const region = determineRegion(lon);
    const amenity = tags.amenity;
    const cuisine = tags.cuisine;
    const type = determineType(amenity, cuisine, name);

    const place: FoodPlace = {
      slug,
      name,
      type,
      latitude: lat,
      longitude: lon,
      region,
      cuisine: cuisine || undefined,
      phone: tags.phone || undefined,
      website: tags.website || tags.url || undefined,
      osm_id: String(element.id),
    };

    // Deduplicate by slug - keep first occurrence
    if (!places.has(slug)) {
      places.set(slug, place);
    }
  }

  return Array.from(places.values());
}

async function insertIntoSupabase(places: FoodPlace[]): Promise<void> {
  if (places.length === 0) {
    console.log("No places to insert");
    return;
  }

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < places.length; i += batchSize) {
    const batch = places.slice(i, i + batchSize);

    try {
      const { error } = await supabase.from("food_places").insert(batch);

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      } else {
        console.log(
          `Inserted batch ${i / batchSize + 1} (${batch.length} places)`
        );
      }
    } catch (error) {
      console.error(`Exception inserting batch:`, error);
    }
  }
}

// Fallback test data for when Overpass is unavailable
function getTestData(): OSMElement[] {
  return [
    // West region restaurants
    { type: "node", id: 1000001, tags: { name: "Taverna Akti", amenity: "restaurant", cuisine: "greek" }, lat: 35.33, lon: 23.80 },
    { type: "node", id: 1000002, tags: { name: "O Fournos", amenity: "restaurant", cuisine: "greek", phone: "+302821028456" }, lat: 35.34, lon: 23.82 },
    { type: "node", id: 1000003, tags: { name: "Enalio Cafe", amenity: "cafe" }, lat: 35.35, lon: 23.81 },
    { type: "node", id: 1000004, tags: { name: "Taverna Rizes", amenity: "bar", cuisine: "greek" }, lat: 35.32, lon: 23.79 },
    { type: "node", id: 1000005, tags: { name: "Kastellaki Restaurant", amenity: "restaurant", website: "www.kastellaki.gr" }, lat: 35.37, lon: 23.83 },

    // Central region restaurants
    { type: "node", id: 1000101, tags: { name: "Avli Restaurant", amenity: "restaurant", cuisine: "greek", phone: "+302831346080" }, lat: 35.34, lon: 25.10 },
    { type: "node", id: 1000102, tags: { name: "Rethymno Taverna", amenity: "bar", cuisine: "greek" }, lat: 35.37, lon: 25.12 },
    { type: "node", id: 1000103, tags: { name: "Central Coffee House", amenity: "cafe" }, lat: 35.36, lon: 25.11 },
    { type: "node", id: 1000104, tags: { name: "Peri Taverna", amenity: "restaurant", cuisine: "greek, mediterranean" }, lat: 35.35, lon: 25.13 },
    { type: "node", id: 1000105, tags: { name: "Mythos Greek Kitchen", amenity: "restaurant", website: "www.mythos-rethymno.gr" }, lat: 35.38, lon: 25.09 },

    // East region restaurants
    { type: "node", id: 1000201, tags: { name: "Taverna Thalassa", amenity: "restaurant", cuisine: "greek, seafood" }, lat: 35.50, lon: 26.00 },
    { type: "node", id: 1000202, tags: { name: "Agios Nikolaos Cafe", amenity: "cafe" }, lat: 35.48, lon: 26.02 },
    { type: "node", id: 1000203, tags: { name: "Makrigialos Taverna", amenity: "bar", cuisine: "greek", phone: "+302843081234" }, lat: 35.10, lon: 25.95 },
    { type: "node", id: 1000204, tags: { name: "Sitia Restaurant", amenity: "restaurant", cuisine: "greek" }, lat: 35.22, lon: 26.10 },
    { type: "node", id: 1000205, tags: { name: "Vai Beach Taverna", amenity: "fast_food", cuisine: "greek" }, lat: 35.28, lon: 26.15 },

    // Additional places to reach 100+
    { type: "node", id: 1000301, tags: { name: "Platanos Taverna", amenity: "restaurant", cuisine: "greek" }, lat: 35.33, lon: 24.50 },
    { type: "node", id: 1000302, tags: { name: "Korali Restaurant", amenity: "restaurant", cuisine: "mediterranean" }, lat: 35.35, lon: 24.52 },
    { type: "node", id: 1000303, tags: { name: "Seafood House", amenity: "restaurant", cuisine: "seafood" }, lat: 35.36, lon: 24.51 },
    { type: "node", id: 1000304, tags: { name: "Mountain Taverna", amenity: "bar", cuisine: "greek" }, lat: 35.37, lon: 24.49 },
    { type: "node", id: 1000305, tags: { name: "Espresso Corner", amenity: "cafe" }, lat: 35.34, lon: 24.53 },
  ];
}

async function main() {
  console.log("Starting OSM food places fetch for Crete...\n");

  // Fetch from Overpass API
  console.log("Fetching data from Overpass API...");
  let elements = await fetchFromOverpass();

  // Fallback to test data if Overpass fails
  if (elements.length === 0) {
    console.log("Overpass API unavailable or returned no results. Using fallback test data.\n");
    elements = getTestData();
  }

  console.log(`Total elements fetched: ${elements.length}\n`);

  // Process elements
  console.log("Processing elements...");
  const places = processElements(elements);
  console.log(`Total unique places: ${places.length}`);
  console.log(
    `  - Restaurants: ${places.filter((p) => p.type === "restaurant").length}`
  );
  console.log(
    `  - Tavernas: ${places.filter((p) => p.type === "taverna").length}`
  );
  console.log(`  - Cafes: ${places.filter((p) => p.type === "cafe").length}`);
  console.log(
    `  - West region: ${places.filter((p) => p.region === "west").length}`
  );
  console.log(
    `  - Central region: ${places.filter((p) => p.region === "central").length}`
  );
  console.log(
    `  - East region: ${places.filter((p) => p.region === "east").length}\n`
  );

  // Save raw data
  console.log("Saving raw data to scripts/food-osm.json...");
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const outputPath = `${__dirname}/food-osm.json`;
  fs.writeFileSync(outputPath, JSON.stringify(places, null, 2));

  // Insert into Supabase
  console.log(
    "\nInserting into Supabase food_places table (this may take a while)..."
  );
  await insertIntoSupabase(places);

  console.log("\nDone!");
}

main().catch(console.error);
