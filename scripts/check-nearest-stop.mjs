// scripts/check-nearest-stop.mjs : tests purs du choix d'arrêt (lot 2 app compagnon).
import assert from "node:assert/strict";
import { pickNearestStop, liveCityFor } from "../src/lib/nearest-stop.ts";

const stops = [
  { slug: "hkl-a", name: "Plateia", lat: 35.339, lng: 25.133, api_code: "0122", coords_source: "citybus", prefecture: "HER" },
  { slug: "cha-b", name: "Agora", lat: 35.516, lng: 24.018, api_code: "74003", coords_source: "citybus", prefecture: "CHA" },
  { slug: "ktel-c", name: "Ierapetra KTEL", lat: 35.011, lng: 25.741, api_code: null, coords_source: "ktel", prefecture: "LAS" },
];
let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

ok("liveCityFor citybus HER = her", () => {
  assert.equal(liveCityFor(stops[0]), "her");
});
ok("liveCityFor citybus CHA = cha", () => {
  assert.equal(liveCityFor(stops[1]), "cha");
});
ok("liveCityFor ktel sans api_code = null", () => {
  assert.equal(liveCityFor(stops[2]), null);
});
ok("citybus sans api_code = null (defensif)", () => {
  assert.equal(liveCityFor({ ...stops[0], api_code: null }), null);
});
ok("arrêt le plus proche à Heraklion centre, live her", () => {
  const r = pickNearestStop(stops, 35.34, 25.13);
  assert.equal(r.slug, "hkl-a");
  assert.ok(r.km < 1, `km=${r.km}`);
  assert.equal(r.liveCity, "her");
  assert.equal(r.apiCode, "0122");
});
ok("arrêt le plus proche à Ierapetra = KTEL sans live", () => {
  const r = pickNearestStop(stops, 35.01, 25.74);
  assert.equal(r.slug, "ktel-c");
  assert.equal(r.liveCity, null);
});
ok("null si aucun arrêt à moins de maxKm", () => {
  assert.equal(pickNearestStop(stops, 34.5, 24.5, 3), null);
});
ok("coords manquantes ignorées sans crash", () => {
  const r = pickNearestStop([{ ...stops[0], lat: null }, stops[2]], 35.01, 25.74);
  assert.equal(r.slug, "ktel-c");
});
console.log(`✅ check:nearest-stop : ${n} tests OK`);
