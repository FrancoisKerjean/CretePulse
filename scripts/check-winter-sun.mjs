// scripts/check-winter-sun.mjs : tests purs du mode hiver de la home.
import assert from "node:assert/strict";
import { isWinterSeason, sunNow, sunWeek } from "../src/lib/winter-sun.ts";

let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

const day = (date, precipProb, tempMax, weatherCode = 1) => ({ date, precipProb, tempMax, tempMin: tempMax - 6, weatherCode });
const city = (name, o) => ({
  name, nameEl: name, lat: 35, lng: 25, temp: 18, windSpeed: 10, windDir: 0,
  weatherCode: 1, seaTemp: 20, waveHeight: 0.5, uvIndex: 3, precipitation: 0, daily: [], ...o,
});

// 12:00 Athènes = 09:00 ou 10:00 UTC selon l'heure d'été : on prend midi UTC, sans ambiguïté de date.
const at = (iso) => new Date(`${iso}T12:00:00Z`);

ok("été : mai à septembre, et octobre jusqu'au 15 inclus", () => {
  for (const d of ["2026-05-01", "2026-07-15", "2026-09-30", "2026-10-15"]) assert.equal(isWinterSeason(at(d)), false, d);
});

ok("hiver : du 16 octobre au 30 avril", () => {
  for (const d of ["2026-10-16", "2026-10-29", "2026-12-25", "2027-02-01", "2027-04-30"]) assert.equal(isWinterSeason(at(d)), true, d);
});

ok("la bascule suit la date d'Athènes, pas l'UTC", () => {
  // 15/10 22:30 UTC = 16/10 01:30 à Athènes (UTC+3) : déjà l'hiver.
  assert.equal(isWinterSeason(new Date("2026-10-15T22:30:00Z")), true);
  // 30/04 21:30 UTC = 01/05 00:30 à Athènes : déjà l'été.
  assert.equal(isWinterSeason(new Date("2026-04-30T21:30:00Z")), false);
});

ok("maintenant : une station sèche passe devant une plus chaude sous la pluie", () => {
  const r = sunNow([
    city("Chania", { weatherCode: 63, temp: 22 }),
    city("Ierapetra", { weatherCode: 2, temp: 19 }),
  ]);
  assert.equal(r.city.name, "Ierapetra");
  assert.equal(r.wetEverywhere, false);
  assert.equal(r.wetCount, 1);
  assert.equal(r.total, 2);
});

ok("maintenant : à ciel égal, la plus douce gagne", () => {
  assert.equal(sunNow([city("A", { temp: 15 }), city("B", { temp: 21 })]).city.name, "B");
});

ok("maintenant : de la pluie mesurée compte même sous un code nuageux", () => {
  const r = sunNow([city("A", { weatherCode: 3, precipitation: 0.4, temp: 25 }), city("B", { weatherCode: 3, temp: 12 })]);
  assert.equal(r.city.name, "B");
});

ok("maintenant : pluie partout signalée, jamais masquée", () => {
  const r = sunNow([city("A", { weatherCode: 61 }), city("B", { weatherCode: 80 })]);
  assert.equal(r.wetEverywhere, true);
  assert.equal(r.wetCount, 2);
});

ok("maintenant : aucune station, aucun verdict", () => {
  assert.equal(sunNow([]), null);
});

ok("semaine : chaque jour élit la station au risque de pluie le plus bas", () => {
  const w = sunWeek([
    city("Chania", { daily: [day("2026-10-30", 80, 22), day("2026-10-31", 10, 20)] }),
    city("Ierapetra", { daily: [day("2026-10-30", 20, 19), day("2026-10-31", 30, 24)] }),
  ]);
  assert.deepEqual(w.map((d) => [d.date, d.city.name]), [["2026-10-30", "Ierapetra"], ["2026-10-31", "Chania"]]);
});

ok("semaine : à 60 % au plus sec, le jour est marqué pluvieux partout", () => {
  const w = sunWeek([city("A", { daily: [day("2026-11-02", 60, 17)] }), city("B", { daily: [day("2026-11-02", 90, 18)] })]);
  assert.equal(w[0].wetEverywhere, true);
  assert.equal(w[0].city.name, "A");
});

ok("semaine : liste les stations où la pluie est probable, la plus exposée d'abord", () => {
  const w = sunWeek([
    city("Chania", { daily: [day("2026-11-03", 70, 16)] }),
    city("Rethymno", { daily: [day("2026-11-03", 50, 17)] }),
    city("Ierapetra", { daily: [day("2026-11-03", 10, 21)] }),
  ]);
  assert.deepEqual(w[0].wetCities.map((c) => c.name), ["Chania", "Rethymno"]);
  assert.equal(w[0].wetEverywhere, false);
});

ok("semaine : île au sec, aucune station listée", () => {
  const w = sunWeek([city("A", { daily: [day("2026-11-03", 49, 16)] }), city("B", { daily: [day("2026-11-03", 0, 20)] })]);
  assert.deepEqual(w[0].wetCities, []);
});

ok("semaine : une station sans prévision vide la semaine plutôt que de mentir", () => {
  assert.deepEqual(sunWeek([city("A", { daily: [day("2026-11-02", 10, 17)] }), city("B")]), []);
  assert.deepEqual(sunWeek([]), []);
});

console.log(`check-winter-sun : ${n} ok`);
