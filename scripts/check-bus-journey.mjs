// Assertions sur fixtures synthetiques. Run: node scripts/check-bus-journey.mjs
// (Node >= 23 : importe le .ts par type-stripping)
import assert from "node:assert/strict";
import {
  dayToken, timesForDate, parseDurationMin, addMinutes,
  buildGraph, reachableFrom, findJourneys,
} from "../src/lib/bus-journey.ts";

const R = (id, from, to, extra = {}) => ({
  id, operator_id: "herlas", from_place: from, to_place: to, to_slug: null,
  season: "all", duration: null, price_eur: null, price_estimated: false,
  frequency: null, departures: null, departures_by_day: null,
  source_url: "x", scraped_at: "2026-06-10", ...extra,
});

// --- helpers date/heure -----------------------------------------------------
assert.equal(dayToken("2026-06-14"), "Sun");
assert.equal(dayToken("2026-06-10"), "Wed");
assert.equal(parseDurationMin("2h 30min"), 150);
assert.equal(parseDurationMin("50min"), 50);
assert.equal(parseDurationMin("1h"), 60);
assert.equal(parseDurationMin(null), null);
assert.equal(addMinutes("08:30", 105), "10:15");

// --- horaires du jour --------------------------------------------------------
const weekSun = R(1, "Heraklion", "Ierapetra", {
  departures: ["07:00", "09:00", "18:00"],
  departures_by_day: [
    { days: "Mon, Tue, Wed, Thu, Fri, Sat", times: ["07:00", "09:00"] },
    { days: "Sun", times: ["18:00"] },
  ],
});
assert.deepEqual(timesForDate(weekSun, "2026-06-10"), ["07:00", "09:00"]); // mercredi
assert.deepEqual(timesForDate(weekSun, "2026-06-14"), ["18:00"]);          // dimanche
assert.deepEqual(
  timesForDate(R(2, "A", "B", { departures: ["10:00"] }), "2026-06-10"),
  ["10:00"],
); // fallback flat
assert.deepEqual(
  timesForDate(R(3, "A", "B", {
    departures: ["06:00"],
    departures_by_day: [{ days: "EVERY DAY", times: ["06:00"] }],
  }), "2026-06-14"),
  ["06:00"],
);
assert.deepEqual(
  timesForDate(R(4, "A", "B", {
    departures: ["06:00"],
    departures_by_day: [{ days: "Mon-Fri", times: ["06:00"] }],
  }), "2026-06-13"),
  [],
); // samedi hors plage Mon-Fri

// --- graphe / atteignabilite -------------------------------------------------
const routes = [
  R(10, "Makry Gyalos", "Ierapetra", {
    departures: ["08:00", "14:00"],
    departures_by_day: [{ days: "EVERY DAY", times: ["08:00", "14:00"] }],
    duration: "40min", price_eur: 4.1,
  }),
  R(11, "Ierapetra", "Heraklion", {
    departures: ["07:30", "09:30", "15:30"],
    departures_by_day: [{ days: "EVERY DAY", times: ["07:30", "09:30", "15:30"] }],
    price_eur: 12.1,
  }),
  R(12, "Heraklion", "Ierapetra", {
    departures: ["08:15"],
    departures_by_day: [{ days: "EVERY DAY", times: ["08:15"] }],
    price_eur: 12.1,
  }),
  R(13, "Heraklion", "Mochos", {
    departures: ["11:00"],
    departures_by_day: [{ days: "Mon, Tue, Wed, Thu, Fri, Sat", times: ["11:00"] }],
    price_eur: 4.6, price_estimated: true,
  }),
];
const g = buildGraph(routes);

const reach = reachableFrom(g, "Makry Gyalos");
assert.ok(reach.includes("Ierapetra"));           // direct
assert.ok(reach.includes("Heraklion"));           // 1 correspondance
assert.ok(!reach.includes("Makry Gyalos"));       // pas soi-meme

// --- direct ------------------------------------------------------------------
const direct = findJourneys(g, "Heraklion", "Ierapetra", "2026-06-10");
assert.equal(direct.length, 1);
assert.equal(direct[0].legs.length, 1);
assert.deepEqual(direct[0].legs[0].times, ["08:15"]);
assert.equal(direct[0].priceTotal, 12.1);
assert.equal(direct[0].priceEstimated, false);

// --- correspondance avec marge 15 min ----------------------------------------
const via = findJourneys(g, "Makry Gyalos", "Heraklion", "2026-06-10");
assert.equal(via.length, 1);
assert.equal(via[0].hub, "Ierapetra");
assert.equal(via[0].legs.length, 2);
// arrivee 08:40 (+15 min marge = 08:55) -> 09:30 et 15:30 valides, pas 07:30
assert.deepEqual(via[0].legs[1].times, ["09:30", "15:30"]);
assert.equal(via[0].priceTotal, 16.2);
assert.equal(via[0].durationKnown, true);

// --- pas de service ce jour --------------------------------------------------
assert.equal(findJourneys(g, "Heraklion", "Mochos", "2026-06-14").length, 0); // dimanche
// --- prix estime propage -----------------------------------------------------
const est = findJourneys(g, "Heraklion", "Mochos", "2026-06-10");
assert.equal(est[0].priceEstimated, true);
// --- inconnu -----------------------------------------------------------------
assert.equal(findJourneys(g, "Heraklion", "Nulle Part", "2026-06-10").length, 0);

console.log("OK check-bus-journey: toutes les assertions passent");
