#!/usr/bin/env node
// Sanity check du référentiel GTFS — pur, lit out/gtfs/{stops.txt,build-stats.json},
// aucune dépendance DB/secret. Run: node scripts/check-gtfs-stops.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "scrapers", "buses", "out", "gtfs");
const BBOX = { latMin: 34.70, latMax: 35.75, lngMin: 23.40, lngMax: 26.40 };

let fail = 0;
const err = (m) => { console.error("FAIL:", m); fail++; };

const stats = JSON.parse(readFileSync(join(OUT, "build-stats.json"), "utf-8"));
const txt = readFileSync(join(OUT, "stops.txt"), "utf-8").trim().split("\n");
const header = txt[0];
const rows = txt.slice(1);

if (header !== "stop_id,stop_name,stop_lat,stop_lon") err(`header inattendu: ${header}`);
if (rows.length !== stats.geocoded) err(`stops.txt ${rows.length} lignes != geocoded ${stats.geocoded}`);

for (const line of rows) {
  // lat/lon = 2 derniers champs (toujours numériques, sans virgule) ; stop_id = 1er (slug, sans virgule).
  const parts = line.split(",");
  const lon = parseFloat(parts[parts.length - 1]);
  const lat = parseFloat(parts[parts.length - 2]);
  if (!parts[0]) err(`stop_id vide: ${line}`);
  if (!(lat >= BBOX.latMin && lat <= BBOX.latMax)) err(`lat hors Crète: ${line}`);
  if (!(lon >= BBOX.lngMin && lon <= BBOX.lngMax)) err(`lng hors Crète: ${line}`);
}

console.log(
  `gtfs_stops: ${stats.total_stops} arrêts, ${stats.geocoded} géocodés ` +
  `(${stats.coverage_pct}%), ${stats.needs_review} needs_review, ${stats.dropped_count} droppés.`,
);
if (stats.coverage_pct < 60) console.warn(`WARN couverture ${stats.coverage_pct}% < 60% (référentiel à compléter)`);
process.exit(fail ? 1 : 0);
