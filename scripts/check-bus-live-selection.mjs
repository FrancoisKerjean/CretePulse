// Assertions des couches sélection (durée, horloge, view-model, champs moteur).
// Run: node --experimental-strip-types scripts/check-bus-live-selection.mjs
import assert from "node:assert/strict";
import { parseDurationMin } from "../src/lib/bus-live/duration.ts";
import { clockHHMM } from "../src/lib/athens-time.ts";
import { busesAt } from "../src/lib/bus-live/position.ts";

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

// --- clockHHMM --------------------------------------------------------------
assert.equal(clockHHMM(0), "00:00");
assert.equal(clockHHMM(545), "09:05");
assert.equal(clockHHMM(1439), "23:59");
assert.equal(clockHHMM(1440), "00:00");   // minuit jour+1
assert.equal(clockHHMM(1505), "01:05");   // arrivée le lendemain
assert.equal(clockHHMM(-5), "23:55");     // borne négative

// --- moteur enrichi : origin / operatorId / pairSlug / etaMinTerminus -------
const line = {
  id: 7, code: "LAS-07", codeOfficial: null, source: "osm",
  totalMinutes: 60, lengthKm: 40, partialGeo: false,
  geometry: [[25.10, 35.00], [25.50, 35.20]],
  stops: [
    { seq: 0, slug: "agios-nikolaos", name: "Agios Nikolaos", lat: 35.00, lng: 25.10, cumKm: 0, cumMin: 0 },
    { seq: 1, slug: "heraklion", name: "Heraklion", lat: 35.20, lng: 25.50, cumKm: 40, cumMin: 60 },
  ],
};
const baseRoute = {
  id: 1, line_id: 7, operator_id: "herlas", from_place: "Agios Nikolaos", to_place: "Heraklion",
  to_slug: null, via_stops: null, season: "all", duration: "45min", duration_estimated: false,
  price_eur: null, price_estimated: false, frequency: null,
  departures: ["09:00"], departures_by_day: [{ days: "EVERY DAY", times: ["09:00"] }],
  source_url: "x", scraped_at: "2026-06-10",
};
const net = { lines: new Map([[7, line]]), routes: [baseRoute] };
const [bus] = busesAt({ iso: "2026-06-15", minutes: 562 }, net); // 09:22
assert.equal(bus.origin, "Agios Nikolaos");
assert.equal(bus.operatorId, "herlas");
assert.equal(bus.pairSlug, "agios-nikolaos-to-heraklion");
assert.equal(bus.durationEstimated, false);
assert.equal(bus.etaMinTerminus, 23); // toMin(09:00)=540 + 45 - 562 = 23

const net2 = { lines: new Map([[7, line]]), routes: [{ ...baseRoute, id: 2, to_place: "Elounda", duration: null, duration_estimated: null }] };
const [bus2] = busesAt({ iso: "2026-06-15", minutes: 562 }, net2);
assert.equal(bus2.pairSlug, null);        // "Elounda" absent de BUS_PLACE_SLUGS (clé = "Eloynta")
assert.equal(bus2.etaMinTerminus, null);
assert.equal(bus2.durationEstimated, false); // null ?? false

console.log("OK check-bus-live-selection: toutes les assertions passent");
