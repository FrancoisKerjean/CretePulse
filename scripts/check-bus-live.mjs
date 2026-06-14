// Assertions du moteur bus-live. Run: node scripts/check-bus-live.mjs
// (Node >= 23 : importe le .ts par type-stripping)
import assert from "node:assert/strict";
import {
  normalizePlace, placeSimilarity, orientRoute, elapsedToKm, kmToPoint,
} from "../src/lib/bus-live/position.ts";

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

// fixture ligne synthétique LAS-07 (Agios Nikolaos seq0 .. Elounda seq4)
const lineLAS07 = {
  id: 7, code: "LAS-07", codeOfficial: null, source: "osm",
  totalMinutes: 37, lengthKm: 10.0, partialGeo: false,
  geometry: [[25.71, 35.19], [25.72, 35.22], [25.73, 35.25]],
  stops: [
    { seq: 0, slug: "agios-nikolaos", name: "Agios Nikolaos", lat: 35.19, lng: 25.71, cumKm: 0.0, cumMin: 0 },
    { seq: 1, slug: "ammoudara", name: "Ammoudara", lat: 35.20, lng: 25.715, cumKm: 0.4, cumMin: 1 },
    { seq: 2, slug: "ellinika", name: "Ellinika", lat: 35.21, lng: 25.72, cumKm: 5.9, cumMin: 22 },
    { seq: 3, slug: "schisma", name: "Schisma", lat: 35.245, lng: 25.725, cumKm: 8.0, cumMin: 30 },
    { seq: 4, slug: "elounda", name: "Elounda", lat: 35.25, lng: 25.73, cumKm: 10.0, cumMin: 37 },
  ],
};
const R = (id, from, to, extra = {}) => ({
  id, line_id: extra.line_id ?? null, operator_id: "herlas", from_place: from, to_place: to,
  to_slug: null, via_stops: null, season: "all", duration: null, duration_estimated: false,
  price_eur: null, price_estimated: false, frequency: null, departures: null,
  departures_by_day: null, source_url: "x", scraped_at: "2026-06-10", ...extra,
});

// sens AVANT : from ≈ seq0
const fwd = orientRoute(R(1, "Agios Nikolaos", "Elounda", { line_id: 7 }), lineLAS07);
assert.equal(fwd.reversed, false);
assert.deepEqual(fwd.profMin, [0, 1, 22, 30, 37]);
assert.deepEqual(fwd.profKm, [0.0, 0.4, 5.9, 8.0, 10.0]);
assert.equal(fwd.orientedStops[0].name, "Agios Nikolaos");

// sens ARRIÈRE : from ≈ seq4 (Elounda) → profil miroité
const rev = orientRoute(R(2, "Elounda", "Agios Nikolaos", { line_id: 7 }), lineLAS07);
assert.equal(rev.reversed, true);
assert.deepEqual(rev.profMin, [0, 7, 15, 36, 37]);          // 37-37,37-30,37-22,37-1,37-0
assert.deepEqual(rev.profKm, [0.0, 2.0, 4.1, 9.6, 10.0]);   // 10-10,10-8,10-5.9,10-0.4,10-0
assert.equal(rev.orientedStops[0].name, "Elounda");
assert.equal(rev.lengthKm, 10.0);

const pm = [0, 1, 22, 30, 37];
const pk = [0.0, 0.4, 5.9, 8.0, 10.0];
assert.equal(elapsedToKm(0, pm, pk), 0.0);            // borne basse
assert.equal(elapsedToKm(37, pm, pk), 10.0);          // borne haute
assert.equal(elapsedToKm(-5, pm, pk), 0.0);           // clamp avant départ
assert.equal(elapsedToKm(99, pm, pk), 10.0);          // clamp après arrivée
assert.equal(elapsedToKm(22, pm, pk), 5.9);           // pile sur Ellinika
assert.ok(Math.abs(elapsedToKm(26, pm, pk) - 6.95) < 1e-9); // entre Ellinika et Schisma

// polyline N-S le long de lng=25 (geometry en [lng,lat]) : 3 points
// segment 0: (25,35.0)->(25,35.1) ≈ 11.12 km ; segment 1: ->(25,35.2) ≈ 11.12 km
const geo = [[25, 35.0], [25, 35.1], [25, 35.2]];
const p0 = kmToPoint(geo, 0);
assert.ok(Math.abs(p0.lat - 35.0) < 1e-6 && Math.abs(p0.lng - 25) < 1e-6);
const pHalf = kmToPoint(geo, 5.56);             // ~moitié du 1er segment
assert.ok(pHalf.lat > 35.04 && pHalf.lat < 35.06);
assert.ok(pHalf.bearing < 1 || pHalf.bearing > 359); // plein nord ≈ 0°
const pSeg2 = kmToPoint(geo, 16.7);             // dans le 2e segment
assert.ok(pSeg2.lat > 35.14 && pSeg2.lat < 35.16);
const pEnd = kmToPoint(geo, 999);               // au-delà → dernier point
assert.ok(Math.abs(pEnd.lat - 35.2) < 1e-6);

console.log("OK check-bus-live: toutes les assertions passent");
