// scripts/check-swim-near.mjs : tests purs du classement plage par position (NowPanel v2).
import assert from "node:assert/strict";
import { pickSwimNear } from "../src/lib/swim-near.ts";

// Positions réelles : Heraklion centre 35.339/25.133.
const HER = { lat: 35.339, lon: 25.133 };
const beaches = [
  { slug: "ammoudara", lat: 35.334, lng: 25.081, score: 62 },   // ~4.8 km
  { slug: "karteros", lat: 35.331, lng: 25.213, score: 78 },    // ~7.3 km
  { slug: "agia-pelagia", lat: 35.407, lng: 25.017, score: 55 }, // ~13 km
  { slug: "matala", lat: 34.995, lng: 24.749, score: 95 },       // ~52 km : hors rayon
  { slug: "vai", lat: 35.254, lng: 26.265, score: 90 },          // ~103 km : hors rayon
];
let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

ok("top 3 par score dans le rayon, une plage a 95 hors rayon ne gagne pas", () => {
  const r = pickSwimNear(beaches, HER);
  assert.deepEqual(r.map((b) => b.slug), ["karteros", "ammoudara", "agia-pelagia"]);
});
ok("km calcule et arrondi au dixieme", () => {
  const r = pickSwimNear(beaches, HER);
  const k = r.find((b) => b.slug === "karteros");
  assert.ok(k.km > 6 && k.km < 9, `km=${k.km}`);
  assert.equal(k.km, Math.round(k.km * 10) / 10);
});
ok("egalite de score : le plus proche d'abord", () => {
  const r = pickSwimNear(
    [
      { slug: "loin", lat: 35.407, lng: 25.017, score: 70 },
      { slug: "pres", lat: 35.334, lng: 25.081, score: 70 },
    ],
    HER,
  );
  assert.deepEqual(r.map((b) => b.slug), ["pres", "loin"]);
});
ok("rayon vide : repli 5 plus proches re-triees par score", () => {
  // Position au large au sud : tout est a plus de 25 km.
  const r = pickSwimNear(beaches, { lat: 34.6, lon: 24.7 });
  assert.equal(r.length, 3);
  assert.equal(r[0].slug, "matala"); // 95, la mieux notee des 5 plus proches
});
ok("moins de 3 plages dans le rayon : renvoie ce qu'il y a", () => {
  const r = pickSwimNear(beaches.slice(0, 2), HER);
  assert.equal(r.length, 2);
});
ok("coords invalides ignorees sans crash", () => {
  const r = pickSwimNear(
    [{ slug: "nan", lat: NaN, lng: 25.1, score: 99 }, ...beaches],
    HER,
  );
  assert.ok(!r.some((b) => b.slug === "nan"));
});
ok("liste vide : []", () => {
  assert.deepEqual(pickSwimNear([], HER), []);
});
ok("limit et radiusKm configurables", () => {
  const r = pickSwimNear(beaches, HER, { radiusKm: 6, limit: 1 });
  assert.deepEqual(r.map((b) => b.slug), ["ammoudara"]);
});
console.log(`✅ check:swim-near : ${n} tests OK`);
