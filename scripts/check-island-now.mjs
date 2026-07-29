// scripts/check-island-now.mjs : tests purs du barometre de l'ile (hero home v2).
import assert from "node:assert/strict";
import { pickTodayCruise, countTrackedVehicles, shouldShowBuses, athensDate } from "../src/lib/island-now.ts";

let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

const CALLS = [
  { call_date: "2026-07-28", port: "heraklion", ship_name: "Costa Fortuna", pax_capacity: 3470, eta: "08:00", etd: "18:30" },
  { call_date: "2026-08-02", port: "heraklion", ship_name: "Celestyal Discovery", pax_capacity: 1582, eta: "06:15", etd: "12:00" },
  { call_date: "2026-08-02", port: "heraklion", ship_name: "Vidanta Elegant", pax_capacity: 298, eta: "08:00", etd: "20:00" },
];

ok("aucune escale aujourd'hui = null", () => {
  assert.equal(pickTodayCruise(CALLS, "2026-07-29"), null);
});

ok("une escale = capacite du navire", () => {
  const c = pickTodayCruise(CALLS, "2026-07-28");
  assert.equal(c.paxCapacity, 3470);
  assert.equal(c.port, "heraklion");
  assert.deepEqual(c.ships.map((s) => s.name), ["Costa Fortuna"]);
});

ok("deux escales = somme des capacites, plus gros navire en tete", () => {
  const c = pickTodayCruise(CALLS, "2026-08-02");
  assert.equal(c.paxCapacity, 1880);
  assert.deepEqual(c.ships.map((s) => s.name), ["Celestyal Discovery", "Vidanta Elegant"]);
});

ok("capacite absente ou nulle : escale ignoree", () => {
  const calls = [{ call_date: "2026-07-28", port: "heraklion", ship_name: "Inconnu", pax_capacity: null, eta: null, etd: null }];
  assert.equal(pickTodayCruise(calls, "2026-07-28"), null);
});

ok("comptage bus = vehicules distincts", () => {
  assert.equal(countTrackedVehicles([{ vehicle_key: "a" }, { vehicle_key: "a" }, { vehicle_key: "b" }]), 2);
  assert.equal(countTrackedVehicles([]), 0);
});

ok("zero bus : ligne masquee", () => {
  assert.equal(shouldShowBuses(0, "2026-07-28T12:00:00Z", Date.parse("2026-07-28T12:01:00Z")), false);
});

ok("donnee fraiche : ligne affichee", () => {
  assert.equal(shouldShowBuses(32, "2026-07-28T12:00:00Z", Date.parse("2026-07-28T12:10:00Z")), true);
});

ok("donnee de plus de 15 min : ligne masquee (cas nuit)", () => {
  assert.equal(shouldShowBuses(32, "2026-07-28T19:50:00Z", Date.parse("2026-07-28T21:29:00Z")), false);
});

ok("horodatage absent : ligne masquee", () => {
  assert.equal(shouldShowBuses(32, null, Date.parse("2026-07-28T12:00:00Z")), false);
});

ok("date Athens au format ISO court", () => {
  assert.equal(athensDate(Date.parse("2026-07-28T21:29:00Z")), "2026-07-29");
  assert.equal(athensDate(Date.parse("2026-07-28T09:00:00Z")), "2026-07-28");
});

console.log(`check:island-now OK (${n} tests)`);
