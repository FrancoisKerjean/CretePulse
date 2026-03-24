/**
 * fix-beach-photos.js
 *
 * Replaces all generic/fake Unsplash beach photos with honest data:
 * - Famous beaches: real Wikimedia Commons photo of THAT SPECIFIC beach
 * - All other beaches: image_url = NULL (no photo is better than a wrong one)
 *
 * Target: ~15 real photos, rest NULL.
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ---------------------------------------------------------------------------
// Verified Wikimedia Commons URLs - each URL has been confirmed via API
// to be a photo of THIS SPECIFIC beach.
// All images are from upload.wikimedia.org (public domain / CC licensed).
// ---------------------------------------------------------------------------
const REAL_PHOTOS = {
  // Elafonisi - iconic pink sand lagoon, SW Crete
  "elafonisi-beach": {
    url: "https://upload.wikimedia.org/wikipedia/commons/2/26/Elafonisi_pink_sand_beach_-_panoramio.jpg",
    credit: "Wikimedia Commons - Elafonisi pink sand beach (panoramio)",
  },

  // Balos - aerial view of the famous turquoise lagoon, NW Crete
  "balos-beach": {
    url: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Aerial_view_of_Balos_Beach_and_Lagoon_on_Crete%2C_Greece.jpg",
    credit: "Wikimedia Commons - Aerial view of Balos Beach and Lagoon on Crete, Greece",
  },

  // Vai - the palm forest beach, E Crete
  "palm-beach-vai": {
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Vai_Palm_Beach%2C_Crete%2C_Kriti.jpg",
    credit: "Wikimedia Commons - Vai Palm Beach, Crete, Kriti",
  },

  // Preveli / Palm Bay - palm river beach panorama, S Crete
  "palm-bay-beach": {
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Preveli_Palm_Beach_Panorama_02.JPG",
    credit: "Wikimedia Commons - Preveli Palm Beach Panorama",
  },

  // Falassarna - wide sandy beach, NW Crete (two matching slugs)
  "falassarna": {
    url: "https://upload.wikimedia.org/wikipedia/commons/5/50/Falassarna_-_Kr%C3%A9ta_-_panoramio_%281%29.jpg",
    credit: "Wikimedia Commons - Falassarna beach, Crete",
  },
  "falasarna-beach": {
    url: "https://upload.wikimedia.org/wikipedia/commons/8/86/Greece_Crete_Chania_FalasarnaBeach_Aerial_Summer_ISymeonidis-2-S.jpg",
    credit: "Wikimedia Commons - Falasarna Beach aerial, Chania, Crete (I. Symeonidis)",
  },

  // Red Beach - red cliff beach near Matala, S Crete
  "red-beach": {
    url: "https://upload.wikimedia.org/wikipedia/commons/4/40/Matala_-_Red_Beach_-_Hippo.jpg",
    credit: "Wikimedia Commons - Matala Red Beach, Crete",
  },

  // Frangokastello - beach in front of the castle, S Crete
  "frangokastello": {
    url: "https://upload.wikimedia.org/wikipedia/commons/9/94/Frangokastello_Beach_R03.jpg",
    credit: "Wikimedia Commons - Frangokastello Beach, Crete",
  },

  // Plakias - long sandy beach, S Crete
  "plakias-beach": {
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Plakias_Beach_01.JPG",
    credit: "Wikimedia Commons - Plakias Beach, Crete",
  },

  // Agia Marina - popular resort beach W of Chania
  "agia-marina-beach": {
    url: "https://upload.wikimedia.org/wikipedia/commons/4/48/Aghia_Marina_01.jpg",
    credit: "Wikimedia Commons - Aghia Marina beach, Crete",
  },

  // Georgioupolis - long sandy beach at river mouth, NW Crete
  "georgioupolis-beach": {
    url: "https://upload.wikimedia.org/wikipedia/commons/3/37/Georgioupoli_beach%2C_Georgioupoli%2C_Chania%2C_Crete%2C_Greece_-_panoramio.jpg",
    credit: "Wikimedia Commons - Georgioupoli beach, Chania, Crete",
  },

  // Matala - caves beach, S Crete
  // Note: no dedicated slug for 'matala' in the DB, this is a fallback reference

  // Triopetra - three rocks beach, S Crete
  "triopetra-beach": {
    url: "https://upload.wikimedia.org/wikipedia/commons/8/81/Triopetra_View_to.JPG",
    credit: "Wikimedia Commons - Triopetra beach, Crete",
  },

  // Kalathas - clear water cove near Chania
  "kalathas-beach": {
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d6/Kalathas_Beach_at_sunset%2C_Chania%2C_Crete%2C_Greece_julesvernex2.jpg",
    credit: "Wikimedia Commons - Kalathas Beach at sunset, Chania, Crete (julesvernex2)",
  },
};

async function main() {
  console.log("Fetching all 166 beaches from Supabase...");

  const { data: beaches, error } = await supabase
    .from("beaches")
    .select("id, slug, name_en, image_url, image_credit");

  if (error) {
    console.error("Supabase error:", error);
    process.exit(1);
  }

  console.log(`Found ${beaches.length} beaches.\n`);

  const toUpdate = [];
  const toNull = [];

  for (const beach of beaches) {
    if (REAL_PHOTOS[beach.slug]) {
      toUpdate.push({
        id: beach.id,
        slug: beach.slug,
        name: beach.name_en,
        image_url: REAL_PHOTOS[beach.slug].url,
        image_credit: REAL_PHOTOS[beach.slug].credit,
      });
    } else {
      // Only null it if it currently has a (fake Unsplash) image
      if (beach.image_url !== null) {
        toNull.push({ id: beach.id, slug: beach.slug, name: beach.name_en });
      }
    }
  }

  console.log(`Real Wikimedia photos to assign: ${toUpdate.length}`);
  console.log(`Fake photos to remove (set NULL): ${toNull.length}`);
  console.log(`Already NULL (no change needed): ${beaches.length - toUpdate.length - toNull.length}\n`);

  // Apply real photos
  let successReal = 0;
  let failReal = 0;
  for (const u of toUpdate) {
    const { error: err } = await supabase
      .from("beaches")
      .update({ image_url: u.image_url, image_credit: u.image_credit })
      .eq("id", u.id);
    if (err) {
      console.error(`  FAIL real photo [${u.slug}]: ${err.message}`);
      failReal++;
    } else {
      console.log(`  SET real: ${u.slug} (${u.name})`);
      successReal++;
    }
  }

  console.log(`\nReal photos applied: ${successReal} ok, ${failReal} failed.`);

  // Null out all fake generic photos
  let successNull = 0;
  let failNull = 0;

  // Batch the NULLs - update in chunks of 50 using .in()
  const BATCH = 50;
  for (let i = 0; i < toNull.length; i += BATCH) {
    const batch = toNull.slice(i, i + BATCH);
    const ids = batch.map((b) => b.id);
    const { error: err } = await supabase
      .from("beaches")
      .update({ image_url: null, image_credit: null })
      .in("id", ids);
    if (err) {
      console.error(`  FAIL batch null [${i}-${i + BATCH}]: ${err.message}`);
      failNull += batch.length;
    } else {
      successNull += batch.length;
      console.log(
        `  Nulled batch ${i + 1}-${Math.min(i + BATCH, toNull.length)} of ${toNull.length}`
      );
    }
  }

  console.log(`\nFake photos removed: ${successNull} ok, ${failNull} failed.`);

  // Final verification
  const { count: withPhoto } = await supabase
    .from("beaches")
    .select("*", { count: "exact", head: true })
    .not("image_url", "is", null);

  const { count: withNull } = await supabase
    .from("beaches")
    .select("*", { count: "exact", head: true })
    .is("image_url", null);

  console.log(`\n=== FINAL STATE ===`);
  console.log(`Beaches with real photo: ${withPhoto}`);
  console.log(`Beaches with no photo (NULL): ${withNull}`);
  console.log(`Total: ${withPhoto + withNull}`);
  console.log(`\nDone. Honesty restored.`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
