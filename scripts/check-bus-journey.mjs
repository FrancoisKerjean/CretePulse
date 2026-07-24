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

// --- libelles de jours ektel (noms complets, plages "To", Weekend) ------------
const ektelWeek = R(5, "Chania", "Paleochora", {
  departures: ["07:30", "16:00", "10:00"],
  departures_by_day: [
    { days: "Monday To Friday", times: ["07:30", "16:00"] },
    { days: "Weekend", times: ["10:00"] },
  ],
});
assert.deepEqual(timesForDate(ektelWeek, "2026-06-09"), ["07:30", "16:00"]); // mardi
assert.deepEqual(timesForDate(ektelWeek, "2026-06-13"), ["10:00"]);          // samedi
assert.deepEqual(
  timesForDate(R(6, "A", "B", {
    departures: ["09:00"],
    departures_by_day: [{ days: "Thursday Saktouria", times: ["09:00"] }],
  }), "2026-06-11"),
  ["09:00"],
); // jeudi, libelle avec village résiduel
assert.deepEqual(
  timesForDate(R(7, "A", "B", {
    departures: ["09:00"],
    departures_by_day: [{ days: "Monday", times: ["09:00"] }],
  }), "2026-06-09"),
  [],
); // mardi != Monday

// --- R1 (16/06/2026) : enumerations a tirets vs plages, weekdays --------------
// "Mon-Wed-Fri" = ENUMERATION (3 tokens), PAS la plage Mon..Wed.
const enumMWF = R(30, "A", "B", {
  departures: ["08:00"],
  departures_by_day: [{ days: "Mon-Wed-Fri", times: ["08:00"] }],
});
assert.deepEqual(timesForDate(enumMWF, "2026-06-10"), ["08:00"]); // mercredi : inclus
assert.deepEqual(timesForDate(enumMWF, "2026-06-12"), ["08:00"]); // vendredi : inclus
assert.deepEqual(timesForDate(enumMWF, "2026-06-09"), []);        // mardi : EXCLU (etait inclus a tort)

// "Tue, Thu" = enumeration a virgule (2 tokens) -> mardi + jeudi seulement.
const enumTT = R(31, "A", "B", {
  departures: ["09:00"],
  departures_by_day: [{ days: "Tue, Thu", times: ["09:00"] }],
});
assert.deepEqual(timesForDate(enumTT, "2026-06-11"), ["09:00"]); // jeudi : inclus
assert.deepEqual(timesForDate(enumTT, "2026-06-10"), []);        // mercredi : exclu

// "Tue-Thu" = PLAGE a tiret (2 tokens) -> mar..jeu (convention transport conservee).
const rangeTT = R(32, "A", "B", {
  departures: ["09:00"],
  departures_by_day: [{ days: "Tue-Thu", times: ["09:00"] }],
});
assert.deepEqual(timesForDate(rangeTT, "2026-06-10"), ["09:00"]); // mercredi : dans la plage

// "Weekdays" = lun..ven (etait invisible tous les jours).
const wd = R(33, "A", "B", {
  departures: ["07:00"],
  departures_by_day: [{ days: "Weekdays", times: ["07:00"] }],
});
assert.deepEqual(timesForDate(wd, "2026-06-10"), ["07:00"]); // mercredi : inclus
assert.deepEqual(timesForDate(wd, "2026-06-13"), []);        // samedi : exclu
assert.deepEqual(timesForDate(wd, "2026-06-14"), []);        // dimanche : exclu

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

// --- arrets intermediaires (via_stops, 13/06/2026) -----------------------------
const viaRoutes = [
  R(20, "Chania", "Heraklion", {
    operator_id: "ektel",
    via_stops: ["Georgioupolis", "Kavros", "Rethymno", "Bali"],
    departures: ["05:15", "09:30"],
    departures_by_day: [{ days: "EVERY DAY", times: ["05:15", "09:30"] }],
    duration: "2h 30min", price_eur: 15.0,
  }),
  R(21, "Kavros", "Spili", {
    operator_id: "ektel",
    departures: ["12:00"],
    departures_by_day: [{ days: "EVERY DAY", times: ["12:00"] }],
    price_eur: 3.0,
  }),
];
const gv = buildGraph(viaRoutes);

// atteignable : les vias comptent comme destinations (direct + correspondance)
const reachVia = reachableFrom(gv, "Chania");
assert.ok(reachVia.includes("Kavros"));
assert.ok(reachVia.includes("Spili")); // Chania -> (descente Kavros) -> Spili

// direct vers un via : leg unique avec alightAt, prix inconnu (tronçon partiel)
const toKavros = findJourneys(gv, "Chania", "Kavros", "2026-06-10");
assert.equal(toKavros.length, 1);
assert.equal(toKavros[0].legs[0].alightAt, "Kavros");
assert.equal(toKavros[0].priceTotal, null);
assert.equal(toKavros[0].priceIncomplete, true);
assert.equal(toKavros[0].durationKnown, false); // duree route entiere non applicable

// direct au terminus : alightAt null, prix connu, rien ne change
const toHerakl = findJourneys(gv, "Chania", "Heraklion", "2026-06-10");
assert.equal(toHerakl[0].legs[0].alightAt, null);
assert.equal(toHerakl[0].priceTotal, 15.0);

// correspondance via descente intermediaire : hub = via, pas de filtre horaire
// (duree du tronçon partiel inconnue) -> correspondance non garantie
const toSpili = findJourneys(gv, "Chania", "Spili", "2026-06-10");
assert.equal(toSpili.length, 1);
assert.equal(toSpili[0].hub, "Kavros");
assert.equal(toSpili[0].legs[0].alightAt, "Kavros");
assert.equal(toSpili[0].legs[1].alightAt, null);
assert.deepEqual(toSpili[0].legs[1].times, ["12:00"]);
assert.equal(toSpili[0].durationKnown, false);

console.log("OK check-bus-journey: toutes les assertions passent");
