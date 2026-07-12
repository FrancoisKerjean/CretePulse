// scripts/check-boarding.mjs : tests purs du proxy embarquement bus (chantier flux-impact).
import assert from "node:assert/strict";
import { inBoardingWindow, bucketInMin, nearStopLabel } from "../src/lib/boarding-proxy.ts";

let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

ok("fenêtre : 0 min = dedans", () => assert.equal(inBoardingWindow(0), true));
ok("fenêtre : 15 min = dedans (borne)", () => assert.equal(inBoardingWindow(15), true));
ok("fenêtre : 16 min = dehors", () => assert.equal(inBoardingWindow(16), false));
ok("fenêtre : -5 min = dedans (bus à quai)", () => assert.equal(inBoardingWindow(-5), true));
ok("fenêtre : -6 min = dehors", () => assert.equal(inBoardingWindow(-6), false));
ok("fenêtre : NaN = dehors", () => assert.equal(inBoardingWindow(NaN), false));

ok("bucket : négatif = due", () => assert.equal(bucketInMin(-3), "due"));
ok("bucket : 0 = 0-5", () => assert.equal(bucketInMin(0), "0-5"));
ok("bucket : 5 = 0-5", () => assert.equal(bucketInMin(5), "0-5"));
ok("bucket : 6 = 6-15", () => assert.equal(bucketInMin(6), "6-15"));
ok("bucket : 15 = 6-15", () => assert.equal(bucketInMin(15), "6-15"));

ok("near_stop : null = unknown", () => assert.equal(nearStopLabel(null), "unknown"));
ok("near_stop : NaN = unknown", () => assert.equal(nearStopLabel(NaN), "unknown"));
ok("near_stop : 0.2 km = yes", () => assert.equal(nearStopLabel(0.2), "yes"));
ok("near_stop : 0.3 km = yes (borne)", () => assert.equal(nearStopLabel(0.3), "yes"));
ok("near_stop : 0.31 km = no", () => assert.equal(nearStopLabel(0.31), "no"));

console.log(`✅ check:boarding : ${n} tests OK`);
