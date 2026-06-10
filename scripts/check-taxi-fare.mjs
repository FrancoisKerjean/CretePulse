// Assertions du module taxi-fare. Run: node scripts/check-taxi-fare.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { taxiFareRange, SLUG_COORDS, TAXI_TARIFF } from "../src/lib/taxi-fare.ts";

// --- couverture : chaque slug de BUS_PLACE_SLUGS a des coordonnees -----------
const pairsSrc = readFileSync(new URL("../src/lib/bus-pairs.ts", import.meta.url), "utf8");
const slugSet = new Set([...pairsSrc.matchAll(/:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]));
for (const slug of slugSet) {
  assert.ok(SLUG_COORDS[slug], `coords manquantes pour le slug "${slug}"`);
}

// --- symetrie + forme ---------------------------------------------------------
const ab = taxiFareRange("heraklion", "ierapetra");
const ba = taxiFareRange("ierapetra", "heraklion");
assert.deepEqual(ab, ba);
assert.ok(ab.low < ab.high);
assert.equal(ab.low % 5, 0);                       // arrondi aux 5 EUR
assert.equal(ab.high % 5, 0);
assert.ok(ab.km > 60 && ab.km < 120, `km Heraklion-Ierapetra: ${ab.km}`);

// --- slug inconnu -> null (jamais de prix invente) -----------------------------
assert.equal(taxiFareRange("heraklion", "atlantis"), null);

// --- plancher : course courte >= minFare ---------------------------------------
const short = taxiFareRange("malia", "stalida");
assert.ok(short.low >= TAXI_TARIFF.minFare);

// --- calibration : prix compteur reel (dist route x perKm + pickup) dans la
// fourchette, sur des distances routieres connues (Google/ViaMichelin 06/2026).
const ROAD_KM = [
  ["heraklion", "chania", 140],
  ["heraklion", "agios-nikolaos", 64],
  ["heraklion", "ierapetra", 100],
  ["heraklion", "sitia", 130],
  ["chania", "paleochora", 77],
  ["heraklion", "matala", 67],
  ["chania", "rethymno", 60],
];
for (const [a, b, roadKm] of ROAD_KM) {
  const r = taxiFareRange(a, b);
  const realMeter = roadKm * TAXI_TARIFF.perKm + TAXI_TARIFF.pickup;
  assert.ok(
    realMeter >= r.low && realMeter <= r.high,
    `${a}->${b}: compteur reel ${realMeter.toFixed(0)} hors fourchette [${r.low}, ${r.high}]`,
  );
}

console.log("OK check-taxi-fare:", slugSet.size, "slugs couverts");
