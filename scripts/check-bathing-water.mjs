// Assertions du module bathing-water. Run: node scripts/check-bathing-water.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getBathingWaterQuality,
  BATHING_SEASON,
  BATHING_SOURCE,
} from "../src/lib/bathing-water.ts";

const data = JSON.parse(
  readFileSync(new URL("../src/data/bathing-water-crete-2025.json", import.meta.url), "utf8"),
);
const sites = data.sites;
const excellent = sites.find((s) => s.status === "Excellent");
const preveli = sites.find((s) => /PREVELI/i.test(s.name)); // Good (rétrogradé 2025)
const chrysi = sites.find((s) => /CHRYSI/i.test(s.name)); // Not classified
assert.ok(excellent && preveli && chrysi, "fixtures EEA introuvables dans le JSON");

// --- match exact sur un point EEA (distance 0) --------------------------------
const exa = getBathingWaterQuality(excellent.lat, excellent.lon, excellent.name);
assert.ok(exa, "un point EEA exact doit matcher");
assert.equal(exa.status, "excellent");
assert.equal(exa.season, BATHING_SEASON);
assert.equal(exa.source, BATHING_SOURCE);
assert.ok(exa.siteName, "siteName renseigné");

// --- statut réel transmis (Préveli = Good, pas Excellent) ---------------------
const pre = getBathingWaterQuality(preveli.lat, preveli.lon, preveli.name);
assert.ok(pre, "Préveli doit matcher");
assert.equal(pre.status, "good", "Préveli est classée Good en 2025, jamais Excellent");

// --- "Not classified" (îlot Chrysí) => pas de badge (null) --------------------
assert.equal(
  getBathingWaterQuality(chrysi.lat, chrysi.lon, chrysi.name),
  null,
  "un site non classé ne doit PAS produire de badge",
);

// --- coords absentes => null (jamais inventé) ---------------------------------
assert.equal(getBathingWaterQuality(null, null, "X"), null);
assert.equal(getBathingWaterQuality(undefined, 25, "X"), null);

// --- point loin de toute zone (massif du Psiloritis, ~16 km de la côte) => null
assert.equal(
  getBathingWaterQuality(35.23, 24.77, "Psiloritis"),
  null,
  "un point intérieur ne doit matcher aucune zone côtière",
);

// --- la règle "nom" ne contourne jamais le plafond de distance ----------------
// Point intérieur nommé comme une vraie plage : reste null (au-delà de 2.5 km).
assert.equal(
  getBathingWaterQuality(35.23, 24.77, preveli.name),
  null,
  "un nom partagé ne doit pas matcher à >2.5 km",
);

// --- récupération par nom dans la bande 0.7–2.5 km ----------------------------
// ~1.3 km au nord de Préveli, même nom => doit matcher Préveli (Good) par nom.
const off = getBathingWaterQuality(preveli.lat + 0.012, preveli.lon, "Preveli palm beach");
assert.ok(off, "récupération par nom attendue à ~1.3 km");
assert.ok(/PREVELI/i.test(off.siteName), `siteName attendu PREVELI, reçu ${off?.siteName}`);

// --- même point, nom étranger => pas de match (ni distance ni nom) ------------
assert.equal(
  getBathingWaterQuality(preveli.lat + 0.012, preveli.lon, "Somewhere unrelated cove"),
  null,
  "sans recoupement de nom et au-delà de 0.7 km, pas de badge",
);

console.log("OK check-bathing-water:", sites.length, "zones,", data.season, "saison");
