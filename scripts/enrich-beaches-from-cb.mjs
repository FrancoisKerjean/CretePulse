/**
 * enrich-beaches-from-cb.mjs
 *
 * Facts-first enrichment for "shell" beaches (rows with an empty description_fr).
 * Each shell is matched to the nearest cb_places entry (<200m, with a name guard)
 * and gets a DETERMINISTIC description_en/fr/de/el built ONLY from real, sourced
 * cb_places attributes (water_color, sand_type, depth, crowds, accessibility,
 * rating). No LLM, no invention. Every attribute traces back to cb_places.source_url
 * (cretanbeaches.com). Beaches with no cb match within 200m are left untouched.
 *
 * Dry-run (default): prints proposals + writes a report, persists nothing.
 *   node --env-file=.env.local scripts/enrich-beaches-from-cb.mjs
 * Persist:
 *   node --env-file=.env.local scripts/enrich-beaches-from-cb.mjs --write
 *
 * Only fills description_* fields that are currently empty; never overwrites.
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase env vars. Use --env-file=.env.local");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const WRITE = process.argv.includes("--write");
const EMIT_SQL = process.argv.includes("--sql");
const sqlEsc = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sqlLines = [];
const MAX_DIST_M = 200;       // hard geo ceiling for a match
const CLOSE_DIST_M = 120;     // below this, distance alone is enough
const LANGS = ["en", "fr", "de", "el"];

// ---------------------------------------------------------------------------
// Token-level translation maps (cb values are composite, comma-separated)
// ---------------------------------------------------------------------------
const RATING_MIN = 3.0;       // below this, rating is omitted (noise / obscure spots)
const T = {
  water: {
    "blue":       { en: "blue",       fr: "bleue",        de: "blau",        el: "μπλε" },
    "deep blue":  { en: "deep blue",  fr: "bleu profond", de: "tiefblau",    el: "σκούρα μπλε" },
    "turquoise":  { en: "turquoise",  fr: "turquoise",    de: "türkis",      el: "τιρκουάζ" },
    "green":      { en: "green",      fr: "verte",        de: "grün",        el: "πράσινα" },
  },
  // Material nouns, phrased as a list: "beach with X and Y" / "plage de X et Y".
  sand: {
    "sand":              { en: "sand",          fr: "sable",              de: "Sand",              el: "άμμο" },
    "white sand":        { en: "white sand",    fr: "sable blanc",        de: "weißem Sand",       el: "λευκή άμμο" },
    "pebbles":           { en: "pebbles",       fr: "galets",             de: "Kieseln",           el: "βότσαλα" },
    "fine pebbles":      { en: "fine pebbles",  fr: "galets fins",        de: "feinen Kieseln",    el: "ψιλά βότσαλα" },
    "rocks in places":   { en: "rocks in places", fr: "rochers par endroits", de: "stellenweise Felsen", el: "βράχια κατά τόπους" },
  },
  // Depth as a nominal clause: "shallow/moderate/deep water".
  depth: {
    "shallow": { en: "shallow",  fr: "faible",  de: "gering", el: "ρηχό" },
    "normal":  { en: "moderate", fr: "normale", de: "normal", el: "κανονικό" },
    "deep":    { en: "deep",     fr: "importante", de: "tief", el: "βαθύ" },
  },
  crowds: {
    "quiet":         { en: "quiet",    fr: "calme",       de: "ruhig",   el: "ήσυχη" },
    "normal":        { en: "moderately busy", fr: "modérément fréquentée", de: "mäßig besucht", el: "μέτρια" },
    "crowded place": { en: "busy",     fr: "fréquentée",  de: "belebt",  el: "πολυσύχναστη" },
  },
  access: {
    "paved road":       { en: "paved road",          fr: "route asphaltée",   de: "asphaltierte Straße", el: "ασφαλτόδρομο" },
    "bus services":     { en: "bus services",        fr: "bus",               de: "Busverbindung",       el: "λεωφορείο" },
    "dirt track":       { en: "dirt track",          fr: "piste en terre",    de: "Schotterpiste",       el: "χωματόδρομο" },
    "boat":             { en: "boat",                fr: "bateau",            de: "Boot",                el: "σκάφος" },
    "walking":          { en: "on foot",             fr: "à pied",            de: "zu Fuß",              el: "με τα πόδια" },
    "handicap friendly":{ en: "wheelchair access",   fr: "accès PMR",         de: "barrierefrei",        el: "πρόσβαση ΑμεΑ" },
  },
};

const CONJ = { en: " and ", fr: " et ", de: " und ", el: " και " };
const REGION = {
  western:  { en: "western",  fr: "occidentale", de: "Westkreta",    el: "δυτική" },
  central:  { en: "central",  fr: "centrale",    de: "Zentralkreta", el: "κεντρική" },
  eastern:  { en: "eastern",  fr: "orientale",   de: "Ostkreta",     el: "ανατολική" },
};

// ---------------------------------------------------------------------------
function regionFromLng(lng) {
  if (lng == null) return "central";
  if (lng < 24.2) return "western";
  if (lng < 25.42) return "central";   // Heraklion counted central (matches cretanbeaches)
  return "eastern";
}

function tokens(raw, dict) {
  if (!raw) return [];
  return raw.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((k) => dict[k])   // unknown tokens dropped (never emit raw English)
    .filter(Boolean);
}

function joinTok(list, lang) {
  const parts = list.map((t) => t[lang]).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + CONJ[lang] + parts[parts.length - 1];
}

function haversine(la1, lo1, la2, lo2) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLa = toRad(la2 - la1), dLo = toRad(lo2 - lo1);
  const a = Math.sin(dLa / 2) ** 2 +
    Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

const STOP = new Set(["beach", "beaches", "the", "of", "and", "cove", "bay", "plage"]);
function nameTokens(s) {
  return new Set((s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w)));
}
function nameOverlap(a, b) {
  const A = nameTokens(a), B = nameTokens(b);
  for (const w of A) if (B.has(w)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Build one language description from cb facts. Returns null if too thin.
// ---------------------------------------------------------------------------
function buildDesc(beachName, region, cb, lang) {
  const sand = joinTok(tokens(cb.sand_type, T.sand), lang);   // material list
  const water = joinTok(tokens(cb.water_color, T.water), lang);
  const depthTok = tokens(cb.depth, T.depth)[0];
  const depth = depthTok ? depthTok[lang] : null;
  const crowdTok = tokens(cb.crowds, T.crowds)[0];
  const crowd = crowdTok ? crowdTok[lang] : null;
  const access = joinTok(tokens(cb.access ?? cb.accessibility, T.access), lang);
  const reg = REGION[region][lang];
  const ratingNum = (cb.rating != null && cb.rating !== "") ? Number(cb.rating) : null;
  const rating = (ratingNum != null && ratingNum >= RATING_MIN) ? ratingNum.toFixed(1) : null;

  // Require at least 2 real facts to avoid empty filler.
  const factCount = [sand, water, depth, crowd, access, rating].filter(Boolean).length;
  if (factCount < 2) return null;

  let s = "";
  if (lang === "en") {
    s += `${beachName} is a beach in ${reg} Crete${sand ? ` with ${sand}` : ""}.`;
    if (water) s += ` The water is ${water}.`;
    if (depth) s += ` Water depth is generally ${depth}.`;
    if (access) s += ` Access is by ${access}.`;
    if (crowd) s += ` It is usually ${crowd}.`;
    if (rating) s += ` Visitor rating: ${rating}/5.`;
  } else if (lang === "fr") {
    s += `${beachName} est une plage de Crète ${reg}${sand ? `, composée de ${sand}` : ""}.`;
    if (water) s += ` L'eau y est ${water}.`;
    if (depth) s += ` Profondeur généralement ${depth}.`;
    if (access) s += ` Accès en ${access}.`;
    if (crowd) s += ` Plage généralement ${crowd}.`;
    if (rating) s += ` Note des visiteurs : ${rating}/5.`;
  } else if (lang === "de") {
    s += `${beachName} ist ein Strand in ${reg}${sand ? ` mit ${sand}` : ""}.`;
    if (water) s += ` Das Wasser ist ${water}.`;
    if (depth) s += ` Wassertiefe meist ${depth}.`;
    if (access) s += ` Erreichbar über ${access}.`;
    if (crowd) s += ` Der Strand ist meist ${crowd}.`;
    if (rating) s += ` Besucherbewertung: ${rating}/5.`;
  } else if (lang === "el") {
    s += `Η ${beachName} είναι μια παραλία στην ${reg} Κρήτη${sand ? ` με ${sand}` : ""}.`;
    if (water) s += ` Τα νερά είναι ${water}.`;
    if (depth) s += ` Βάθος συνήθως ${depth}.`;
    if (access) s += ` Πρόσβαση με ${access}.`;
    if (crowd) s += ` Συνήθως ${crowd}.`;
    if (rating) s += ` Βαθμολογία επισκεπτών: ${rating}/5.`;
  }
  return s.trim().replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
async function main() {
  console.log(`Mode: ${WRITE ? "WRITE" : "DRY-RUN"}  ·  URL: ${SUPABASE_URL}`);

  const { data: beaches, error: e1 } = await supabase
    .from("beaches")
    .select("slug, name_en, name_fr, name_de, name_el, latitude, longitude, description_en, description_fr, description_de, description_el");
  if (e1) throw e1;

  const { data: cbs, error: e2 } = await supabase
    .from("cb_places")
    .select("slug, name, latitude, longitude, rating, water_color, sand_type, depth, crowds, accessibility, source_url");
  if (e2) throw e2;

  const cbGeo = cbs.filter((c) => c.latitude != null && c.longitude != null);
  const shells = beaches.filter(
    (b) => (!b.description_fr || b.description_fr === "") && b.latitude != null && b.longitude != null
  );
  console.log(`Shells (no FR desc, geolocated): ${shells.length}  ·  cb_places geoloc: ${cbGeo.length}`);

  const report = [];
  let matched = 0, wrote = 0, skippedNoMatch = 0, skippedThin = 0;

  for (const b of shells) {
    let best = null, bestD = Infinity;
    for (const c of cbGeo) {
      const d = haversine(b.latitude, b.longitude, c.latitude, c.longitude);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (!best || bestD > MAX_DIST_M) { skippedNoMatch++; continue; }
    // Name guard for the 120-200m band (very close = trust distance).
    if (bestD > CLOSE_DIST_M && !nameOverlap(b.name_en, best.name)) { skippedNoMatch++; continue; }

    const region = regionFromLng(b.longitude);
    const names = { en: b.name_en, fr: b.name_fr || b.name_en, de: b.name_de || b.name_en, el: b.name_el || b.name_en };
    const desc = {};
    let anyLang = false;
    for (const lang of LANGS) {
      const cur = b[`description_${lang}`];
      if (cur && cur !== "") continue;            // never overwrite existing
      const txt = buildDesc(names[lang], region, best, lang);
      if (txt) { desc[`description_${lang}`] = txt; anyLang = true; }
    }
    if (!anyLang) { skippedThin++; continue; }
    matched++;

    report.push({
      beach: b.slug, cb_slug: best.slug, dist_m: Math.round(bestD),
      source_url: best.source_url, fields: Object.keys(desc),
      all: Object.fromEntries(Object.entries(desc).map(([k, v]) => [k.replace("description_", ""), v])),
    });

    if (EMIT_SQL) {
      // Only fill fields currently empty (idempotent): guard each with IS NULL / ''.
      const sets = Object.entries(desc).map(([col, val]) => `${col} = ${sqlEsc(val)}`).join(", ");
      const guards = Object.keys(desc).map((col) => `(${col} IS NULL OR ${col} = '')`).join(" AND ");
      sqlLines.push(`UPDATE beaches SET ${sets}, updated_at = now() WHERE slug = ${sqlEsc(b.slug)} AND ${guards};`);
    }
    if (WRITE) {
      const { error } = await supabase.from("beaches").update(desc).eq("slug", b.slug);
      if (error) { console.error(`  ✗ ${b.slug}: ${error.message}`); }
      else { wrote++; }
    }
  }

  if (EMIT_SQL) {
    const sqlPath = "scripts/out/beaches-enrich.sql";
    writeFileSync(sqlPath, "BEGIN;\n" + sqlLines.join("\n") + "\nCOMMIT;\n");
    console.log(`SQL written: ${sqlPath} (${sqlLines.length} updates)`);
  }

  mkdirSync("scripts/out", { recursive: true });
  const reportPath = "scripts/out/beaches-enrich-report.json";
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("\n──────── SUMMARY ────────");
  console.log(`matched & enrichable : ${matched}`);
  console.log(`skipped (no cb <200m or name mismatch): ${skippedNoMatch}`);
  console.log(`skipped (facts too thin): ${skippedThin}`);
  if (WRITE) console.log(`rows written: ${wrote}`);
  console.log(`report: ${reportPath}`);
  console.log("\n──────── SAMPLE (first 8, all langs) ────────");
  for (const r of report.slice(0, 8)) {
    console.log(`\n• ${r.beach}  ← ${r.cb_slug} (${r.dist_m}m)  [${r.fields.join(",")}]`);
    for (const [k, v] of Object.entries(r.all || {})) console.log(`  ${k}: ${v}`);
    console.log(`  src: ${r.source_url}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
