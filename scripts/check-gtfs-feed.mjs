// scripts/check-gtfs-feed.mjs
// Sanity check du flux GTFS (étape C) : intégrité référentielle + monotonie.
// Usage: node scripts/check-gtfs-feed.mjs [out/gtfs]
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = process.argv[2] || "scripts/scrapers/buses/out/gtfs";
const CRETE = { latMin: 34.70, latMax: 35.75, lngMin: 23.40, lngMax: 26.40 };

function parseCsv(name) {
  const text = readFileSync(join(DIR, name), "utf-8").replace(/\r/g, "");
  const lines = text.split("\n").filter((l) => l.length > 0);
  const header = splitRow(lines[0]);
  return lines.slice(1).map((l) => Object.fromEntries(splitRow(l).map((v, i) => [header[i], v])));
}
// split RFC4180 minimal (gère les champs entre guillemets avec virgules)
function splitRow(line) {
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const errors = [];
const stops = parseCsv("stops.txt");
const routes = parseCsv("routes.txt");
const trips = parseCsv("trips.txt");
const calendar = parseCsv("calendar.txt");
const stopTimes = parseCsv("stop_times.txt");

const stopIds = new Set(stops.map((s) => s.stop_id));
const routeIds = new Set(routes.map((r) => r.route_id));
const serviceIds = new Set(calendar.map((c) => c.service_id));
const tripIds = new Set(trips.map((t) => t.trip_id));

// intégrité référentielle
for (const t of trips) {
  if (!routeIds.has(t.route_id)) errors.push(`trip ${t.trip_id}: route_id inconnu ${t.route_id}`);
  if (!serviceIds.has(t.service_id)) errors.push(`trip ${t.trip_id}: service_id inconnu ${t.service_id}`);
}
for (const st of stopTimes) {
  if (!stopIds.has(st.stop_id)) errors.push(`stop_times: stop_id inconnu ${st.stop_id}`);
  if (!tripIds.has(st.trip_id)) errors.push(`stop_times: trip_id inconnu ${st.trip_id}`);
}

// coords des stops dans la bbox Crète
for (const s of stops) {
  const lat = parseFloat(s.stop_lat), lng = parseFloat(s.stop_lon);
  if (!(lat >= CRETE.latMin && lat <= CRETE.latMax && lng >= CRETE.lngMin && lng <= CRETE.lngMax))
    errors.push(`stop ${s.stop_id}: coords hors bbox Crète (${lat},${lng})`);
}

// >=2 stop_times par trip + temps non-décroissants (ordre stop_sequence)
const byTrip = new Map();
for (const st of stopTimes) {
  if (!byTrip.has(st.trip_id)) byTrip.set(st.trip_id, []);
  byTrip.get(st.trip_id).push(st);
}
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
for (const [tripId, sts] of byTrip) {
  if (sts.length < 2) errors.push(`trip ${tripId}: <2 stop_times`);
  sts.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
  for (let i = 1; i < sts.length; i++)
    if (toMin(sts[i].departure_time) < toMin(sts[i - 1].departure_time))
      errors.push(`trip ${tripId}: temps décroissant à seq ${sts[i].stop_sequence}`);
}

console.log(`stops=${stops.length} routes=${routes.length} trips=${trips.length} ` +
            `services=${calendar.length} stop_times=${stopTimes.length}`);
if (errors.length) {
  console.error(`FAIL: ${errors.length} erreur(s)`);
  for (const e of errors.slice(0, 50)) console.error("  - " + e);
  process.exit(1);
}
console.log("OK: intégrité référentielle + monotonie + bbox validées");
