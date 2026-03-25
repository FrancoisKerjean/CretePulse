/**
 * village-photos-wikimedia.js
 *
 * Fetches real photos for all 161 Crete villages from Wikimedia Commons.
 * Also tries cretanbeaches.com as a secondary source.
 *
 * Rules:
 * - Only use a photo if the image title/description contains the village name
 * - Use 800px thumburl (not full res)
 * - Rate limit: 1 request per 2 seconds (Wikimedia policy)
 * - Better 50 real photos than 161 fake ones
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Load env
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) envVars[m[1]] = m[2].trim();
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USER_AGENT =
  "CreteDirect/1.0 (https://crete.direct; contact@crete.direct)";
const RATE_LIMIT_MS = 2200; // 2.2s between requests to be polite

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function get(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const options = { headers: { "User-Agent": USER_AGENT } };
    const req = https.get(url, options, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location, timeout).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error(`Timeout for ${url}`));
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Wikimedia Commons ────────────────────────────────────────────────────────

/**
 * Checks that an image title/description actually contains the village name.
 * We do a case-insensitive check and also try common transliterations.
 */
function titleMatchesVillage(imageTitle, villageName) {
  const title = imageTitle.toLowerCase();
  const name = villageName.toLowerCase();

  // Direct match
  if (title.includes(name)) return true;

  // Try without spaces/hyphens (e.g. "AgioNikolaos" vs "Agios Nikolaos")
  const nameCompact = name.replace(/[\s-]/g, "");
  const titleCompact = title.replace(/[\s_-]/g, "");
  if (titleCompact.includes(nameCompact)) return true;

  // Some common Greek transliterations
  const alternates = {
    "agios nikolaos": ["ag nikolaos", "agios-nikolaos", "aghios nikolaos"],
    "agia marina": ["ag marina", "aghia marina"],
    "agia pelagia": ["ag pelagia", "aghia pelagia"],
    "agia triada": ["ag triada", "aghia triada"],
    "agia galini": ["ag galini"],
    "agios pavlos": ["ag pavlos"],
    "agios georgios": ["ag georgios"],
    "makrigialos": ["makrygialos", "makri gialos"],
    "schinokapsala": ["skinokapsala", "schinokapsala"],
    "kato zakros": ["zakros", "kato-zakros"],
    "paleokastro": ["palaikastro", "palekastro"],
    "heraklion": ["iraklio", "iraklion", "herakleion"],
    "rethymno": ["rethimno", "rethymnon"],
    "siteia": ["sitia"],
    "ierapetra": ["hierapetra"],
    "elounda": ["elounta"],
    "kritsa": ["krytsa"],
    "archanes": ["arkhanes"],
    "gournes": ["gournia"],
    "stalida": ["stalis", "malia"],
    "georgioupoli": ["georgiopolis", "georgiopouli"],
  };

  const alts = alternates[name] || [];
  for (const alt of alts) {
    if (title.includes(alt)) return true;
  }

  return false;
}

/**
 * Search Wikimedia Commons for images of a village.
 * Returns { thumburl, license, artist, title } or null.
 */
async function searchWikimedia(villageName) {
  // Try multiple search queries in order of specificity
  const queries = [
    `${villageName} Crete village`,
    `${villageName} Crete`,
    `${villageName} Creta`,
    `${villageName} Κρήτη`,
  ];

  for (const query of queries) {
    let searchResult;
    try {
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query
      )}&srnamespace=6&format=json&srlimit=10`;
      searchResult = await get(searchUrl);
    } catch (e) {
      console.warn(`  Search error for "${query}": ${e.message}`);
      continue;
    }

    const results = searchResult?.query?.search || [];

    // Find first result whose title contains the village name
    for (const result of results) {
      const fileTitle = result.title; // e.g. "File:Elounda.jpg"

      if (!titleMatchesVillage(fileTitle, villageName)) {
        continue;
      }

      // Skip non-photo files
      const lower = fileTitle.toLowerCase();
      if (
        lower.endsWith(".svg") ||
        lower.endsWith(".gif") ||
        lower.endsWith(".pdf") ||
        lower.endsWith(".ogg") ||
        lower.endsWith(".mp4") ||
        lower.endsWith(".webm") ||
        lower.includes("map") ||
        lower.includes("coat_of_arms") ||
        lower.includes("flag") ||
        lower.includes("logo") ||
        lower.includes("icon") ||
        lower.includes("plan") ||
        lower.includes("schema")
      ) {
        continue;
      }

      // Get image info
      try {
        await sleep(RATE_LIMIT_MS);
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
          fileTitle
        )}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json`;
        const infoResult = await get(infoUrl);
        const pages = infoResult?.query?.pages;
        if (!pages) continue;

        const page = Object.values(pages)[0];
        if (!page?.imageinfo?.[0]) continue;

        const ii = page.imageinfo[0];
        const meta = ii.extmetadata || {};

        // Skip if no thumburl
        if (!ii.thumburl) continue;

        // Extract license and artist
        const license =
          meta.LicenseShortName?.value ||
          meta.License?.value ||
          "Wikimedia Commons";

        const rawArtist = meta.Artist?.value || meta.Credit?.value || "";
        // Strip HTML tags from artist
        const artist = rawArtist
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 100);

        const credit = artist
          ? `© ${artist} / ${license} / Wikimedia Commons`
          : `${license} / Wikimedia Commons`;

        return {
          thumburl: ii.thumburl,
          url: ii.url,
          license,
          artist,
          credit,
          fileTitle,
        };
      } catch (e) {
        console.warn(`  Imageinfo error for "${fileTitle}": ${e.message}`);
        continue;
      }
    }

    // Rate limit between search queries too
    await sleep(RATE_LIMIT_MS);
  }

  return null;
}

// ─── cretanbeaches.com secondary approach ────────────────────────────────────
// We try their village/place pages. They cover many Cretan locations.

async function tryGetHtml(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
      },
    };
    const req = https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return tryGetHtml(res.headers.location, timeout).then(resolve).catch(reject);
      }
      if (res.statusCode === 404) return resolve(null);
      if (res.statusCode !== 200) return resolve(null);
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => resolve(data));
    });
    req.on("error", () => resolve(null));
    req.setTimeout(timeout, () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Try to find a village photo from cretanbeaches.com.
 * They have village pages at various URL patterns.
 */
async function searchCretanBeaches(villageName, slug) {
  const urlPatterns = [
    `https://www.cretanbeaches.com/en/villages/${slug}`,
    `https://www.cretanbeaches.com/en/towns-and-villages/${slug}`,
    `https://www.cretanbeaches.com/en/destinations/${slug}`,
    `https://www.cretanbeaches.com/en/resorts/${slug}`,
  ];

  for (const url of urlPatterns) {
    const html = await tryGetHtml(url);
    if (!html) continue;

    // Look for og:image meta tag first (most reliable)
    const ogMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    if (ogMatch) {
      const imageUrl = ogMatch[1];
      // Make sure it's not a generic logo
      if (
        !imageUrl.includes("logo") &&
        !imageUrl.includes("favicon") &&
        imageUrl.startsWith("http")
      ) {
        return {
          thumburl: imageUrl,
          credit: `cretanbeaches.com`,
          fileTitle: `${villageName} from cretanbeaches.com`,
          source: "cretanbeaches",
        };
      }
    }

    // Fallback: look for <img> tags with the village name in src or alt
    const imgMatches = [
      ...html.matchAll(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/gi),
      ...html.matchAll(/<img[^>]+alt="([^"]*)"[^>]+src="([^"]+)"/gi),
    ];

    for (const match of imgMatches) {
      const src = match[1];
      const alt = match[2] || "";
      if (
        src &&
        src.startsWith("http") &&
        !src.includes("logo") &&
        !src.includes("icon") &&
        titleMatchesVillage(alt + " " + src, villageName)
      ) {
        return {
          thumburl: src,
          credit: `cretanbeaches.com`,
          fileTitle: `${villageName} from cretanbeaches.com`,
          source: "cretanbeaches",
        };
      }
    }

    await sleep(1000);
  }

  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching all villages from Supabase...");
  const { data: villages, error } = await supabase
    .from("villages")
    .select("id, name_en, slug, image_url")
    .order("id");

  if (error) {
    console.error("Supabase error:", error);
    process.exit(1);
  }

  console.log(`Found ${villages.length} villages.`);

  // Only process villages without photos
  const toProcess = villages.filter((v) => !v.image_url);
  console.log(`${toProcess.length} villages need photos.\n`);

  const results = {
    total: villages.length,
    already_had_photo: villages.length - toProcess.length,
    processed: 0,
    wikimedia_success: 0,
    cretanbeaches_success: 0,
    not_found: 0,
    errors: 0,
    details: [],
  };

  for (let i = 0; i < toProcess.length; i++) {
    const village = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;
    console.log(`${progress} Processing: ${village.name_en}`);

    let photo = null;
    let source = null;

    // ── Approach 1: Wikimedia Commons ────────────────────────────────────────
    try {
      photo = await searchWikimedia(village.name_en);
      if (photo) {
        source = "wikimedia";
        console.log(`  ✓ Wikimedia: ${photo.fileTitle}`);
      }
    } catch (e) {
      console.warn(`  Wikimedia error: ${e.message}`);
      results.errors++;
    }

    // ── Approach 2: cretanbeaches.com (fallback) ──────────────────────────
    if (!photo) {
      try {
        photo = await searchCretanBeaches(village.name_en, village.slug);
        if (photo) {
          source = "cretanbeaches";
          console.log(`  ✓ CretanBeaches: ${photo.thumburl.substring(0, 80)}`);
        }
      } catch (e) {
        console.warn(`  CretanBeaches error: ${e.message}`);
      }
    }

    if (!photo) {
      console.log(`  ✗ No photo found`);
      results.not_found++;
      results.details.push({
        id: village.id,
        name: village.name_en,
        status: "not_found",
      });
      // Rate limit even on misses
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    // ── Update Supabase ───────────────────────────────────────────────────────
    try {
      const { error: updateError } = await supabase
        .from("villages")
        .update({
          image_url: photo.thumburl,
          image_credit: photo.credit,
        })
        .eq("id", village.id);

      if (updateError) {
        console.error(`  Update error: ${updateError.message}`);
        results.errors++;
        results.details.push({
          id: village.id,
          name: village.name_en,
          status: "db_error",
          error: updateError.message,
        });
      } else {
        results.processed++;
        if (source === "wikimedia") results.wikimedia_success++;
        if (source === "cretanbeaches") results.cretanbeaches_success++;
        results.details.push({
          id: village.id,
          name: village.name_en,
          status: "success",
          source,
          image_url: photo.thumburl,
          credit: photo.credit,
        });
      }
    } catch (e) {
      console.error(`  Fatal update error: ${e.message}`);
      results.errors++;
    }

    results.total_processed = i + 1;

    // Rate limit between villages
    await sleep(RATE_LIMIT_MS);
  }

  // ── Final report ─────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("FINAL REPORT");
  console.log("=".repeat(60));
  console.log(`Total villages:          ${results.total}`);
  console.log(`Already had photo:       ${results.already_had_photo}`);
  console.log(`Newly found photos:      ${results.processed}`);
  console.log(`  - From Wikimedia:      ${results.wikimedia_success}`);
  console.log(`  - From CretanBeaches:  ${results.cretanbeaches_success}`);
  console.log(`Not found:               ${results.not_found}`);
  console.log(`Errors:                  ${results.errors}`);
  console.log(
    `Coverage after run:      ${results.already_had_photo + results.processed}/${results.total} (${Math.round(((results.already_had_photo + results.processed) / results.total) * 100)}%)`
  );

  // Villages without photos
  const notFound = results.details.filter((d) => d.status === "not_found");
  if (notFound.length > 0) {
    console.log("\nVillages without photos:");
    notFound.forEach((d) => console.log(`  - ${d.name}`));
  }

  // Save full report
  const reportPath = path.join(__dirname, "..", "village-photos-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nFull report saved to: village-photos-report.json`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
