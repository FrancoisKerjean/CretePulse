// Génère public/data/airbnb-density.json : heatmap densité touristique Airbnb
// Utilisation : node scripts/build-airbnb-density.mjs
// Pattern : parse .env.local, pagine PostgREST par batchs de 1000, agrège sur grille 0.02°

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Parse .env.local ────────────────────────────────────────────────────────
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
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

// ── Constantes ───────────────────────────────────────────────────────────────
const TABLE = "airbnb_listings";
const BATCH = 1000;
// Grille initiale 0.02°
let GRID = 0.02;
// BBox Crète approximative
const CRETE_BBOX = { minLat: 34.7, maxLat: 35.8, minLng: 23.3, maxLng: 26.5 };

// ── Helpers ──────────────────────────────────────────────────────────────────
function postgrestUrl(offset) {
  const base = `${SUPABASE_URL}/rest/v1/${TABLE}`;
  // latitude et longitude not null, sélection minimale
  const params = new URLSearchParams({
    select: "latitude,longitude",
    "latitude": "not.is.null",
    "longitude": "not.is.null",
    limit: BATCH,
    offset,
  });
  // PostgREST filtre not null via query param col=not.is.null
  return `${base}?select=latitude,longitude&latitude=not.is.null&longitude=not.is.null&limit=${BATCH}&offset=${offset}`;
}

async function fetchBatch(offset) {
  const url = postgrestUrl(offset);
  const resp = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`PostgREST erreur ${resp.status} (offset=${offset}) : ${body.substring(0, 300)}`);
  }
  return resp.json();
}

// ── Vérification des noms de colonnes ────────────────────────────────────────
async function detectColumns() {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?select=*&limit=1`;
  const resp = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Impossible d'accéder à la table (${resp.status}) : ${body.substring(0, 300)}`);
  }
  const rows = await resp.json();
  if (!rows || rows.length === 0) {
    throw new Error("Table vide ou inaccessible.");
  }
  const cols = Object.keys(rows[0]);
  console.log(`Colonnes détectées (${cols.length}) : ${cols.slice(0, 10).join(", ")}...`);

  // Détecter lat/lng
  const latCol = cols.find((c) => /^lat(itude)?$/i.test(c));
  const lngCol = cols.find((c) => /^lon(g(itude)?)?$/i.test(c));

  if (!latCol || !lngCol) {
    throw new Error(
      `Colonnes lat/lng non trouvées. Colonnes disponibles : ${cols.join(", ")}`
    );
  }
  console.log(`Colonnes lat/lng : "${latCol}" / "${lngCol}"`);
  return { latCol, lngCol };
}

// ── Agrégation sur grille ────────────────────────────────────────────────────
function cellKey(lat, lng, grid) {
  const cellLat = Math.round(lat / grid) * grid;
  const cellLng = Math.round(lng / grid) * grid;
  return `${cellLat.toFixed(6)}_${cellLng.toFixed(6)}`;
}

function buildDensityMap(rows, grid) {
  const cells = {};
  let skipped = 0;
  for (const row of rows) {
    const lat = parseFloat(row.latitude ?? row.lat ?? row.Latitude);
    const lng = parseFloat(row.longitude ?? row.lon ?? row.lng ?? row.Longitude);
    if (isNaN(lat) || isNaN(lng)) { skipped++; continue; }
    // Filtre BBox Crète
    if (lat < CRETE_BBOX.minLat || lat > CRETE_BBOX.maxLat ||
        lng < CRETE_BBOX.minLng || lng > CRETE_BBOX.maxLng) {
      skipped++;
      continue;
    }
    const key = cellKey(lat, lng, grid);
    cells[key] = (cells[key] || 0) + 1;
  }
  if (skipped > 0) console.log(`  ${skipped} lignes hors BBox ou sans coordonnées ignorées.`);
  return cells;
}

function cellsToGeoJSON(cells, grid) {
  const features = Object.entries(cells).map(([key, w]) => {
    const [latStr, lngStr] = key.split("_");
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [
          Math.round(lng * 10000) / 10000,
          Math.round(lat * 10000) / 10000,
        ],
      },
      properties: { w },
    };
  });
  return { type: "FeatureCollection", features };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== build-airbnb-density.mjs ===`);
  console.log(`Supabase URL : ${SUPABASE_URL}`);
  console.log(`Table : ${TABLE}\n`);

  // 1. Vérification colonnes
  const { latCol, lngCol } = await detectColumns();

  // 2. Pagination de toute la table
  console.log(`Paginage par batchs de ${BATCH}...`);
  const allRows = [];
  let offset = 0;
  let iteration = 0;

  while (true) {
    const rows = await fetchBatch(offset);
    if (!rows || rows.length === 0) break;
    allRows.push(...rows);
    offset += rows.length;
    iteration++;
    if (iteration % 10 === 0 || rows.length < BATCH) {
      console.log(`  ${allRows.length} lignes récupérées...`);
    }
    if (rows.length < BATCH) break;
  }

  console.log(`\nTotal lignes récupérées : ${allRows.length}`);

  // 3. Agrégation
  console.log(`\nAgrégation sur grille ${GRID}°...`);
  let cells = buildDensityMap(allRows, GRID);
  const maxW = Math.max(...Object.values(cells));
  const totalInCells = Object.values(cells).reduce((a, b) => a + b, 0);

  // 4. Vérifier taille estimée (compact JSON ~60B/feature)
  const estimatedKB = (Object.keys(cells).length * 70) / 1024;
  if (estimatedKB > 500) {
    console.log(`Grille 0.02° → ~${estimatedKB.toFixed(0)} KB > 500 KB. Passage à 0.03°...`);
    GRID = 0.03;
    cells = buildDensityMap(allRows, GRID);
  }

  // 5. GeoJSON
  const geojson = cellsToGeoJSON(cells, GRID);

  // 6. Écriture
  const outDir = path.join(__dirname, "..", "public", "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "airbnb-density.json");
  fs.writeFileSync(outPath, JSON.stringify(geojson));

  const stats = fs.statSync(outPath);
  const sizeKB = (stats.size / 1024).toFixed(1);

  // 7. Résumé
  console.log(`\n=== Résultats ===`);
  console.log(`Colonnes lat/lng           : "${latCol}" / "${lngCol}"`);
  console.log(`Listings traités           : ${allRows.length}`);
  console.log(`Listings dans la bbox Crète: ${totalInCells}`);
  console.log(`Nombre de cellules         : ${geojson.features.length}`);
  console.log(`Poids max (w)              : ${maxW}`);
  console.log(`Grille utilisée            : ${GRID}°`);
  console.log(`Taille fichier             : ${sizeKB} KB`);
  console.log(`Chemin                     : public/data/airbnb-density.json`);

  // 8. Sanity check géographique
  let outOfBbox = 0;
  for (const f of geojson.features) {
    const [lng, lat] = f.geometry.coordinates;
    if (lat < CRETE_BBOX.minLat || lat > CRETE_BBOX.maxLat ||
        lng < CRETE_BBOX.minLng || lng > CRETE_BBOX.maxLng) {
      outOfBbox++;
    }
  }
  if (outOfBbox > 0) {
    console.warn(`AVERTISSEMENT : ${outOfBbox} cellules hors BBox Crète (devrait être 0)`);
  } else {
    console.log(`Sanity check BBox Crète    : OK (0 cellule hors bbox)`);
  }

  console.log(`\nFichier prêt : ${outPath}\n`);
}

main().catch((err) => {
  console.error("Erreur fatale :", err.message);
  process.exit(1);
});
