// scripts/check-retention.mjs : tests purs du module de rétention (lot 0 app compagnon).
import assert from "node:assert/strict";
import { computeRetention, RETENTION_STORAGE_KEY } from "../src/lib/retention.ts";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse("2026-07-10T09:00:00Z");
let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

ok("clé de stockage stable", () => {
  assert.equal(RETENTION_STORAGE_KEY, "cd_visit");
});

ok("première visite = new, visit_number 1, days 0", () => {
  const { props, next } = computeRetention(null, T0);
  assert.deepEqual(props, { visit_number: "1", days_since_first: "0", bucket: "new" });
  assert.deepEqual(next, { f: T0, l: T0, n: 1 });
});

ok("état corrompu traité comme première visite", () => {
  const { props } = computeRetention("{garbage", T0);
  assert.equal(props.bucket, "new");
});

ok("retour même jour = same_day, visit_number incrémenté", () => {
  const prev = JSON.stringify({ f: T0, l: T0, n: 1 });
  const { props, next } = computeRetention(prev, T0 + 3 * 60 * 60 * 1000);
  assert.equal(props.bucket, "same_day");
  assert.equal(props.visit_number, "2");
  assert.equal(props.days_since_first, "0");
  assert.equal(next.n, 2);
  assert.equal(next.f, T0); // firstSeen jamais réécrit
});

ok("retour lendemain = d1", () => {
  const prev = JSON.stringify({ f: T0, l: T0, n: 1 });
  const { props } = computeRetention(prev, T0 + 1 * DAY + 60000);
  assert.equal(props.bucket, "d1");
  assert.equal(props.days_since_first, "1");
});

ok("retour J+3 = d2_7", () => {
  const prev = JSON.stringify({ f: T0, l: T0, n: 2 });
  const { props } = computeRetention(prev, T0 + 3 * DAY);
  assert.equal(props.bucket, "d2_7");
});

ok("retour J+9 = d8_plus", () => {
  const prev = JSON.stringify({ f: T0, l: T0, n: 2 });
  const { props } = computeRetention(prev, T0 + 9 * DAY);
  assert.equal(props.bucket, "d8_plus");
});

ok("bucket calculé sur lastSeen, pas firstSeen (J+2 revu chaque jour = d1)", () => {
  const prev = JSON.stringify({ f: T0, l: T0 + 1 * DAY, n: 2 });
  const { props } = computeRetention(prev, T0 + 2 * DAY);
  assert.equal(props.bucket, "d1");
  assert.equal(props.days_since_first, "2");
});

ok("visit_number plafonné à 50 (cardinalité Plausible)", () => {
  const prev = JSON.stringify({ f: T0, l: T0, n: 400 });
  const { props, next } = computeRetention(prev, T0 + 1000);
  assert.equal(props.visit_number, "50+");
  assert.equal(next.n, 401); // le compteur interne continue
});

ok("days_since_first plafonné à 30+", () => {
  const prev = JSON.stringify({ f: T0, l: T0 + 44 * DAY, n: 5 });
  const { props } = computeRetention(prev, T0 + 45 * DAY);
  assert.equal(props.days_since_first, "30+");
});

console.log(`✅ check:retention : ${n} tests OK`);
