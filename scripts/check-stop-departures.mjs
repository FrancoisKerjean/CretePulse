// Assertions du moteur arrêt-centré. Run: node --experimental-strip-types scripts/check-stop-departures.mjs
import assert from "node:assert/strict";
import { stopDepartures } from "../src/lib/stop-departures.ts";

// Ligne synthétique L1 : A(0) → M(30) → B(60) → C(90). total 90 min.
// Route R1 A→B (durée réelle 40min) ; R2 B→A (40min) ; R3 A→C sans durée.
const R = (from, to, extra = {}) => ({
  id: 1, line_id: 1, operator_id: "x", from_place: from, to_place: to,
  to_slug: null, via_stops: null, season: "all", duration: extra.duration ?? null,
  duration_estimated: false, price_eur: null, price_estimated: false,
  frequency: null, departures: null,
  departures_by_day: [{ days: "Every Day", times: extra.times ?? ["10:00", "12:00"] }],
  source_url: "x", scraped_at: "2026-06-17",
});
const graph = {
  stops: [
    { slug: "a", name: "A", lat: 0, lng: 0 },
    { slug: "m", name: "M", lat: 0, lng: 0 },
    { slug: "b", name: "B", lat: 0, lng: 0 },
    { slug: "c", name: "C", lat: 0, lng: 0 },
  ],
  lines: [{
    id: 1, code: "L1", totalMinutes: 90,
    stops: [
      { slug: "a", name: "A", cumMin: 0 },
      { slug: "m", name: "M", cumMin: 30 },
      { slug: "b", name: "B", cumMin: 60 },
      { slug: "c", name: "C", cumMin: 90 },
    ],
    routes: [
      R("A", "B", { duration: "40min" }),
      R("B", "A", { duration: "40min" }),
      R("A", "C", { duration: null }), // durée inconnue, destination distincte
    ],
  }],
};
const now = { iso: "2026-06-17", minutes: 0 }; // minuit : tout est à venir
const tmw = "2026-06-18";

// À l'arrêt M : 3 destinations (vers B en sens A→B, vers A en sens B→A, vers C en sens A→C)
const d = stopDepartures(graph, "m", now, tmw);
const dests = d.map((x) => x.destination).sort();
assert.deepEqual(dests, ["A", "B", "C"], "M dessert A, B et C");

// vers B : départ 10:00 + frac(30/60)*40min = 10:20 ; 12:00 -> 12:20
const toB = d.find((x) => x.destination === "B");
assert.ok(toB.durationKnown, "durée B connue");
assert.deepEqual(toB.nextTimes, ["10:20", "12:20"], "passage proratisé à M vers B");
assert.equal(toB.estimated, true);

// vers A (sens inverse) : M est à 30min de B -> départ + frac(30/60)*40 = +20 ; 10:20,12:20
const toA = d.find((x) => x.destination === "A");
assert.deepEqual(toA.nextTimes, ["10:20", "12:20"], "passage proratisé à M vers A (sens inverse)");

// À l'arrêt B : PAS desservi vers B (terminus A→B), mais vers A (R2 B→A) et vers C (R3 A→C passe par B)
const atB = stopDepartures(graph, "b", now, tmw).map((x) => x.destination);
assert.deepEqual(atB.sort(), ["A", "C"], "B desservi vers A et C (pas vers B qui est terminus A→B)");

// À l'arrêt M, vers C : durationKnown false → nextTimes vides, estimated false
const toC = d.find((x) => x.destination === "C");
assert.ok(toC, "M dessert aussi C");
assert.equal(toC.durationKnown, false, "C sans durée -> durationKnown false");
assert.deepEqual(toC.nextTimes, [], "C sans durée -> pas d'horaire estimé");
assert.equal(toC.estimated, false, "C sans durée -> estimated false");

// Repli demain : à 23:59, plus de passage aujourd'hui -> 1er de demain marqué isTomorrow
const late = stopDepartures(graph, "m", { iso: "2026-06-17", minutes: 23 * 60 + 59 }, tmw);
const lb = late.find((x) => x.destination === "B");
assert.equal(lb.isTomorrow, true, "repli demain");
assert.deepEqual(lb.nextTimes, ["10:20"], "1er passage de demain");

console.log("check-stop-departures OK");
