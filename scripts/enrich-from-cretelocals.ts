/**
 * enrich-from-cretelocals.ts
 *
 * Scrapes factual beach data (text only, no photos) from cretelocals.com
 * and enriches our Supabase beaches table with missing fields.
 *
 * Data extracted per beach:
 *   - name, region (from FAQ answers mentioning Chania / Heraklion / Rethymno / Lasithi)
 *   - description_en (first meaningful paragraph)
 *   - type (sand | pebble | rock | mixed – inferred from FAQ)
 *   - parking (boolean)
 *   - sunbeds (boolean)
 *   - taverna (boolean)
 *   - snorkeling (boolean)
 *   - kids_friendly (boolean)
 *   - source_url (for audit trail)
 *
 * Rate limit: 1 request / 3 seconds.
 * No photos are scraped.
 *
 * Villages: cretelocals.com/villages/ returns 404 – villages are not available
 *   on this source. Village enrichment would require a different data source.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npx tsx scripts/enrich-from-cretelocals.ts
 *   npx tsx scripts/enrich-from-cretelocals.ts --dry-run
 *   npx tsx scripts/enrich-from-cretelocals.ts --limit 20
 *   npx tsx scripts/enrich-from-cretelocals.ts --output enrichment-cache.json
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const BASE_URL = "https://cretelocals.com";
const RATE_LIMIT_MS = 3000; // 1 req / 3s
const MAX_LISTING_PAGES = 50; // safety cap (~1000 beaches max)

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
const LIMIT_IDX = args.indexOf("--limit");
const LIMIT = LIMIT_IDX !== -1 ? parseInt(args[LIMIT_IDX + 1], 10) : Infinity;
const OUTPUT_IDX = args.indexOf("--output");
const OUTPUT_FILE =
  OUTPUT_IDX !== -1
    ? args[OUTPUT_IDX + 1]
    : path.join(__dirname, "cretelocals-enrichment.json");

if (DRY_RUN) {
  console.log("[DRY RUN] No Supabase writes will happen.");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BeachEnrichment {
  source_url: string;
  name_en: string;
  description_en: string | null;
  region: "west" | "central" | "east" | "south" | null;
  type: "sand" | "pebble" | "rock" | "mixed" | null;
  parking: boolean | null;
  sunbeds: boolean | null;
  taverna: boolean | null;
  snorkeling: boolean | null;
  kids_friendly: boolean | null;
  // Additional info for matching
  _slug_hint: string; // derived from URL slug
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _uaIndex = 0;
function nextUserAgent(): string {
  const ua = USER_AGENTS[_uaIndex % USER_AGENTS.length];
  _uaIndex++;
  return ua;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": nextUserAgent(),
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalise a beach name for fuzzy matching against our DB.
 * Lowercases, removes "beach", "lagoon", accents, punctuation.
 */
function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(beach|lagoon|bay|paralia|plage)\b/gi, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Levenshtein distance – used for fuzzy name matching.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
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

function similarityScore(a: string, b: string): number {
  const na = normaliseName(a);
  const nb = normaliseName(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return maxLen === 0 ? 1.0 : 1 - dist / maxLen;
}

// ---------------------------------------------------------------------------
// Scraping: discover all beach URLs
// ---------------------------------------------------------------------------

async function discoverBeachUrls(): Promise<string[]> {
  const urls = new Set<string>();
  console.log("Discovering beach URLs from listing pages...");

  for (let page = 1; page <= MAX_LISTING_PAGES; page++) {
    const listUrl =
      page === 1 ? `${BASE_URL}/beaches/` : `${BASE_URL}/beaches/?pg=${page}`;
    let html: string;
    try {
      html = await fetchPage(listUrl);
    } catch (err) {
      console.warn(`  Listing page ${page} failed: ${err}`);
      break;
    }

    // Extract beach detail links
    const matches = html.matchAll(
      /href="(https:\/\/cretelocals\.com\/beaches\/[^/"]+\/)"/g
    );
    let found = 0;
    for (const m of matches) {
      const url = m[1];
      if (url !== `${BASE_URL}/beaches/`) {
        if (!urls.has(url)) {
          urls.add(url);
          found++;
        }
      }
    }

    console.log(`  Page ${page}: +${found} new, total ${urls.size}`);

    // If we got 0 new on this page, we've exhausted the listing
    if (found === 0) {
      console.log(`  No new beaches on page ${page}, stopping discovery.`);
      break;
    }

    if (urls.size >= LIMIT) {
      console.log(`  Reached --limit ${LIMIT}, stopping discovery.`);
      break;
    }

    await sleep(RATE_LIMIT_MS);
  }

  return Array.from(urls);
}

// ---------------------------------------------------------------------------
// Scraping: parse a single beach page
// ---------------------------------------------------------------------------

function parseRegion(text: string): "west" | "central" | "east" | "south" | null {
  const t = text.toLowerCase();
  if (t.includes("chania")) return "west";
  if (t.includes("rethymno") || t.includes("rethymnon")) return "central";
  if (t.includes("heraklion") || t.includes("iraklio")) return "central";
  if (t.includes("lasithi") || t.includes("sitia") || t.includes("agios nikolaos")) return "east";
  if (t.includes("elounda") || t.includes("ierapetra") || t.includes("makrygialos") || t.includes("makrigialos")) return "east";
  if (t.includes("south crete") || t.includes("libyan")) return "south";
  return null;
}

function parseSurfaceType(text: string): "sand" | "pebble" | "rock" | "mixed" | null {
  const t = text.toLowerCase();
  const hasSand = t.includes("sand") || t.includes("sandy");
  const hasPebble =
    t.includes("pebble") || t.includes("pebbles") || t.includes("shingle");
  const hasRock = t.includes("rock") && !hasSand && !hasPebble;

  if (hasSand && hasPebble) return "mixed";
  if (hasSand) return "sand";
  if (hasPebble) return "pebble";
  if (hasRock) return "rock";
  return null;
}

function parseBool(text: string, positiveKw: string[], negativeKw: string[]): boolean | null {
  const t = text.toLowerCase();
  for (const kw of negativeKw) {
    if (t.includes(kw)) return false;
  }
  for (const kw of positiveKw) {
    if (t.includes(kw)) return true;
  }
  return null;
}

function extractFaqPairs(html: string): Array<{ q: string; a: string }> {
  const pairs: Array<{ q: string; a: string }> = [];
  // The FAQ section has h3 immediately followed by p
  const re = /<h3[^>]*>(.*?)<\/h3>\s*<p[^>]*>(.*?)<\/p>/gis;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const q = stripTags(m[1]);
    const a = stripTags(m[2]);
    if (q && a) pairs.push({ q, a });
  }
  return pairs;
}

function extractBeachDetails(html: string): string {
  // The "Beach details" section has tag-like items (Fine Pebbles, Parking, etc.)
  const match = html.match(
    /Beach details([\s\S]*?)(?:Most frequent asked questions|<h[23])/i
  );
  if (!match) return "";
  return stripTags(match[1]);
}

function extractFirstDescription(html: string): string | null {
  // Find the first paragraph with real content after the H1
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(html)) !== null) {
    const clean = stripTags(m[1]);
    if (
      clean.length > 80 &&
      !clean.includes("{{") &&
      !clean.includes("Google") &&
      !clean.includes("Menu") &&
      !clean.includes("Save post") &&
      !clean.startsWith("9.") // hotel ratings
    ) {
      return clean.slice(0, 600); // cap at 600 chars
    }
  }
  return null;
}

async function scrapeBeachPage(url: string): Promise<BeachEnrichment | null> {
  let html: string;
  try {
    html = await fetchPage(url);
  } catch (err) {
    console.warn(`  SKIP ${url}: ${err}`);
    return null;
  }

  // Title / name
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!titleMatch) return null;
  const name_en = stripTags(titleMatch[1]);

  // Slug hint from URL
  const slugMatch = url.match(/\/beaches\/([^/]+)\//);
  const _slug_hint = slugMatch ? slugMatch[1] : "";

  // Description
  const description_en = extractFirstDescription(html);

  // FAQ pairs
  const faqs = extractFaqPairs(html);

  // Beach details tag area
  const detailsTags = extractBeachDetails(html);

  // Assemble all text for feature extraction
  const allText = [
    name_en,
    description_en ?? "",
    detailsTags,
    ...faqs.map((f) => f.q + " " + f.a),
  ].join(" ");

  // Region: prefer the FAQ answer about location
  let region: "west" | "central" | "east" | "south" | null = null;
  const locFaq = faqs.find(
    (f) =>
      f.q.toLowerCase().includes("location") ||
      f.q.toLowerCase().includes("where")
  );
  if (locFaq) region = parseRegion(locFaq.a);
  if (!region) region = parseRegion(allText);

  // Surface type
  const sandFaq = faqs.find(
    (f) =>
      f.q.toLowerCase().includes("sand") ||
      f.q.toLowerCase().includes("surface") ||
      f.q.toLowerCase().includes("type")
  );
  const sandText = sandFaq ? sandFaq.a : detailsTags;
  let type = parseSurfaceType(sandText);
  if (!type) type = parseSurfaceType(allText);

  // Parking
  const parkingFaq = faqs.find((f) => f.q.toLowerCase().includes("parking"));
  const parkingText = parkingFaq
    ? parkingFaq.a
    : detailsTags + " " + allText;
  const parking = parseBool(
    parkingText,
    ["yes, there is parking", "parking area", "parking available", "parking spot", "parking lot", "free parking"],
    ["no parking", "no car park", "no road access", "cannot access by car"]
  );

  // Sunbeds
  const bedFaq = faqs.find(
    (f) =>
      f.q.toLowerCase().includes("facilities") ||
      f.q.toLowerCase().includes("sunbed") ||
      f.q.toLowerCase().includes("umbrellas")
  );
  const bedText = bedFaq ? bedFaq.a : detailsTags + " " + allText;
  const sunbeds = parseBool(
    bedText,
    ["umbrellas/beds", "umbrellas and beds", "sunbeds", "sun loungers", "beach chairs", "loungers"],
    ["no sunbeds", "no facilities", "no amenities"]
  );

  // Taverna / food
  const foodFaq = faqs.find(
    (f) =>
      f.q.toLowerCase().includes("restaurant") ||
      f.q.toLowerCase().includes("food") ||
      f.q.toLowerCase().includes("cafe") ||
      f.q.toLowerCase().includes("taverna")
  );
  const foodText = foodFaq ? foodFaq.a : detailsTags + " " + allText;
  const taverna = parseBool(
    foodText,
    [
      "food/water nearby",
      "food and water",
      "restaurants and cafes",
      "restaurant",
      "taverna",
      "cafe",
      "snack bar",
      "kiosk",
      "canteen",
    ],
    ["no restaurants", "no food", "no taverna", "no facilities"]
  );

  // Snorkeling
  const snorFaq = faqs.find(
    (f) =>
      f.q.toLowerCase().includes("snorkel") ||
      f.q.toLowerCase().includes("water sport")
  );
  const snorText = snorFaq ? snorFaq.a : detailsTags + " " + allText;
  const snorkeling = parseBool(
    snorText,
    ["snorkeling", "snorkelling", "snorkel"],
    ["no snorkeling", "no water sports"]
  );

  // Kids friendly
  const kidsFaq = faqs.find(
    (f) =>
      f.q.toLowerCase().includes("children") ||
      f.q.toLowerCase().includes("family") ||
      f.q.toLowerCase().includes("kids")
  );
  const kidsText = kidsFaq ? kidsFaq.a : detailsTags + " " + allText;
  const kids_friendly = parseBool(
    kidsText,
    ["family friendly", "suitable for families", "suitable for children", "safe for kids", "shallow"],
    [
      "not recommended for children",
      "not family",
      "not suitable for children",
      "dangerous for children",
      "not for families",
      "hard to access",
    ]
  );

  return {
    source_url: url,
    name_en,
    description_en,
    region,
    type,
    parking,
    sunbeds,
    taverna,
    snorkeling,
    kids_friendly,
    _slug_hint,
  };
}

// ---------------------------------------------------------------------------
// Matching against Supabase
// ---------------------------------------------------------------------------

interface SupabaseBeach {
  id: number;
  slug: string;
  name_en: string | null;
  name_el: string | null;
  region: string | null;
  type: string | null;
  parking: boolean | null;
  sunbeds: boolean | null;
  taverna: boolean | null;
  snorkeling: boolean | null;
  kids_friendly: boolean | null;
  description_en: string | null;
}

function findBestMatch(
  enrichment: BeachEnrichment,
  dbBeaches: SupabaseBeach[]
): { beach: SupabaseBeach; score: number } | null {
  let best: { beach: SupabaseBeach; score: number } | null = null;

  for (const b of dbBeaches) {
    const nameCandidates = [b.name_en ?? "", b.name_el ?? "", b.slug];
    let maxScore = 0;

    for (const candidate of nameCandidates) {
      if (!candidate) continue;
      const s = similarityScore(enrichment.name_en, candidate);
      if (s > maxScore) maxScore = s;
    }

    // Also try matching the slug hint
    const slugScore = similarityScore(
      enrichment._slug_hint.replace(/-/g, " "),
      b.slug.replace(/-/g, " ")
    );
    if (slugScore > maxScore) maxScore = slugScore;

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
  console.log("=== CretePulse Beach Enrichment from cretelocals.com ===\n");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Step 1: Discover beach URLs
  const beachUrls = await discoverBeachUrls();
  const urlsToProcess = beachUrls.slice(0, LIMIT);
  console.log(`\nTotal beach URLs discovered: ${beachUrls.length}`);
  console.log(`URLs to process: ${urlsToProcess.length}\n`);

  // Step 2: Scrape each beach page
  const enrichments: BeachEnrichment[] = [];
  for (let i = 0; i < urlsToProcess.length; i++) {
    const url = urlsToProcess[i];
    process.stdout.write(
      `[${i + 1}/${urlsToProcess.length}] Scraping ${url.replace(BASE_URL, "")} ... `
    );
    const data = await scrapeBeachPage(url);
    if (data) {
      enrichments.push(data);
      process.stdout.write(
        `OK (${data.name_en}, region=${data.region}, type=${data.type})\n`
      );
    } else {
      process.stdout.write("FAILED\n");
    }
    // Rate limit
    if (i < urlsToProcess.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  // Step 3: Save enrichment cache
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enrichments, null, 2), "utf-8");
  console.log(`\nEnrichment data saved to: ${OUTPUT_FILE}`);
  console.log(`Total enrichments: ${enrichments.length}\n`);

  // Step 4: Load Supabase beaches
  console.log("Loading beaches from Supabase...");
  const { data: dbBeaches, error: dbError } = await supabase
    .from("beaches")
    .select(
      "id, slug, name_en, name_el, region, type, parking, sunbeds, taverna, snorkeling, kids_friendly, description_en"
    );

  if (dbError) {
    console.error("Supabase error:", dbError.message);
    process.exit(1);
  }

  const beaches = dbBeaches as SupabaseBeach[];
  console.log(`Loaded ${beaches.length} beaches from Supabase.\n`);

  // Step 5: Match and update
  let matched = 0;
  let updated = 0;
  let skipped = 0;
  const MATCH_THRESHOLD = 0.65; // minimum similarity to accept a match

  const updateLog: Array<{
    supabase_slug: string;
    source_url: string;
    score: number;
    changes: Record<string, unknown>;
  }> = [];

  for (const enrichment of enrichments) {
    const result = findBestMatch(enrichment, beaches);
    if (!result || result.score < MATCH_THRESHOLD) {
      console.log(
        `  NO MATCH: "${enrichment.name_en}" (best score: ${result?.score?.toFixed(2) ?? "N/A"})`
      );
      skipped++;
      continue;
    }

    const { beach, score } = result;
    matched++;

    // Only update fields that are currently null/missing in the DB
    const patch: Record<string, unknown> = {};

    if (!beach.description_en && enrichment.description_en) {
      patch.description_en = enrichment.description_en;
    }
    if (!beach.region && enrichment.region) {
      patch.region = enrichment.region;
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

    if (Object.keys(patch).length === 0) {
      console.log(
        `  UP-TO-DATE: "${beach.name_en}" (score=${score.toFixed(2)}) – nothing to update`
      );
      continue;
    }

    console.log(
      `  MATCH (${score.toFixed(2)}): "${enrichment.name_en}" → "${beach.name_en}" [${beach.slug}]`
    );
    console.log(`    Patch: ${JSON.stringify(patch)}`);

    updateLog.push({
      supabase_slug: beach.slug,
      source_url: enrichment.source_url,
      score,
      changes: patch,
    });

    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from("beaches")
        .update(patch)
        .eq("id", beach.id);

      if (updateError) {
        console.error(`    UPDATE ERROR: ${updateError.message}`);
      } else {
        updated++;
        console.log(`    Updated.`);
      }
    } else {
      console.log(`    [DRY RUN] Would update.`);
      updated++;
    }
  }

  // Step 6: Save update log
  const logFile = OUTPUT_FILE.replace(".json", "-update-log.json");
  fs.writeFileSync(logFile, JSON.stringify(updateLog, null, 2), "utf-8");

  // Step 7: Summary
  console.log("\n=== Summary ===");
  console.log(`  Scraped from cretelocals:  ${enrichments.length}`);
  console.log(`  Matched to Supabase:       ${matched}`);
  console.log(`  No match / skipped:        ${skipped}`);
  console.log(`  Fields updated:            ${updated}`);
  console.log(`  Enrichment cache:          ${OUTPUT_FILE}`);
  console.log(`  Update log:                ${logFile}`);
  if (DRY_RUN) {
    console.log("\n  [DRY RUN] No actual writes to Supabase.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
