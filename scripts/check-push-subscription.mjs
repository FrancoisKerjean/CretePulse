// Run: node scripts/check-push-subscription.mjs  (Node >= 23, type-stripping du .ts)
import assert from "node:assert/strict";
import {
  parseSubscription, normaliseTopics, normaliseLocale,
} from "../src/lib/push-subscription.ts";

// parseSubscription : rejette les formes invalides
assert.equal(parseSubscription(null), null);
assert.equal(parseSubscription({}), null);
assert.equal(parseSubscription({ endpoint: "http://x", keys: { p256dh: "a", auth: "b" } }), null); // non https
assert.equal(parseSubscription({ endpoint: "https://x", keys: { p256dh: "a" } }), null); // auth manquant
assert.equal(parseSubscription({ endpoint: "https://x", keys: { p256dh: "", auth: "b" } }), null); // p256dh vide
assert.equal(parseSubscription({ endpoint: "https://" + "a".repeat(3000), keys: { p256dh: "PK", auth: "AU" } }), null); // endpoint trop long
assert.deepEqual(
  parseSubscription({ endpoint: "https://fcm.example/abc", keys: { p256dh: "PK", auth: "AU" }, extra: 1 }),
  { endpoint: "https://fcm.example/abc", keys: { p256dh: "PK", auth: "AU" } },
);

// normaliseTopics : garde le connu, défaut = les deux
assert.deepEqual(normaliseTopics(["bus_alerts"]), ["bus_alerts"]);
assert.deepEqual(normaliseTopics(["bus_alerts", "junk"]), ["bus_alerts"]);
assert.deepEqual(normaliseTopics("nope"), ["bus_alerts", "urgent_news"]);
assert.deepEqual(normaliseTopics([]), ["bus_alerts", "urgent_news"]);

// normaliseLocale : 4 langues traduites, sinon en
assert.equal(normaliseLocale("fr"), "fr");
assert.equal(normaliseLocale("el"), "el");
assert.equal(normaliseLocale("ru"), "en");
assert.equal(normaliseLocale(undefined), "en");

console.log("OK push-subscription");
