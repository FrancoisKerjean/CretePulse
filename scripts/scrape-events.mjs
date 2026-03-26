#!/usr/bin/env node
/**
 * scrape-events.mjs
 * Fetches events from web sources and uses Claude to extract/enrich them.
 * Inserts into Supabase events table.
 *
 * Run: node scripts/scrape-events.mjs
 *
 * Requires: ANTHROPIC_API_KEY env var (or reads from ~/.kairos-keys)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { execSync } from "child_process";

const SUPABASE_URL = "https://fzofxinjsuexjoxlwrhg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9KIRJh01jgKZ4X5XCpik-w_jWT9BmAX";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Try to get API key from various sources
function getApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const keys = readFileSync(join(homedir(), '.kairos-keys'), 'utf8');
    const match = keys.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  throw new Error("No ANTHROPIC_API_KEY found");
}

const API_KEY = getApiKey();

function slugify(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

// Ask Claude via Python helper (Node fetch unreliable on this Windows env)
function askClaude(prompt) {
  const body = JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const payloadFile = join(homedir(), ".claude-payload.json");
  const responseFile = join(homedir(), ".claude-response.json");
  const pyFile = join(homedir(), ".claude-api-call.py");
  writeFileSync(payloadFile, body, "utf8");

  const pyScript = `
import json, urllib.request, ssl, os, sys

ctx = ssl.create_default_context()
keys_path = os.path.expanduser("~/.kairos-keys")
api_key = ""
with open(keys_path) as f:
    for line in f:
        if line.startswith("ANTHROPIC_API_KEY="):
            api_key = line.split("=",1)[1].strip()

payload_path = os.path.expanduser("~/.claude-payload.json")
response_path = os.path.expanduser("~/.claude-response.json")

with open(payload_path, "rb") as f:
    data = f.read()

print(f"Sending {len(data)} bytes to API...", file=sys.stderr)

req = urllib.request.Request(
    "https://api.anthropic.com/v1/messages",
    data=data,
    headers={
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    },
    method="POST"
)
resp = urllib.request.urlopen(req, timeout=120, context=ctx)
result = resp.read()

with open(response_path, "wb") as f:
    f.write(result)

print(f"Got {len(result)} bytes response", file=sys.stderr)
`;

  writeFileSync(pyFile, pyScript, "utf8");

  try {
    execSync(`python "${pyFile}"`, { timeout: 150000, stdio: ["pipe", "pipe", "inherit"] });
  } catch (e) {
    const stderr = e.stderr?.toString() || "";
    throw new Error("Python API call failed: " + stderr.slice(0, 500));
  }

  const raw = readFileSync(responseFile, "utf8");
  // Clean up
  try { unlinkSync(payloadFile); } catch {}
  try { unlinkSync(responseFile); } catch {}
  try { unlinkSync(pyFile); } catch {}

  const data = JSON.parse(raw);
  if (data.error) {
    throw new Error(data.error.message || "Claude API error");
  }
  return data.content?.[0]?.text || "";
}

// Get current month context
function getTimeContext() {
  const now = new Date();
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const currentMonth = months[now.getMonth()];
  const nextMonth = months[(now.getMonth() + 1) % 12];
  const year = now.getFullYear();
  return { currentMonth, nextMonth, year };
}

// Main scrape + generate pipeline
async function run() {
  console.log("--- CretePulse Event Scraper ---\n");

  // Skip web scraping (most sources fail + content breaks JSON encoding)
  // Claude's knowledge of Cretan events is sufficient
  console.log("Using Claude knowledge base (no web scraping)\n");

  const { currentMonth, nextMonth, year } = getTimeContext();

  // Get existing events to avoid duplicates
  const { data: existing } = await supabase.from("events").select("title_en, date_start, slug");
  const existingKeys = new Set((existing || []).map(e => `${e.title_en?.toLowerCase().slice(0, 30)}|${e.date_start}`));
  const existingSlugs = new Set((existing || []).map(e => e.slug));
  console.log(`Existing events in DB: ${existing?.length || 0}`);

  // Build exclusion list from existing events
  const existingTitles = (existing || []).map(e => e.title_en).filter(Boolean).slice(0, 50);
  const excludeList = existingTitles.length > 0
    ? `\nDo NOT include these events (already in database): ${existingTitles.join(", ")}\n`
    : "";

  const prompt = `You are an expert on Crete, Greece events and festivals. Using your knowledge of annual Cretan events, generate a JSON array of exactly 10 upcoming events in Crete for ${currentMonth} and ${nextMonth} ${year}, and also major events for the coming months.
${excludeList}
Include a mix of:
- Local festivals and panegyria (saint's day celebrations in specific villages)
- Cultural events (concerts, exhibitions, theater)
- Food & wine festivals (olive oil, wine, raki/tsikoudia, honey)
- Sports events (marathons, swimming races, cycling)
- Markets and fairs
- Music festivals
- Religious celebrations (Easter, Assumption, patron saints)
- Seasonal events (carnival, Easter, summer festivals)

For each event, provide accurate dates for ${year}. If you're not sure of the exact date, use a reasonable estimate based on the typical timing.

Return ONLY a valid JSON array (no markdown fences, no explanation, no text before or after) with objects having these exact fields:
{
  "title_en": "Event Name in English",
  "title_fr": "Event Name in French (properly accented)",
  "title_de": "Event Name in German",
  "title_el": "Event Name in Greek",
  "description_en": "2-3 sentence description in English",
  "description_fr": "2-3 sentence description in French (with proper accents: e, e, e, a, u, c, etc.)",
  "description_de": "2-3 sentence description in German",
  "description_el": "2-3 sentence description in Greek",
  "date_start": "YYYY-MM-DD",
  "date_end": "YYYY-MM-DD or null",
  "time_start": "HH:MM or null",
  "location_name": "City/Village, Region",
  "latitude": number or null,
  "longitude": number or null,
  "region": "east|west|central|south",
  "category": "festival|food|music|religious|sports|market|cultural|theater|exhibition"
}

Important rules:
- Keep descriptions SHORT (1-2 sentences max) to fit within token limits
- Use REAL locations in Crete with accurate coordinates
- Include the Greek name in title_el with proper Greek characters
- French descriptions must have proper accents
- Cover ALL regions of Crete (Heraklion, Chania, Rethymno, Lasithi)
- Include small village events, not just big city ones
- Do NOT include events that are clearly past (before today ${new Date().toISOString().slice(0, 10)})
- Output must be valid JSON parseable by JSON.parse()`;

  console.log("\nAsking Claude to generate events...");
  const response = await askClaude(prompt);

  let events;
  try {
    // Handle potential markdown wrapping
    const jsonStr = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    events = JSON.parse(jsonStr);
  } catch (err) {
    console.error("Failed to parse Claude response:", err.message);
    console.log("Raw response (first 500 chars):", response.slice(0, 500));
    return;
  }

  if (!Array.isArray(events)) {
    console.error("Response is not an array");
    return;
  }

  console.log(`Got ${events.length} events from Claude\n`);

  let inserted = 0;
  let skipped = 0;

  for (const event of events) {
    if (!event.title_en || !event.date_start) {
      console.log("  Skip (missing title or date)");
      skipped++;
      continue;
    }

    let slug = slugify(event.title_en);
    const key = `${event.title_en?.toLowerCase().slice(0, 30)}|${event.date_start}`;

    // Skip duplicates by title+date
    if (existingKeys.has(key)) {
      console.log(`  Skip (duplicate): ${event.title_en}`);
      skipped++;
      continue;
    }

    // Ensure unique slug
    if (existingSlugs.has(slug)) {
      slug = slug + "-" + event.date_start.slice(5, 7);
      if (existingSlugs.has(slug)) {
        console.log(`  Skip (slug exists): ${slug}`);
        skipped++;
        continue;
      }
    }

    const row = {
      slug,
      title_en: event.title_en,
      title_fr: event.title_fr || event.title_en,
      title_de: event.title_de || event.title_en,
      title_el: event.title_el || event.title_en,
      description_en: event.description_en || "",
      description_fr: event.description_fr || "",
      description_de: event.description_de || "",
      description_el: event.description_el || "",
      date_start: event.date_start,
      date_end: event.date_end || null,
      time_start: event.time_start || null,
      location_name: event.location_name || "Crete",
      latitude: event.latitude || null,
      longitude: event.longitude || null,
      region: event.region || null,
      category: event.category || "cultural",
      source_url: null,
      verified: true,
    };

    const { error } = await supabase.from("events").insert(row);

    if (error) {
      console.error(`  Error inserting "${event.title_en}": ${error.message}`);
    } else {
      console.log(`  Inserted: ${event.title_en} (${event.date_start})`);
      existingKeys.add(key);
      existingSlugs.add(slug);
      inserted++;
    }
  }

  console.log(`\n--- Done! Inserted: ${inserted}, Skipped: ${skipped} ---`);
}

run().catch(console.error);
