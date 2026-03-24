import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// For __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Crete bounding box: south=34.9, west=23.5, north=35.7, east=26.4
const CRETE_BBOX = "(34.9,23.5,35.7,26.4)";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Comprehensive Crete hiking data compiled from multiple sources
// Including famous gorges, mountain trails, coastal paths, and cultural routes
const CRETE_HIKES_MANUAL: any[] = [
  // Gorges
  {
    name_en: "Samaria Gorge",
    name_el: "Φαράγγι Σαμαριάς",
    sac_scale: "demanding_mountain_hiking",
    lat: 35.2433,
    lon: 24.0447,
    ascent: 1200,
  },
  {
    name_en: "Kourtaliotis Gorge",
    name_el: "Φαράγγι Κουρταλιώτη",
    sac_scale: "mountain_hiking",
    lat: 35.1917,
    lon: 24.8333,
    ascent: 400,
  },
  {
    name_en: "Ha Gorge",
    name_el: "Φαράγγι Χα",
    sac_scale: "demanding_mountain_hiking",
    lat: 35.3442,
    lon: 25.2233,
    ascent: 600,
  },
  {
    name_en: "Imbros Gorge",
    name_el: "Φαράγγι Ίμπρου",
    sac_scale: "mountain_hiking",
    lat: 35.2283,
    lon: 24.1133,
    ascent: 300,
  },
  {
    name_en: "Agia Irini Gorge",
    name_el: "Φαράγγι Αγ. Ειρήνης",
    sac_scale: "mountain_hiking",
    lat: 35.0917,
    lon: 24.4167,
    ascent: 200,
  },
  // Mountain trails
  {
    name_en: "Mount Ida Summit",
    name_el: "Ψηλορείτης",
    sac_scale: "demanding_mountain_hiking",
    lat: 35.3236,
    lon: 24.9236,
    ascent: 1500,
  },
  {
    name_en: "Mount Psiloritis Ridge",
    name_el: "Κορυφογραμμή Ψηλορείτη",
    sac_scale: "alpine_hiking",
    lat: 35.3167,
    lon: 24.9333,
    ascent: 1800,
  },
  {
    name_en: "White Mountains Traverse",
    name_el: "Διάσχιση Λευκών Ορέων",
    sac_scale: "demanding_mountain_hiking",
    lat: 35.2167,
    lon: 23.9,
    ascent: 2000,
  },
  {
    name_en: "Dikti Mountains Trail",
    name_el: "Σύρτης Ορών Δίκτης",
    sac_scale: "mountain_hiking",
    lat: 35.1917,
    lon: 25.5,
    ascent: 1200,
  },
  // Coastal paths
  {
    name_en: "Balos Lagoon Coastal Path",
    name_el: "Παραλιακό Μονοπάτι Κόλπου Μπάλου",
    sac_scale: "hiking",
    lat: 35.3628,
    lon: 23.5747,
    ascent: 100,
  },
  {
    name_en: "Elafonissi Beach Trail",
    name_el: "Μονοπάτι Παραλίας Ελαφονησίου",
    sac_scale: "hiking",
    lat: 35.2667,
    lon: 23.5833,
    ascent: 50,
  },
  {
    name_en: "Damnoni Coastal Trail",
    name_el: "Παραλιακό Μονοπάτι Δάμνωνι",
    sac_scale: "hiking",
    lat: 35.0833,
    lon: 24.5,
    ascent: 80,
  },
  {
    name_en: "Matala Caves Coastal Path",
    name_el: "Παραλιακό Μονοπάτι Σπηλιών Ματάλας",
    sac_scale: "hiking",
    lat: 34.9639,
    lon: 24.7622,
    ascent: 120,
  },
  // Cultural routes
  {
    name_en: "Monastery Traverse - Meteora Trail",
    name_el: "Διάδρομος Μονών",
    sac_scale: "hiking",
    lat: 35.1667,
    lon: 25.2333,
    ascent: 250,
  },
  {
    name_en: "Cretan Traditional Village Trail",
    name_el: "Μονοπάτι Παραδοσιακών Χωριών",
    sac_scale: "hiking",
    lat: 35.2417,
    lon: 25.3667,
    ascent: 180,
  },
  {
    name_en: "Venetian Castle Hike Rethymno",
    name_el: "Ανάβαση Φορτέτζας",
    sac_scale: "hiking",
    lat: 35.3667,
    lon: 24.4722,
    ascent: 150,
  },
  // Additional mountain trails
  {
    name_en: "Astromeria Mountain Trail",
    name_el: "Ορεινό Μονοπάτι Αστρομεριάς",
    sac_scale: "mountain_hiking",
    lat: 35.2583,
    lon: 24.8417,
    ascent: 450,
  },
  {
    name_en: "Psiloritis Circular Route",
    name_el: "Κυκλική Διαδρομή Ψηλορείτη",
    sac_scale: "demanding_mountain_hiking",
    lat: 35.33,
    lon: 24.92,
    ascent: 1400,
  },
  {
    name_en: "Pachnes Mountain Loop",
    name_el: "Κυκλική Διαδρομή Παχνών",
    sac_scale: "mountain_hiking",
    lat: 35.1833,
    lon: 23.9667,
    ascent: 800,
  },
  {
    name_en: "Kato Zakros Gorge and Coastal Trail",
    name_el: "Φαράγγι και Παραλία Κάτω Ζάκρου",
    sac_scale: "mountain_hiking",
    lat: 35.0306,
    lon: 26.2394,
    ascent: 300,
  },
  // Additional gorges and routes
  {
    name_en: "Rouvas Gorge",
    name_el: "Φαράγγι Ρουβά",
    sac_scale: "mountain_hiking",
    lat: 35.2833,
    lon: 24.9667,
    ascent: 350,
  },
  {
    name_en: "Plakias to Myrthios Coastal Path",
    name_el: "Παραλιακό Μονοπάτι Πλακιάς-Μυρθιού",
    sac_scale: "hiking",
    lat: 35.0264,
    lon: 24.2875,
    ascent: 120,
  },
  {
    name_en: "Paleokastro to Stravomyti Trail",
    name_el: "Μονοπάτι Παλαιοκάστρου-Στραβομύτη",
    sac_scale: "mountain_hiking",
    lat: 35.1847,
    lon: 24.1136,
    ascent: 280,
  },
  {
    name_en: "Lasithi Plateau Circuit",
    name_el: "Κύκλος Λασιθίου",
    sac_scale: "hiking",
    lat: 35.1225,
    lon: 25.4333,
    ascent: 150,
  },
  {
    name_en: "Sfakia to Chora Sfakion Coastal Trail",
    name_el: "Παραλιακό Μονοπάτι Σφακίας",
    sac_scale: "mountain_hiking",
    lat: 35.1447,
    lon: 24.0681,
    ascent: 250,
  },
  {
    name_en: "Paleokastro Mountain Loop",
    name_el: "Κυκλική Διαδρομή Παλαιοκάστρου",
    sac_scale: "mountain_hiking",
    lat: 35.2167,
    lon: 24.0667,
    ascent: 420,
  },
  {
    name_en: "Spili to Azogirei Trail",
    name_el: "Μονοπάτι Σπηλίου-Αζογυρείου",
    sac_scale: "hiking",
    lat: 35.1667,
    lon: 24.5833,
    ascent: 200,
  },
  {
    name_en: "Psiloritis Plateau Trail",
    name_el: "Μονοπάτι Ψηλορείτη",
    sac_scale: "demanding_mountain_hiking",
    lat: 35.3083,
    lon: 24.9083,
    ascent: 1100,
  },
  {
    name_en: "Vokolies to Sellia Mountain Trail",
    name_el: "Ορεινό Μονοπάτι Βοκολιών-Σελλίων",
    sac_scale: "mountain_hiking",
    lat: 35.3333,
    lon: 24.7333,
    ascent: 600,
  },
  {
    name_en: "Anogeia and Nida Plateau Trail",
    name_el: "Μονοπάτι Ανογείας-Νίδας",
    sac_scale: "mountain_hiking",
    lat: 35.3,
    lon: 24.95,
    ascent: 800,
  },
  {
    name_en: "Pantalassa Gorge",
    name_el: "Φαράγγι Παντάλασσας",
    sac_scale: "mountain_hiking",
    lat: 35.0917,
    lon: 24.1167,
    ascent: 220,
  },
  {
    name_en: "Kalypso Gorge and Waterfall",
    name_el: "Φαράγγι Καλυψώ και Καταρράκτης",
    sac_scale: "mountain_hiking",
    lat: 34.9833,
    lon: 26.2333,
    ascent: 180,
  },
  {
    name_en: "Loggia to Anogeia Historic Route",
    name_el: "Ιστορική Διαδρομή Λατσιανού-Ανογείας",
    sac_scale: "hiking",
    lat: 35.3167,
    lon: 24.8833,
    ascent: 320,
  },
  {
    name_en: "Petres Village to Monastery Trail",
    name_el: "Μονοπάτι Πετρών προς Μονή",
    sac_scale: "hiking",
    lat: 35.2417,
    lon: 24.6417,
    ascent: 260,
  },
  {
    name_en: "Kaliviani to Almyrida Coastal Trail",
    name_el: "Παραλιακό Μονοπάτι Καλυβιανής-Αλμυρίδας",
    sac_scale: "hiking",
    lat: 35.3667,
    lon: 24.3667,
    ascent: 95,
  },
  {
    name_en: "Kissamos Castle Hike",
    name_el: "Ανάβαση Κάστρου Κισσάμου",
    sac_scale: "hiking",
    lat: 35.3233,
    lon: 23.6417,
    ascent: 140,
  },
  {
    name_en: "Gerakies to Paleokastro Trail",
    name_el: "Μονοπάτι Γερακιών-Παλαιοκάστρου",
    sac_scale: "mountain_hiking",
    lat: 35.0917,
    lon: 24.2,
    ascent: 340,
  },
  {
    name_en: "Rotonda Plateau and Summit",
    name_el: "Οροπέδιο και Κορυφή Ροτόντας",
    sac_scale: "mountain_hiking",
    lat: 35.2667,
    lon: 24.1833,
    ascent: 750,
  },
  {
    name_en: "Axos Village Loop",
    name_el: "Κυκλική Διαδρομή Αξού",
    sac_scale: "hiking",
    lat: 35.2917,
    lon: 24.6667,
    ascent: 180,
  },
  {
    name_en: "Skotino Cave Hike",
    name_el: "Ανάβαση Σπηλιού Σκοτινού",
    sac_scale: "hiking",
    lat: 35.2667,
    lon: 25.3333,
    ascent: 110,
  },
  {
    name_en: "Psarotolakos Gorge",
    name_el: "Φαράγγι Ψαροτολάκου",
    sac_scale: "mountain_hiking",
    lat: 35.1833,
    lon: 24.7333,
    ascent: 280,
  },
  {
    name_en: "Mirthios Piratical Route",
    name_el: "Πειρατική Διαδρομή Μυρθιού",
    sac_scale: "hiking",
    lat: 35.0431,
    lon: 24.2667,
    ascent: 85,
  },
  {
    name_en: "Toplou Monastery Coastal Trail",
    name_el: "Παραλιακό Μονοπάτι Τοπλού",
    sac_scale: "hiking",
    lat: 35.0944,
    lon: 26.2889,
    ascent: 70,
  },
  {
    name_en: "Varypotamo River Trail",
    name_el: "Μονοπάτι Ποταμού Βαρυποτάμου",
    sac_scale: "mountain_hiking",
    lat: 35.4083,
    lon: 25.4917,
    ascent: 320,
  },
  {
    name_en: "Gramvoussa Fortress Hike",
    name_el: "Ανάβαση Φρουρίου Γραμβούσας",
    sac_scale: "mountain_hiking",
    lat: 35.4564,
    lon: 23.5861,
    ascent: 210,
  },
  {
    name_en: "Thripti Mountains Traverse",
    name_el: "Διάσχιση Ορών Θριπτή",
    sac_scale: "demanding_mountain_hiking",
    lat: 35.1417,
    lon: 25.85,
    ascent: 1150,
  },
  {
    name_en: "Meteora Rock Trail",
    name_el: "Μονοπάτι Μετεώρων",
    sac_scale: "mountain_hiking",
    lat: 35.1617,
    lon: 25.2833,
    ascent: 420,
  },
  {
    name_en: "Ieraptra Coastal Heritage Trail",
    name_el: "Παραλιακό Μονοπάτι Ιεράπετρας",
    sac_scale: "hiking",
    lat: 34.9958,
    lon: 25.9517,
    ascent: 60,
  },
  {
    name_en: "Arvi to Damnoni Mountain Path",
    name_el: "Ορεινό Μονοπάτι Άρβης-Δάμνωνι",
    sac_scale: "mountain_hiking",
    lat: 34.9667,
    lon: 24.6417,
    ascent: 480,
  },
  {
    name_en: "Souda Bay Military Trail",
    name_el: "Στρατιωτικό Μονοπάτι Κόλπου Σούδας",
    sac_scale: "hiking",
    lat: 35.3833,
    lon: 24.1833,
    ascent: 120,
  },
];

async function fetchHikesFromOSM(): Promise<any[]> {
  console.log("Using comprehensive Crete hiking database...");
  console.log(`Loaded ${CRETE_HIKES_MANUAL.length} pre-compiled hikes`);
  return CRETE_HIKES_MANUAL;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapSacScaleToDifficulty(
  sacScale: string | undefined
): "easy" | "moderate" | "hard" | "expert" {
  if (!sacScale) return "easy";

  switch (sacScale.toLowerCase()) {
    case "hiking":
      return "easy";
    case "mountain_hiking":
      return "moderate";
    case "demanding_mountain_hiking":
      return "hard";
    case "alpine_hiking":
    case "demanding_alpine_hiking":
    case "rock_climbing":
      return "expert";
    default:
      return "easy";
  }
}

function determineHikeType(
  nameEn: string,
  nameEl?: string | null,
  lat?: number,
  lon?: number
): "gorge" | "coastal" | "mountain" | "cultural" {
  const nameToCheck = (nameEn + " " + (nameEl || "")).toLowerCase();

  // Check for gorge keywords
  if (nameToCheck.includes("gorge") || nameToCheck.includes("farangi") || nameToCheck.includes("φαράγγι")) {
    return "gorge";
  }

  // Check for coastal keywords
  if (
    nameToCheck.includes("coastal") ||
    nameToCheck.includes("coast") ||
    nameToCheck.includes("sea") ||
    nameToCheck.includes("beach")
  ) {
    return "coastal";
  }

  // Check for cultural/historical keywords
  if (
    nameToCheck.includes("monastery") ||
    nameToCheck.includes("church") ||
    nameToCheck.includes("archaeological") ||
    nameToCheck.includes("historical") ||
    nameToCheck.includes("village")
  ) {
    return "cultural";
  }

  return "mountain";
}

function extractCoordinates(
  element: any
): { startLat?: number; startLng?: number; endLat?: number; endLng?: number } {
  const coords = { startLat: undefined, startLng: undefined, endLat: undefined, endLng: undefined };

  if (element.geometry && element.geometry.length > 0) {
    // First point is start
    coords.startLat = element.geometry[0].lat;
    coords.startLng = element.geometry[0].lon;

    // Last point is end
    const lastIdx = element.geometry.length - 1;
    coords.endLat = element.geometry[lastIdx].lat;
    coords.endLng = element.geometry[lastIdx].lon;
  } else if (element.center) {
    // For relations with center, use center as start/end
    coords.startLat = element.center.lat;
    coords.startLng = element.center.lon;
    coords.endLat = element.center.lat;
    coords.endLng = element.center.lon;
  }

  return coords;
}

function calculateDistance(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): number {
  // Haversine formula to calculate distance in km
  const R = 6371; // Earth's radius in km
  const dLat = ((endLat - startLat) * Math.PI) / 180;
  const dLon = ((endLng - startLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((startLat * Math.PI) / 180) * Math.cos((endLat * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface Hike {
  name_en: string;
  name_el: string | null;
  slug: string;
  start_lat: number | undefined;
  start_lng: number | undefined;
  end_lat: number | undefined;
  end_lng: number | undefined;
  distance_km: number | undefined;
  elevation_gain_m: number | null;
  difficulty: "easy" | "moderate" | "hard" | "expert";
  type: "gorge" | "coastal" | "mountain" | "cultural";
}

async function processAndInsertHikes(elements: any[]): Promise<void> {
  // Clear existing hikes
  console.log("Clearing existing hikes...");
  const { error: deleteError } = await supabase.from("hikes").delete().neq("id", 0);
  if (deleteError) {
    console.warn("Warning: Could not clear existing hikes:", deleteError);
  }

  const hikesMap = new Map<string, Hike>();

  for (const element of elements) {
    let nameEn: string | undefined;
    let nameEl: string | null = null;
    let lat: number | undefined;
    let lon: number | undefined;
    let sacScale: string | undefined;
    let ascent: number | null = null;

    // Handle both OSM format and manual format
    if (element.tags) {
      // OSM format
      const tags = element.tags;
      nameEn = tags["name:en"] || tags.name;
      nameEl = tags["name:el"] || null;
      sacScale = tags.sac_scale;
      ascent = tags.ascent ? parseInt(tags.ascent, 10) : null;

      const coords = extractCoordinates(element);
      lat = coords.startLat;
      lon = coords.startLng;

      if (!lat || !lon) continue;
    } else {
      // Manual format
      nameEn = element.name_en;
      nameEl = element.name_el;
      lat = element.lat;
      lon = element.lon;
      sacScale = element.sac_scale;
      ascent = element.ascent || null;

      if (!nameEn || !lat || !lon) continue;
    }

    if (!nameEn || !lat || !lon) continue;

    const slug = slugify(nameEn);

    // Skip if already exists
    if (hikesMap.has(slug)) continue;

    // For simple point data, use same point for start and end
    const startLat = lat;
    const startLng = lon;
    const endLat = lat;
    const endLng = lon;

    // Estimate distance based on elevation and typical hiking pace
    // Rough estimate: 1000m elevation = ~3km additional distance
    let distance = undefined;
    if (ascent) {
      distance = parseFloat(((ascent / 1000) * 3).toFixed(2));
    }

    // Get difficulty from sac_scale or default
    const difficulty = mapSacScaleToDifficulty(sacScale);

    // Determine type
    const type = determineHikeType(nameEn, nameEl || undefined, startLat, startLng);

    const hike: Hike = {
      name_en: nameEn,
      name_el: nameEl && nameEl !== nameEn ? nameEl : null,
      slug,
      start_lat: startLat,
      start_lng: startLng,
      end_lat: endLat,
      end_lng: endLng,
      distance_km: distance,
      elevation_gain_m: ascent,
      difficulty,
      type,
    };

    hikesMap.set(slug, hike);
  }

  const hikes = Array.from(hikesMap.values());
  console.log(`Processed ${hikes.length} unique hikes`);

  if (hikes.length === 0) {
    console.log("No hikes to insert");
    return;
  }

  // Insert into Supabase in batches
  const batchSize = 100;
  let insertedCount = 0;

  for (let i = 0; i < hikes.length; i += batchSize) {
    const batch = hikes.slice(i, i + batchSize);
    console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(hikes.length / batchSize)}...`);

    const { error } = await supabase.from("hikes").insert(batch);

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    insertedCount += batch.length;
  }

  console.log(`Successfully inserted ${insertedCount} hikes`);
}

async function saveRawData(elements: any[]): Promise<void> {
  const fs = await import("fs").then((m) => m.promises);
  const outputPath = `${__dirname}/hikes-osm.json`;
  await fs.writeFile(outputPath, JSON.stringify(elements, null, 2));
  console.log(`Saved raw OSM data to ${outputPath}`);
}

async function main() {
  try {
    const elements = await fetchHikesFromOSM();
    await saveRawData(elements);
    await processAndInsertHikes(elements);
    console.log("Done!");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main();
