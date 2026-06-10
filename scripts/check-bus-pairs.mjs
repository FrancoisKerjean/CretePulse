// Assertions du module bus-pairs. Run: node scripts/check-bus-pairs.mjs
import assert from "node:assert/strict";
import {
  slugifyPlace, pairSlug, eligiblePairs, pairRoutes, onwardPlaces,
} from "../src/lib/bus-pairs.ts";

const R = (id, from, to) => ({ id, from_place: from, to_place: to });

// --- slugs --------------------------------------------------------------
assert.equal(slugifyPlace("Heraklion"), "heraklion");
assert.equal(slugifyPlace("Makry Gyalos"), "makry-gyalos");
assert.equal(slugifyPlace("Plaka(Ag.Nikolaos)"), "plaka");
assert.equal(slugifyPlace("A1 Super Market"), null);          // pas digne -> null
// slug stable quel que soit le sens (ordre alphabetique des slugs)
assert.equal(pairSlug("Heraklion", "Ierapetra"), "heraklion-to-ierapetra");
assert.equal(pairSlug("Ierapetra", "Heraklion"), "heraklion-to-ierapetra");
assert.equal(pairSlug("Chania", "A1 Super Market"), null);    // un bout indigne -> null

// --- eligibilite ----------------------------------------------------------
const routes = [
  R(1, "Heraklion", "Ierapetra"),
  R(2, "Ierapetra", "Heraklion"),                 // retour -> meme page
  R(3, "Heraklion", "Stella Blue-(Analipsis Hotels)"), // hotel -> exclu
  R(4, "Chania", "Paleochora"),
  R(5, "Chania", "Chania"),                       // self-loop -> exclu
];
const pairs = eligiblePairs(routes);
const slugs = pairs.map((p) => p.slug).sort();
assert.deepEqual(slugs, ["chania-to-paleochora", "heraklion-to-ierapetra"]);
const hi = pairs.find((p) => p.slug === "heraklion-to-ierapetra");
assert.equal(hi.placeA, "Heraklion");             // ordre alphabetique des slugs
assert.equal(hi.placeB, "Ierapetra");

// --- lookup aller/retour ----------------------------------------------------
const pr = pairRoutes(routes, "heraklion-to-ierapetra");
assert.equal(pr.outbound.length, 1);              // Heraklion -> Ierapetra
assert.equal(pr.outbound[0].id, 1);
assert.equal(pr.inbound.length, 1);               // Ierapetra -> Heraklion
assert.equal(pr.inbound[0].id, 2);
assert.equal(pairRoutes(routes, "x-to-y"), null);

// --- onward ------------------------------------------------------------------
const onward = onwardPlaces(routes, "Heraklion", "Ierapetra");
assert.ok(!onward.includes("Ierapetra"));         // exclut l'autre bout de la paire
assert.ok(!onward.includes("Stella Blue-(Analipsis Hotels)")); // indigne exclu

console.log("OK check-bus-pairs:", pairs.length, "paires sur fixtures");
