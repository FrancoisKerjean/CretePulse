// Génère src/data/beach-crowd-scores.json : score d'affluence estimée par plage.
// Utilisation : node scripts/build-beach-crowd-scores.mjs
//
// Méthode (documentée aussi dans le JSON de sortie) :
// 1. Pression Airbnb = somme des cellules de la heatmap
//    (public/data/airbnb-density.json, grille ~2,2 km, 31K listings) dans un
//    rayon de 5 km, noyau exponentiel exp(-d/1.5km), puis rang percentile
//    0-100 parmi les plages (robuste aux extrêmes type Chania w=2061).
// 2. Signal DOMINANT = fréquentation observée cb_places.crowds (match GPS
//    < 1.5 km, même règle que src/lib/cb-beach-match.ts) : Crowded place 85,
//    Normal 50, Quiet 25. La densité Airbnb seule rate les plages-excursions
//    (Balos/Preveli : zéro hébergement autour, pourtant bondées) — vérifié
//    sur la v1 de ce script le 09/07/2026.
// 3. crowds connu : score = crowdsScore + (airbnbPct - 50) × 0.3, borné 0-100.
//    crowds inconnu : score = airbnbPct.
// Bandes : quiet <= 35 < moderate <= 65 < busy.
//
// C'est une ESTIMATION (observation + structure), pas un comptage de
// visiteurs : le JSON l'assume dans `method`.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

// ── Parse .env.local ────────────────────────────────────────────────────────
const envContent = fs.readFileSync(path.join(ROOT, ".env.local"), "utf-8");
const envVars = {};
envContent.split(/\r?\n/).forEach((line) => {
  const m = line.match(/^([^=#][^=]*)=(.*)$/);
  if (m) envVars[m[1].trim()] = m[2].trim();
});
const SUPABASE_URL = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const SUPABASE_ANON_KEY = envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Erreur : NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY absent dans .env.local");
  process.exit(1);
}

const HEADERS = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
const KERNEL_KM = 1.5;
const RADIUS_KM = 5;

// Fréquentation observée -> score de base (valeurs DB constatées le 09/07/2026 :
// "Quiet" 269, "Normal" 137, "Crowded place" 45, NULL 24).
function crowdsScore(token) {
  if (!token) return null;
  if (token.includes("crowded")) return 85;
  if (token.includes("normal")) return 50;
  if (token.includes("quiet")) return 25;
  return null;
}

function haversineKm(latA, lngA, latB, lngB) {
  const R = 6371;
  const dLat = ((latB - latA) * Math.PI) / 180;
  const dLng = ((lngB - lngA) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((latA * Math.PI) / 180) * Math.cos((latB * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function fetchAll(pathAndQuery) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}&limit=1000&offset=${offset}`, { headers: HEADERS });
    if (!resp.ok) throw new Error(`PostgREST ${resp.status} sur ${pathAndQuery} : ${(await resp.text()).slice(0, 300)}`);
    const batch = await resp.json();
    out.push(...batch);
    if (batch.length < 1000) return out;
  }
}

// ── Données ──────────────────────────────────────────────────────────────────
const density = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "data", "airbnb-density.json"), "utf-8"));
const cells = density.features.map((f) => ({
  lng: f.geometry.coordinates[0],
  lat: f.geometry.coordinates[1],
  w: f.properties.w,
}));

const beaches = await fetchAll("beaches?select=slug,latitude,longitude&latitude=not.is.null");
const cbBeaches = await fetchAll("cb_places?select=latitude,longitude,crowds&place_type=eq.beach&latitude=not.is.null");
console.log(`${beaches.length} plages, ${cells.length} cellules densité, ${cbBeaches.length} plages cb_places`);

// ── Score brut : pression Airbnb pondérée par la distance ───────────────────
const raws = beaches.map((b) => {
  let raw = 0;
  for (const c of cells) {
    // préfiltre bon marché ~5 km en degrés
    if (Math.abs(c.lat - b.latitude) > 0.05 || Math.abs(c.lng - b.longitude) > 0.065) continue;
    const d = haversineKm(b.latitude, b.longitude, c.lat, c.lng);
    if (d <= RADIUS_KM) raw += c.w * Math.exp(-d / KERNEL_KM);
  }
  return { slug: b.slug, lat: b.latitude, lng: b.longitude, raw };
});

// ── Percentile 0-100 ─────────────────────────────────────────────────────────
const sorted = [...raws].map((r) => r.raw).sort((a, b) => a - b);
const percentile = (v) => Math.round((sorted.filter((x) => x < v).length / (sorted.length - 1)) * 100);

// ── Ajustement crowds cb_places (match < 1.5 km, premier token) ─────────────
function crowdsNear(lat, lng) {
  let best = null;
  let bestKm = 1.5;
  for (const c of cbBeaches) {
    if (Math.abs(c.latitude - lat) > 0.02 || Math.abs(c.longitude - lng) > 0.02) continue;
    const km = haversineKm(lat, lng, c.latitude, c.longitude);
    if (km <= bestKm) { bestKm = km; best = c.crowds; }
  }
  return best ? best.split(",")[0].trim().toLowerCase() : null;
}

const scores = {};
for (const r of raws) {
  const crowds = crowdsNear(r.lat, r.lng);
  const airbnbPct = percentile(r.raw);
  const observed = crowdsScore(crowds);
  const raw = observed !== null ? observed + (airbnbPct - 50) * 0.3 : airbnbPct;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  scores[r.slug] = {
    score,
    band: score <= 35 ? "quiet" : score <= 65 ? "moderate" : "busy",
    crowds,
  };
}

const bands = Object.values(scores).reduce((acc, s) => ((acc[s.band] = (acc[s.band] ?? 0) + 1), acc), {});
console.log("Répartition bandes :", bands);

const out = {
  generated_at: new Date().toISOString(),
  method:
    "Estimated crowd pressure, not a visitor count. Airbnb listing density (31K listings, ~2.2 km grid) within 5 km, distance-weighted (exp(-d/1.5km)), percentile-ranked across all beaches, then adjusted by the field-observed cb_places crowds attribute (Crowded +15 / Normal +5 / Quiet -5 / None -15), clamped 0-100.",
  bands: { quiet: "score <= 35", moderate: "36-65", busy: "> 65" },
  beaches: scores,
};
const outPath = path.join(ROOT, "src", "data", "beach-crowd-scores.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 1) + "\n", "utf-8");
console.log(`Écrit ${outPath} (${Object.keys(scores).length} plages)`);
