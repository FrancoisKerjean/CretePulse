// scripts/enrich-bento-tiles.mjs
/**
 * Enrichit cb_places.bento_tiles par famille via Claude Haiku.
 * Usage : node scripts/enrich-bento-tiles.mjs --family heritage [--type monastery] [--limit 50] [--force]
 * Familles : heritage | nature | village | beach
 * Idempotent : skip les lieux dont bento_tiles IS NOT NULL (sauf --force).
 * Charge l'URL+clé Supabase depuis .env.local (PAS d'URL codée en dur).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

// --- args ---
const args = process.argv.slice(2);
const getArg = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const FAMILY = getArg("--family", "heritage");
const TYPE = getArg("--type", null); // pilote sur 1 SEUL place_type (ex monastery) ; sinon toute la famille
const LIMIT = parseInt(getArg("--limit", "50"), 10);
const FORCE = args.includes("--force");
const BATCH = 10;
const DELAY_MS = 3000;

// --- supabase depuis .env.local ---
const env = {};
for (const l of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
// Clé WRITE de la base cretepulse self-hosted. L'anon reçoit "permission denied"
// (RLS) sur cb_places (vérifié). NE PAS réutiliser SUPABASE_SERVICE_ROLE_KEY de
// ~/.kairos-keys : elle appartient à un AUTRE projet. Kami fournit cette clé dédiée.
const SUPA_KEY = env.CRETEPULSE_SERVICE_ROLE_KEY;
if (!SUPA_KEY) {
  console.error("ABORT: CRETEPULSE_SERVICE_ROLE_KEY absente de .env.local — clé write self-hosted requise (l'anon est bloquée par RLS). Voir Pré-requis bloquants.");
  process.exit(1);
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, SUPA_KEY);

// `python` est un stub Microsoft Store inopérant sur cet env ; seul `py` marche.
const PY = (() => { try { execSync("py --version", { stdio: "ignore" }); return "py"; } catch { return "python"; } })();

// --- familles -> types + schéma de prompt ---
const FAMILY_TYPES = {
  heritage: ["monastery", "church", "historical-site", "archaeological-site", "fort", "museum", "mythology", "tradition"],
  nature: ["gorge", "cave", "lake", "waterfall", "forest", "mountain", "river", "plateau", "island", "geological", "natural-park", "nature"],
  village: ["town"],
  beach: ["beach"],
};
const FAMILY_SCHEMA = {
  heritage: `{ "century": number|null (siècle de construction, ex 14), "frescoes_date": string|null (année des fresques, ex "1360"), "walking_minutes": number|null (minutes de marche pour y accéder), "unique_feature": string|null (UNE phrase courte EN sur un détail rare), "access_note": string|null (EN court) }`,
  nature: `{ "length_km": number|null, "elevation_m": number|null, "difficulty": "easy"|"moderate"|"hard"|null, "duration_minutes": number|null, "season": string|null (EN, ex "May–Oct"), "access_note": string|null }`,
  village: `{ "population": number|null, "altitude_m": number|null, "specialty": string|null (EN court), "access_note": string|null }`,
  beach: `{ "access_note": string|null (EN court), "unique_feature": string|null (EN court) }`,
};

const types = FAMILY_TYPES[FAMILY];
if (!types) { console.error("Famille inconnue:", FAMILY); process.exit(1); }

// --- appel Claude via Python (fetch Node instable sur ce Windows) ---
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
import urllib.request, ssl, os, sys
ctx = ssl.create_default_context()
api_key = ""
with open(os.path.expanduser("~/.kairos-keys")) as f:
    for line in f:
        if line.startswith("ANTHROPIC_API_KEY="):
            api_key = line.split("=",1)[1].strip()
with open(os.path.expanduser("~/.claude-payload.json"), "rb") as f:
    data = f.read()
req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=data,
    headers={"Content-Type":"application/json","x-api-key":api_key,"anthropic-version":"2023-06-01"}, method="POST")
resp = urllib.request.urlopen(req, timeout=120, context=ctx)
with open(os.path.expanduser("~/.claude-response.json"), "wb") as f:
    f.write(resp.read())
`;
  writeFileSync(pyFile, pyScript, "utf8");
  try {
    execSync(`${PY} "${pyFile}"`, { timeout: 150000, stdio: ["pipe", "pipe", "inherit"] });
  } catch (e) {
    throw new Error("Python API call failed: " + (e.stderr?.toString() || "").slice(0, 500));
  }
  const raw = readFileSync(responseFile, "utf8");
  try { unlinkSync(payloadFile); unlinkSync(responseFile); unlinkSync(pyFile); } catch {}
  const data = JSON.parse(raw);
  if (data.error) throw new Error(data.error.message || "Claude API error");
  return data.content?.[0]?.text || "";
}

function parseClaudeJsonArray(raw) {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error("not a JSON array");
  return parsed;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log(`--- enrich-bento-tiles family=${FAMILY} type=${TYPE ?? "*"} limit=${LIMIT} force=${FORCE} py=${PY} ---`);
  let q = supabase.from("cb_places")
    .select("slug, name, place_type, description")
    .order("slug")
    .limit(LIMIT);
  q = TYPE ? q.eq("place_type", TYPE) : q.in("place_type", types);
  if (!FORCE) q = q.is("bento_tiles", null);
  const { data: places, error } = await q;
  if (error) { console.error("fetch error:", error.message); process.exit(1); }
  if (!places?.length) { console.log("Rien à enrichir."); return; }
  console.log(`${places.length} lieux à traiter`);

  let updated = 0, errors = 0;
  for (let b = 0; b < Math.ceil(places.length / BATCH); b++) {
    const batch = places.slice(b * BATCH, (b + 1) * BATCH);
    const list = batch.map((p) => `- slug: ${p.slug} | name: "${p.name}" | type: ${p.place_type}\n  description: ${(p.description || "").slice(0, 900)}`).join("\n");
    const prompt = `Extract structured tile data for these Crete places from their description.
For each place return an object { "slug": string, "tiles": ${FAMILY_SCHEMA[FAMILY]} }.
Rules: use ONLY facts present in the description; put null when a field is absent; keep text fields in ENGLISH and very short (max ~8 words); numbers as raw numbers (no units).
Return ONLY a valid JSON array, no markdown fences, no commentary.

Places:
${list}`;
    let rows;
    try {
      console.log(`Batch ${b + 1}: appel Claude (${batch.length})...`);
      rows = parseClaudeJsonArray(askClaude(prompt));
    } catch (e) {
      console.error(`  batch ${b + 1} erreur:`, e.message); errors += batch.length;
      if (b < Math.ceil(places.length / BATCH) - 1) await sleep(DELAY_MS);
      continue;
    }
    for (const row of rows) {
      if (!row.slug || !row.tiles) { errors++; continue; }
      const { error: uErr } = await supabase.from("cb_places").update({ bento_tiles: row.tiles }).eq("slug", row.slug);
      if (uErr) { console.error(`  update ${row.slug}: ${uErr.message}`); errors++; }
      else { console.log(`  OK ${row.slug}`); updated++; }
    }
    if (b < Math.ceil(places.length / BATCH) - 1) await sleep(DELAY_MS);
  }
  console.log(`--- Done. updated=${updated} errors=${errors} ---`);
}
run().catch(console.error);
