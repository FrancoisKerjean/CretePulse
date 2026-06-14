// Assertions du moteur bus-live. Run: node scripts/check-bus-live.mjs
// (Node >= 23 : importe le .ts par type-stripping)
import assert from "node:assert/strict";
import { normalizePlace, placeSimilarity } from "../src/lib/bus-live/position.ts";

// --- normalisation ----------------------------------------------------------
assert.equal(normalizePlace("Chaniá"), "chania");
assert.equal(normalizePlace("Áno Vianno!"), "ano vianno");
assert.equal(normalizePlace("Agios   Nikolaos"), "agios nikolaos");

// --- similarité (tolérante Chania/Khania, départage 2 candidats) -------------
assert.ok(placeSimilarity("Chania", "Khania") > 0.6);     // graphies divergentes
assert.ok(placeSimilarity("Chania", "Chania") === 1);     // identique
assert.ok(placeSimilarity("Chania", "Sitia") < 0.3);      // sans rapport
assert.ok(
  placeSimilarity("Agios Nikolaos", "Agios Nikolaos") >
  placeSimilarity("Agios Nikolaos", "Sitia"),
);

console.log("OK check-bus-live: toutes les assertions passent");
