/**
 * scrape-cretanbeaches.js
 *
 * Scrapes factual beach data (text only, no photos) from cretanbeaches.com
 * and enriches our Supabase beaches table with missing fields.
 *
 * Data extracted per beach:
 *   - name_en (English name)
 *   - name_el (Greek name if present)
 *   - region (west | central | east — mapped from Chania/Rethymno/Heraklion/Lassithi)
 *   - description_en (first substantive paragraph)
 *   - type (sand | pebble | rock | mixed)
 *   - parking (boolean)
 *   - sunbeds (boolean)
 *   - taverna (boolean)
 *   - snorkeling (boolean)
 *   - kids_friendly (boolean)
 *   - latitude / longitude (if found in page)
 *   - source_url (for audit trail)
 *
 * Rate limit: 1 request / 3 seconds (configurable via RATE_LIMIT_MS).
 * No photos are scraped.
 *
 * Usage:
 *   node scripts/scrape-cretanbeaches.js --limit 20 --dry-run
 *   node scripts/scrape-cretanbeaches.js --limit 20
 *   node scripts/scrape-cretanbeaches.js
 *   node scripts/scrape-cretanbeaches.js --update-supabase
 *
 * Env vars (only needed with --update-supabase):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Output files:
 *   scripts/cretanbeaches-data.json        — raw scraped data
 *   scripts/cretanbeaches-update-log.json  — what would be / was updated in Supabase
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = "https://www.cretanbeaches.com";
const RATE_LIMIT_MS = 3000; // 1 request per 3 seconds

/**
 * Region listing pages with their ?start= pagination step (8 per page).
 * URL format discovered by exploring the site:
 *   /en/beaches-of-crete/west-crete-beaches          (Chania, 100 beaches)
 *   /en/beaches-of-crete/central-crete-beaches-rethymnon
 *   /en/beaches-of-crete/central-crete-beaches-heraklion
 *   /en/beaches-of-crete/east-crete-beaches-lassithi  (Lassithi, 86 beaches)
 *
 * Beach detail page URL format:
 *   /en/sea-tourism/{region-slug}/{beach-slug}
 */
const REGION_LISTING_PAGES = [
  {
    region: "west",
    label: "Chania (West Crete)",
    listPath: "/en/beaches-of-crete/west-crete-beaches",
    detailPrefix: "/en/sea-tourism/west-crete-beaches/",
  },
  {
    region: "central",
    label: "Rethymno (Central Crete)",
    listPath: "/en/beaches-of-crete/central-crete-beaches-rethymnon",
    detailPrefix: "/en/sea-tourism/central-crete-beaches-rethymnon/",
  },
  {
    region: "central",
    label: "Heraklion (Central Crete)",
    listPath: "/en/beaches-of-crete/central-crete-beaches-heraklion",
    detailPrefix: "/en/sea-tourism/central-crete-beaches-heraklion/",
  },
  {
    region: "east",
    label: "Lassithi (East Crete)",
    listPath: "/en/beaches-of-crete/east-crete-beaches-lassithi",
    detailPrefix: "/en/sea-tourism/east-crete-beaches-lassithi/",
  },
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
];

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const UPDATE_SUPABASE = args.includes("--update-supabase");
const LIMIT_IDX = args.indexOf("--limit");
const LIMIT = LIMIT_IDX !== -1 ? parseInt(args[LIMIT_IDX + 1], 10) : Infinity;
const OUTPUT_FILE = path.join(__dirname, "cretanbeaches-data.json");
const LOG_FILE = path.join(__dirname, "cretanbeaches-update-log.json");

console.log("=== CretePulse Beach Scraper — cretanbeaches.com ===");
if (DRY_RUN) console.log("[DRY RUN] No Supabase writes will happen.");
if (LIMIT !== Infinity) console.log(`[LIMIT] Processing max ${LIMIT} beaches.`);
console.log();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _uaIndex = 0;
function nextUserAgent() {
  return USER_AGENTS[_uaIndex++ % USER_AGENTS.length];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": nextUserAgent(),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Referer: BASE_URL + "/en/",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(beach|lagoon|bay|paralia|plage|strand)\b/gi, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarityScore(a, b) {
  const na = normaliseName(a);
  const nb = normaliseName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return maxLen === 0 ? 1.0 : 1 - dist / maxLen;
}

// ---------------------------------------------------------------------------
// Scraping: discover beach URLs from listing pages
// ---------------------------------------------------------------------------

/**
 * cretanbeaches.com listing pages paginate via ?start=N, step 8.
 * Beach detail links match: /en/sea-tourism/{region}/{beach-slug}
 */
async function discoverBeachUrls() {
  const allUrls = []; // [{url, region, slugHint}]
  const seen = new Set();

  for (const regionDef of REGION_LISTING_PAGES) {
    console.log(`Discovering: ${regionDef.label}`);
    let start = 0;
    let emptyPages = 0;

    while (true) {
      const listUrl =
        start === 0
          ? `${BASE_URL}${regionDef.listPath}`
          : `${BASE_URL}${regionDef.listPath}?start=${start}`;

      let html;
      try {
        html = await fetchPage(listUrl);
      } catch (err) {
        console.warn(`  Listing page (start=${start}) failed: ${err.message}`);
        break;
      }

      // Extract all /en/sea-tourism/... links from the page
      // cretanbeaches uses href="/en/sea-tourism/..." pattern
      const re = /href="(\/en\/sea-tourism\/[^"]+)"/g;
      let m;
      let newOnPage = 0;

      while ((m = re.exec(html)) !== null) {
        const urlPath = m[1];
        // Skip if it's a listing page itself or too short
        const parts = urlPath.split("/").filter(Boolean);
        if (parts.length < 4) continue; // need at least /en/sea-tourism/{region}/{beach}
        // Skip non-beach paths (e.g. island sub-pages that are not beaches)
        if (urlPath.includes("/en/sea-tourism/") && !seen.has(urlPath)) {
          seen.add(urlPath);
          const slugHint = parts[parts.length - 1];
          allUrls.push({
            url: BASE_URL + urlPath,
            urlPath,
            region: regionDef.region,
            slugHint,
          });
          newOnPage++;
        }
      }

      console.log(`  start=${start}: +${newOnPage} new (total so far: ${allUrls.length})`);

      if (newOnPage === 0) {
        emptyPages++;
        if (emptyPages >= 2) break;
      } else {
        emptyPages = 0;
      }

      if (allUrls.length >= LIMIT) {
        console.log(`  Reached --limit ${LIMIT}, stopping discovery.`);
        break;
      }

      start += 8;
      await sleep(RATE_LIMIT_MS);
    }

    if (allUrls.length >= LIMIT) break;
    console.log();
  }

  return allUrls;
}

// ---------------------------------------------------------------------------
// Scraping: parse a single beach detail page
// ---------------------------------------------------------------------------

function parseSurfaceType(text) {
  const t = text.toLowerCase();
  const hasSand = /\bsand(y)?\b/.test(t);
  const hasPebble = /\bpebble|shingle|gravel\b/.test(t);
  const hasRock = /\brock(y)?\b/.test(t) && !hasSand && !hasPebble;
  if (hasSand && hasPebble) return "mixed";
  if (hasSand) return "sand";
  if (hasPebble) return "pebble";
  if (hasRock) return "rock";
  return null;
}

function parseBool(text, positiveKw, negativeKw) {
  const t = text.toLowerCase();
  for (const kw of negativeKw) {
    if (t.includes(kw)) return false;
  }
  for (const kw of positiveKw) {
    if (t.includes(kw)) return true;
  }
  return null;
}

/**
 * cretanbeaches.com structure (observed):
 *
 * - H1: beach name in English
 * - Greek name often in a subtitle or breadcrumb (Παραλία ...)
 * - "Characteristics" section: icon list with labels (Fine sand, Parking, etc.)
 * - Description paragraphs follow
 * - GPS coordinates sometimes embedded in map link or microdata
 *
 * Key icon/tag labels we look for (translated from the site's icon tags):
 *   Fine sand / Coarse sand / Fine pebbles / Coarse pebbles / Rock / Mixed
 *   Parking / No road access
 *   Umbrellas/beds / No facilities
 *   Food/water nearby / Canteen / Restaurant / Taverna
 *   Snorkeling / Spearfishing
 *   Family friendly / Shallow
 *   Blue flag
 *   Water sports
 *   Lifeguard
 *   Showers
 *   Handicap friendly / Accessible
 */
async function scrapeBeachPage(beachDef) {
  let html;
  try {
    html = await fetchPage(beachDef.url);
  } catch (err) {
    return { _error: err.message, ...beachDef };
  }

  // -- Name English --
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const name_en = h1Match ? stripTags(h1Match[1]).replace(/\s+/g, " ").trim() : null;
  if (!name_en) return { _error: "no h1", ...beachDef };

  // -- Name Greek --
  // cretanbeaches embeds the Greek URL (and thus Greek name) in the alternate
  // language hreflang link:
  //   <link rel="alternate" hreflang="el" href="/el/θαλάσσιος-τουρισμός/.../παραλία-λιμνοθάλασσα-μπάλου">
  // We extract the last path segment and decode the URL-encoded Greek slug.
  let name_el = null;

  // Primary: extract from hreflang el-GR alternate link slug
  // The site uses: <link rel="alternate" hreflang="el-GR" href="..." />
  // or the full URL appears as href="/el/..." adjacent to hreflang="el-GR"
  const hreflangMatch = html.match(
    /hreflang="el(?:-GR)?"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*hreflang="el(?:-GR)?"/i
  )
  // Also try matching the full /el/ URL directly from link tags
  || html.match(/href="(https?:\/\/www\.cretanbeaches\.com\/el\/[^"]+)"/i)
  || html.match(/href="(\/el\/[\u0370-\u03FF\u1F00-\u1FFF][^"]+)"/i);
  if (hreflangMatch) {
    const href = hreflangMatch[1] || hreflangMatch[2];
    const parts = href.split("/").filter(Boolean);
    if (parts.length > 0) {
      try {
        const rawSlug = parts[parts.length - 1];
        const decoded = decodeURIComponent(rawSlug).replace(/-/g, " ").trim();
        // Only accept if it contains Greek chars and isn't just the language root
        if (/[\u0370-\u03FF\u1F00-\u1FFF]/.test(decoded) && decoded.length > 3) {
          name_el = decoded;
        }
      } catch (_) {}
    }
  }

  // Fallback: scan for "Παραλία ..." pattern in page text
  if (!name_el) {
    const paraMatch = html.match(/Παραλί[αά]\s+[\u0370-\u03FF\u1F00-\u1FFF\s]{2,50}/);
    if (paraMatch) {
      name_el = paraMatch[0].trim().slice(0, 60);
    }
  }

  // -- GPS Coordinates --
  // cretanbeaches embeds coords in a Leaflet map init call:
  //   L.map('...').setView([35.5838, 23.588], 13)
  let latitude = null;
  let longitude = null;

  // Primary: Leaflet setView([lat, lng], zoom)
  const leafletMatch = html.match(/\.setView\(\s*\[\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\]/);
  if (leafletMatch) {
    latitude = parseFloat(leafletMatch[1]);
    longitude = parseFloat(leafletMatch[2]);
  }

  // Fallback: JSON-LD schema geo
  if (!latitude) {
    const jsonLdMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        const geo = jsonLd.geo || (jsonLd["@graph"] && jsonLd["@graph"][0]?.geo);
        if (geo) {
          latitude = parseFloat(geo.latitude) || null;
          longitude = parseFloat(geo.longitude) || null;
        }
      } catch (_) {}
    }
  }

  // Fallback: Google Maps link
  if (!latitude) {
    const mapsMatch = html.match(/maps\.google\.[a-z]+\/\?q=([-\d.]+),([-\d.]+)/);
    if (mapsMatch) {
      latitude = parseFloat(mapsMatch[1]);
      longitude = parseFloat(mapsMatch[2]);
    }
  }

  // Sanity check: Crete is roughly 34.8-35.7 N, 23.5-26.4 E
  if (latitude !== null && (latitude < 34.5 || latitude > 36.0)) latitude = null;
  if (longitude !== null && (longitude < 23.0 || longitude > 27.0)) longitude = null;

  // -- Characteristics block --
  // cretanbeaches.com uses <strong>Label:</strong> Value pairs for beach attributes.
  // E.g.: <strong>Sand type:</strong> White Sand
  //       <strong>Facilities:</strong> Food / water nearby, Umbrellas / beds
  //       <strong>Accessibility:</strong> Bus services, Dirt track
  // Extract all such pairs into a structured string for later parsing.
  let charBlock = "";
  const strongPairRe = /<strong>([^<]{2,50}):<\/strong>\s*([^<]{0,200})/gi;
  let sp;
  const charPairs = [];
  while ((sp = strongPairRe.exec(html)) !== null) {
    const label = sp[1].trim();
    const value = stripTags(sp[2]).trim();
    if (value) charPairs.push(`${label}: ${value}`);
  }
  charBlock = charPairs.join(" | ");

  // Also try a broader section match as fallback
  if (!charBlock) {
    const charMatch = html.match(
      /(?:characteristics|facilities|beach details|amenities)([\s\S]{0,3000}?)(?:<h[23]|section|<footer)/i
    );
    if (charMatch) charBlock = stripTags(charMatch[1]);
  }

  // Full page text (stripped) for fallback matching
  const fullText = stripTags(html);

  // Combined text for attribute detection
  const searchText = charBlock + " " + fullText.slice(0, 8000);

  // -- Description --
  let description_en = null;
  // Find paragraphs with real content (>80 chars, not nav/footer noise)
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pm;
  const NOISE_PATTERNS = [
    "cookie", "privacy", "gdpr", "javascript", "menu", "navigation",
    "follow us", "subscribe", "newsletter", "©", "copyright", "terms of use",
    "loading", "please wait", "browser", "enable", "advertisement",
    "read more about", "click here", "back to top",
  ];
  while ((pm = pRe.exec(html)) !== null) {
    const clean = stripTags(pm[1]);
    if (clean.length < 80) continue;
    const lower = clean.toLowerCase();
    if (NOISE_PATTERNS.some((n) => lower.includes(n))) continue;
    // Must contain at least one sentence about the beach (water, sea, sand, crete, etc.)
    if (
      lower.includes("beach") ||
      lower.includes("sea") ||
      lower.includes("sand") ||
      lower.includes("water") ||
      lower.includes("crete") ||
      lower.includes("village") ||
      lower.includes("coast")
    ) {
      description_en = clean.slice(0, 700);
      break;
    }
  }

  // -- Surface type --
  // cretanbeaches uses labels like "Fine sand", "Coarse pebbles", "Fine pebbles"
  let type = null;
  const surfaceRe = /\b(fine sand|coarse sand|golden sand|white sand|fine pebbles|coarse pebbles|pebbles|sand and pebbles|mixed|rock|rocky)\b/i;
  const surfaceMatch = searchText.match(surfaceRe);
  if (surfaceMatch) {
    const s = surfaceMatch[1].toLowerCase();
    if (s.includes("sand and pebble") || s.includes("mixed")) type = "mixed";
    else if (s.includes("sand")) type = "sand";
    else if (s.includes("pebble")) type = "pebble";
    else if (s.includes("rock")) type = "rock";
  }
  if (!type) type = parseSurfaceType(searchText);

  // -- Parking --
  const parking = parseBool(
    searchText,
    ["parking", "car park", "paved road", "road access"],
    ["no road access", "no car access", "accessible only by boat", "by boat only", "no parking"]
  );

  // -- Sunbeds --
  const sunbeds = parseBool(
    searchText,
    ["umbrellas/beds", "umbrellas and beds", "sunbeds", "sun loungers", "beach chairs", "loungers", "sun beds"],
    ["no facilities", "no sunbeds", "no umbrellas", "no amenities", "no beach facilities"]
  );

  // -- Taverna / food --
  const taverna = parseBool(
    searchText,
    ["food/water nearby", "food and water", "restaurant", "taverna", "cafe", "canteen", "snack bar", "kiosk", "beach bar"],
    ["no restaurants", "no food", "no taverna", "no facilities", "no water", "no beach facilities"]
  );

  // -- Snorkeling --
  const snorkeling = parseBool(
    searchText,
    ["snorkeling", "snorkelling", "snorkel", "ideal for snorkeling", "spearfishing", "diving", "underwater"],
    ["no water sports", "no snorkeling", "no diving"]
  );

  // -- Kids friendly --
  // cretanbeaches signals this via "shallow", "calm", "family friendly", "handicap friendly"
  const kids_friendly = parseBool(
    searchText,
    ["family friendly", "family-friendly", "suitable for families", "children", "shallow", "calm waters", "safe for swimming", "handicap friendly"],
    ["not recommended for families", "not suitable for children", "dangerous", "strong currents", "rocky", "not for families", "nudist", "naturist"]
  );

  // -- Blue Flag --
  const blue_flag = /blue flag/i.test(searchText);

  // -- Water sports --
  const water_sports = parseBool(
    searchText,
    ["water sports", "windsurfing", "kitesurfing", "jet ski", "canoe", "kayak", "sailing"],
    ["no water sports"]
  );

  // -- Lifeguard --
  const lifeguard = /lifeguard/i.test(searchText);

  // -- Naturist --
  const naturist = /naturis|nudis/i.test(searchText);

  // -- Wind exposure (inferred from sea conditions) --
  let wind_exposure = null;
  if (/usually calm|calm waters|sheltered|protected/i.test(searchText)) wind_exposure = "sheltered";
  else if (/moderate wind|sometimes rough/i.test(searchText)) wind_exposure = "moderate";
  else if (/exposed|strong wind|rough sea|windy/i.test(searchText)) wind_exposure = "exposed";

  // -- Region (inferred from URL path — more reliable than listing page for cross-posts) --
  let region = beachDef.region;
  if (beachDef.urlPath.includes("west-crete")) region = "west";
  else if (beachDef.urlPath.includes("rethymnon")) region = "central";
  else if (beachDef.urlPath.includes("heraklion")) region = "central";
  else if (beachDef.urlPath.includes("lassithi")) region = "east";

  return {
    source_url: beachDef.url,
    url_path: beachDef.urlPath,
    slug_hint: beachDef.slugHint,
    region,
    name_en,
    name_el,
    latitude,
    longitude,
    description_en,
    type,
    parking,
    sunbeds,
    taverna,
    snorkeling,
    kids_friendly,
    blue_flag,
    water_sports,
    lifeguard,
    naturist,
    wind_exposure,
  };
}

// ---------------------------------------------------------------------------
// Matching against Supabase beaches
// ---------------------------------------------------------------------------

function findBestMatch(enrichment, dbBeaches) {
  let best = null;

  for (const b of dbBeaches) {
    const candidates = [
      b.name_en || "",
      b.name_el || "",
      b.slug || "",
    ];
    let maxScore = 0;

    for (const candidate of candidates) {
      if (!candidate) continue;
      const s = similarityScore(enrichment.name_en, candidate);
      if (s > maxScore) maxScore = s;
    }

    // Also compare slug_hint vs DB slug
    if (enrichment.slug_hint) {
      const slugScore = similarityScore(
        enrichment.slug_hint.replace(/-/g, " "),
        (b.slug || "").replace(/-/g, " ")
      );
      if (slugScore > maxScore) maxScore = slugScore;
    }

    // GPS proximity boost: if both have coords and are within ~1km, boost score
    if (
      enrichment.latitude &&
      enrichment.longitude &&
      b.latitude &&
      b.longitude
    ) {
      const dlat = enrichment.latitude - b.latitude;
      const dlng = enrichment.longitude - b.longitude;
      const dist = Math.sqrt(dlat * dlat + dlng * dlng); // rough degrees
      if (dist < 0.01) maxScore = Math.min(1.0, maxScore + 0.15); // ~1km
    }

    if (!best || maxScore > best.score) {
      best = { beach: b, score: maxScore };
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // ------------------------------------------------------------------
  // Step 1: Discover all beach URLs
  // ------------------------------------------------------------------
  console.log("Step 1: Discovering beach URLs...\n");
  const allBeachDefs = await discoverBeachUrls();
  const toProcess = allBeachDefs.slice(0, LIMIT === Infinity ? allBeachDefs.length : LIMIT);
  console.log(`\nTotal discovered: ${allBeachDefs.length}, will process: ${toProcess.length}\n`);

  // ------------------------------------------------------------------
  // Step 2: Scrape each beach page
  // ------------------------------------------------------------------
  console.log("Step 2: Scraping beach detail pages...\n");
  const enrichments = [];

  for (let i = 0; i < toProcess.length; i++) {
    const beachDef = toProcess[i];
    process.stdout.write(
      `[${String(i + 1).padStart(3)}/${toProcess.length}] ${beachDef.slugHint} ... `
    );

    const data = await scrapeBeachPage(beachDef);

    if (data._error) {
      process.stdout.write(`FAILED (${data._error})\n`);
    } else {
      enrichments.push(data);
      process.stdout.write(
        `OK — "${data.name_en}" | ${data.region} | ${data.type || "?"} | ` +
        `park:${data.parking} sun:${data.sunbeds} tav:${data.taverna} snork:${data.snorkeling} kids:${data.kids_friendly}\n`
      );
    }

    if (i < toProcess.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  // ------------------------------------------------------------------
  // Step 3: Save raw data to JSON
  // ------------------------------------------------------------------
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enrichments, null, 2), "utf-8");
  console.log(`\nRaw data saved to: ${OUTPUT_FILE} (${enrichments.length} beaches)\n`);

  // ------------------------------------------------------------------
  // Step 4: Match & update Supabase (if requested)
  // ------------------------------------------------------------------
  if (!UPDATE_SUPABASE && !DRY_RUN) {
    console.log("Tip: Run with --update-supabase to push enrichments to DB.");
    console.log("     Run with --dry-run to preview matches without writing.");
    console.log("     Raw data already saved above — scraping complete.\n");
    return;
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    if (DRY_RUN) {
      console.log("No Supabase env vars — skipping match preview (raw data saved above).");
      console.log("Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY to preview matches.\n");
      return;
    }
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  // Lazy-load Supabase only when needed
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("Step 4: Loading beaches from Supabase...");
  const { data: dbBeaches, error: dbError } = await supabase
    .from("beaches")
    .select(
      "id, slug, name_en, name_el, region, type, parking, sunbeds, taverna, snorkeling, kids_friendly, description_en, latitude, longitude, wind_exposure"
    );

  if (dbError) {
    console.error("Supabase error:", dbError.message);
    process.exit(1);
  }
  console.log(`Loaded ${dbBeaches.length} beaches from Supabase.\n`);

  // ------------------------------------------------------------------
  // Step 5: Match enrichments to DB rows, compute patches
  // ------------------------------------------------------------------
  const MATCH_THRESHOLD = 0.65;
  let matched = 0;
  let noMatch = 0;
  let upToDate = 0;
  let willUpdate = 0;
  const updateLog = [];

  for (const enrichment of enrichments) {
    if (!enrichment.name_en) { noMatch++; continue; }

    const result = findBestMatch(enrichment, dbBeaches);
    if (!result || result.score < MATCH_THRESHOLD) {
      console.log(
        `  NO MATCH: "${enrichment.name_en}" (best: ${result?.score?.toFixed(2) ?? "N/A"})`
      );
      noMatch++;
      continue;
    }

    const { beach, score } = result;
    matched++;

    // Only fill in fields currently null/missing in DB — never overwrite
    const patch = {};

    if (!beach.description_en && enrichment.description_en) {
      patch.description_en = enrichment.description_en;
    }
    if (!beach.type && enrichment.type) {
      patch.type = enrichment.type;
    }
    if (beach.parking === null && enrichment.parking !== null) {
      patch.parking = enrichment.parking;
    }
    if (beach.sunbeds === null && enrichment.sunbeds !== null) {
      patch.sunbeds = enrichment.sunbeds;
    }
    if (beach.taverna === null && enrichment.taverna !== null) {
      patch.taverna = enrichment.taverna;
    }
    if (beach.snorkeling === null && enrichment.snorkeling !== null) {
      patch.snorkeling = enrichment.snorkeling;
    }
    if (beach.kids_friendly === null && enrichment.kids_friendly !== null) {
      patch.kids_friendly = enrichment.kids_friendly;
    }
    if (!beach.wind_exposure && enrichment.wind_exposure) {
      patch.wind_exposure = enrichment.wind_exposure;
    }
    // Only fill GPS if DB has none and we have valid Crete coords
    if (!beach.latitude && enrichment.latitude) {
      patch.latitude = enrichment.latitude;
    }
    if (!beach.longitude && enrichment.longitude) {
      patch.longitude = enrichment.longitude;
    }
    // Greek name
    if (!beach.name_el && enrichment.name_el) {
      patch.name_el = enrichment.name_el;
    }

    if (Object.keys(patch).length === 0) {
      upToDate++;
      continue;
    }

    console.log(
      `  MATCH (${score.toFixed(2)}): "${enrichment.name_en}" → "${beach.name_en}" [${beach.slug}]`
    );
    console.log(`    Patch: ${JSON.stringify(patch)}`);

    updateLog.push({
      supabase_slug: beach.slug,
      supabase_id: beach.id,
      source_url: enrichment.source_url,
      match_score: score,
      changes: patch,
    });

    if (!DRY_RUN && UPDATE_SUPABASE) {
      const { error: updateError } = await supabase
        .from("beaches")
        .update(patch)
        .eq("id", beach.id);

      if (updateError) {
        console.error(`    UPDATE ERROR: ${updateError.message}`);
      } else {
        willUpdate++;
        console.log(`    Updated.`);
      }
    } else {
      willUpdate++;
      console.log(`    [DRY RUN] Would update.`);
    }
  }

  // ------------------------------------------------------------------
  // Step 6: NEW beaches not in DB
  // ------------------------------------------------------------------
  // Beaches scraped from cretanbeaches.com that didn't match any DB row
  // are NEW candidates. Save them separately for manual review.
  const newBeaches = enrichments.filter((e) => {
    if (!e.name_en) return false;
    const result = findBestMatch(e, dbBeaches);
    return !result || result.score < MATCH_THRESHOLD;
  });

  const newBeachesFile = OUTPUT_FILE.replace(".json", "-new-candidates.json");
  fs.writeFileSync(newBeachesFile, JSON.stringify(newBeaches, null, 2), "utf-8");

  // ------------------------------------------------------------------
  // Step 7: Save update log
  // ------------------------------------------------------------------
  fs.writeFileSync(LOG_FILE, JSON.stringify(updateLog, null, 2), "utf-8");

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  console.log("\n=== Summary ===");
  console.log(`  Beaches scraped from cretanbeaches.com: ${enrichments.length}`);
  console.log(`  Matched to Supabase DB:                 ${matched}`);
  console.log(`  No match (below threshold ${MATCH_THRESHOLD}):       ${noMatch}`);
  console.log(`  Already up-to-date (nothing to patch):  ${upToDate}`);
  console.log(`  Rows updated / would update:            ${willUpdate}`);
  console.log(`  New beach candidates (not in DB):       ${newBeaches.length}`);
  console.log();
  console.log(`  Raw data:         ${OUTPUT_FILE}`);
  console.log(`  Update log:       ${LOG_FILE}`);
  console.log(`  New candidates:   ${newBeachesFile}`);
  if (DRY_RUN) {
    console.log("\n  [DRY RUN] No actual writes to Supabase.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
