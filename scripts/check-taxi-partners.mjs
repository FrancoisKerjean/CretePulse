// Assertions zones/partenaires. Run: node scripts/check-taxi-partners.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { zoneOfSlug, partnerForPair, activePartners, PARTNER_PRICE_EUR } from "../src/lib/taxi-partners.ts";

const data = JSON.parse(readFileSync(new URL("../src/data/taxi-partners.json", import.meta.url), "utf8"));

// --- schema -------------------------------------------------------------------
assert.ok(Array.isArray(data.zones) && data.zones.length >= 5);
for (const z of data.zones) {
  assert.match(z.id, /^[a-z0-9-]+$/);
  assert.ok(z.label && Array.isArray(z.placeSlugs) && z.placeSlugs.length > 0);
}
for (const p of data.partners) {
  assert.ok(data.zones.some((z) => z.id === p.zoneId), `zone inconnue ${p.zoneId}`);
  assert.ok(p.name && p.phone && p.reportEmail && p.since);
}

// --- chaque slug de BUS_PLACE_SLUGS a exactement une zone ----------------------
const pairsSrc = readFileSync(new URL("../src/lib/bus-pairs.ts", import.meta.url), "utf8");
const slugSet = new Set([...pairsSrc.matchAll(/:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]));
for (const slug of slugSet) {
  const zones = data.zones.filter((z) => z.placeSlugs.includes(slug));
  assert.equal(zones.length, 1, `slug "${slug}" dans ${zones.length} zones`);
  assert.equal(zoneOfSlug(data, slug)?.id, zones[0].id);
}

// --- lookup partenaire : priorite zone de A, deterministe ----------------------
const fx = {
  zones: [
    { id: "za", label: "A", placeSlugs: ["aa"] },
    { id: "zb", label: "B", placeSlugs: ["bb"] },
  ],
  partners: [
    { zoneId: "zb", name: "Taxi B", phone: "+30 123", reportEmail: "b@x.gr", since: "2026-07-01" },
  ],
};
assert.equal(partnerForPair(fx, "aa", "bb").name, "Taxi B"); // zone A sans partenaire -> B
fx.partners.push({ zoneId: "za", name: "Taxi A", phone: "+30 456", reportEmail: "a@x.gr", since: "2026-07-01" });
assert.equal(partnerForPair(fx, "aa", "bb").name, "Taxi A"); // A prioritaire
assert.equal(partnerForPair(fx, "zz", "yy"), null);

// --- etat de lancement : zero partenaire, prix defini ---------------------------
assert.equal(activePartners(data).length, 0);
assert.equal(typeof PARTNER_PRICE_EUR, "number");

console.log("OK check-taxi-partners:", data.zones.length, "zones,", slugSet.size, "slugs");
