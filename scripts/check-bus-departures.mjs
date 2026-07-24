// Assertions sur fixtures synthetiques. Run: node scripts/check-bus-departures.mjs
// (Node >= 23 : importe le .ts par type-stripping)
import assert from "node:assert/strict";
import { departuresFrom, originPlaces } from "../src/lib/bus-departures.ts";

const R = (id, from, to, extra = {}) => ({
  id, operator_id: "herlas", from_place: from, to_place: to, to_slug: null,
  season: "all", duration: null, price_eur: null, price_estimated: false,
  frequency: null, departures: null, departures_by_day: null, via_stops: null,
  duration_estimated: false, source_url: "x", scraped_at: "2026-06-10", ...extra,
});

const routes = [
  R(1, "Heraklion", "Chania", { departures: ["08:00", "14:00", "20:00"], duration: "2h 50min", price_eur: 13.8 }),
  R(2, "Heraklion", "Malia", { departures: ["14:15"], duration: "45min", price_eur: 3.8 }),
  R(3, "Sitia", "Ierapetra", { departures: ["09:00"], price_eur: 4.1 }),   // autre lieu
  R(4, "Heraklion", "Rethymno", { departures: [], price_eur: 8.8 }),       // pas de depart ce jour
];

// 1) Ne renvoie que les departs DEPUIS le lieu actif, tries par heure, >= now
const wed = "2026-06-10"; // mercredi
const d = departuresFrom(routes, "Heraklion", wed, 13 * 60); // 13:00
assert.deepEqual(d.map((x) => x.time), ["14:00", "14:15", "20:00"]);
assert.equal(d[0].toPlace, "Chania");
assert.equal(d[0].minutesUntil, 60);
assert.equal(d[0].durationLabel, "2h 50min");
assert.equal(d[0].priceEur, 13.8);
assert.equal(d[0].pairSlug, "chania-to-heraklion"); // slug alpha

// 2) Aucune route d'un autre lieu ne fuite
assert.ok(d.every((x) => x.toPlace !== "Ierapetra"));

// 3) Jour futur : pas de countdown (minutesUntil null), tous les departs
const future = departuresFrom(routes, "Heraklion", "2026-06-20", null);
assert.deepEqual(future.map((x) => x.time), ["08:00", "14:00", "14:15", "20:00"]);
assert.equal(future[0].minutesUntil, null);

// 4) Plus de depart aujourd'hui -> isTomorrow + premier bus du lendemain
const late = departuresFrom(routes, "Heraklion", wed, 23 * 60, { tomorrowISO: "2026-06-11" });
assert.ok(late.length > 0, "le board vit meme tard : montre demain");
assert.ok(late.every((x) => x.isTomorrow === true));
assert.equal(late[0].minutesUntil, null);

// 5) originPlaces : lieux de depart distincts, tries
assert.deepEqual(originPlaces(routes), ["Heraklion", "Sitia"]);

console.log("OK bus-departures", d.length, future.length, late.length);
