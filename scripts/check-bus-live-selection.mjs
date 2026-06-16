// Assertions des couches sélection (durée, horloge, view-model, champs moteur).
// Run: node --experimental-strip-types scripts/check-bus-live-selection.mjs
import assert from "node:assert/strict";
import { parseDurationMin } from "../src/lib/bus-live/duration.ts";

// --- parseDurationMin -------------------------------------------------------
assert.equal(parseDurationMin("2h 30min"), 150);
assert.equal(parseDurationMin("2h30"), 150);
assert.equal(parseDurationMin("1h45"), 105);
assert.equal(parseDurationMin("1h"), 60);
assert.equal(parseDurationMin("1h30min"), 90);
assert.equal(parseDurationMin("20min"), 20);
assert.equal(parseDurationMin("45 min"), 45);
assert.equal(parseDurationMin(null), null);
assert.equal(parseDurationMin(""), null);
assert.equal(parseDurationMin("abc"), null);

console.log("OK check-bus-live-selection: toutes les assertions passent");
