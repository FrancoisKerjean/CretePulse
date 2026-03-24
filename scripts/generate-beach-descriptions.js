const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to get region display name
function getRegionName(region) {
  const names = {
    east: "eastern",
    west: "western",
    central: "central",
    south: "southern",
  };
  return names[region] || region;
}

// Helper to get nearest town based on coordinates (rough approximation)
function getNearestTown(latitude, longitude, region) {
  // Rough approximations for major Cretan towns
  const towns = {
    east: [
      { name: "Sitia", lat: 35.214, lng: 26.095 },
      { name: "Ierapetra", lat: 35.0, lng: 25.734 },
      { name: "Agios Nikolaos", lat: 35.189, lng: 25.734 },
    ],
    west: [
      { name: "Chania", lat: 35.34, lng: 24.45 },
      { name: "Rethymno", lat: 35.366, lng: 24.473 },
      { name: "Kissamos", lat: 35.296, lng: 23.65 },
    ],
    central: [
      { name: "Rethymno", lat: 35.366, lng: 24.473 },
      { name: "Heraklion", lat: 35.327, lng: 25.131 },
      { name: "Hania", lat: 35.34, lng: 24.45 },
    ],
    south: [
      { name: "Ierapetra", lat: 35.0, lng: 25.734 },
      { name: "Matala", lat: 34.982, lng: 24.789 },
      { name: "Plakias", lat: 35.187, lng: 24.393 },
    ],
  };

  const regionTowns = towns[region] || [];
  if (regionTowns.length === 0) return "Crete";

  // Find closest town
  let closest = regionTowns[0];
  let minDist = 999;

  for (const town of regionTowns) {
    const dist = Math.hypot(town.lat - latitude, town.lng - longitude);
    if (dist < minDist) {
      minDist = dist;
      closest = town;
    }
  }

  return minDist < 0.3 ? closest.name : "Crete";
}

// Generate English description
function generateDescriptionEn(beach) {
  const { name_en, type, region, latitude, longitude, wind_exposure } = beach;

  let desc = "";

  // Type + location
  if (type) {
    desc += `${type.charAt(0).toUpperCase() + type.slice(1)} beach on the ${getRegionName(region)} coast of Crete`;
  } else {
    desc += `Beach on the ${getRegionName(region)} coast of Crete`;
  }

  // Add nearest town if generic location
  const nearestTown = getNearestTown(latitude, longitude, region);
  if (nearestTown !== "Crete") {
    desc += ` near ${nearestTown}`;
  }

  desc += ". ";

  // Wind exposure
  if (wind_exposure) {
    if (wind_exposure === "sheltered") {
      desc += "Sheltered from strong winds, ideal during meltemi conditions. ";
    } else if (wind_exposure === "moderate") {
      desc += "Moderate wind exposure. ";
    } else if (wind_exposure === "exposed") {
      desc += "Exposed to northern winds, best visited in calm conditions. ";
    }
  }

  // Coordinates
  desc += `GPS: ${latitude.toFixed(3)}, ${longitude.toFixed(3)}.`;

  return desc;
}

// Generate French description (slightly shorter)
function generateDescriptionFr(beach) {
  const { name_en, type, region, latitude, longitude, wind_exposure } = beach;

  let desc = "";

  // Type + location
  if (type) {
    const typeMap = { sand: "Plage de sable", pebble: "Plage de galets", rock: "Plage rocheuse", mixed: "Plage mixte" };
    desc += `${typeMap[type] || "Plage"} sur la côte ${getRegionName(region)} de la Crète`;
  } else {
    desc += `Plage sur la côte ${getRegionName(region)} de la Crète`;
  }

  const nearestTown = getNearestTown(latitude, longitude, region);
  if (nearestTown !== "Crete" && nearestTown !== "Crète") {
    desc += ` près de ${nearestTown}`;
  }

  desc += ". ";

  // Wind exposure
  if (wind_exposure) {
    if (wind_exposure === "sheltered") {
      desc += "Abritée des vents forts.";
    } else if (wind_exposure === "moderate") {
      desc += "Exposition modérée au vent.";
    } else if (wind_exposure === "exposed") {
      desc += "Exposée aux vents du nord.";
    }
  }

  return desc;
}

async function main() {
  try {
    console.log("Fetching beaches with empty descriptions...");

    // Fetch all beaches where description_en is NULL or empty
    const { data: beaches, error } = await supabase.from("beaches").select("*").or("description_en.is.null,description_en.eq.''");

    if (error) {
      console.error("Error fetching beaches:", error);
      process.exit(1);
    }

    console.log(`Found ${beaches.length} beaches needing descriptions.\n`);

    let updated = 0;
    let errors = 0;

    for (const beach of beaches) {
      try {
        const descriptionEn = generateDescriptionEn(beach);
        const descriptionFr = generateDescriptionFr(beach);

        const { error: updateError } = await supabase
          .from("beaches")
          .update({
            description_en: descriptionEn,
            description_fr: descriptionFr,
          })
          .eq("id", beach.id);

        if (updateError) {
          console.error(`Error updating beach ${beach.id} (${beach.name_en}):`, updateError.message);
          errors++;
        } else {
          console.log(`✓ Updated: ${beach.name_en || `Beach ${beach.id}`}`);
          console.log(`  EN: ${descriptionEn.substring(0, 80)}...`);
          console.log(`  FR: ${descriptionFr.substring(0, 80)}...\n`);
          updated++;
        }
      } catch (err) {
        console.error(`Error processing beach ${beach.id}:`, err.message);
        errors++;
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total beaches processed: ${beaches.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Errors: ${errors}`);

    process.exit(errors > 0 ? 1 : 0);
  } catch (err) {
    console.error("Fatal error:", err.message);
    process.exit(1);
  }
}

main();
