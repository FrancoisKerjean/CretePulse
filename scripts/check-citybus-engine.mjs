// scripts/check-citybus-engine.mjs — assertions moteur citybus (2 sens + arrêts jumeaux).
// Run: node --experimental-strip-types scripts/check-citybus-engine.mjs
import assert from "node:assert/strict";
import { createCitybusEngine } from "../src/lib/citybus/engine.ts";

// Réseau synthétique : ligne L1 aller A→B→C ; retour C2→B2→A2 (jumeaux à ~55 m,
// comme les arrêts ΕΠΙΣΤΡΟΦΗΣ du vrai réseau). D = arrêt isolé (>150 m de tout).
// 0.0005° de latitude ≈ 55 m.
const S = (slug, lat, lng) => ({ slug, name: slug.toUpperCase(), nameEl: slug, lat, lng });
const data = {
  info: { operator: "test", sourceUrl: "x", city: "Test" },
  stops: {
    a: S("a", 35.0, 25.0), b: S("b", 35.01, 25.0), c: S("c", 35.02, 25.0),
    a2: S("a2", 35.0005, 25.0), b2: S("b2", 35.0105, 25.0), c2: S("c2", 35.0205, 25.0),
    d: S("d", 35.1, 25.1),
  },
  lines: [{ code: "L1", apiCode: "1", name: "L1", nameEl: "L1", hex: null, textHex: null, totalMinutes: 10, lengthKm: 3 }],
  routes: [
    { code: "R-ALLER", lineCode: "L1", name: "A - C", direction: 1, stops: [
      { slug: "a", seq: 0, cumKm: 0, cumMin: 0 },
      { slug: "b", seq: 1, cumKm: 1.1, cumMin: 4 },
      { slug: "c", seq: 2, cumKm: 2.2, cumMin: 8 },
    ] },
    { code: "R-RETOUR", lineCode: "L1", name: "C - A", direction: 2, stops: [
      { slug: "c2", seq: 0, cumKm: 0, cumMin: 0 },
      { slug: "b2", seq: 1, cumKm: 1.1, cumMin: 4 },
      { slug: "a2", seq: 2, cumKm: 2.2, cumMin: 8 },
    ] },
  ],
};
const eng = createCitybusEngine(data);

// 1. Direct aller inchangé, sans pénalité (arrêts exacts).
let trips = eng.findTrips("a", "c");
assert.ok(trips.length >= 1, "a->c direct attendu");
assert.equal(trips[0].transfers, 0);
assert.equal(trips[0].legs[0].fromSlug, "a");
assert.equal(trips[0].totalMinutes, 8, "pas de pénalité quand arrêts exacts");

// 2. Retour c->a : la route retour part du jumeau c2 (~55 m) et arrive en a2.
trips = eng.findTrips("c", "a");
assert.ok(trips.length >= 1, "c->a doit passer par les jumeaux c2/a2");
assert.equal(trips[0].legs[0].fromSlug, "c2", "part du jumeau c2");
assert.equal(trips[0].legs[0].toSlug, "a2", "arrive au jumeau a2");

// 3. Pénalité marche incluse dans le total (8 min bus + 2× ~1 min marche).
assert.ok(trips[0].totalMinutes > 8, `pénalité marche attendue, total=${trips[0].totalMinutes}`);

// 4. Arrêt isolé (>150 m de tout) : aucun trajet.
assert.equal(eng.findTrips("d", "a").length, 0, "d isolé, pas de trajet");

// 5. Pas de doublon de signature dans les résultats.
trips = eng.findTrips("a", "c");
const sigs = trips.map((t) => t.legs.map((l) => `${l.routeCode}:${l.fromSlug}>${l.toSlug}`).join("|"));
assert.equal(new Set(sigs).size, sigs.length, "pas de doublons");

console.log("check-citybus-engine OK");
