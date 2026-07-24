// Assertions sur fixtures synthétiques. Run: node scripts/check-match-geo.mjs
// (Node >= 23 : importe le .ts par type-stripping)
import assert from "node:assert/strict";
import { nearSlugs, sampleDeck, NEAR_RATIO } from "../src/lib/match-scoring.ts";

const P = (slug, lat, lon, type = "beach") => ({
  slug, name: slug, place_type: type, prefecture: null, rating: 4,
  water_color: null, sand_type: null, crowds: null,
  latitude: lat, longitude: lon, photos: ["x.jpg"],
});

// Grappe Makrigialos (35.04, 25.97) : 30 lieux à <5 km, 30 lieux à ~200 km (ouest)
const nearPool = Array.from({ length: 30 }, (_, i) => P(`near-${i}`, 35.04 + i * 0.001, 25.97));
const farPool = Array.from({ length: 30 }, (_, i) => P(`far-${i}`, 35.5, 23.6 + i * 0.001, "gorge"));
const pool = [...nearPool, ...farPool];
const here = { lat: 35.04, lon: 25.97 };

// --- nearSlugs : rayon 40 km suffit (30 lieux >= 25) ------------------------
const near = nearSlugs(pool, here);
assert.equal(near.size, 30);
assert.ok(near.has("near-0") && !near.has("far-0"));

// --- nearSlugs : rayon adaptatif — min introuvable => Set vide ---------------
assert.equal(nearSlugs(farPool, here, [40, 70, 100], 25).size, 0);
// 12 lieux proches, min 10 => premier rayon les couvre
assert.equal(nearSlugs(nearPool.slice(0, 12), here, [40, 70, 100], 10).size, 12);

// --- nearSlugs : lieux sans coordonnées ignorés ------------------------------
const noCoords = [...nearPool, P("nocoord", null, null)];
assert.ok(!nearSlugs(noCoords, here).has("nocoord"));

// --- sampleDeck near : ~65 % du deck vient du set near -----------------------
for (let run = 0; run < 5; run++) {
  const deck = sampleDeck(pool, 40, new Set(), undefined, near);
  assert.equal(deck.length, 40);
  const nearCount = deck.filter((p) => near.has(p.slug)).length;
  assert.equal(nearCount, Math.round(40 * NEAR_RATIO)); // 26
}

// --- sampleDeck near : complétion croisée si far insuffisant -----------------
const tinyFar = [...nearPool, P("lonely-far", 35.5, 23.6, "gorge")];
const deckTiny = sampleDeck(tinyFar, 31, new Set(), undefined, nearSlugs(tinyFar, here));
assert.equal(deckTiny.length, 31); // 30 near + 1 far, complétion par les near

// --- sampleDeck near : seen exclus, pas de doublon ---------------------------
const seen = new Set(["near-0", "far-0"]);
const deckSeen = sampleDeck(pool, 40, seen, undefined, near);
assert.ok(!deckSeen.some((p) => seen.has(p.slug)));
assert.equal(new Set(deckSeen.map((p) => p.slug)).size, deckSeen.length);

// --- sampleDeck near × preferred : la pondération intérêts survit ------------
const deckPref = sampleDeck(pool, 40, new Set(), new Set(["beach"]), near);
// les near sont tous beach => la moitié near reste majoritairement beach
assert.ok(deckPref.filter((p) => p.place_type === "beach").length >= 26);

// --- rétro-compat : sans near, comportement existant intact ------------------
const deckNoGeo = sampleDeck(pool, 40, new Set(), new Set(["beach"]));
assert.equal(deckNoGeo.length, 40);
assert.ok(deckNoGeo.filter((p) => p.place_type === "beach").length >= 28); // ~75 %

console.log("check-match-geo: OK");
