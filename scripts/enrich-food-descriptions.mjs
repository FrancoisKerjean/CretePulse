#!/usr/bin/env node
/**
 * enrich-food-descriptions.mjs
 * Fetches food places with NULL descriptions from Supabase,
 * generates descriptions in EN/FR/DE/EL using Claude Haiku,
 * and updates the records.
 *
 * Run: node scripts/enrich-food-descriptions.mjs
 * Processes 50 places per run (5 batches of 10). Run multiple times for all 1996.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { execSync } from "child_process";

const SUPABASE_URL = "https://fzofxinjsuexjoxlwrhg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9KIRJh01jgKZ4X5XCpik-w_jWT9BmAX";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BATCH_SIZE = 10;
const MAX_BATCHES = 5;
const DELAY_MS = 3000; // delay between batches to respect rate limits

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
  try { unlinkSync(payloadFile); } catch {}
  try { unlinkSync(responseFile); } catch {}
  try { unlinkSync(pyFile); } catch {}

  const data = JSON.parse(raw);
  if (data.error) {
    throw new Error(data.error.message || "Claude API error");
  }
  return data.content?.[0]?.text || "";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log("--- CretePulse Food Description Enrichment ---\n");

  // Fetch food places with NULL description_fr (description_en contains addresses, not real descriptions)
  const { data: places, error: fetchErr } = await supabase
    .from("food_places")
    .select("id, name, type, cuisine, region, village, description_en")
    .is("description_fr", null)
    .order("id", { ascending: true })
    .limit(BATCH_SIZE * MAX_BATCHES);

  if (fetchErr) {
    console.error("Error fetching food places:", fetchErr.message);
    return;
  }

  if (!places || places.length === 0) {
    console.log("No food places with missing descriptions found. All done!");
    return;
  }

  console.log(`Found ${places.length} food places needing descriptions\n`);

  let totalUpdated = 0;
  let totalErrors = 0;

  // Process in batches
  const numBatches = Math.ceil(places.length / BATCH_SIZE);

  for (let b = 0; b < numBatches; b++) {
    const batch = places.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    console.log(`\n--- Batch ${b + 1}/${numBatches} (${batch.length} places) ---`);

    // Build the place list for the prompt
    const placeList = batch.map(p =>
      `- ID: ${p.id} | Name: "${p.name}" | Type: ${p.type || "unknown"} | Cuisine: ${p.cuisine || "unknown"} | Region: ${p.region || "unknown"} | Village: ${p.village || "unknown"} | Address hint: ${p.description_en || "none"}`
    ).join("\n");

    const prompt = `Generate short descriptions (2-3 sentences each) for these restaurants/food places in Crete, Greece.
For each place, provide descriptions in English, French (with proper accents), German, and Greek.
Use what you know about Cretan cuisine and the specific area. Be specific and useful for tourists.

Return ONLY a valid JSON array (no markdown fences, no explanation) with objects:
{ "id": number, "description_en": "...", "description_fr": "...", "description_de": "...", "description_el": "..." }

Places:
${placeList}`;

    let descriptions;
    try {
      console.log("  Calling Claude Haiku...");
      const response = askClaude(prompt);
      const jsonStr = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      descriptions = JSON.parse(jsonStr);
    } catch (err) {
      console.error(`  Error getting descriptions for batch ${b + 1}:`, err.message);
      totalErrors += batch.length;
      if (b < numBatches - 1) await sleep(DELAY_MS);
      continue;
    }

    if (!Array.isArray(descriptions)) {
      console.error("  Response is not an array, skipping batch");
      totalErrors += batch.length;
      if (b < numBatches - 1) await sleep(DELAY_MS);
      continue;
    }

    // Update each place in Supabase
    for (const desc of descriptions) {
      if (!desc.id || !desc.description_en) {
        console.log(`  Skip (missing id or description): ${JSON.stringify(desc).slice(0, 80)}`);
        totalErrors++;
        continue;
      }

      const { error: updateErr } = await supabase
        .from("food_places")
        .update({
          description_en: desc.description_en,
          description_fr: desc.description_fr || desc.description_en,
          description_de: desc.description_de || desc.description_en,
          description_el: desc.description_el || desc.description_en,
        })
        .eq("id", desc.id);

      if (updateErr) {
        console.error(`  Error updating ID ${desc.id}: ${updateErr.message}`);
        totalErrors++;
      } else {
        console.log(`  Updated: ${desc.id} - ${batch.find(p => p.id === desc.id)?.name || "?"}`);
        totalUpdated++;
      }
    }

    // Delay between batches (skip after last)
    if (b < numBatches - 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s before next batch...`);
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n--- Done! Updated: ${totalUpdated}, Errors: ${totalErrors} ---`);
  console.log(`Run again to process more places.`);
}

run().catch(console.error);
