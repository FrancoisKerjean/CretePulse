// Assertions de la couche d'animation. Run: node scripts/check-bus-animate.mjs
import assert from "node:assert/strict";
import { lerp, lerpAngle, reconcile } from "../src/lib/bus-live/animate.ts";

// lerp linéaire
assert.equal(lerp(0, 10, 0), 0);
assert.equal(lerp(0, 10, 1), 10);
assert.equal(lerp(0, 10, 0.5), 5);

// lerpAngle : plus court chemin (350° -> 10° passe par 0°, pas par 180°)
assert.ok(Math.abs(lerpAngle(350, 10, 0.5) - 0) < 1e-9 || Math.abs(lerpAngle(350, 10, 0.5) - 360) < 1e-9);
assert.equal(lerpAngle(0, 90, 0.5), 45);
assert.ok(Math.abs(lerpAngle(10, 350, 0.5) % 360 - 0) < 1e-9);

// reconcile : 1 présent (bouge), 1 entrant, 1 sortant
const prev = new Map([
  ["A", { id: "A", lat: 1, lng: 1, bearing: 0 }],
  ["C", { id: "C", lat: 9, lng: 9, bearing: 0 }],
]);
const next = [
  { id: "A", lat: 2, lng: 2, bearing: 90 },   // present, nouvelle cible
  { id: "B", lat: 5, lng: 5, bearing: 0 },     // entrant
];
const r = reconcile(prev, next);
assert.deepEqual(r.entering.map((b) => b.id), ["B"]);
assert.deepEqual(r.present.map((p) => p.id), ["A"]);
assert.deepEqual(r.leaving, ["C"]);
// la cible de A est bien la nouvelle position
assert.equal(r.present[0].to.lat, 2);
assert.equal(r.present[0].from.lat, 1);

console.log("OK check-bus-animate: toutes les assertions passent");
